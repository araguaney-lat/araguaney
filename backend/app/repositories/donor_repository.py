from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.donor import Donor
from app.repositories.base import BaseRepository
from app.schemas.donor import DonorInput
from app.utils.errors import api_error

_MIN_QUERY = 2
_SEARCH_LIMIT = 10


class DonorRepository(BaseRepository):
    """Acceso a la cartera de donantes capturada por los centros.

    Todo método recibe `center_id` y filtra por él. La cartera de donantes es la
    PII más sensible del sistema: un centro nunca ve ni enumera los donantes de
    otro, ni siquiera de forma indirecta.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def find_or_create(self, data: DonorInput, center_id: UUID) -> Donor:
        """Reutiliza el donante si ya existe en este centro; si no, lo crea.

        El email es la llave de reuso. Sin email no hay deduplicación posible,
        así que cada captura anónima-pero-identificada es una entrada nueva:
        preferible a fusionar por nombre, que juntaría a dos personas distintas.
        """
        if data.email:
            existing = self.db.execute(
                select(Donor).where(
                    Donor.email == data.email,
                    Donor.center_id == center_id,
                    Donor.source == "center",
                )
            ).scalar_one_or_none()
            if existing is not None:
                self._update(existing, data)
                return existing

        donor = Donor(
            donor_type=data.donor_type,
            source="center",
            center_id=center_id,
            first_name=data.first_name,
            last_name=data.last_name,
            legal_name=data.legal_name,
            email=data.email,
            phone=data.phone,
        )
        self.db.add(donor)
        return donor

    def find_or_create_self(self, data: DonorInput) -> Donor:
        """Donante de autoservicio (Fase 18). Sin centro: el email es su identidad.

        A diferencia del capturado por un centro, aquí el email es obligatorio y
        único a nivel global, así que la misma persona reutiliza su registro
        entre donaciones.
        """
        existing = self.db.execute(
            select(Donor).where(Donor.email == data.email, Donor.source == "self")
        ).scalar_one_or_none()
        if existing is not None:
            self._update(existing, data)
            return existing

        donor = Donor(
            donor_type=data.donor_type,
            source="self",
            center_id=None,
            first_name=data.first_name,
            last_name=data.last_name,
            legal_name=data.legal_name,
            email=data.email,
            phone=data.phone,
        )
        self.db.add(donor)
        return donor

    def search(self, q: str, center_id: UUID) -> list[Donor]:
        """Autocompletado sobre los donantes del propio centro."""
        q = (q or "").strip()
        if len(q) < _MIN_QUERY:
            raise api_error(
                "QUERY_TOO_SHORT",
                f"La búsqueda requiere al menos {_MIN_QUERY} caracteres",
                field="q",
            )

        pattern = f"%{q}%"
        stmt = (
            select(Donor)
            .where(
                Donor.center_id == center_id,
                Donor.source == "center",
                or_(
                    Donor.email.ilike(pattern),
                    Donor.first_name.ilike(pattern),
                    Donor.last_name.ilike(pattern),
                    Donor.legal_name.ilike(pattern),
                ),
            )
            .order_by(Donor.created_at.desc())
            .limit(_SEARCH_LIMIT)
        )
        return list(self.db.execute(stmt).scalars().all())

    def find_by_id(self, donor_id: UUID, center_id: UUID | None) -> Donor | None:
        """`center_id=None` solo para national_admin, que ve todos los centros."""
        stmt = select(Donor).where(Donor.id == donor_id)
        if center_id is not None:
            stmt = stmt.where(Donor.center_id == center_id)
        return self.db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def _update(donor: Donor, data: DonorInput) -> None:
        """Los datos más recientes ganan: quien captura tiene al donante enfrente."""
        donor.donor_type = data.donor_type
        donor.first_name = data.first_name
        donor.last_name = data.last_name
        donor.legal_name = data.legal_name
        if data.phone:
            donor.phone = data.phone
