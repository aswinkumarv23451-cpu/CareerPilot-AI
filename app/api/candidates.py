from fastapi import APIRouter,Depends,HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.candidate import Candidate

router=APIRouter()

class CandidateCreate(BaseModel):
    name:str
    education:str|None=None
    skills:str|None=None
    experience:str|None=None
    interests:str|None=None
    preferred_location:str|None=None

@router.post("/")
def create_Candidate(candidate: CandidateCreate,db:Session=Depends(get_db)):
    new_candidate=Candidate(**candidate.model_dump())

    db.add(new_candidate)
    db.commit()
    db.refresh(new_candidate)

    return {
        'message':'Candidate created successfully',
        'candidate_id':{
            'id':new_candidate.id,
            'name':new_candidate.name
        }
    }

@router.get("/")
def get_candidate(
    candidate_id:int,
    db:Session=Depends(get_db)
    ):
    candidate=db.query(Candidate).filter(
        Candidate.id == candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail='Candidate not found'
        )
    return candidate