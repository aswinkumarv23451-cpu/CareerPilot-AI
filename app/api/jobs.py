from fastapi import APIRouter,Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.job import Job

router=APIRouter()

class JobCreate(BaseModel):
    title:str
    company:str
    location:str|None=None
    required_skills:str|None=None
    experience:str|None=None
    job_type:str|None=None

@router.post("/")
def create_job(job: JobCreate,db:Session=Depends(get_db)):
    new_job=Job(**job.model_dump())

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    return {
        'message':'Job created successfully',
        'job':{
            'id':new_job.id,
            'title':new_job.title,
            'company':new_job.company
        }
    }

@router.get("/")
def get_jobs(db:Session=Depends(get_db)):
    jobs=db.query(Job).all()
    return jobs