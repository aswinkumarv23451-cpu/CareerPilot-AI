from app.core.database import SessionLocal
from app.models.job import Job

jobs = [
    {
        "title": "Machine Learning Intern",
        "company": "TechNova AI",
        "location": "Bengaluru",
        "required_skills": "Python, Machine Learning, SQL, Pandas, NumPy",
        "experience": "Beginner",
        "job_type": "Internship"
    },
    {
        "title": "Python Backend Intern",
        "company": "CodeWorks",
        "location": "Remote",
        "required_skills": "Python, FastAPI, SQL, REST API, Git",
        "experience": "Beginner",
        "job_type": "Internship"
    },
    {
        "title": "Data Analyst Intern",
        "company": "DataSphere",
        "location": "Chennai",
        "required_skills": "Python, SQL, Pandas, Excel, Power BI",
        "experience": "Beginner",
        "job_type": "Internship"
    },
    {
        "title": "Frontend Developer Intern",
        "company": "WebCraft",
        "location": "Remote",
        "required_skills": "HTML, CSS, JavaScript, React, Git",
        "experience": "Beginner",
        "job_type": "Internship"
    },
    {
        "title": "AI Engineer Intern",
        "company": "FutureAI",
        "location": "Bengaluru",
        "required_skills": "Python, Deep Learning, NLP, TensorFlow, Machine Learning",
        "experience": "Intermediate",
        "job_type": "Internship"
    }
]

db = SessionLocal()

try:
    for job_data in jobs:
        db.add(Job(**job_data))

    db.commit()
    print("Successfully added 5 sample jobs!")

finally:
    db.close()