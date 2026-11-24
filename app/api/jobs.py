from fastapi import APIRouter, Depends, HTTPException
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


@router.get("/")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(Job).all()


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
            detail="Candidate not found"
        )

    jobs = db.query(Job).all()
    recommendations = []

    candidate_profile = (
        f"{candidate.education or ''} "
        f"{candidate.skills or ''} "
        f"{candidate.experience or ''} "
        f"{candidate.interests or ''}"
    )

    for job in jobs:
        result = calculate_match(
            candidate.skills or "",
            job.required_skills or ""
        )

        job_description = (
            f"{job.title} "
            f"{job.required_skills or ''} "
            f"{job.experience or ''} "
            f"{job.location or ''}"
        )

        semantic_result = calculate_semantic_match(
            candidate_profile,
            job_description
        )

        semantic_score = semantic_result["semantic_score"]

        final_score = (
            0.6 * result["match_score"]
            + 0.4 * semantic_score
        )

        recommendations.append({
            "job_id": job.id,
            "title": job.title,
            "company": job.company,
            'location':job.location,
            'job_type':job.job_type,
            'experience':job.experience,
            'required_skills':job.required_skills,
            "match_score": result["match_score"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
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
    keyword: str,
    location: str = "India",
    page: int = 1,
    candidate_id: int = 3,
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

        for job in result["jobs"]:
            job_description = (
                f"{job['title']} "
                f"{job['description']} "
                f"{job['location']}"
            )

            similarity = calculate_semantic_match(
                candidate_profile,
                job_description
            )

            job["profile_similarity_score"] = similarity[
                "semantic_score"
            ]

        result["jobs"].sort(
            key=lambda job: job["profile_similarity_score"],
            reverse=True
        )

        result["candidate"] = candidate.name
        result["ranking_method"] = "Semantic similarity"

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