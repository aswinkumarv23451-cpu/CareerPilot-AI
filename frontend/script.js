/* ==========================================
   CAREERPILOT AI — MAIN FRONTEND SCRIPT
   PART 1: API, PROFILE AND JOB RECOMMENDATIONS
========================================== */

const API_BASE = "https://careerpilot-ai-1xey.onrender.com";


const urlParams = new URLSearchParams(window.location.search);
const searchTerm = urlParams.get("search");

if (searchTerm) {
    const keywordInput = document.getElementById("job-keyword");

    if (keywordInput) {
        keywordInput.value = searchTerm;
    }
}
function getCandidateId() {
    return localStorage.getItem("careerpilot_candidate_id");
}

let allRecommendations = [];
let activeFilter = "all";

// HTML ESCAPING
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// API REQUEST
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
            error.detail || `API error: ${response.status}`
        );
    }

    if (response.status === 204) return null;

    return response.json();
}

// BACKEND CONNECTION
async function checkBackend() {
    const status = document.getElementById("connection-status");

    if (!status) return;

    try {
        await apiRequest("/health");
        status.textContent = "Connected";
    } catch {
        status.textContent = "Disconnected";
    }
}

// LOAD CANDIDATE PROFILE
async function loadProfile() {
    const container = document.getElementById("profile-details");
    const status = document.getElementById("candidate-status");
    const candidateId = getCandidateId();

    if (!candidateId) {
        if (container) {
            container.textContent = "Create your profile first.";
        }

        if (status) {
            status.textContent = "Profile not created";
        }

        return;
    }

    try {
        const candidate = await apiRequest(
            `/candidates/${encodeURIComponent(candidateId)}`
        );

        const name = candidate.name || "Candidate";

        const nameElement = document.getElementById("profile-name");
        const educationElement =
            document.getElementById("profile-education");
        const locationElement =
            document.getElementById("profile-location");
        const avatarElement =
            document.getElementById("profile-avatar");

        if (nameElement) {
            nameElement.textContent = name;
        }

        if (educationElement) {
            educationElement.textContent =
                candidate.education || "Education not provided";
        }

        if (locationElement) {
            locationElement.textContent =
                candidate.preferred_location || "Location not provided";
        }

        if (avatarElement) {
            avatarElement.textContent =
                name.charAt(0).toUpperCase();
        }

        if (container) {
            const skills = (candidate.skills || "")
                .split(",")
                .map(skill => skill.trim())
                .filter(Boolean);

            container.innerHTML = skills.length
                ? skills.map(skill =>
                    `<span class="skill-tag">${escapeHTML(skill)}</span>`
                  ).join("")
                : "<p>No skills added yet.</p>";
        }

        if (status) {
            status.textContent = "Active";
        }

    } catch (error) {
        if (container) {
            container.textContent = error.message;
        }

        if (status) {
            status.textContent = "Unavailable";
        }
    }
}

// LOAD JOB RECOMMENDATIONS
async function loadJobs() {
    const container = document.getElementById("jobs-list");
    const totalJobs = document.getElementById("total-jobs");
    const candidateId = getCandidateId();

    if (!candidateId) {
        if (container) {
            container.textContent =
                "Create your profile before viewing recommendations.";
        }

        return;
    }

    try {
        const data = await apiRequest(
            `/jobs/recommendations/${encodeURIComponent(candidateId)}`
        );

        allRecommendations = data.recommendations || [];

        if (totalJobs) {
            totalJobs.textContent =
                data.total_jobs ?? allRecommendations.length;
        }

        const topScore = allRecommendations.length
            ? Number(allRecommendations[0].final_score)
            : null;

        const topMatch = document.getElementById("top-match");

        if (topMatch) {
            topMatch.textContent = topScore === null
                ? "--"
                : `${topScore.toFixed(2)}%`;
        }

        renderJobs();

    } catch (error) {
        if (container) {
            container.innerHTML = `
                <article class="card empty-state">
                    <h3>Unable to load opportunities</h3>
                    <p>${escapeHTML(error.message)}</p>
                    <p>Please check your backend connection.</p>
                </article>
            `;
        }

        const feedCount = document.getElementById("feed-count");

        if (feedCount) {
            feedCount.textContent = "Unable to load jobs";
        }
    }
}
// GLOBAL SAVED JOBS AND APPLICATIONS
let savedJobsCache = [];
let applicationsCache = [];

function getSavedJobs() {
    return savedJobsCache;
}

function getApplications() {
    return applicationsCache;
}
// JOB SEARCH AND FILTERING
function getFilteredJobs() {
    const keyword = (
        document.getElementById("job-keyword")?.value || ""
    ).trim().toLowerCase();

    const location = (
        document.getElementById("job-location")?.value || ""
    ).trim().toLowerCase();

    const normalize = value =>
        Array.isArray(value)
            ? value.join(" ")
            : String(value || "");

    const terms = keyword.split(/[\s,]+/).filter(Boolean);

    return allRecommendations.filter(job => {
        const searchable = [
            job.title,
            job.company,
            job.location,
            job.job_type,
            job.experience,
            job.required_skills,
            job.skills,
            job.description,
            job.matched_skills,
            job.missing_skills
        ].map(normalize).join(" ").toLowerCase();

        const matchesKeyword = terms.every(term =>
            searchable.includes(term)
        );

        const matchesLocation = !location ||
            normalize(job.location).toLowerCase().includes(location);

        const filter = String(activeFilter || "all").toLowerCase();

        let matchesFilter = true;

        if (filter === "remote") {
            matchesFilter =
                /remote|work from home|wfh/i.test(searchable);

        } else if (filter === "internship") {
            matchesFilter =
                /intern|internship|trainee/i.test(searchable);

        } else if (filter === "ai") {
            matchesFilter =
                /artificial intelligence|\bai\b|machine learning|deep learning|\bnlp\b|computer vision|tensorflow|pytorch/i.test(searchable);

        } else if (filter === "backend") {
            matchesFilter =
                /backend|back-end|fastapi|django|flask|node\.?js|express|server|api|java|spring/i.test(searchable);

        } else if (filter === "data") {
            matchesFilter =
                /data science|data analyst|data analysis|analytics|pandas|numpy|sql|power bi|tableau/i.test(searchable);

        } else if (filter === "frontend") {
            matchesFilter =
                /frontend|front-end|html|css|javascript|react|angular|vue/i.test(searchable);
        }

        return matchesKeyword && matchesLocation && matchesFilter;
    });
}

// DISPLAY JOB RECOMMENDATIONS
function renderJobs() {
    const container = document.getElementById("jobs-list");

    if (!container) return;

    const jobs = getFilteredJobs();
    const savedJobs = getSavedJobs();

    const feedCount = document.getElementById("feed-count");
    const topMatch = document.getElementById("top-match");

    if (feedCount) {
        feedCount.textContent =
            `${jobs.length} opportunities found`;
    }

    // Update score using currently filtered jobs
    if (topMatch) {
        const highestScore = jobs.length
            ? Math.max(
                ...jobs.map(job =>
                    Number(job.final_score) || 0
                )
            )
            : null;

        topMatch.textContent =
            highestScore === null
                ? "--"
                : `${highestScore.toFixed(2)}%`;
    }

    if (!jobs.length) {
        container.innerHTML = `
            <article class="card empty-state">
                <div class="empty-symbol">⌕</div>
                <h3>No matching opportunities</h3>
                <p>Try another keyword, location or filter.</p>
            </article>
        `;
        return;
    }

    container.innerHTML = jobs.map(job => {
        const matchedSkills = (job.matched_skills || [])
            .map(skill =>
                `<span class="skill-tag">${escapeHTML(skill)}</span>`
            )
            .join("");

        const missingSkills = (job.missing_skills || [])
            .map(escapeHTML)
            .join(", ");

        const score = Number(job.final_score) || 0;
        const skillScore = Number(job.match_score) || 0;
        const textScore = Number(job.semantic_score) || 0;

        const isSaved = savedJobs.some(
            item => String(item.job_id) === String(job.job_id)
        );

        return `
            <article class="job-card">

                <div class="card-heading">
                    <span class="ai-label">DATABASE LISTING</span>
                    <span class="job-score">
                        ${score.toFixed(2)}% ranking
                    </span>
                </div>

                <h3>${escapeHTML(job.title)}</h3>
                <p>${escapeHTML(job.company)}</p>

                <div class="job-meta">
                    <span>📍 ${escapeHTML(
                        job.location || "Location not specified"
                    )}</span>

                    <span>💼 ${escapeHTML(
                        job.job_type || "Not specified"
                    )}</span>

                    <span>🎯 ${escapeHTML(
                        job.experience || "Not specified"
                    )}</span>
                </div>

                <p><strong>Matched skills</strong></p>

                <div class="job-skills">
                    ${matchedSkills || "No exact skill matches"}
                </div>

                <p>
                    <strong>Skills to improve:</strong>
                    ${missingSkills || "None identified"}
                </p>

                <div class="job-meta">
                    <span>Skill match: ${skillScore.toFixed(2)}%</span>
                    <span>Text similarity: ${textScore.toFixed(2)}%</span>
                </div>

                <div class="job-actions">
                    <span class="muted">
                        Check the original listing before applying.
                    </span>

                    <button
                        type="button"
                        class="save-job-button"
                        data-save-job="${escapeHTML(job.job_id)}">
                        ${isSaved ? "★ Saved" : "☆ Save job"}
                    </button>
                </div>

            </article>
        `;
    }).join("");
}



// LOAD SAVED JOBS FROM DATABASE
async function loadSavedJobs() {
    try {
        const candidateId = requireCandidateId();

        const result = await apiRequest(
            `/tracking/saved?candidate_id=${candidateId}`
        );

        savedJobsCache = result.saved_jobs || [];

        renderSavedJobs();
        renderJobs();

    } catch (error) {
        console.error("Saved jobs error:", error);
    }
}

// SAVE JOB TO DATABASE
async function saveJob(job) {
    try {
        const candidateId = requireCandidateId();

        await apiRequest("/tracking/saved", {
            method: "POST",
            body: JSON.stringify({
                candidate_id: Number(candidateId),
                job_id: job.job_id,
                title: job.title,
                company: job.company,
                location: job.location || null,
                source: "internal"
            })
        });

        await loadSavedJobs();

    } catch (error) {
        alert(error.message);
    }
}

// REMOVE SAVED JOB FROM DATABASE
async function removeSavedJob(savedJobId) {
    try {
        const candidateId = requireCandidateId();

        await apiRequest(
            `/tracking/saved/${savedJobId}?candidate_id=${candidateId}`,
            { method: "DELETE" }
        );

        await loadSavedJobs();

    } catch (error) {
        alert(error.message);
    }
}

// DISPLAY SAVED JOBS
function renderSavedJobs() {
    const savedCount = document.getElementById("saved-count");

    if (savedCount) {
        savedCount.textContent = savedJobsCache.length;
    }
    const container = document.getElementById("saved-jobs-list");

    if (!container) return;

    if (!savedJobsCache.length) {
        container.innerHTML = `
            <p class="empty-state">No saved jobs yet.</p>
        `;
        return;
    }

    container.innerHTML = savedJobsCache.map(job => `
        <div class="saved-job-card">
            <h3>${escapeHTML(job.title)}</h3>
            <p>${escapeHTML(job.company)}</p>
            <p>${escapeHTML(job.location || "Location not specified")}</p>

            <button
                type="button"
                data-remove-job="${job.id}">
                Remove
            </button>
        </div>
    `).join("");
}

// SAVE / UNSAVE BUTTON
document.addEventListener("click", async event => {
    const button = event.target.closest("[data-save-job]");

    if (!button) return;

    const jobId = button.dataset.saveJob;

    const job = allRecommendations.find(
        item => String(item.job_id) === String(jobId)
    );

    if (!job) return;

    const existing = savedJobsCache.find(
        item => String(item.job_id) === String(jobId)
    );

    if (existing) {
        await removeSavedJob(existing.id);
    } else {
        await saveJob(job);
    }
});

// REMOVE BUTTON
document.addEventListener("click", async event => {
    const button = event.target.closest("[data-remove-job]");

    if (!button) return;

    await removeSavedJob(button.dataset.removeJob);
});


/* ==========================================
   DATABASE-BASED APPLICATION TRACKER
========================================== */

// LOAD APPLICATIONS FROM DATABASE
async function loadApplications() {
    try {
        const candidateId = requireCandidateId();

        const result = await apiRequest(
            `/tracking/applications?candidate_id=${candidateId}`
        );

        applicationsCache = result.applications || [];

        renderApplications();

    } catch (error) {
        console.error("Applications error:", error);
    }
}

// DISPLAY APPLICATIONS
function renderApplications() {
    const container = document.getElementById("applications-list");

    if (!container) return;

    const filter =
        document.getElementById("application-filter")?.value || "All";

    const filtered = filter === "All"
        ? applicationsCache
        : applicationsCache.filter(app => app.status === filter);

    const total = applicationsCache.length;

    const applied = applicationsCache.filter(
        app => app.status === "Applied"
    ).length;

    const interviews = applicationsCache.filter(
        app => app.status === "Interview"
    ).length;

    const offers = applicationsCache.filter(
        app => app.status === "Offer"
    ).length;

    const totalElement = document.getElementById("total-applications");
    const appliedElement = document.getElementById("applied-count");
    const interviewElement = document.getElementById("interview-count");
    const offerElement = document.getElementById("offer-count");

    if (totalElement) totalElement.textContent = total;
    if (appliedElement) appliedElement.textContent = applied;
    if (interviewElement) interviewElement.textContent = interviews;
    if (offerElement) offerElement.textContent = offers;

    if (!filtered.length) {
        container.innerHTML = `
            <p class="empty-state">No applications found.</p>
        `;
        return;
    }

    container.innerHTML = filtered.map(app => {
        const date = app.applied_at
            ? new Date(app.applied_at).toLocaleDateString()
            : "Date unavailable";

        return `
            <div class="application-card">
                <h3>${escapeHTML(app.title)}</h3>
                <p>${escapeHTML(app.company)}</p>
                <p>Applied: ${escapeHTML(date)}</p>

                <select
                    data-update-application="${app.id}"
                    aria-label="Update application status">

                    ${["Applied", "Under Review", "Interview", "Offer",
                       "Selected", "Rejected", "Withdrawn"].map(status => `
                        <option
                            value="${status}"
                            ${app.status === status ? "selected" : ""}>
                            ${status}
                        </option>
                    `).join("")}

                </select>

                <button
                    type="button"
                    data-delete-application="${app.id}">
                    Delete
                </button>
            </div>
        `;
    }).join("");
}

// ADD APPLICATION
const applicationForm = document.getElementById("application-form");

applicationForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const title = document.getElementById("application-title")?.value.trim();
    const company = document.getElementById("application-company")?.value.trim();
    const date = document.getElementById("application-date")?.value;
    const status = document.getElementById("application-status")?.value;

    if (!title || !company || !date || !status) {
        alert("Please fill in all application details.");
        return;
    }

    try {
        const candidateId = requireCandidateId();

        await apiRequest("/tracking/applications", {
            method: "POST",
            body: JSON.stringify({
                candidate_id: Number(candidateId),
                title,
                company,
                status,
                applied_at: `${date}T12:00:00`
            })
        });

        applicationForm.reset();
        await loadApplications();

    } catch (error) {
        alert(error.message);
    }
});

// APPLICATION FILTER
document.getElementById("application-filter")
    ?.addEventListener("change", renderApplications);

// UPDATE APPLICATION STATUS
document.addEventListener("change", async event => {
    const select = event.target.closest("[data-update-application]");

    if (!select) return;

    try {
        const candidateId = requireCandidateId();

        await apiRequest(
            `/tracking/applications/${select.dataset.updateApplication}?candidate_id=${candidateId}`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    status: select.value
                })
            }
        );

        await loadApplications();

    } catch (error) {
        alert(error.message);
    }
});

// DELETE APPLICATION
document.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete-application]");

    if (!button) return;

    if (!confirm("Delete this application?")) return;

    try {
        const candidateId = requireCandidateId();

        await apiRequest(
            `/tracking/applications/${button.dataset.deleteApplication}?candidate_id=${candidateId}`,
            { method: "DELETE" }
        );

        await loadApplications();

    } catch (error) {
        alert(error.message);
    }
});
/* ==========================================
   PART 3: NAVIGATION, PROFILE EDITING,
   EXTERNAL JOB SEARCH AND INITIALIZATION
========================================== */

// ACTIVE NAVIGATION
function setActiveNavigation() {
    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    document.querySelectorAll(".top-nav-link").forEach(link => {
        const targetPage = link.getAttribute("href");

        if (targetPage === currentPage) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        } else {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
        }
    });
}

// LOAD PROFILE PAGE
async function loadProfilePage() {
    const profileName = document.getElementById("profile-name");
    const candidateId = getCandidateId();

    if (!candidateId) {
        if (profileName) {
            profileName.textContent = "Create your profile first";
        }
        return;
    }

    try {
        const candidate = await apiRequest(
            `/candidates/${encodeURIComponent(candidateId)}`
        );

        const name = candidate.name || "Not provided";

        const setText = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };

        setText("profile-name", name);
        setText("detail-name", name);
        setText("profile-education", candidate.education || "Education not provided");
        setText("detail-education", candidate.education || "—");
        setText("detail-experience", candidate.experience || "—");
        setText("profile-location", candidate.preferred_location || "Location not provided");
        setText("detail-location", candidate.preferred_location || "—");
        setText("profile-interests", candidate.interests || "No interests added yet.");

        setText(
            "profile-avatar",
            name.charAt(0).toUpperCase()
        );

        const skillsContainer =
            document.getElementById("profile-skills");

        if (skillsContainer) {
            skillsContainer.replaceChildren();

            (candidate.skills || "")
                .split(",")
                .map(skill => skill.trim())
                .filter(Boolean)
                .forEach(skill => {
                    const tag = document.createElement("span");
                    tag.className = "profile-skill-tag";
                    tag.textContent = skill;
                    skillsContainer.appendChild(tag);
                });

            if (!skillsContainer.children.length) {
                skillsContainer.textContent = "No skills added yet.";
            }
        }

        const detailSkills =
            document.getElementById("profile-details");

        if (detailSkills) {
            detailSkills.textContent = candidate.skills || "No skills added.";
        }

        console.log("Profile loaded successfully:", candidate);

    } catch (error) {
        if (profileName) {
            profileName.textContent = "Unable to load profile";
        }

        console.error("Profile loading error:", error);
    }
}
// PROFILE CREATE AND UPDATE
const profileEditForm =
    document.getElementById("profile-edit-form");

if (profileEditForm) {

    async function loadProfileForEditing() {
        const message = document.getElementById(
            "profile-save-message"
        );

        const candidateId = getCandidateId();

        if (!candidateId) {
            if (message) {
                message.textContent =
                    "Enter your details and save to create your profile.";
            }

            return;
        }

        try {
            const profile = await apiRequest(
                `/candidates/${encodeURIComponent(candidateId)}`
            );

            document.getElementById("edit-name").value =
                profile.name || "";

            document.getElementById("edit-education").value =
                profile.education || "";

            document.getElementById("edit-skills").value =
                profile.skills || "";

            document.getElementById("edit-experience").value =
                profile.experience || "";

            document.getElementById("edit-interests").value =
                profile.interests || "";

            document.getElementById("edit-location").value =
                profile.preferred_location || "";

        } catch (error) {
            if (message) {
                message.textContent = error.message;
            }
        }
    }

    profileEditForm.addEventListener("submit", async event => {
        event.preventDefault();

        const message = document.getElementById(
            "profile-save-message"
        );

        const formData = new FormData(profileEditForm);

        const profileData = Object.fromEntries(
            formData.entries()
        );

        if (!String(profileData.name || "").trim()) {
            message.textContent = "Please enter your name.";
            return;
        }

        message.textContent = "Saving profile...";

        try {
            const candidateId = getCandidateId();

            let result;

            if (candidateId) {
                result = await apiRequest(
                    `/candidates/${encodeURIComponent(candidateId)}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(profileData)
                    }
                );

            } else {
                result = await apiRequest("/candidates/", {
                    method: "POST",
                    body: JSON.stringify(profileData)
                });

                const newId = result.candidate.id;

                if (!newId) {
                    throw new Error(
                        "The server did not return a candidate ID."
                    );
                }

                localStorage.setItem(
                    "careerpilot_candidate_id",
                    String(newId)
                );
            }

            message.textContent =
                "Profile saved successfully.";

            await loadProfileForEditing();
            await loadProfilePage();
            await loadProfile();

        } catch (error) {
            message.textContent =
                `Save failed: ${error.message}`;
        }
    });

    loadProfileForEditing();
}

// EXTERNAL JOB SEARCH
let externalCurrentPage = 1;
let externalTotalPages = 1;

const externalJobForm = document.getElementById(
    "external-job-search-form"
);

if (externalJobForm) {
    const prevButton = document.getElementById(
        "external-prev-page"
    );

    const nextButton = document.getElementById(
        "external-next-page"
    );

    const pageNumber = document.getElementById(
        "external-page-number"
    );

    async function loadExternalJobs() {
        const keyword = document.getElementById(
            "external-job-keyword"
        )?.value.trim() || "";

        const location = document.getElementById(
            "external-job-location"
        )?.value.trim() || "India";

        const status = document.getElementById(
            "external-jobs-status"
        );

        const container = document.getElementById(
            "external-jobs-list"
        );

        if (!getCandidateId()) {
            status.textContent =
                "Create your profile before searching jobs.";

            container.replaceChildren();
            return;
        }

        status.textContent =
            "Searching live opportunities...";

        container.replaceChildren();

        try {
            const params = new URLSearchParams({
                keyword,
                location,
                page: String(externalCurrentPage),
                candidate_id: String(getCandidateId())
            });

            const data = await apiRequest(
                `/jobs/external/search?${params}`
            );

            const jobs = data.jobs || [];

            externalTotalPages = Math.min(
                10,
                Math.max(
                    1,
                    Math.ceil((data.total_results || 0) / 20)
                )
            );

            if (pageNumber) {
                pageNumber.textContent =
                    `Page ${externalCurrentPage} of ${externalTotalPages}`;
            }

            if (prevButton) {
                prevButton.disabled = externalCurrentPage <= 1;
            }

            if (nextButton) {
                nextButton.disabled =
                    externalCurrentPage >= externalTotalPages;
            }

            if (jobs.length === 0) {
                status.textContent = "No matching jobs found.";
                return;
            }

            status.textContent =
                `${data.total_results || jobs.length} opportunities found · Showing ${jobs.length}`;

            container.innerHTML = jobs.map(job => {
                let safeUrl = "";

                try {
                    const parsed = new URL(
                        job.application_url || ""
                    );

                    if (
                        parsed.protocol === "https:" ||
                        parsed.protocol === "http:"
                    ) {
                        safeUrl = escapeHTML(parsed.href);
                    }

                } catch {
                    safeUrl = "";
                }

                const score = Number(
                    job.profile_similarity_score || 0
                ).toFixed(1);

                const description = String(
                    job.description || ""
                );

                return `
                    <article class="card external-job-card">

                        <div class="external-job-top">
                            <span class="eyebrow">
                                EXTERNAL LISTING
                            </span>

                            <span class="job-source-label">
                                ${score}% profile similarity
                            </span>
                        </div>

                        <h3>${escapeHTML(job.title)}</h3>

                        <p class="external-company">
                            ${escapeHTML(job.company)}
                        </p>

                        <p class="external-location">
                            📍 ${escapeHTML(
                                job.location || "Location not specified"
                            )}
                        </p>

                        <p class="external-description">
                            ${escapeHTML(description.slice(0, 280))}
                            ${description.length > 280 ? "..." : ""}
                        </p>

                        <div class="external-job-actions">
                            ${
                                safeUrl
                                ? `<a
                                    href="${safeUrl}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="primary-button">
                                    View Original Job ↗
                                   </a>`
                                : "Application link unavailable"
                            }
                        </div>

                    </article>
                `;
            }).join("");

        } catch (error) {
            status.textContent =
                `Error: ${error.message}`;

            console.error(
                "External job search error:",
                error
            );
        }
    }
    // SEARCH LIVE JOBS
    externalJobForm.addEventListener("submit", event => {
        event.preventDefault();
        externalCurrentPage = 1;
        loadExternalJobs();
    });

    // LOAD LIVE JOBS WHEN PAGE OPENS
    loadExternalJobs();

// PREVIOUS PAGE
prevButton?.addEventListener("click", async () => {
    if (externalCurrentPage <= 1) return;

    externalCurrentPage--;

    await loadExternalJobs();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

// NEXT PAGE
nextButton?.addEventListener("click", async () => {
    if (externalCurrentPage >= externalTotalPages) return;

    externalCurrentPage++;

    await loadExternalJobs();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

}
// GENERAL EVENT LISTENERS

document.getElementById("load-profile")
    ?.addEventListener("click", loadProfile);


document.getElementById("job-search-form")
    ?.addEventListener("submit", event => {
        event.preventDefault();
        renderJobs();
    });

document.getElementById("global-search")?.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        const keyword = this.value.trim();

        if (!keyword) return;

        window.location.href =
            `jobs.html?search=${encodeURIComponent(keyword)}`;
    }
});

document.querySelectorAll(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".filter-chip")
            .forEach(item => item.classList.remove("active"));

        button.classList.add("active");

        activeFilter = button.dataset.filter || "all";

        renderJobs();
    });
});

// AI CHAT FORM
document.getElementById("chat-form")
    ?.addEventListener("submit", async event => {
        event.preventDefault();

        const input = document.getElementById("chat-input");

        if (!input) return;

        const message = input.value.trim();

        if (!message) return;

        addMessage("user", message);

        input.value = "";

        await sendMessage(message);
    });

// INITIALIZE APPLICATION
document.addEventListener("DOMContentLoaded", () => {
    checkBackend();
    loadSavedJobs();
    loadApplications();
    setActiveNavigation();

    if (document.getElementById("profile-details")) {
        loadProfile();
    }

    if (document.getElementById("jobs-list")) {
        loadJobs();
    }

    if (
        document.getElementById("profile-name") &&
        document.getElementById("detail-name")
    ) {
        loadProfilePage();
    }
});

// Also initialize when this script is loaded after DOMContentLoaded.
if (document.readyState !== "loading") {
    checkBackend();
    renderSavedJobs();
    renderApplications();
    setActiveNavigation();

    if (document.getElementById("profile-details")) {
        loadProfile();
    }

    if (
        document.getElementById("profile-name") &&
        document.getElementById("detail-name")
    ) {
        loadProfilePage();
    }
}

// CHAT MESSAGE DISPLAY
function addMessage(role, message) {
    const container = document.getElementById("chat-messages");

    if (!container) return;

    const element = document.createElement("div");

    element.className = role === "user"
        ? "user-message"
        : "assistant-message";

    if (role === "assistant" && typeof marked !== "undefined") {
        element.innerHTML = marked.parse(message);
    } else {
        element.textContent = message;
    }

    container.appendChild(element);
    container.scrollTop = container.scrollHeight;
}

// SEND MESSAGE TO AI ASSISTANT
async function sendMessage(message) {
    const button = document.querySelector("#chat-form button");
    const candidateId = getCandidateId();

    if (!candidateId) {
        addMessage("assistant", "Please create your profile before using the AI assistant.");
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Thinking...";
    }

    try {
        const response = await fetch(`${API_BASE}/agent/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                candidate_id: Number(candidateId),
                message: message
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || `API error: ${response.status}`);
        }

        addMessage(
            "assistant",
            data.response || "The assistant returned an empty response."
        );

    } catch (error) {
        addMessage("assistant", "Error: " + error.message);
        console.error("AI Assistant Error:", error);

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Send ↗";
        }
    }
}
if (document.getElementById("jobs-list")) {
    loadJobs();
}