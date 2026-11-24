import os
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from dotenv import load_dotenv

load_dotenv()

ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api"


def search_adzuna_jobs(
    keyword: str,
    location: str = "India",
    page: int = 1
):
    app_id = os.getenv("ADZUNA_APP_ID")
    app_key = os.getenv("ADZUNA_APP_KEY")

    if not app_id or not app_key:
        raise ValueError("Adzuna API credentials are missing")

    if not keyword.strip():
        raise ValueError("Search keyword is required")

    if page < 1 or page > 10:
        raise ValueError("Page must be between 1 and 10")

    params = {
        "app_id": app_id,
        "app_key": app_key,
        "results_per_page": 20,
        "what": keyword,
        "where": location,
        "content-type": "application/json"
    }

    url = (
        f"{ADZUNA_BASE_URL}/jobs/in/search/{page}?"
        f"{urlencode(params)}"
    )

    request = Request(
        url,
        headers={"Accept": "application/json"}
    )

    try:
        with urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))

    except HTTPError as error:
        raise RuntimeError(
            f"Adzuna API returned HTTP {error.code}"
        ) from None

    except URLError:
        raise RuntimeError(
            "Could not connect to Adzuna. Check your internet connection."
        ) from None

    jobs = []

    for item in data.get("results", []):
        company = item.get("company") or {}
        job_location = item.get("location") or {}

        jobs.append({
            "job_id": str(item.get("id", "")),
            "title": item.get("title", "Untitled"),
            "company": company.get("display_name", "Not specified"),
            "location": job_location.get(
                "display_name", "Not specified"
            ),
            "description": item.get("description", ""),
            "posted_at": item.get("created"),
            "application_url": item.get("redirect_url"),
            "salary_min": item.get("salary_min"),
            "salary_max": item.get("salary_max"),
            "source": "Adzuna"
        })

    return {
        "source": "Adzuna",
        "total_results": data.get("count", len(jobs)),
        "page": page,
        "jobs": jobs
    }