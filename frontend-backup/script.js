const API_BASE = "http://127.0.0.1:8000";
const CANDIDATE_ID = 3;

// Safely display text returned by the API.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// API request helper
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

// Backend connection status
async function checkBackend() {
    const status = document.getElementById("connection-status");

    try {
        await apiRequest("/health");
        status.textContent = "Connected";
    } catch (error) {
        status.textContent = "Disconnected";
    }
}

// Load candidate profile
async function loadProfile() {
    const container = document.getElementById("profile-details");
    const status = document.getElementById("candidate-status");

    container.textContent = "Loading profile...";

    try {
        const candidate = await apiRequest(
            `/candidates/?candidate_id=${CANDIDATE_ID}`
        );

        container.innerHTML = `
            <p><strong>Name:</strong> ${escapeHTML(candidate.name)}</p>
            <p><strong>Education:</strong> ${escapeHTML(candidate.education || "Not provided")}</p>
            <p><strong>Skills:</strong> ${escapeHTML(candidate.skills || "Not provided")}</p>
            <p><strong>Experience:</strong> ${escapeHTML(candidate.experience || "Not provided")}</p>
            <p><strong>Interests:</strong> ${escapeHTML(candidate.interests || "Not provided")}</p>
            <p><strong>Preferred Location:</strong> ${escapeHTML(candidate.preferred_location || "Not provided")}</p>
        `;

        status.textContent = "Active";

    } catch (error) {
        container.textContent = error.message;
        status.textContent = "Unavailable";
    }
}

// Load available jobs
async function loadJobs() {
    const container = document.getElementById("jobs-list");
    const totalJobs = document.getElementById("total-jobs");

    container.textContent = "Loading recommendations...";

    try {
        const data = await apiRequest(
            `/jobs/recommendations/${CANDIDATE_ID}`
        );

        totalJobs.textContent = data.total_jobs;

        if (!data.recommendations.length) {
            container.innerHTML = `
                <div class="panel empty-state">
                    <h3>No recommendations yet</h3>
                    <p>Try adding more job listings.</p>
                </div>
            `;
            document.getElementById("top-match").textContent = "--";
            return;
        }

        const topScore = data.recommendations[0].final_score;
        document.getElementById("top-match").textContent = `${topScore}%`;

        container.innerHTML = data.recommendations.map(job => `
            <article class="job-card">
                <h3>${escapeHTML(job.title)}</h3>
                <p>${escapeHTML(job.company)}</p>
                <p>Skill match: ${job.match_score}%</p>
                <p>Semantic similarity: ${job.semantic_score}%</p>

                <div>
                    ${(job.matched_skills || []).map(skill =>
                        `<span class="skill-tag">${escapeHTML(skill)}</span>`
                    ).join("")}
                </div>

                <div class="job-score">
                    ${job.final_score}% overall ranking score
                </div>

                <p>Missing skills: ${escapeHTML(
                    (job.missing_skills || []).join(", ") || "None"
                )}</p>
            </article>
        `).join("");

    } catch (error) {
        container.textContent = error.message;
    }
}

// Add a chat message to the interface
function addMessage(role, message) {
    const container = document.getElementById("chat-messages");
    const element = document.createElement("div");

    element.className = role === "user"
        ? "user-message"
        : "assistant-message";

    if (role === "assistant") {
        const heading = document.createElement("strong");
        heading.textContent = "CareerPilot AI";
        element.appendChild(heading);
    }

    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    element.appendChild(paragraph);

    container.appendChild(element);
    container.scrollTop = container.scrollHeight;

    return element;
}

// Chat with Gemini through FastAPI
async function sendMessage(message) {
    const button = document.querySelector("#chat-form button");

    button.disabled = true;
    button.textContent = "Thinking...";

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
        addMessage("assistant", `Sorry, something went wrong: ${error.message}`);
    } finally {
        button.disabled = false;
        button.textContent = "Send ↗";
    }
}

// Event listeners
document.getElementById("load-profile")
    .addEventListener("click", loadProfile);

document.getElementById("load-jobs")
    .addEventListener("click", loadJobs);

document.getElementById("chat-form")
    .addEventListener("submit", async event => {
        event.preventDefault();

        const input = document.getElementById("chat-input");
        const message = input.value.trim();

        if (!message) return;

        addMessage("user", message);
        input.value = "";

        await sendMessage(message);
    });

// Initialize dashboard
checkBackend();
loadProfile();
loadJobs();

// Update the dashboard with the candidate's identity
async function updateCandidateIdentity() {
    try {
        const candidate = await apiRequest(
            `/candidates/?candidate_id=${CANDIDATE_ID}`
        );

        const name = candidate.name || "Candidate";

        document.querySelector(".user-info strong").textContent = name;
        document.querySelector(".avatar").textContent =
            name.charAt(0).toUpperCase();
    } catch (error) {
        console.error("Could not load candidate identity:", error);
    }
}

// Highlight the active navigation section
document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });
});

// Initialize candidate identity
updateCandidateIdentity();