import os
from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.services.career_tools import (
    get_candidate_profile,
    search_jobs
)

load_dotenv()

MODEL = "gemini-3.5-flash-lite"
FALLBACK_MODEL="gemini-3.1-flash-lite"


def run_career_agent(db, candidate_id: int, message: str, history=None):

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError("GEMINI_API_KEY is missing from .env")

    def get_my_candidate_profile() -> dict:
        """Retrieve the current candidate's career profile."""
        return get_candidate_profile(db, candidate_id)

    def search_jobs_tool(keyword: str) -> dict:
        """Search available jobs using a keyword."""
        return search_jobs(db, keyword)

    instructions = """
    You are CareerPilot AI, an intelligent career assistant.

    Help candidates find suitable internships and understand their skills.

    Use the candidate profile and job search tools when relevant.
    Never invent candidate information or job listings.
    Explain matching scores as estimates, not probabilities.
    Give clear and practical recommendations.
    Remember the previous conversation context.
    """

    contents = []

    for item in (history or []):
        role = "model" if item["role"] == "assistant" else item["role"]

        contents.append(
            types.Content(
                role=role,
                parts=[
                    types.Part.from_text(text=item["content"])
                ]
            )
        )

    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)]
        )
    )

    with genai.Client(api_key=api_key) as client:
        config = types.GenerateContentConfig(
            system_instruction=instructions,
            tools=[get_my_candidate_profile, search_jobs_tool],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                maximum_remote_calls=5
            )
        )

        try:
            response = client.models.generate_content(
                model=MODEL,
                contents=contents,
                config=config
            )

        except Exception as error:
            if getattr(error, "code", None) not in (429, 503):
                raise

            response = client.models.generate_content(
                model=FALLBACK_MODEL,
                contents=contents,
                config=config
    )

    return response.text or "I couldn't generate a response. Please try again."