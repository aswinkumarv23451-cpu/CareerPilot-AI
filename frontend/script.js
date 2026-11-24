const API_BASE = "https://careerpilot-ai-1xey.onrender.com";
const CANDIDATE_ID = 3;

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
        throw new Error(error.detail || `API error: ${response.status}`);
    }

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

// CANDIDATE PROFILE
async function loadProfile() {
    const container = document.getElementById("profile-details");
    const status = document.getElementById("candidate-status");

    try {
        const candidate = await apiRequest(
            `/candidates/?candidate_id=${CANDIDATE_ID}`
        );

        const name = candidate.name || "Candidate";

        const nameElement = document.getElementById("profile-name");
        const educationElement = document.getElementById("profile-education");
        const locationElement = document.getElementById("profile-location");
        const avatarElement = document.getElementById("profile-avatar");

        if (nameElement) nameElement.textContent = name;

        if (educationElement) {
            educationElement.textContent =
                candidate.education || "Education not provided";
        }

        if (locationElement) {
            locationElement.textContent =
                candidate.preferred_location || "Location not provided";
        }

        if (avatarElement) {
            avatarElement.textContent = name.charAt(0).toUpperCase();
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

        if (status) status.textContent = "Active";

    } catch (error) {
        if (container) container.textContent = error.message;
        if (status) status.textContent = "Unavailable";
    }
}

// JOB RECOMMENDATIONS
async function loadJobs() {
    const container = document.getElementById("jobs-list");
    const totalJobs = document.getElementById("total-jobs");

    try {
        const data = await apiRequest(
            `/jobs/recommendations/${CANDIDATE_ID}`
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
                    <p>Check that your FastAPI backend is running.</p>
                </article>`;
        }

        const feedCount = document.getElementById("feed-count");
        if (feedCount) {
            feedCount.textContent = "Unable to load jobs";
        }
    }
}

// JOB SEARCH AND FILTERING
function getFilteredJobs() {
    const keyword = (
        document.getElementById("job-keyword")?.value ||
        document.getElementById("global-search")?.value ||
        ""
    ).trim().toLowerCase();

    const location = (
        document.getElementById("job-location")?.value || ""
    ).trim().toLowerCase();

    return allRecommendations.filter(job => {
        const searchable = [
            job.title,
            job.company,
            job.location,
            job.required_skills,
            ...(job.matched_skills || []),
            ...(job.missing_skills || [])
        ].join(" ").toLowerCase();

        const matchesKeyword =
            !keyword || searchable.includes(keyword);

        const matchesLocation =
            !location ||
            String(job.location || "").toLowerCase().includes(location);

        let matchesFilter = true;

        if (activeFilter === "remote") {
            matchesFilter =
                String(job.location || "").toLowerCase().includes("remote");
        } else if (activeFilter === "ai") {
            matchesFilter =
                /ai|machine learning|deep learning|nlp/.test(searchable);
        } else if (activeFilter === "backend") {
            matchesFilter =
                /backend|python|fastapi|api/.test(searchable);
        } else if (activeFilter === "data") {
            matchesFilter =
                /data|analyst|pandas|sql|analytics/.test(searchable);
        } else if (activeFilter === "frontend") {
            matchesFilter =
                /frontend|html|css|javascript|react/.test(searchable);
        }

        return matchesKeyword && matchesLocation && matchesFilter;
    });
}

// DISPLAY JOBS
function renderJobs() {
    const container = document.getElementById("jobs-list");
    if (!container) return;

    const jobs = getFilteredJobs();
    const savedJobs = getSavedJobs();

    const feedCount = document.getElementById("feed-count");

    if (feedCount) {
        feedCount.textContent =
            `${jobs.length} opportunities found`;
    }

    if (!jobs.length) {
        container.innerHTML = `
            <article class="card empty-state">
                <div class="empty-symbol">⌕</div>
                <h3>No matching opportunities</h3>
                <p>Try another keyword or filter.</p>
            </article>`;
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

        const score = Number(job.final_score || 0);
        const skillScore = Number(job.match_score || 0);
        const semanticScore = Number(job.semantic_score || 0);

        const isSaved = savedJobs.some(
            item => String(item.job_id) === String(job.job_id)
        );

        return `
            <article class="job-card">

                <div class="card-heading">
                    <span class="ai-label">DEMO LISTING</span>
                    <span class="job-score">
                        ${score.toFixed(2)}% AI ranking
                    </span>
                </div>

                <h3>${escapeHTML(job.title)}</h3>
                <p>${escapeHTML(job.company)}</p>

                <div class="job-meta">
                    <span>📍 ${escapeHTML(job.location || "Location not specified")}</span>
                    <span>💼 ${escapeHTML(job.job_type || "Not specified")}</span>
                    <span>🎯 ${escapeHTML(job.experience || "Not specified")}</span>
                </div>

                <p><strong>Matched skills</strong></p>

                <div class="job-skills">
                    ${matchedSkills || "No exact skill matches"}
                </div>

                <p>
                    <strong>Skills to improve:</strong>
                    ${missingSkills || "None"}
                </p>

                <div class="job-meta">
                    <span>Skill match: ${skillScore.toFixed(2)}%</span>
                    <span>Semantic similarity: ${semanticScore.toFixed(2)}%</span>
                </div>

                <div class="job-actions">
                    <span class="muted">
                        Sample data · Not a live vacancy
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

// CHAT MESSAGE DISPLAY
function addMessage(role, message) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    const element = document.createElement("div");

    element.className = role === "user"
        ? "user-message"
        : "assistant-message";

    if (role === "assistant") {
        const heading = document.createElement("strong");
        heading.textContent = "CareerPilot AI";
        element.appendChild(heading);

        const content = document.createElement("div");
        content.className = "message-content";

        if (
            typeof marked !== "undefined" &&
            typeof DOMPurify !== "undefined"
        ) {
            content.innerHTML = DOMPurify.sanitize(
                marked.parse(String(message ?? ""))
            );
        } else {
            content.textContent = String(message ?? "");
        }

        element.appendChild(content);

    } else {
        const paragraph = document.createElement("p");
        paragraph.textContent = message;
        element.appendChild(paragraph);
    }

    container.appendChild(element);
    container.scrollTop = container.scrollHeight;
}

// GEMINI AI CHAT
async function sendMessage(message) {
    const button = document.querySelector("#chat-form button");

    if (button) {
        button.disabled = true;
        button.textContent = "Thinking...";
    }

    try {
        const data = await apiRequest("/agent/chat", {
            method: "POST",
            body: JSON.stringify({
                candidate_id: CANDIDATE_ID,
                message: message
            })
        });

        addMessage("assistant", data.response);

    } catch (error) {
        addMessage(
            "assistant",
            `Something went wrong: ${error.message}`
        );

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Send ↗";
        }
    }
}

// EVENT LISTENERS

document.getElementById("load-profile")
    ?.addEventListener("click", loadProfile);

document.getElementById("load-jobs")
    ?.addEventListener("click", loadJobs);

document.getElementById("job-search-form")
    ?.addEventListener("submit", event => {
        event.preventDefault();
        renderJobs();
    });

document.getElementById("global-search")
    ?.addEventListener("input", renderJobs);

document.querySelectorAll(".filter-chip").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".filter-chip").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");
        activeFilter = button.dataset.filter || "all";

        renderJobs();
    });
});

document.getElementById("chat-form")
    ?.addEventListener("submit", async event => {
        event.preventDefault();

        const input = document.getElementById("chat-input");
        const message = input.value.trim();

        if (!message) return;

        addMessage("user", message);
        input.value = "";

        await sendMessage(message);
    });

// INITIALIZE CURRENT PAGE
checkBackend();

if (document.getElementById("profile-details")) {
    loadProfile();
}

if (document.getElementById("jobs-list")) {
    loadJobs();
}
/* PROFILE PAGE DATA */

async function loadProfilePage() {
    const profileName = document.getElementById("profile-name");

    if (!profileName || !document.getElementById("detail-name")) return;

    try {
        const response = await fetch(
            `${API_BASE}/candidates/?candidate_id=${CANDIDATE_ID}`
        );

        if (!response.ok) {
            throw new Error("Unable to load candidate profile");
        }

        const candidate = await response.json();

        document.getElementById("profile-avatar").textContent =
            (candidate.name || "A").charAt(0).toUpperCase();

        document.getElementById("profile-name").textContent =
            candidate.name || "Not provided";

        document.getElementById("profile-education").textContent =
            candidate.education || "Education not provided";

        document.getElementById("profile-location").textContent =
            candidate.preferred_location || "Location not provided";

        document.getElementById("detail-name").textContent =
            candidate.name || "—";

        document.getElementById("detail-education").textContent =
            candidate.education || "—";

        document.getElementById("detail-experience").textContent =
            candidate.experience || "—";

        document.getElementById("detail-location").textContent =
            candidate.preferred_location || "—";

        const skillsContainer = document.getElementById("profile-skills");
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

        document.getElementById("profile-interests").textContent =
            candidate.interests || "No interests added yet.";

    } catch (error) {
        profileName.textContent = "Unable to load profile";
        console.error("Profile loading error:", error);
    }
}

loadProfilePage();
/* SAVED JOBS MANAGEMENT */

function getSavedJobs() {
    try {
        return JSON.parse(localStorage.getItem("careerpilot_saved_jobs")) || [];
    } catch {
        return [];
    }
}

function saveJob(job) {
    const savedJobs = getSavedJobs();

    if (savedJobs.some(item => item.job_id === job.job_id)) {
        return false;
    }

    savedJobs.push(job);

    localStorage.setItem(
        "careerpilot_saved_jobs",
        JSON.stringify(savedJobs)
    );

    return true;
}

function removeSavedJob(jobId) {
    const updatedJobs = getSavedJobs().filter(
        job => String(job.job_id) !== String(jobId)
    );

    localStorage.setItem(
        "careerpilot_saved_jobs",
        JSON.stringify(updatedJobs)
    );

    renderSavedJobs();
}

function renderSavedJobs() {
    const container = document.getElementById("saved-jobs-list");

    if (!container) return;

    const jobs = getSavedJobs();
    const count = document.getElementById("saved-count");

    count.textContent = jobs.length;

    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="card saved-empty">
                <div class="saved-empty-icon">☆</div>
                <h3>No saved jobs yet</h3>
                <p>Explore opportunities and bookmark jobs to find them here.</p>
                <a href="jobs.html" class="primary-button">
                    Discover opportunities
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = jobs.map(job => `
        <article class="card saved-job-card">
            <div class="saved-job-info">
                <h3>${escapeHTML(job.title)}</h3>
                <p>${escapeHTML(job.company)}</p>
                <span>${escapeHTML(job.location || "Location not specified")}</span>
                <p class="saved-job-match">
                    Match score: ${escapeHTML(job.final_score ?? 0)}%
                </p>
            </div>

            <button
                class="remove-saved-button"
                data-remove-job="${escapeHTML(job.job_id)}"
                type="button">
                Remove
            </button>
        </article>
    `).join("");
}

document.addEventListener("click", event => {
    const removeButton = event.target.closest("[data-remove-job]");

    if (removeButton) {
        removeSavedJob(removeButton.dataset.removeJob);
    }
});

renderSavedJobs();
/* JOB BOOKMARK BUTTON */

document.addEventListener("click", event => {
    const button = event.target.closest("[data-save-job]");

    if (!button) return;

    const jobId = button.dataset.saveJob;

    const job = allRecommendations.find(
        item => String(item.job_id) === String(jobId)
    );

    if (!job) return;

    const savedJobs = getSavedJobs();

    const alreadySaved = savedJobs.some(
        item => String(item.job_id) === String(jobId)
    );

    if (alreadySaved) {
        removeSavedJob(jobId);
    } else {
        saveJob(job);
    }

    renderJobs();
});

/* APPLICATION TRACKER */

function getApplications() {
    try {
        return JSON.parse(
            localStorage.getItem("careerpilot_applications")
        ) || [];
    } catch {
        return [];
    }
}

function saveApplications(applications) {
    localStorage.setItem(
        "careerpilot_applications",
        JSON.stringify(applications)
    );
}

function renderApplications() {
    const container = document.getElementById("applications-list");

    if (!container) return;

    const applications = getApplications();
    const filter = document.getElementById("application-filter")?.value || "All";

    const filtered = filter === "All"
        ? applications
        : applications.filter(app => app.status === filter);

    document.getElementById("total-applications").textContent =
        applications.length;

    document.getElementById("applied-count").textContent =
        applications.filter(app => app.status === "Applied").length;

    document.getElementById("interview-count").textContent =
        applications.filter(app => app.status === "Interview").length;

    document.getElementById("offer-count").textContent =
        applications.filter(app => app.status === "Offer").length;

    if (!filtered.length) {
        container.innerHTML = `
            <div class="card saved-empty">
                <h3>No applications found</h3>
                <p>Add an application or select another status filter.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(app => `
        <article class="card application-item">

            <div class="application-info">
                <h3>${escapeHTML(app.title)}</h3>
                <p>${escapeHTML(app.company)}</p>
                <span>Applied on: ${escapeHTML(app.date)}</span>
            </div>

            <div class="application-controls">

                <select
                    class="application-status-select"
                    data-update-application="${escapeHTML(app.id)}">

                    ${["Applied", "Interview", "Offer", "Rejected", "Withdrawn"]
                        .map(status => `
                            <option value="${status}"
                                ${app.status === status ? "selected" : ""}>
                                ${status}
                            </option>
                        `).join("")}

                </select>

                <button
                    type="button"
                    class="remove-saved-button"
                    data-delete-application="${escapeHTML(app.id)}">
                    Delete
                </button>

            </div>

        </article>
    `).join("");
}

const applicationForm = document.getElementById("application-form");

applicationForm?.addEventListener("submit", event => {
    event.preventDefault();

    const title = document.getElementById("application-title").value.trim();
    const company = document.getElementById("application-company").value.trim();
    const date = document.getElementById("application-date").value;
    const status = document.getElementById("application-status").value;

    if (!title || !company || !date) return;

    const applications = getApplications();

    applications.unshift({
        id: crypto.randomUUID(),
        title,
        company,
        date,
        status
    });

    saveApplications(applications);
    applicationForm.reset();
    renderApplications();
});

document.getElementById("application-filter")?.addEventListener(
    "change",
    renderApplications
);

document.addEventListener("change", event => {
    const select = event.target.closest("[data-update-application]");

    if (!select) return;

    const applications = getApplications();

    const application = applications.find(
        app => app.id === select.dataset.updateApplication
    );

    if (!application) return;

    application.status = select.value;

    saveApplications(applications);
    renderApplications();
});

document.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-application]");

    if (!button) return;

    const updated = getApplications().filter(
        app => app.id !== button.dataset.deleteApplication
    );

    saveApplications(updated);
    renderApplications();
});

renderApplications();

/* ACTIVE NAVIGATION */

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

setActiveNavigation();

const profileEditForm = document.getElementById("profile-edit-form");

if (profileEditForm) {
    async function loadProfileForEditing() {
        const message = document.getElementById("profile-save-message");

        try {
            const response = await fetch(
                `${API_BASE}/candidates/?candidate_id=${CANDIDATE_ID}`
            );

            if (!response.ok) {
                throw new Error("Could not load profile");
            }

            const profile = await response.json();

            document.getElementById("edit-name").value = profile.name || "";
            document.getElementById("edit-education").value = profile.education || "";
            document.getElementById("edit-skills").value = profile.skills || "";
            document.getElementById("edit-experience").value = profile.experience || "";
            document.getElementById("edit-interests").value = profile.interests || "";
            document.getElementById("edit-location").value =
                profile.preferred_location || "";

        } catch (error) {
            message.textContent = error.message;
        }
    }

    profileEditForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const message = document.getElementById("profile-save-message");
        const formData = new FormData(profileEditForm);

        const updatedProfile = Object.fromEntries(formData.entries());

        message.textContent = "Saving...";

        try {
            const response = await fetch(
                `${API_BASE}/candidates/${CANDIDATE_ID}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(updatedProfile)
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || "Profile update failed");
            }

            message.textContent = "Profile updated successfully!";
            
            if (typeof loadProfilePage === "function") {
                await loadProfilePage();
            }

        } catch (error) {
            message.textContent = error.message;
        }
    });

    loadProfileForEditing();
}

let externalCurrentPage = 1;
let externalTotalPages = 1;

const externalJobForm = document.getElementById(
    "external-job-search-form"
);

if (externalJobForm) {
    const prevButton = document.getElementById("external-prev-page");
    const nextButton = document.getElementById("external-next-page");
    const pageNumber = document.getElementById("external-page-number");

    async function loadExternalJobs() {
        const keyword = document.getElementById(
            "external-job-keyword"
        ).value.trim();

        const location = document.getElementById(
            "external-job-location"
        ).value.trim() || "India";

        const status = document.getElementById("external-jobs-status");
        const container = document.getElementById("external-jobs-list");

        status.textContent = "Searching live opportunities...";
        container.innerHTML = "";

        try {
            const params = new URLSearchParams({
                keyword,
                location,
                page: String(externalCurrentPage),
                candidate_id: String(CANDIDATE_ID)
            });

            const response = await fetch(
                `${API_BASE}/jobs/external/search?${params}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Job search failed.");
            }

            const jobs = data.jobs || [];

            externalTotalPages = Math.min(
                10,
                Math.max(1, Math.ceil((data.total_results || 0) / 20))
            );

            pageNumber.textContent =
                `Page ${externalCurrentPage} of ${externalTotalPages}`;

            prevButton.disabled = externalCurrentPage <= 1;
            nextButton.disabled =
                externalCurrentPage >= externalTotalPages;

            if (jobs.length === 0) {
                status.textContent = "No matching jobs found.";
                return;
            }

            status.textContent =
                `${data.total_results || jobs.length} opportunities found · Showing ${jobs.length}`;

            container.innerHTML = jobs.map(job => {
                let safeUrl = "";

                try {
                    const parsed = new URL(job.application_url || "");

                    if (["https:", "http:"].includes(parsed.protocol)) {
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
                            <span class="eyebrow">LIVE OPPORTUNITY</span>
                            <span class="job-source-label">
                                ${score}% profile similarity
                            </span>
                        </div>

                        <h3>${escapeHTML(job.title)}</h3>

                        <p class="external-company">
                            ${escapeHTML(job.company)}
                        </p>

                        <p class="external-location">
                            📍 ${escapeHTML(job.location)}
                        </p>

                        <p class="external-description">
                            ${escapeHTML(description.slice(0, 280))}
                            ${description.length > 280 ? "..." : ""}
                        </p>

                        <div class="external-job-actions">
                            ${
                                safeUrl
                                ? `<a href="${safeUrl}"
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
            status.textContent = `Error: ${error.message}`;
            console.error("External job search:", error);
        }
    }

    externalJobForm.addEventListener("submit", event => {
        event.preventDefault();
        externalCurrentPage = 1;
        loadExternalJobs();
    });

    prevButton.addEventListener("click", async () => {
        if (externalCurrentPage > 1) {
            externalCurrentPage--;
            await loadExternalJobs();

        document.querySelector(".external-jobs-section")
            .scrollIntoView({ behavior: "smooth", block: "start" });
    }
});
    nextButton.addEventListener("click", async () => {
    if (externalCurrentPage < externalTotalPages) {
        externalCurrentPage++;
        await loadExternalJobs();

        document.querySelector(".external-jobs-section")
            .scrollIntoView({ behavior: "smooth", block: "start" });
    }
});
        

    loadExternalJobs();
}