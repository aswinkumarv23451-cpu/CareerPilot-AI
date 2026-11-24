from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.candidate import Candidate

router = APIRouter()


class CandidateCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    education: str | None = Field(default=None, max_length=200)
    skills: str | None = Field(default=None, max_length=500)
    experience: str | None = Field(default=None, max_length=200)
    interests: str | None = Field(default=None, max_length=300)
    preferred_location: str | None = Field(default=None, max_length=100)


@router.post("/")
def create_candidate(
    candidate: CandidateCreate,
    db: Session = Depends(get_db)
):
    new_candidate = Candidate(**candidate.model_dump())

    db.add(new_candidate)
    db.commit()
    db.refresh(new_candidate)

    return {
        "message": "Candidate created successfully",
        "candidate_id": {
            "id": new_candidate.id,
            "name": new_candidate.name
        }
    }


@router.get("/")
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found"
        )

    return candidate

@router.put("/{candidate_id}")
def update_candidate(
    candidate_id: int,
    candidate_data: CandidateCreate,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found"
        )

    for field, value in candidate_data.model_dump().items():
        setattr(candidate, field, value)

    db.commit()
    db.refresh(candidate)

    return {
        "message": "Candidate profile updated successfully",
        "candidate": candidate
    }