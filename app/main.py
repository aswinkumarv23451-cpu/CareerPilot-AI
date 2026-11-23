from fastapi import FastAPI
from app.core.database import engine,Base
from app.models import job
from app.api.jobs import router as jobs_router
from app.models import candidate
from app.api.candidates import router as candidates_router

Base.metadata.create_all(bind=engine)

app=FastAPI(
    title='CareerPilot AI',
    description='AI-powered job matching and career assistant',
    version='1.0.0'
)
app.include_router(jobs_router, prefix='/jobs',tags=['Jobs'])
app.include_router(candidates_router, prefix='/candidates',tags=['Candidates'])

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