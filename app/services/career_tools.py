from app.models.candidate import Candidate


def get_candidate_profile(db, candidate_id: int):

    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        return {
            "success": False,
            "message": "Candidate not found"
        }

    return {
        "success": True,
        "candidate": {
            "id": candidate.id,
            "name": candidate.name,
            "education": candidate.education,
            "skills": candidate.skills,
            "experience": candidate.experience,
            "interests": candidate.interests,
            "preferred_location": candidate.preferred_location
        }
    }

from app.models.job import Job


def search_jobs(db, keyword: str = ""):

    query = db.query(Job)

    if keyword:
        search_term = f"%{keyword}%"

        query = query.filter(
            (Job.title.ilike(search_term)) |
            (Job.required_skills.ilike(search_term)) |
            (Job.company.ilike(search_term))
        )

    jobs = query.all()

    return {
        "success": True,
        "total_jobs": len(jobs),
        "jobs": [
            {
                "id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "required_skills": job.required_skills,
                "job_type": job.job_type
            }
            for job in jobs
        ]
    }