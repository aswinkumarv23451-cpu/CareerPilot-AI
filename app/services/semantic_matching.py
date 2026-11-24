import re
import math
from collections import Counter


def tokenize(text):
    return re.findall(r"\b[a-zA-Z0-9+#.]+\b", text.lower())


def calculate_semantic_match(candidate_profile, job_description):
    documents = [
        tokenize(candidate_profile),
        tokenize(job_description)
    ]

    vocabulary = set(documents[0]) | set(documents[1])

    if not vocabulary:
        return {"semantic_score": 0.0}

    def tfidf(tokens):
        counts = Counter(tokens)
        total = len(tokens) or 1
        vector = {}

        for word in vocabulary:
            frequency = counts[word] / total
            document_frequency = sum(
                word in document for document in documents
            )
            inverse_frequency = math.log(
                1 + len(documents) / (1 + document_frequency)
            )
            vector[word] = frequency * inverse_frequency

        return vector

    first = tfidf(documents[0])
    second = tfidf(documents[1])

    dot_product = sum(
        first[word] * second[word] for word in vocabulary
    )

    magnitude_first = math.sqrt(sum(value ** 2 for value in first.values()))
    magnitude_second = math.sqrt(sum(value ** 2 for value in second.values()))

    if not magnitude_first or not magnitude_second:
        similarity = 0.0
    else:
        similarity = dot_product / (
            magnitude_first * magnitude_second
        )

    return {
        "semantic_score": round(similarity * 100, 2)
    }