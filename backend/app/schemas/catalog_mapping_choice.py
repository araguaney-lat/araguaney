from pydantic import Field

from app.schemas._base import StrictModel, StrictUUID


class CatalogMappingChoiceIn(StrictModel):
    """Lo que el panel manda cuando alguien resuelve una sugerencia de mapeo:
    lo que se le mostró y lo que de verdad eligió, aceptara la sugerencia,
    la cambiara, o buscara/creara el producto por su cuenta."""

    free_text: str = Field(min_length=1, max_length=500)
    suggested_product_type_ids: list[StrictUUID] = Field(default_factory=list, max_length=3)
    chosen_product_type_id: StrictUUID
