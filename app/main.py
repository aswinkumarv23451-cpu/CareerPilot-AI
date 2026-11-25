from fastapi import FastAPI
from app.core.database import engine,Base
from app.models import job
from app.api.jobs import router as jobs_router
from app.models import candidate
from app.api.candidates import router as candidates_router
from app.api.agent import router as agent_router
from app.models import conversation
from fastapi.middleware.cors import CORSMiddleware
from app.models import saved_job
from app.models import application 
from app.api.tracking import router as tracking_router
import os

Base.metadata.create_all(bind=engine)

app=FastAPI(
    title='CareerPilot AI',
    description='AI-powered job matching and career assistant',
    version='1.0.0'
)
frontend_url = os.getenv(
    "FRONTEND_URL",
    "https://careerpilot-ai-aswin.netlify.app"
).rstrip("/")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://careerpilot-ai-aswin.netlify.app",
        frontend_url
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(jobs_router, prefix='/jobs',tags=['Jobs'])
app.include_router(candidates_router, prefix='/candidates',tags=['Candidates'])
app.include_router(agent_router,prefix='/agent',tags=['AI Agent Tools'])
app.include_router(
    tracking_router,
    prefix="/tracking",
    tags=["Job Tracking"]
)

@app.get('/')
def home():
    return {
        'message':'Welcome to CareerPilot AI!',
        'status':'running'
    }

@app.get('/health')
def health_check():
    return {
        'status':'healthy'
    }