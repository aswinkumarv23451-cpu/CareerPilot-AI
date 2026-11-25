from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.models.job import Job
from app.models.candidate import Candidate
from app.services.matching import calculate_match
from app.services.semantic_matching import calculate_semantic_match
from app.services.adzuna import search_adzuna_jobs

router = APIRouter()


class JobCreate(BaseModel):
    title: str = Field(min_length=2, max_length=150)
    company: str = Field(min_length=2, max_length=150)
    location: str | None = Field(default=None, max_length=150)
    required_skills: str | None = Field(default=None, max_length=500)
    experience: str | None = Field(default=None, max_length=100)
    job_type: str | None = Field(default=None, max_length=100)


@router.post("/")
def create_job(
    job: JobCreate,
    db: Session = Depends(get_db)
):
    new_job = Job(**job.model_dump())

    try:
        db.add(new_job)
        db.commit()
        db.refresh(new_job)

        return {
            "message": "Job created successfully",
            "job": {
                "id": new_job.id,
                "title": new_job.title,
                "company": new_job.company
            }
        }
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create job"
        )


@router.get("/")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(Job).order_by(Job.id.desc()).all()


@router.get("/recommendations/{candidate_id}")
def recommend_jobs(
    candidate_id: int,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail="Candidate profile not found"
        )

    jobs = db.query(Job).all()
    recommendations = []

    candidate_profile = (
    f"{candidate.education or ''} "
    f"{candidate.skills or ''} "
    f"{candidate.experience or ''} "
    f"{candidate.interests or ''} "
    f"{candidate.preferred_location or ''}"
)

    for job in jobs:
        match_result = calculate_match(
            candidate.skills or "",
            job.required_skills or ""
        )

        job_description = (
            f"{job.title} "
            f"{job.required_skills or ''} "
            f"{job.experience or ''} "
            f"{job.location or ''} "
            f"{job.job_type or ''}"
        )
        semantic_result = calculate_semantic_match(
            candidate_profile,
            job_description
        )

        semantic_score = semantic_result["semantic_score"]

        final_score = (
            0.6 * match_result["match_score"]
            + 0.4 * semantic_score
        )

        recommendations.append({
            "job_id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "job_type": job.job_type,
            "experience": job.experience,
            "required_skills": job.required_skills,
            "match_score": match_result["match_score"],
            "matched_skills": match_result["matched_skills"],
            "missing_skills": match_result["missing_skills"],
            "semantic_score": semantic_score,
            "final_score": round(final_score, 2)
        })

    recommendations.sort(
        key=lambda item: item["final_score"],
        reverse=True
    )

    return {
        "candidate": candidate.name,
        "total_jobs": len(recommendations),
        "recommendations": recommendations
    }


@router.get("/external/search")
def search_external_jobs(
    keyword: str = Query(..., min_length=2, max_length=100),
    location: str = Query(default="India", max_length=100),
    page: int = Query(default=1, ge=1, le=50),
    candidate_id: int = Query(..., ge=1),
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail="Candidate profile not found"
        )

    try:
        result = search_adzuna_jobs(
            keyword=keyword,
            location=location,
            page=page
        )

        candidate_profile = (
            f"{candidate.education or ''} "
            f"{candidate.skills or ''} "
            f"{candidate.experience or ''} "
            f"{candidate.interests or ''}"
        )

        jobs = result.get("jobs", [])

        for job in jobs:
            job_description = (
                f"{job.get('title', '')} "
                f"{job.get('description', '')} "
                f"{job.get('location', '')}"
            )

            similarity = calculate_semantic_match(
                candidate_profile,
                job_description
            )

            job["profile_similarity_score"] = similarity[
                "semantic_score"
            ]

        jobs.sort(
            key=lambda job: job["profile_similarity_score"],
            reverse=True
        )

        result["jobs"] = jobs
        result["candidate"] = candidate.name
        result["ranking_method"] = "TF-IDF text similarity"

        return result

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error)
        )