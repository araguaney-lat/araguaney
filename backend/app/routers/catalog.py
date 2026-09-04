import json
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_center_role
from app.models.user import User
from app.repositories.product_type_repository import ProductTypeRepository
from app.repositories.user_campaign_repository import UserCampaignRepository
from app.schemas.catalog_mapping_choice import CatalogMappingChoiceIn
from app.schemas.product_type import BarcodePrefill, BarcodeResult, ProductTypeOut, RxNormSuggestion
from app.services.catalog_learning_service import CatalogLearningService
from app.utils import cache
from app.utils.errors import api_error
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/catalog", tags=["catalog"])

_BARCODE_TTL = 86_400  # 24 h
_RXNORM_TTL = 3_600   # 1 h


@router.get("/search", response_model=list[ProductTypeOut])
@limiter.limit("120/minute")
def catalog_search(
    request: Request,
    q: str = "",
    campaign_id: UUID | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    """Search local catalog (global products + campaign-scoped products).

    When campaign_id is supplied, validates that the current user belongs to
    that campaign before returning scoped results.
    """
    if campaign_id is not None:
        if not UserCampaignRepository(db).is_member(current_user.id, campaign_id):
            raise api_error("FORBIDDEN", "You are not a member of this campaign", status_code=403)
        campaign_ids: list[UUID] | None = [campaign_id]
    else:
        campaign_ids = None

    results = ProductTypeRepository(db).search(q, category=category, campaign_ids=campaign_ids)
    return results


@router.get("/barcode/{gtin}", response_model=BarcodeResult)
@limiter.limit("30/minute")
async def barcode_lookup(
    request: Request,
    gtin: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_center_role),
):
    """Look up a barcode: local DB first, then Open Food Facts with 24-hour Redis cache."""
    from app.utils.gtin import validate as validate_gtin, normalize as normalize_gtin

    gtin = normalize_gtin(gtin)
    if not validate_gtin(gtin):
        raise api_error("INVALID_GTIN", "GTIN must be a valid EAN-8, UPC-A, or EAN-13", field="gtin", status_code=422)

    # 1. Local match — no internet needed
    local = ProductTypeRepository(db).find_by_gtin(gtin)
    if local:
        return BarcodeResult(
            source="local",
            product_type=ProductTypeOut.model_validate(local),
        )

    # 2. Redis cache
    cache_key = f"catalog:barcode:{gtin}"
    cached = cache.get(cache_key)
    if cached is not None:
        data = json.loads(cached)
        if data is None:
            raise api_error("BARCODE_NOT_FOUND", "Barcode not found", status_code=404)
        return BarcodeResult(source="open_food_facts", prefill=BarcodePrefill(**data))

    # 3. Open Food Facts
    import httpx
    from app.utils.open_food_facts import lookup_barcode

    try:
        result = await lookup_barcode(gtin)
    except httpx.HTTPError as exc:
        raise api_error(
            "EXTERNAL_SERVICE_UNAVAILABLE",
            "Open Food Facts is unreachable — try again later",
            status_code=503,
        ) from exc

    # Cache both hits and confirmed misses to avoid hammering OFF
    cache.set(cache_key, json.dumps(result), ttl=_BARCODE_TTL)

    if result is None:
        raise api_error("BARCODE_NOT_FOUND", "Barcode not found in local catalog or Open Food Facts", status_code=404)

    return BarcodeResult(source="open_food_facts", prefill=BarcodePrefill(**result))


@router.get("/rxnorm", response_model=list[RxNormSuggestion])
@limiter.limit("60/minute")
async def rxnorm_search(
    request: Request,
    q: str,
    _: User = Depends(require_center_role),
):
    """INN autocomplete via NLM RxNorm (no API key). Cached 1 h in Redis."""
    if len(q.strip()) < 2:
        raise api_error("QUERY_TOO_SHORT", "Query must be at least 2 characters", field="q", status_code=422)

    cache_key = f"catalog:rxnorm:{q.lower().strip()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return json.loads(cached)

    import httpx
    from app.utils.rxnorm import search_inn

    try:
        results = await search_inn(q.strip())
    except httpx.HTTPError as exc:
        raise api_error(
            "EXTERNAL_SERVICE_UNAVAILABLE",
            "RxNorm is unreachable — try again later",
            status_code=503,
        ) from exc

    cache.set(cache_key, json.dumps(results), ttl=_RXNORM_TTL)
    return results


@router.post("/mapping-choices", status_code=204)
@limiter.limit("60/minute")
def record_mapping_choice(
    request: Request,
    data: CatalogMappingChoiceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    """El panel llama esto cuando alguien resuelve una sugerencia de mapeo de
    texto libre — la aceptó, la cambió, o buscó/creó el producto por su
    cuenta. Es la única forma de que exista un conjunto de evaluación con
    datos reales (Fase 23, task 8) en vez de casos escritos a mano."""
    CatalogLearningService(db).record_mapping_choice(
        data, user_id=current_user.id, center_id=current_user.center_id
    )
