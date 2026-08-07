"""National dashboard and public needs endpoints."""

import json
import logging
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_center_role, tenant_scope, require_national_admin
from app.models.campaign import Campaign
from app.models.center import Center
from app.models.events import BoxEvent, PalletEvent
from app.models.intake import Intake
from app.models.user import User
from app.repositories.aggregate_repository import AggregateRepository
from app.repositories.box_repository import BoxRepository
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.pallet_repository import PalletRepository
from app.schemas.aggregate import (
    NationalDashboardOut,
    PublicCampaignListItemOut,
    PublicCampaignOut,
    PublicNeedsOut,
    WeightDashboardOut,
)
from app.schemas.qr_ficha import QrBoxFicha, QrEventOut, QrPalletBoxRow, QrPalletFicha
from app.services.ai import national_summary as national_summary_service
from app.utils import cache, delivery_status
from app.utils.errors import api_error
from app.utils.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dashboard"])

_DASHBOARD_TTL = 120   # 2 minutes — fresh enough, cheap enough
_PUBLIC_TTL = 300      # 5 minutes — cacheable at edge too


# ── Authenticated national dashboard ──────────────────────────────────────────

@router.get("/dashboard/national", response_model=NationalDashboardOut)
@limiter.limit("30/minute")
def national_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    """Aggregate dashboard.

    national_admin → all centers.
    coordinator/volunteer → their center only.
    """
    cache_key = f"dashboard:national:{str(scope) if scope else 'all'}"
    cached = cache.get(cache_key)
    if cached:
        return JSONResponse(content=json.loads(cached))

    repo = AggregateRepository(db)
    payload = NationalDashboardOut(
        totals=repo.summary_totals(center_id=scope),
        by_category=repo.stock_by_category(center_id=scope),
        by_center=repo.stock_by_center(center_id=scope),
        by_inn=repo.stock_by_inn(center_id=scope),
    )
    serialized = payload.model_dump_json()
    cache.set(cache_key, serialized, ttl=_DASHBOARD_TTL)
    return JSONResponse(content=json.loads(serialized))


# ── Weight metrics ────────────────────────────────────────────────────────────

@router.get("/dashboard/national/summary", response_model=dict)
@limiter.limit("10/minute")
def national_summary(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_national_admin),
):
    """Párrafo redactado sobre las cifras que este panel ya calcula.

    `null` si la capacidad está apagada o no hay inventario que resumir: el
    panel muestra sus cifras igual, que es como se ve hoy.
    """
    return {"summary": national_summary_service.summarize(db, user_id=current_user.id)}


@router.get("/dashboard/weight", response_model=WeightDashboardOut)
@limiter.limit("60/minute")
def weight_dashboard(
    request: Request,
    campaign_id: UUID | None = None,
    center_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    """Weight metrics per campaign + per center.

    national_admin: can query any campaign_id / center_id.
    coordinator/volunteer: scoped to their center; campaign_id ignored outside their campaigns.
    """
    effective_center = center_id if scope is None else scope
    repo = AggregateRepository(db)
    campaigns = repo.weight_by_campaign(
        center_id=effective_center,
        campaign_id=campaign_id,
    )
    center_kg = repo.weight_by_center(effective_center) if effective_center else None
    return WeightDashboardOut(campaigns=campaigns, center_kg=center_kg)


# ── Public QR ficha ───────────────────────────────────────────────────────────

_QR_TTL = 60  # 1 minute; edge can extend with stale-while-revalidate


@router.get("/public/qr/{code}")
@limiter.limit("120/minute")
def qr_ficha(
    request: Request,
    code: str,
    db: Session = Depends(get_db),
):
    """Public QR lookup — no auth required.

    Tries boxes first (prefix BOX-), then pallets (prefix PAL-).
    Response is safe to cache at Cloudflare edge: no PII, no center-specific secrets.
    """
    cache_key = f"qr:{code}"
    cached = cache.get(cache_key)
    if cached:
        return JSONResponse(
            content=json.loads(cached),
            headers={"Cache-Control": f"public, max-age={_QR_TTL}, s-maxage={_QR_TTL}, stale-while-revalidate=300"},
        )

    # ── Try box ──
    box = BoxRepository(db).find_by_code(code)
    if box:
        center = db.get(Center, box.center_id)
        intake = db.get(Intake, box.intake_id) if box.intake_id else None
        campaign = db.get(Campaign, intake.campaign_id) if intake else None
        from app.models.product_type import ProductType
        pt = db.get(ProductType, box.product_type_id)

        events = list(
            db.execute(
                select(BoxEvent)
                .where(BoxEvent.box_id == box.id)
                .order_by(BoxEvent.ts.asc())
            ).scalars()
        )

        entrega = delivery_status.for_box(db, box.id)
        ficha = QrBoxFicha(
            code=box.code,
            status=box.status,
            display_name=pt.display_name if pt else "Desconocido",
            category=pt.category if pt else "OTHER",
            inn_name=pt.inn_name if pt else None,
            strength=pt.strength if pt else None,
            form=pt.form if pt else None,
            batch=box.batch,
            expiry_date=box.expiry_date,
            quantity=box.quantity,
            unit=box.unit,
            weight_kg=box.weight_kg,
            center_name=center.name if center else "Desconocido",
            campaign_name=campaign.name if campaign else None,
            sealed_at=box.sealed_at,
            created_at=box.created_at,
            events=[QrEventOut(from_status=e.from_status, to_status=e.to_status,
                               milestone=e.milestone, note=e.note, ts=e.ts) for e in events],
            delivered=entrega.delivered,
            delivered_at=entrega.delivered_at,
        )
        serialized = ficha.model_dump_json()
        cache.set(cache_key, serialized, ttl=_QR_TTL)
        return JSONResponse(
            content=json.loads(serialized),
            headers={"Cache-Control": f"public, max-age={_QR_TTL}, s-maxage={_QR_TTL}, stale-while-revalidate=300"},
        )

    # ── Try pallet ──
    pallet = PalletRepository(db).find_by_code(code)
    if pallet:
        center = db.get(Center, pallet.center_id)

        from app.models.box import Box
        from app.models.product_type import ProductType
        box_rows = list(
            db.execute(
                select(Box, ProductType)
                .join(ProductType, Box.product_type_id == ProductType.id)
                .where(Box.pallet_id == pallet.id)
                .order_by(Box.created_at.asc())
            ).all()
        )

        events = list(
            db.execute(
                select(PalletEvent)
                .where(PalletEvent.pallet_id == pallet.id)
                .order_by(PalletEvent.ts.asc())
            ).scalars()
        )

        total_weight: Decimal | None = None
        for b, _ in box_rows:
            if b.weight_kg is not None:
                total_weight = (total_weight or Decimal(0)) + b.weight_kg

        entrega = delivery_status.for_pallet(db, pallet.id)
        ficha = QrPalletFicha(
            code=pallet.code,
            status=pallet.status,
            center_name=center.name if center else "Desconocido",
            box_count=len(box_rows),
            total_weight_kg=total_weight,
            closed_at=pallet.closed_at,
            created_at=pallet.created_at,
            boxes=[
                QrPalletBoxRow(
                    display_name=pt.display_name,
                    category=pt.category,
                    quantity=b.quantity,
                    unit=b.unit,
                    weight_kg=b.weight_kg,
                )
                for b, pt in box_rows
            ],
            events=[QrEventOut(from_status=e.from_status, to_status=e.to_status,
                               milestone=e.milestone, note=e.note, ts=e.ts) for e in events],
            delivered=entrega.delivered,
            delivered_at=entrega.delivered_at,
        )
        serialized = ficha.model_dump_json()
        cache.set(cache_key, serialized, ttl=_QR_TTL)
        return JSONResponse(
            content=json.loads(serialized),
            headers={"Cache-Control": f"public, max-age={_QR_TTL}, s-maxage={_QR_TTL}, stale-while-revalidate=300"},
        )

    raise api_error("NOT_FOUND", "QR code not found", status_code=404)


# ── Public needs endpoint (no auth) ───────────────────────────────────────────

@router.get("/public/needs", response_model=PublicNeedsOut)
@limiter.limit("60/minute")
def public_needs(
    request: Request,
    db: Session = Depends(get_db),
):
    """Public read-only snapshot: what categories have sealed stock.

    No PII, no center names, no auth required.
    Cached in Redis; Cloudflare/Vercel CDN adds another cache layer via
    Cache-Control headers.
    """
    cache_key = "public:needs"
    cached = cache.get(cache_key)
    if cached:
        return JSONResponse(
            content=json.loads(cached),
            headers={"Cache-Control": f"public, max-age={_PUBLIC_TTL}, s-maxage={_PUBLIC_TTL}, stale-while-revalidate=60"},
        )

    repo = AggregateRepository(db)
    payload = PublicNeedsOut(by_category=repo.needed_by_category())
    serialized = payload.model_dump_json()
    cache.set(cache_key, serialized, ttl=_PUBLIC_TTL)
    return JSONResponse(
        content=json.loads(serialized),
        headers={"Cache-Control": f"public, max-age={_PUBLIC_TTL}, s-maxage={_PUBLIC_TTL}, stale-while-revalidate=60"},
    )


# ── Public campaigns (event landing pages) ────────────────────────────────────

@router.get("/public/campaigns", response_model=list[PublicCampaignListItemOut])
@limiter.limit("60/minute")
def public_campaigns(
    request: Request,
    db: Session = Depends(get_db),
):
    """Active, non-general campaigns — safe for public listing (sitemap, event links).

    No PII, no operational data. Feeds sitemap.xml and internal linking on the frontend.
    """
    cache_key = "public:campaigns"
    cached = cache.get(cache_key)
    if cached:
        return JSONResponse(
            content=json.loads(cached),
            headers={"Cache-Control": f"public, max-age={_PUBLIC_TTL}, s-maxage={_PUBLIC_TTL}, stale-while-revalidate=60"},
        )

    campaigns = CampaignRepository(db).find_public_active()
    payload = [
        PublicCampaignListItemOut(
            id=c.id, slug=c.slug, name=c.name, destination_country=c.destination_country
        )
        for c in campaigns
    ]
    serialized = json.dumps([p.model_dump() for p in payload])
    cache.set(cache_key, serialized, ttl=_PUBLIC_TTL)
    return JSONResponse(
        content=json.loads(serialized),
        headers={"Cache-Control": f"public, max-age={_PUBLIC_TTL}, s-maxage={_PUBLIC_TTL}, stale-while-revalidate=60"},
    )


@router.get("/public/campaigns/{slug}", response_model=PublicCampaignOut)
@limiter.limit("60/minute")
def public_campaign_detail(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    """Event landing page data: campaign context + what's needed for it.

    Only active, non-general campaigns are exposed — draft/inactive/general
    campaigns 404 here even if the slug exists.
    """
    cache_key = f"public:campaign:{slug}"
    cached = cache.get(cache_key)
    if cached:
        return JSONResponse(
            content=json.loads(cached),
            headers={"Cache-Control": f"public, max-age={_PUBLIC_TTL}, s-maxage={_PUBLIC_TTL}, stale-while-revalidate=60"},
        )

    campaign = CampaignRepository(db).find_by_slug(slug)
    if not campaign or not campaign.is_active or campaign.is_general:
        raise api_error("NOT_FOUND", "Campaign not found", status_code=404)

    repo = AggregateRepository(db)
    payload = PublicCampaignOut(
        slug=campaign.slug,
        name=campaign.name,
        description=campaign.description,
        destination_country=campaign.destination_country,
        start_date=campaign.start_date,
        end_date=campaign.end_date,
        by_category=repo.needed_by_category(campaign_id=campaign.id),
    )
    serialized = payload.model_dump_json()
    cache.set(cache_key, serialized, ttl=_PUBLIC_TTL)
    return JSONResponse(
        content=json.loads(serialized),
        headers={"Cache-Control": f"public, max-age={_PUBLIC_TTL}, s-maxage={_PUBLIC_TTL}, stale-while-revalidate=60"},
    )
