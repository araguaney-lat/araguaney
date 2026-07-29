"""Pure byte-generating functions for async export jobs (Fase 12 tarea 15c).

Called from app.worker's ARQ tasks — never from a router directly. All
authorization checks already happened in the router before the ExportJob was
created; these functions only re-fetch the (already-validated) resource by id
and build the file. Each returns (bytes, content_type, filename).
"""

from datetime import date
from typing import Callable
from uuid import UUID

from sqlalchemy.orm import Session

from app.utils.manifest import (
    ManifestBoxRow,
    ManifestData,
    ManifestPalletSection,
    TransferManifestData,
    generate_manifest_pdf,
    generate_transfer_manifest_pdf as _generate_transfer_manifest_pdf,
)
from app.utils.manifest_xlsx import generate_manifest_xlsx
from app.utils.pdf_labels import LabelData, generate_labels_pdf
from app.utils.pdf_pallet_label import PalletLabelData, generate_pallet_label_pdf as _generate_pallet_label_pdf


def _build_shipment_manifest_data(db: Session, shipment_id: UUID) -> ManifestData:
    from app.repositories.pallet_repository import PalletRepository
    from app.repositories.product_type_repository import ProductTypeRepository
    from app.repositories.shipment_repository import ShipmentRepository

    shipment = ShipmentRepository(db).find_by_id(shipment_id, center_id=None)
    if not shipment:
        raise ValueError(f"Shipment {shipment_id} not found")

    pallet_repo = PalletRepository(db)
    pt_repo = ProductTypeRepository(db)
    pt_cache: dict = {}

    pallets = ShipmentRepository(db).find_pallets(shipment_id)
    boxes_by_pallet = pallet_repo.find_boxes_for_pallets([p.id for p in pallets])
    pallet_sections: list[ManifestPalletSection] = []
    for pallet in pallets:
        rows: list[ManifestBoxRow] = []
        for box in boxes_by_pallet[pallet.id]:
            pt_id = box.product_type_id
            if pt_id not in pt_cache:
                pt_cache[pt_id] = pt_repo.find_by_id(pt_id)
            pt = pt_cache[pt_id]
            rows.append(ManifestBoxRow(
                code=box.code,
                display_name=pt.display_name if pt else "—",
                category=pt.category if pt else "OTHER",
                inn_name=pt.inn_name if pt else None,
                strength=pt.strength if pt else None,
                batch=box.batch,
                expiry_date=box.expiry_date,
                quantity=box.quantity,
                unit=box.unit,
                weight_kg=box.weight_kg,
            ))
        pallet_sections.append(ManifestPalletSection(code=pallet.code, boxes=rows))

    return ManifestData(
        shipment_id=str(shipment.id),
        destination=shipment.destination,
        carrier=shipment.carrier,
        reference=shipment.reference,
        status=shipment.status,
        closed_at=shipment.closed_at,
        pallets=pallet_sections,
    )


def generate_shipment_manifest_pdf(db: Session, shipment_id: str) -> tuple[bytes, str, str]:
    manifest_data = _build_shipment_manifest_data(db, UUID(shipment_id))
    ref = manifest_data.reference or shipment_id[:8]
    return generate_manifest_pdf(manifest_data), "application/pdf", f"manifiesto-{ref}.pdf"


def generate_shipment_manifest_xlsx(db: Session, shipment_id: str) -> tuple[bytes, str, str]:
    manifest_data = _build_shipment_manifest_data(db, UUID(shipment_id))
    ref = manifest_data.reference or shipment_id[:8]
    content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return generate_manifest_xlsx(manifest_data), content_type, f"packing-list-ifrc-{ref}.xlsx"


def generate_box_labels_pdf(db: Session, center_id: str | None, status: str) -> tuple[bytes, str, str]:
    from app.repositories.box_repository import BoxRepository
    from app.repositories.center_repository import CenterRepository
    from app.repositories.product_type_repository import ProductTypeRepository
    from app.config import settings

    scope = UUID(center_id) if center_id else None
    boxes = BoxRepository(db).list_all(scope, status=status, limit=None)
    if not boxes:
        raise ValueError("No boxes found with the given filters")

    pt_cache: dict = {}
    center_name = "Araguaney"
    if scope:
        center = CenterRepository(db).find_by_id(scope)
        if center:
            center_name = center.name

    base_url = settings.frontend_url.split(",")[0].strip().rstrip("/")
    pt_repo = ProductTypeRepository(db)

    labels: list[LabelData] = []
    for box in boxes:
        pt_id = box.product_type_id
        if pt_id not in pt_cache:
            pt_cache[pt_id] = pt_repo.find_by_id(pt_id)
        pt = pt_cache[pt_id]
        labels.append(LabelData(
            code=box.code,
            display_name=pt.display_name if pt else "—",
            category=pt.category if pt else "OTHER",
            batch=box.batch,
            expiry_date=box.expiry_date,
            quantity=box.quantity,
            unit=box.unit,
            center_name=center_name,
            base_url=base_url,
        ))

    return generate_labels_pdf(labels), "application/pdf", f"etiquetas-{status.lower()}.pdf"


def generate_pallet_label_pdf(db: Session, pallet_id: str) -> tuple[bytes, str, str]:
    from app.repositories.center_repository import CenterRepository
    from app.services.pallet_service import PalletService
    from app.config import settings

    detail = PalletService(db).get_detail(UUID(pallet_id), center_id=None)
    base_url = settings.frontend_url.split(",")[0].strip().rstrip("/")
    # La etiqueta se pega en una tarima física: quien la lee necesita el nombre
    # del centro, no su UUID.
    center = CenterRepository(db).find_by_id(detail.center_id) if detail.center_id else None
    label = PalletLabelData(
        code=detail.code,
        center_name=center.name if center else "Araguaney",
        status=detail.status,
        box_codes=[b.code for b in detail.boxes],
        closed_at=detail.closed_at,
        base_url=base_url,
    )
    filename = f"tarima-{detail.code}.pdf"
    return _generate_pallet_label_pdf(label), "application/pdf", filename


def generate_transfer_manifest_pdf(db: Session, transfer_id: str) -> tuple[bytes, str, str]:
    from app.repositories.center_repository import CenterRepository
    from app.repositories.product_type_repository import ProductTypeRepository
    from app.repositories.transfer_repository import TransferRepository

    repo = TransferRepository(db)
    transfer = repo.find_by_id(UUID(transfer_id))
    if not transfer:
        raise ValueError(f"Transfer {transfer_id} not found")

    center_repo = CenterRepository(db)
    from_center = center_repo.find_by_id(transfer.from_center_id)
    to_center = center_repo.find_by_id(transfer.to_center_id)

    pt_repo = ProductTypeRepository(db)
    pt_cache: dict = {}
    boxes = repo.find_boxes(UUID(transfer_id))
    rows: list[ManifestBoxRow] = []
    for box in boxes:
        pt_id = box.product_type_id
        if pt_id not in pt_cache:
            pt_cache[pt_id] = pt_repo.find_by_id(pt_id)
        pt = pt_cache[pt_id]
        rows.append(ManifestBoxRow(
            code=box.code,
            display_name=pt.display_name if pt else "—",
            category=pt.category if pt else "OTHER",
            inn_name=pt.inn_name if pt else None,
            strength=pt.strength if pt else None,
            batch=box.batch,
            expiry_date=box.expiry_date,
            quantity=box.quantity,
            unit=box.unit,
            weight_kg=box.weight_kg,
        ))

    manifest_data = TransferManifestData(
        transfer_id=str(transfer.id),
        from_center=from_center.name if from_center else str(transfer.from_center_id)[:8],
        to_center=to_center.name if to_center else str(transfer.to_center_id)[:8],
        status=transfer.status,
        created_at=transfer.created_at,
        boxes=rows,
    )
    short_id = transfer_id[:8]
    return _generate_transfer_manifest_pdf(manifest_data), "application/pdf", f"transferencia-{short_id}.pdf"


def generate_report_export_csv(
    db: Session, campaign_id: str, center_id: str | None, start: str, end: str
) -> tuple[bytes, str, str]:
    import csv
    import io as io_mod
    from app.repositories.report_repository import ReportRepository

    scope = UUID(center_id) if center_id else None
    rows = ReportRepository(db).export_rows(UUID(campaign_id), scope, date.fromisoformat(start), date.fromisoformat(end))

    output = io_mod.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    else:
        output.write("No data for the selected period.\n")

    filename = f"reporte_{campaign_id}_{start}_{end}.csv"
    return output.getvalue().encode("utf-8"), "text/csv", filename


_GENERATORS: dict[str, Callable[[Session, dict], tuple[bytes, str, str]]] = {
    "SHIPMENT_MANIFEST_PDF": lambda db, p: generate_shipment_manifest_pdf(db, p["shipment_id"]),
    "SHIPMENT_MANIFEST_XLSX": lambda db, p: generate_shipment_manifest_xlsx(db, p["shipment_id"]),
    "BOX_LABELS_PDF": lambda db, p: generate_box_labels_pdf(db, p["center_id"], p["status"]),
    "PALLET_LABEL_PDF": lambda db, p: generate_pallet_label_pdf(db, p["pallet_id"]),
    "TRANSFER_MANIFEST_PDF": lambda db, p: generate_transfer_manifest_pdf(db, p["transfer_id"]),
    "REPORT_EXPORT_CSV": lambda db, p: generate_report_export_csv(
        db, p["campaign_id"], p["center_id"], p["start"], p["end"]
    ),
}


def run_export_job(job_id: str) -> None:
    """Shared runner for all 6 export kinds: mark_running -> generate -> upload to R2 -> mark_done/failed.

    Dispatches on job.kind (stored on the row) rather than taking a generate
    callable, so this single function works both as the ARQ task body (via
    asyncio.to_thread) and as the direct in-process fallback when Redis is
    down — same shape as the send_*_email functions used elsewhere in worker.py.
    """
    import logging
    from uuid import UUID as _UUID

    from app.database import SessionLocal
    from app.repositories.export_job_repository import ExportJobRepository
    from app.utils import r2

    logger = logging.getLogger(__name__)

    with SessionLocal() as db:
        repo = ExportJobRepository(db)
        job = repo.find_by_id(_UUID(job_id))
        if not job:
            logger.warning("Export job %s not found — skipping", job_id)
            return

        repo.mark_running(job.id)
        try:
            generate = _GENERATORS[job.kind]
            data, content_type, filename = generate(db, job.params)
            extension = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
            r2_key = f"exports/{job.id}.{extension}"
            r2.put_object(r2_key, data, content_type, filename=filename)
            repo.mark_done(job.id, r2_key)
        except Exception as exc:
            logger.error("Export job %s (%s) failed: %s", job.id, job.kind, exc)
            repo.mark_failed(job.id, str(exc))
