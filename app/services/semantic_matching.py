from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model=SentenceTransformer('all-MiniLM-L6-v2')
def calculate_semantic_match(candidate_profile, job_description):
    embeddings=model.encode([
        candidate_profile,
        job_description
    ])
    
    similarity=cosine_similarity(
        [embeddings[0]],
        [embeddings[1]]
    )[0][0]

    return {
        'semantic_score':round(float(similarity)*100,2)
    }