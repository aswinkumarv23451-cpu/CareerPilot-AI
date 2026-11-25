from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.saved_job import SavedJob
from app.models.application import Application
from app.models.candidate import Candidate

router = APIRouter()

ALLOWED_STATUSES = {
    "Applied",
    "Under Review",
    "Interview",
    "Offer",
    "Selected",
    "Rejected",
    "Withdrawn"
}


class SavedJobCreate(BaseModel):
    candidate_id: int = Field(gt=0)
    job_id: Optional[int] = None
    external_job_id: Optional[str] = Field(default=None, max_length=200)
    title: str = Field(min_length=2, max_length=200)
    company: str = Field(min_length=2, max_length=200)
    location: Optional[str] = None
    application_url: Optional[str] = None
    source: Optional[str] = None


class ApplicationCreate(BaseModel):
    candidate_id: int = Field(gt=0)
    job_id: Optional[int] = None
    external_job_id: Optional[str] = Field(default=None, max_length=200)
    title: str = Field(min_length=2, max_length=200)
    company: str = Field(min_length=2, max_length=200)
    location: Optional[str] = None
    application_url: Optional[str] = None
    status: str = Field(default="Applied", max_length=50)
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None


class ApplicationUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None


def verify_candidate(candidate_id: int, db: Session):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail="Candidate profile not found"
        )

    return candidate


@router.post("/saved")
def save_job(
    data: SavedJobCreate,
    db: Session = Depends(get_db)
):
    verify_candidate(data.candidate_id, db)

    if data.job_id is None and not data.external_job_id:
        raise HTTPException(
            status_code=400,
            detail="A job_id or external_job_id is required"
        )

    query = db.query(SavedJob).filter(
        SavedJob.candidate_id == data.candidate_id
    )

    if data.job_id is not None:
        query = query.filter(SavedJob.job_id == data.job_id)
    else:
        query = query.filter(
            SavedJob.external_job_id == data.external_job_id
        )

    existing = query.first()

    if existing:
        return {
            "message": "Job already saved",
            "saved_job_id": existing.id
        }

    saved = SavedJob(**data.model_dump())

    try:
        db.add(saved)
        db.commit()
        db.refresh(saved)

        return {
            "message": "Job saved successfully",
            "saved_job_id": saved.id
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save job"
        )


@router.get("/saved")
def get_saved_jobs(
    candidate_id: int = Query(gt=0),
    db: Session = Depends(get_db)
):
    verify_candidate(candidate_id, db)

    jobs = db.query(SavedJob).filter(
        SavedJob.candidate_id == candidate_id
    ).order_by(SavedJob.saved_at.desc()).all()

    return {
        "total": len(jobs),
        "saved_jobs": jobs
    }


@router.delete("/saved/{saved_job_id}")
def remove_saved_job(
    saved_job_id: int,
    candidate_id: int = Query(gt=0),
    db: Session = Depends(get_db)
):
    saved = db.query(SavedJob).filter(
        SavedJob.id == saved_job_id,
        SavedJob.candidate_id == candidate_id
    ).first()

    if saved is None:
        raise HTTPException(
            status_code=404,
            detail="Saved job not found"
        )

    db.delete(saved)
    db.commit()

    return {"message": "Saved job removed successfully"}


@router.post("/applications")
def create_application(
    data: ApplicationCreate,
    db: Session = Depends(get_db)
):
    verify_candidate(data.candidate_id, db)

    if data.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid application status"
        )

    application = Application(
        **data.model_dump(exclude_none=True)
    )

    try:
        db.add(application)
        db.commit()
        db.refresh(application)

        return {
            "message": "Application recorded successfully",
            "application_id": application.id
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to record application"
        )


@router.get("/applications")
def get_applications(
    candidate_id: int = Query(gt=0),
    db: Session = Depends(get_db)
):
    verify_candidate(candidate_id, db)

    applications = db.query(Application).filter(
        Application.candidate_id == candidate_id
    ).order_by(Application.applied_at.desc()).all()

    return {
        "total": len(applications),
        "applications": applications
    }


@router.patch("/applications/{application_id}")
def update_application(
    application_id: int,
    data: ApplicationUpdate,
    candidate_id: int = Query(gt=0),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.candidate_id == candidate_id
    ).first()

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    updates = data.model_dump(exclude_unset=True)

    if "status" in updates and updates["status"] is not None:
        if updates["status"] not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid application status"
            )

    for field, value in updates.items():
        setattr(application, field, value)

    try:
        db.commit()
        db.refresh(application)

        return {
            "message": "Application updated successfully",
            "application": application
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update application"
        )


@router.delete("/applications/{application_id}")
def delete_application(
    application_id: int,
    candidate_id: int = Query(gt=0),
    db: Session = Depends(get_db)
):
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.candidate_id == candidate_id
    ).first()

    if application is None:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    db.delete(application)
    db.commit()

    return {"message": "Application deleted successfully"}