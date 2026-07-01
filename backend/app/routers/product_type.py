from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_national_admin
from app.models.user import User
from app.schemas.product_type import ProductTypeCreate, ProductTypeOut, ProductTypeUpdate
from app.services.product_type_service import ProductTypeService
from app.utils.open_food_facts import lookup_barcode
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/product-types", tags=["product-types"])


@router.get("", response_model=list[ProductTypeOut])
@limiter.limit("120/minute")
def list_product_types(
    request: Request,
    category: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ProductTypeService(db).get_all(category=category)


@router.get("/search", response_model=list[ProductTypeOut])
@limiter.limit("120/minute")
def search_product_types(
    request: Request,
    q: str,
    category: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ProductTypeService(db).search(q, category=category)


@router.get("/barcode/{gtin}")
@limiter.limit("30/minute")
async def lookup_by_barcode(
    request: Request,
    gtin: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Check local DB first, then fall back to Open Food Facts."""
    from app.repositories.product_type_repository import ProductTypeRepository
    local = ProductTypeRepository(db).find_by_gtin(gtin)
    if local:
        return {"source": "local", "product_type": ProductTypeOut.model_validate(local)}
    off = await lookup_barcode(gtin)
    return {"source": "open_food_facts", "prefill": off}


@router.get("/{pt_id}", response_model=ProductTypeOut)
@limiter.limit("120/minute")
def get_product_type(
    request: Request,
    pt_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ProductTypeService(db).get(pt_id)


@router.post("", response_model=ProductTypeOut, status_code=201)
@limiter.limit("30/minute")
def create_product_type(
    request: Request,
    data: ProductTypeCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    return ProductTypeService(db).create(data)


@router.patch("/{pt_id}", response_model=ProductTypeOut)
@limiter.limit("30/minute")
def update_product_type(
    request: Request,
    pt_id: UUID,
    data: ProductTypeUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    return ProductTypeService(db).update(pt_id, data)


@router.post("/{pt_id}/promote", response_model=ProductTypeOut)
@limiter.limit("30/minute")
def promote_product_type(
    request: Request,
    pt_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    """Promote a campaign-scoped ProductType to the global catalog (campaign_id → NULL)."""
    return ProductTypeService(db).promote(pt_id)
