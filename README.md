# CareerPilot AI 🚀

## AI-Powered Internship Matching & Career Assistant

**CareerPilot AI** is an AI-powered career assistance platform that helps candidates discover relevant job opportunities through hybrid skill-based and semantic matching. It also provides an interactive AI career assistant powered by Google Gemini.

### ✨ Key Features

- Candidate Profiles: Create and retrieve candidate career profiles.
- Job Management: Create and browse job listings.
- Hybrid Job Matching: Combines exact skill matching and semantic similarity.
- Explainable Recommendations: Displays matched skills, missing skills, and individual scores.
- AI Career Assistant: Uses Google Gemini to answer career-related questions.
- Tool Calling: Allows the AI assistant to retrieve candidate profiles and search jobs.
- Conversation Memory: Stores recent conversation history in SQLite for contextual follow-ups.
- Input Validation: Uses Pydantic to validate API requests.
- Automated Testing: Tests matching and semantic matching functionality.

### 🛠️ Tech Stack

Category| Technologies
Backend| Python, FastAPI
Database| SQLite, SQLAlchemy
AI / LLM| Google Gemini API
Semantic Search| Sentence Transformers
Machine Learning| Scikit-learn
Validation| Pydantic
Testing| Pytest

### 🧠 Hybrid Recommendation System

CareerPilot AI combines two matching approaches:

1. Skill Matching (60%) – Measures overlap between candidate skills and job requirements.
2. Semantic Similarity (40%) – Measures contextual similarity between candidate profiles and job descriptions using sentence embeddings.

Final ranking score:

"Final Score = (0.6 × Skill Match) + (0.4 × Semantic Similarity)"

Scores are ranking signals, not probabilities of getting hired.

### 🏗️ Project Structure

```
CareerPilot-AI/
├── app/
│   ├── api/
│   │   ├── jobs.py
│   │   ├── candidates.py
│   │   └── agent.py
│   ├── core/
│   │   └── database.py
│   ├── models/
│   │   ├── job.py
│   │   ├── candidate.py
│   │   └── conversation.py
│   ├── services/
│   │   ├── matching.py
│   │   ├── semantic_matching.py
│   │   ├── career_tools.py
│   │   └── agent.py
│   └── main.py
├── tests/
│   ├── test_matching.py
│   └── test_semantic_matching.py
├── data/
├── add_sample_jobs.py
├── requirements.txt
├── pytest.ini
├── .gitignore
└── README.md
```

### ⚙️ Installation & Setup

1. Clone the repository
```
      git clone https://github.com/aswinkumarv23451-cpu/CareerPilot-AI.git
      cd CareerPilot-AI
```
2. Create a virtual environment
```
      python -m venv .venv
```
Activate it on Windows:
```
      .venv\Scripts\activate
```
3. Install dependencies
```
      pip install -r requirements.txt
```
4. Configure the Gemini API key

Create a ".env" file in the project root:
```
      GEMINI_API_KEY=your_gemini_api_key
```
Never commit your API key.

5. Start the application
```
      uvicorn app.main:app --reload
```
Application URL: "http://127.0.0.1:8000"

Interactive API documentation: "http://127.0.0.1:8000/docs"

### 🔌 API Endpoints

|Method| Endpoint| Purpose|
|---|---|---|
GET| "/"| Welcome endpoint
GET| "/health"| Health check
POST| "/candidates/"| Create candidate
GET| "/candidates/?candidate_id=3"| Retrieve candidate
POST| "/jobs/"| Create job
GET| "/jobs/"| List jobs
GET| "/jobs/recommendations/{candidate_id}"| Get ranked recommendations
GET| "/agent/candidate/{candidate_id}"| Retrieve candidate through agent tools
GET| "/agent/search?keyword=Python"| Search jobs
POST| "/agent/chat"| Chat with AI assistant

### 🧪 Testing

Run automated tests:

     python -m pytest -v

The current test suite covers exact skill matching and semantic matching.

### 📊 Current Project Status

- Backend API implementation
- Candidate and job database models
- Hybrid recommendation engine
- Gemini-powered career assistant
- Tool calling and conversation history
- Input validation
- Automated matching tests

Sample job records are fictional demonstration data, not verified live vacancies.

### 🔮 Future Improvements

- Frontend dashboard
- Advanced job retrieval and filtering
- Recommendation evaluation metrics
- More comprehensive API integration tests
- Docker deployment
- Cloud database and hosting

### 👨‍💻 Author

ASWIN KUMAR V.

B.Tech – Artificial Intelligence and Data Science

[GitHub](https://github.com/aswinkumarv23451-cpu)

[LinkedIn](https://linkedin.com/in/aswin-kumar-v-740724426/)

---

Built to explore AI agents, semantic search, recommendation systems, and backend engineering.