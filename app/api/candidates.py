from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, ConfigDict

from app.core.database import get_db
from app.models.candidate import Candidate

router = APIRouter()


# CREATE PROFILE
class CandidateCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    education: str | None = Field(default=None, max_length=200)
    skills: str | None = Field(default=None, max_length=500)
    experience: str | None = Field(default=None, max_length=200)
    interests: str | None = Field(default=None, max_length=300)
    preferred_location: str | None = Field(default=None, max_length=100)


# UPDATE PROFILE
class CandidateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    education: str | None = Field(default=None, max_length=200)
    skills: str | None = Field(default=None, max_length=500)
    experience: str | None = Field(default=None, max_length=200)
    interests: str | None = Field(default=None, max_length=300)
    preferred_location: str | None = Field(default=None, max_length=100)


# RESPONSE FORMAT
class CandidateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    education: str | None = None
    skills: str | None = None
    experience: str | None = None
    interests: str | None = None
    preferred_location: str | None = None


# CREATE A NEW CANDIDATE
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_candidate(
    candidate_data: CandidateCreate,
    db: Session = Depends(get_db)
):
    new_candidate = Candidate(**candidate_data.model_dump())

    db.add(new_candidate)
    db.commit()
    db.refresh(new_candidate)

    return {
        "message": "Profile created successfully",
        "candidate": CandidateResponse.model_validate(new_candidate)
    }


# GET CANDIDATE PROFILE
@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found"
        )

    return candidate


# UPDATE CANDIDATE PROFILE
@router.put("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: int,
    candidate_data: CandidateUpdate,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found"
        )

    updates = candidate_data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(candidate, field, value)

    db.commit()
    db.refresh(candidate)

    return candidate


# DELETE CANDIDATE PROFILE
@router.delete("/{candidate_id}")
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found"
        )

    db.delete(candidate)
    db.commit()

    return {"message": "Candidate profile deleted successfully"}