from sqlalchemy import Integer, String, Column
from app.core.database import Base

class Candidate(Base):
    __tablename__='candidates'

    id=Column(Integer,primary_key=True,index=True)
    name=Column(String,nullable=False)
    education=Column(String)
    skills=Column(String)
    experience=Column(String)
    interests=Column(String)
    preferred_location=Column(String)