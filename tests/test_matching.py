from app.services.matching import calculate_match


def test_perfect_match():
    result = calculate_match(
        "Python, SQL, Java",
        "Python, SQL"
    )

    assert result["match_score"] == 100
    assert result["matched_skills"] == ["python", "sql"]
    assert result["missing_skills"] == []


def test_partial_match():
    result = calculate_match(
        "Python, SQL",
        "Python, Java"
    )

    assert result["match_score"] == 50
    assert result["matched_skills"] == ["python"]
    assert result["missing_skills"] == ["java"]


def test_empty_job_skills():
    result = calculate_match("Python, SQL", "")

    assert result["match_score"] == 0
    assert result["matched_skills"] == []
    assert result["missing_skills"] == []