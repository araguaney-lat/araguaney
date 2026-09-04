"""Registra las elecciones reales de mapeo de texto libre (Fase 23, task 8).

Sin esto no hay forma de construir el conjunto de ~100 casos reales que pide
la fase: hoy ninguna tabla liga el texto que escribe quien dona con el
producto que una coordinación termina eligiendo. Este servicio no decide
nada — solo acumula el par (texto, producto elegido) para que
`evals/run.py` algún día mida con datos de verdad en vez de casos escritos
a mano.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.product_mapping_choice import ProductMappingChoice
from app.schemas.catalog_mapping_choice import CatalogMappingChoiceIn


class CatalogLearningService:

    def __init__(self, db: Session) -> None:
        self.db = db

    def record_mapping_choice(
        self,
        data: CatalogMappingChoiceIn,
        user_id: UUID | None,
        center_id: UUID | None,
    ) -> None:
        self.db.add(ProductMappingChoice(
            free_text=data.free_text,
            suggested_product_type_ids=[str(i) for i in data.suggested_product_type_ids],
            chosen_product_type_id=data.chosen_product_type_id,
            user_id=user_id,
            center_id=center_id,
        ))
        self.db.commit()
