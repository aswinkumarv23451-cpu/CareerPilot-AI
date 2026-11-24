from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel,Field
from google.genai.errors import APIError

from app.core.database import get_db
from app.services.career_tools import (
    get_candidate_profile,
    search_jobs
)
from app.services.agent import run_career_agent
from app.models.conversation import Conversation
from app.models.candidate import Candidate

router = APIRouter()


@router.get("/candidate/{candidate_id}")
def candidate_profile(
    candidate_id: int,
    db: Session = Depends(get_db)
):
    return get_candidate_profile(db, candidate_id)


@router.get("/search")
def job_search(
    keyword: str = "",
    db: Session = Depends(get_db)
):
    return search_jobs(db, keyword)


class AgentChatRequest(BaseModel):
    candidate_id: int = Field(gt=0)
    message: str = Field(min_length=2, max_length=2000)

@router.post("/chat")
def chat_with_agent(
    request: AgentChatRequest,
    db: Session = Depends(get_db)
):
    candidate = db.query(Candidate).filter(
        Candidate.id == request.candidate_id
    ).first()

    if candidate is None:
        raise HTTPException(
            status_code=404,
            detail="Candidate not found"
        )

    history_records = (
        db.query(Conversation)
        .filter(
            Conversation.candidate_id == request.candidate_id
        )
        .order_by(Conversation.id.desc())
        .limit(10)
        .all()
    )

    history_records.reverse()

    history = [
        {
            "role": item.role,
            "content": item.content
        }
        for item in history_records
    ]

    try:
        answer = run_career_agent(
            db,
            request.candidate_id,
            request.message,
            history
        )

        db.add(Conversation(
            candidate_id=request.candidate_id,
            role="user",
            content=request.message
        ))

        db.add(Conversation(
            candidate_id=request.candidate_id,
            role="assistant",
            content=answer
        ))

        db.commit()

        return {"response": answer}

    except APIError as error:
        db.rollback()

        status_code = getattr(error, "code", None)

        if status_code == 503:
            raise HTTPException(
                status_code=503,
                detail="AI Assistant is temporarily busy. Please try again shortly."
            )

        if status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="AI request limit reached. Please try again later."
            )

        raise HTTPException(
            status_code=502,
            detail="AI service is temporarily unavailable."
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Something went wrong while processing your message."
        )