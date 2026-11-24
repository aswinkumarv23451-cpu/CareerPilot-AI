def calculate_match(candidate_skills,job_skills):
    candidate_set={
        skill.strip().lower() for skill in candidate_skills.split(',') if skill.strip()
    }
    job_set={
            skill.strip().lower() for skill in job_skills.split(',') if skill.strip()
        }
    if not job_set:
        return {
            'match_score':0,
            'matched_skills':[],
            'missing_skills':[]
        }

    matched=candidate_set.intersection(job_set)
    missing=job_set.difference(candidate_set)

    score=(len(matched)/len(job_set))*100

    return {            
            'match_score': round(score,2),
            'matched_skills':sorted(matched),
            'missing_skills':sorted(missing)
    }