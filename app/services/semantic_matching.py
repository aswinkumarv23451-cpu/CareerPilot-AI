from functools import lru_cache
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


@lru_cache(maxsize=1)
def get_model():
    return SentenceTransformer("all-MiniLM-L6-v2")


def calculate_semantic_match(candidate_profile, job_description):
    model = get_model()

    embeddings = model.encode(
        [candidate_profile, job_description],
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    similarity = float(
        cosine_similarity(
            [embeddings[0]],
            [embeddings[1]]
        )[0][0]
    )

    return {
        "semantic_score": round(similarity * 100, 2)
    }