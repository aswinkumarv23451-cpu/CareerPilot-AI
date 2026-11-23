from sqlalchemy import Integer, String, Column
from app.core.database import Base

class Job(Base):
    __tablename__='jobs'

    id=Column(Integer,primary_key=True,index=True)
    title=Column(String,nullable=False)
    company=Column(String,nullable=False)
    location=Column(String)
    required_skills=Column(String)
    experience=Column(String)
    job_type=Column(String)