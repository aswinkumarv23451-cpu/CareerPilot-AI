from app.services.semantic_matching import calculate_semantic_match


def test_semantic_match_returns_score():
    result = calculate_semantic_match(
        "Python developer with machine learning experience",
        "Python engineer working on machine learning projects"
    )

    assert "semantic_score" in result
    assert isinstance(result["semantic_score"], float)
    assert 0 <= result["semantic_score"] <= 100


def test_identical_text():
    text = "Python SQL machine learning"

    result = calculate_semantic_match(text, text)

    assert result["semantic_score"] > 99