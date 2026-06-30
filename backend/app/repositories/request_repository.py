import uuid
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.orm import Session, joinedload

from app.models.request import Request, RequestMessage

REQUEST_STATUSES = ("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED")


class RequestRepository:
    def __init__(self, db: Session):
        self._db = db

    def create(self, *, author_id: UUID, center_id: UUID | None, title: str, description: str) -> Request:
        req = Request(
            id=uuid.uuid4(),
            author_id=author_id,
            center_id=center_id,
            title=title,
            description=description,
            status="OPEN",
        )
        self._db.add(req)
        self._db.flush()
        return req

    def find_by_id(self, request_id: UUID) -> Request | None:
        return self._db.execute(
            select(Request).where(Request.id == request_id).options(joinedload(Request.messages))
        ).unique().scalar_one_or_none()

    def list(
        self,
        *,
        center_id: UUID | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Request]:
        conditions = []
        if center_id:
            conditions.append(Request.center_id == center_id)
        if status:
            conditions.append(Request.status == status)

        stmt = select(Request)
        if conditions:
            stmt = stmt.where(and_(*conditions))
        stmt = stmt.order_by(Request.created_at.desc()).limit(limit).offset(offset)
        return list(self._db.execute(stmt).scalars().all())

    def update_status(self, req: Request, status: str) -> Request:
        req.status = status
        self._db.flush()
        return req

    def add_message(self, *, request_id: UUID, author_id: UUID, body: str) -> RequestMessage:
        msg = RequestMessage(
            id=uuid.uuid4(),
            request_id=request_id,
            author_id=author_id,
            body=body,
        )
        self._db.add(msg)
        self._db.flush()
        return msg
