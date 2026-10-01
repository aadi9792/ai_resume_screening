let applicants = [];
let aiFilterActive = false;
let aiShortlistThreshold = 70;

/* =====================================
   LOAD APPLICANTS
===================================== */

async function loadApplicants() {
    try {
        const response = await fetch("http://localhost:5000/api/applicants");

        if (!response.ok) {
            throw new Error("Failed to fetch applicants");
        }

        const data = await response.json();
        applicants = data.applicants || [];

        updateStatistics();
        populateRoles();
        filterApplicants();

    } catch (error) {
        console.error("Error loading applicants:", error);

        document.getElementById("candidateTable").innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    Failed to load candidates.
                    Make sure the backend is running on port 5000.
                </td>
            </tr>
        `;
    }
}

/* =====================================
   STATISTICS
===================================== */

function updateStatistics() {
    document.getElementById("totalApplicants").textContent = applicants.length;

    const roles = [
        ...new Set(
            applicants
                .map(app => app.role)
                .filter(Boolean)
        )
    ];

    document.getElementById("totalRoles").textContent = roles.length;

    const shortlisted = applicants.filter(
        app => app.status === "Shortlisted"
    ).length;

    document.getElementById("shortlisted").textContent = shortlisted;

    const screened = applicants.filter(
        app => app.analyzedAt
    ).length;

    document.getElementById("aiScreened").textContent = screened;

    // AI Recommended candidates (Score >= 70)
    const aiRecommended = applicants.filter(
        app => (Number(app.matchScore) || 0) >= 70
    ).length;

    const badge = document.getElementById("aiShortlistCountBadge");
    if (badge) {
        badge.textContent = `${aiRecommended} Ready`;
        badge.title = `${aiRecommended} candidate(s) meet the recommended 70%+ match threshold`;
    }
}

/* =====================================
   POPULATE ROLE FILTER
===================================== */

function populateRoles() {
    const roleFilter = document.getElementById("roleFilter");
    if (!roleFilter) return;

    const currentVal = roleFilter.value;
    roleFilter.innerHTML = `<option value="all">All Roles</option>`;

    const roles = [
        ...new Set(
            applicants
                .map(app => app.role)
                .filter(Boolean)
        )
    ];

    roles.forEach(role => {
        const option = document.createElement("option");
        option.value = role;
        option.textContent = role;
        roleFilter.appendChild(option);
    });

    if (roles.includes(currentVal)) {
        roleFilter.value = currentVal;
    }
}

/* =====================================
   RENDER APPLICANTS
===================================== */

function renderApplicants(list) {
    const table = document.getElementById("candidateTable");
    table.innerHTML = "";

    if (list.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="loading">
                    No candidates match the current filters.
                </td>
            </tr>
        `;
        return;
    }

    list.forEach(applicant => {
        const row = document.createElement("tr");

        const initials = getInitials(applicant.name);
        const skills = applicant.skills || [];

        const skillHTML = skills
            .slice(0, 4)
            .map(skill => `<span class="skill">${escapeHTML(skill)}</span>`)
            .join("");

        const score = Number(applicant.matchScore) || 0;
        const isScreened = Boolean(applicant.analyzedAt);

        let matchClass = "low";
        if (score >= 70) {
            matchClass = "high";
        } else if (score >= 40) {
            matchClass = "medium";
        }

        const status = applicant.status || "Applied";
        const statusClass = status.toLowerCase().replace(/\s+/g, "-");

        const isShortlisted = status === "Shortlisted";
        const isRejected = status === "Rejected";

        const date = applicant.createdAt
            ? new Date(applicant.createdAt).toLocaleDateString()
            : "N/A";

        const resumeFile = applicant.resumeFile || "";

        // AI recommendation badge for high scores
        const aiPickBadge = (score >= 70 && isScreened)
            ? `<div class="ai-recommend-pill" title="AI recommends shortlisting based on ${score}% match score">
                   <span class="sparkle-icon">✨</span> AI Pick
               </div>`
            : "";

        // Quick status action buttons
        const shortlistBtnHTML = isShortlisted
            ? `<button class="quick-status-btn active-shortlist" data-action="set-status" data-status="Applied" data-id="${escapeHTML(applicant._id)}" title="Click to undo shortlist">
                   ✓ Shortlisted
               </button>`
            : `<button class="quick-status-btn ai-shortlist-action" data-action="set-status" data-status="Shortlisted" data-id="${escapeHTML(applicant._id)}" title="AI Quick Shortlist">
                   <span class="sparkle-icon">✨</span> Shortlist
               </button>`;

        const rejectBtnHTML = isRejected
            ? `<button class="quick-status-btn active-rejected" data-action="set-status" data-status="Applied" data-id="${escapeHTML(applicant._id)}" title="Click to reset">
                   Rejected
               </button>`
            : `<button class="quick-status-btn reject-action" data-action="set-status" data-status="Rejected" data-id="${escapeHTML(applicant._id)}" title="Reject candidate">
                   ✕
               </button>`;

        row.innerHTML = `
            <td>
                <div class="candidate-name">
                    <div class="candidate-avatar">
                        ${escapeHTML(initials)}
                    </div>
                    <div>
                        <strong>${escapeHTML(applicant.name || "Unknown")}</strong>
                        <small>${escapeHTML(applicant.email || "No email")}</small>
                    </div>
                </div>
            </td>

            <td>
                <strong>${escapeHTML(applicant.role || "N/A")}</strong>
            </td>

            <td>
                <div class="skills">
                    ${skillHTML || `<span class="skill">No skills</span>`}
                </div>
            </td>

            <td>
                <div class="status-cell-wrapper">
                    <span class="status ${statusClass}">
                        ${escapeHTML(status)}
                    </span>
                    ${aiPickBadge}
                </div>
            </td>

            <td>
                ${
                    isScreened
                        ? `<span class="match ${matchClass}">
                               ${score}%
                           </span>`
                        : `<span class="match unanalyzed" title="Pending AI analysis">—</span>`
                }
            </td>

            <td>${escapeHTML(date)}</td>

            <td>
                <div class="action-buttons-wrapper">
                    <div class="quick-status-group">
                        ${shortlistBtnHTML}
                        ${rejectBtnHTML}
                    </div>

                    <div class="secondary-actions-group">
                        <button
                            class="view-btn"
                            data-action="view"
                            data-id="${escapeHTML(applicant._id)}"
                            title="View full candidate profile & AI report">
                            View
                        </button>

                        <button
                            class="analyze-btn"
                            data-action="analyze"
                            data-id="${escapeHTML(applicant._id)}"
                            title="Run Gemini AI screening">
                            🤖 Analyze
                        </button>

                        <button
                            class="resume-btn"
                            data-action="resume"
                            data-file="${escapeHTML(resumeFile)}"
                            title="Open original resume PDF">
                            📄 Resume
                        </button>
                    </div>
                </div>
            </td>
        `;

        table.appendChild(row);
    });
}

/* =====================================
   UPDATE APPLICANT STATUS
===================================== */

async function updateApplicantStatus(id, newStatus) {
    const applicant = applicants.find(app => app._id === id);
    if (!applicant) return;

    const previousStatus = applicant.status;
    applicant.status = newStatus;

    updateStatistics();
    filterApplicants();

    try {
        const response = await fetch(`http://localhost:5000/api/applicants/${encodeURIComponent(id)}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || "Failed to update status");
        }

        console.log(`Updated applicant ${applicant.name} status to ${newStatus}`);

    } catch (error) {
        console.error("Status update error:", error);
        applicant.status = previousStatus;
        updateStatistics();
        filterApplicants();
        alert(`Could not update status: ${error.message}`);
    }
}

/* =====================================
   TABLE BUTTON EVENTS
===================================== */

document.getElementById("candidateTable").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    const file = button.dataset.file;
    const newStatus = button.dataset.status;

    if (action === "set-status") {
        updateApplicantStatus(id, newStatus);
        return;
    }

    if (action === "view") {
        viewCandidate(id);
        return;
    }

    if (action === "analyze") {
        analyzeResume(id, button);
        return;
    }

    if (action === "resume") {
        viewResume(file);
        return;
    }
});

/* =====================================
   SEARCH AND FILTERS
===================================== */

document.getElementById("searchInput").addEventListener("input", filterApplicants);
document.getElementById("roleFilter").addEventListener("change", filterApplicants);
document.getElementById("statusFilter").addEventListener("change", filterApplicants);

const aiFilterBtn = document.getElementById("aiFilterBtn");
if (aiFilterBtn) {
    aiFilterBtn.addEventListener("click", () => {
        aiFilterActive = !aiFilterActive;
        aiFilterBtn.classList.toggle("active", aiFilterActive);
        filterApplicants();
    });
}

function filterApplicants() {
    const search = document.getElementById("searchInput").value.toLowerCase().trim();
    const role = document.getElementById("roleFilter").value;
    const status = document.getElementById("statusFilter").value;

    const filtered = applicants.filter(applicant => {
        const name = (applicant.name || "").toLowerCase();
        const email = (applicant.email || "").toLowerCase();

        const matchesSearch = name.includes(search) || email.includes(search);
        const matchesRole = role === "all" || applicant.role === role;
        const matchesStatus = status === "all" || applicant.status === status;

        const score = Number(applicant.matchScore) || 0;
        const matchesAi = !aiFilterActive || (score >= 70 && Boolean(applicant.analyzedAt));

        return matchesSearch && matchesRole && matchesStatus && matchesAi;
    });

    renderApplicants(filtered);
}

/* =====================================
   AI SHORTLIST ASSISTANT MODAL
===================================== */

const openAiShortlistBtn = document.getElementById("openAiShortlistBtn");
if (openAiShortlistBtn) {
    openAiShortlistBtn.addEventListener("click", openAiShortlistModal);
}

const sidebarAiScreeningBtn = document.getElementById("sidebarAiScreeningBtn");
if (sidebarAiScreeningBtn) {
    sidebarAiScreeningBtn.addEventListener("click", event => {
        event.preventDefault();
        openAiShortlistModal();
    });
}

function openAiShortlistModal() {
    const modal = document.getElementById("aiShortlistModal");
    renderAiShortlistModalContent();
    modal.style.display = "flex";
}

function closeAiShortlistModal() {
    const modal = document.getElementById("aiShortlistModal");
    if (modal) modal.style.display = "none";
}

document.getElementById("aiShortlistModal")?.addEventListener("click", function(event) {
    if (event.target === this) {
        closeAiShortlistModal();
    }
});

function renderAiShortlistModalContent() {
    const container = document.getElementById("aiShortlistContent");
    if (!container) return;

    // Filter qualifying candidates based on threshold
    const qualifyingCandidates = applicants.filter(
        app => (Number(app.matchScore) || 0) >= aiShortlistThreshold && Boolean(app.analyzedAt)
    );

    const pendingShortlist = qualifyingCandidates.filter(app => app.status !== "Shortlisted");
    const alreadyShortlisted = qualifyingCandidates.filter(app => app.status === "Shortlisted");
    const unanalyzedCount = applicants.filter(app => !app.analyzedAt).length;

    let candidateCardsHTML = "";

    if (qualifyingCandidates.length === 0) {
        candidateCardsHTML = `
            <div class="ai-empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No candidates meet the ${aiShortlistThreshold}% threshold</h3>
                <p>Try lowering the threshold slider above or run AI analysis on more candidates.</p>
                ${
                    unanalyzedCount > 0
                        ? `<p class="unanalyzed-note">⚠️ You have <strong>${unanalyzedCount}</strong> unanalyzed candidate(s). Run "🤖 Analyze" on them to generate scores.</p>`
                        : ""
                }
            </div>
        `;
    } else {
        candidateCardsHTML = qualifyingCandidates.map(cand => {
            const score = cand.matchScore || 0;
            const isShortlisted = cand.status === "Shortlisted";
            const topSkills = (cand.matchedSkills || []).slice(0, 4);

            return `
                <div class="ai-candidate-card ${isShortlisted ? 'is-shortlisted' : ''}">
                    <div class="card-left">
                        <div class="ai-card-score ${score >= 70 ? 'high' : 'medium'}">
                            ${score}%
                        </div>
                        <div class="card-info">
                            <div class="candidate-header-line">
                                <strong>${escapeHTML(cand.name)}</strong>
                                <span class="card-role">${escapeHTML(cand.role || 'Applicant')}</span>
                                ${
                                    isShortlisted
                                        ? `<span class="card-status-badge shortlisted">✓ Shortlisted</span>`
                                        : `<span class="card-status-badge pending">Ready to Shortlist</span>`
                                }
                            </div>
                            <div class="card-skills">
                                ${
                                    topSkills.length
                                        ? topSkills.map(s => `<span class="ai-skill-tag">${escapeHTML(s)}</span>`).join('')
                                        : '<span class="ai-skill-tag muted">Skills matching profile</span>'
                                }
                            </div>
                            ${
                                cand.analysisSummary
                                    ? `<p class="card-summary">"${escapeHTML(cand.analysisSummary.slice(0, 120))}..."</p>`
                                    : ''
                            }
                        </div>
                    </div>
                    <div class="card-actions">
                        ${
                            isShortlisted
                                ? `<button class="card-btn undo-btn" onclick="updateSingleInModal('${escapeHTML(cand._id)}', 'Applied')">
                                       Undo
                                   </button>`
                                : `<button class="card-btn shortlist-btn" onclick="updateSingleInModal('${escapeHTML(cand._id)}', 'Shortlisted')">
                                       ✨ Shortlist
                                   </button>`
                        }
                    </div>
                </div>
            `;
        }).join("");
    }

    container.innerHTML = `
        <div class="ai-modal-header">
            <div class="ai-assistant-avatar">✨</div>
            <div>
                <h2>AI Shortlisting Assistant</h2>
                <p>Automate candidate shortlisting based on Gemini AI semantic match scores</p>
            </div>
        </div>

        <div class="ai-threshold-control">
            <div class="threshold-header">
                <span>Minimum Match Score Threshold:</span>
                <strong id="thresholdValText">${aiShortlistThreshold}%</strong>
            </div>
            <input
                type="range"
                id="thresholdSlider"
                min="40"
                max="90"
                step="5"
                value="${aiShortlistThreshold}"
            >
            <div class="slider-marks">
                <span>40% (Broad)</span>
                <span>70% (Recommended)</span>
                <span>90% (Strict)</span>
            </div>
        </div>

        <div class="ai-metrics-row">
            <div class="ai-metric-card">
                <span class="metric-value">${qualifyingCandidates.length}</span>
                <span class="metric-label">Meet Criteria</span>
            </div>
            <div class="ai-metric-card highlight">
                <span class="metric-value">${pendingShortlist.length}</span>
                <span class="metric-label">Ready to Shortlist</span>
            </div>
            <div class="ai-metric-card success">
                <span class="metric-value">${alreadyShortlisted.length}</span>
                <span class="metric-label">Already Shortlisted</span>
            </div>
        </div>

        <div class="ai-recommendations-list">
            ${candidateCardsHTML}
        </div>

        <div class="ai-modal-footer">
            <button
                class="primary-btn ai-batch-btn"
                onclick="applyBatchShortlist()"
                ${pendingShortlist.length === 0 ? "disabled" : ""}>
                ✨ Auto-Shortlist All Qualifying Candidates (${pendingShortlist.length})
            </button>
            <button class="view-btn" onclick="closeAiShortlistModal()">
                Close
            </button>
        </div>
    `;

    // Connect slider listener
    const slider = document.getElementById("thresholdSlider");
    if (slider) {
        slider.addEventListener("input", e => {
            aiShortlistThreshold = Number(e.target.value);
            const textEl = document.getElementById("thresholdValText");
            if (textEl) textEl.textContent = `${aiShortlistThreshold}%`;
            renderAiShortlistModalContent();
        });
    }
}

async function updateSingleInModal(id, newStatus) {
    await updateApplicantStatus(id, newStatus);
    renderAiShortlistModalContent();
}

async function applyBatchShortlist() {
    const qualifyingCandidates = applicants.filter(
        app => (Number(app.matchScore) || 0) >= aiShortlistThreshold &&
               Boolean(app.analyzedAt) &&
               app.status !== "Shortlisted"
    );

    if (qualifyingCandidates.length === 0) {
        alert("All qualifying candidates are already shortlisted!");
        return;
    }

    const ids = qualifyingCandidates.map(c => c._id);

    try {
        const response = await fetch("http://localhost:5000/api/applicants/batch-status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                applicantIds: ids,
                status: "Shortlisted"
            })
        });

        if (!response.ok) {
            throw new Error("Batch shortlisting failed on server.");
        }

        // Update local status
        qualifyingCandidates.forEach(cand => {
            cand.status = "Shortlisted";
        });

        updateStatistics();
        filterApplicants();
        renderAiShortlistModalContent();

        alert(`✨ Successfully shortlisted ${ids.length} candidate(s)!`);

    } catch (error) {
        console.error("Batch shortlist error:", error);
        alert(`Error during batch shortlisting: ${error.message}`);
    }
}

/* =====================================
   GEMINI AI RESUME ANALYSIS
===================================== */

async function analyzeResume(id, button) {
    const applicant = applicants.find(app => app._id === id);

    if (!applicant) {
        alert("Candidate not found.");
        return;
    }

    if (!applicant.resumeText?.trim()) {
        alert("Resume text is not available for this candidate.");
        return;
    }

    const jobDescription = prompt(
        `Enter the job description for ${applicant.role || "this candidate"}:`,
        applicant.role
            ? `Job Role: ${applicant.role}\nRequired skills and responsibilities: `
            : ""
    );

    if (jobDescription === null || !jobDescription.trim()) {
        return;
    }

    const originalText = button.textContent;

    try {
        button.disabled = true;
        button.textContent = "⏳ Analyzing...";

        const response = await fetch(
            `http://localhost:5000/api/applicants/${encodeURIComponent(id)}/analyze`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    jobDescription: jobDescription.trim()
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                data.error ||
                "Gemini analysis failed."
            );
        }

        if (!data.analysis) {
            throw new Error("Analysis data was not returned by the backend.");
        }

        // Update candidate with Gemini response
        Object.assign(applicant, data.analysis);

        updateStatistics();
        filterApplicants();

        // Open candidate details with AI report
        viewCandidate(id);

        alert("✨ Gemini AI analysis completed successfully!");

    } catch (error) {
        console.error("Resume analysis error:", error);
        alert(
            "AI analysis failed:\n" +
            error.message +
            "\n\nCheck the backend terminal for details."
        );
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

/* =====================================
   VIEW CANDIDATE DETAILS
===================================== */

function viewCandidate(id) {
    const applicant = applicants.find(app => app._id === id);

    if (!applicant) {
        alert("Candidate not found.");
        return;
    }

    const modal = document.getElementById("candidateModal");
    const details = document.getElementById("candidateDetails");

    const score = Number(applicant.matchScore) || 0;
    const resumeFile = applicant.resumeFile || "";

    const matchedSkills = applicant.matchedSkills || [];
    const missingSkills = applicant.missingSkills || [];
    const recommendations = applicant.analysisRecommendations || [];

    const isShortlisted = applicant.status === "Shortlisted";
    const isRejected = applicant.status === "Rejected";

    const analysisHTML = applicant.analyzedAt
        ? `
            <div class="ai-report">
                <h3>🤖 Gemini AI Analysis</h3>

                <p class="analysis-date">
                    Analyzed on:
                    ${escapeHTML(
                        new Date(applicant.analyzedAt).toLocaleString()
                    )}
                </p>

                <div class="analysis-score">
                    <span>Resume Match Score</span>
                    <strong>${score}%</strong>
                </div>

                <h4>✅ Matched Skills</h4>

                <div class="analysis-tags">
                    ${
                        matchedSkills.length
                            ? matchedSkills.map(skill => `
                                <span class="analysis-tag matched">
                                    ${escapeHTML(skill)}
                                </span>
                            `).join("")
                            : "<span>No matched skills returned.</span>"
                    }
                </div>

                <h4>⚠️ Missing or Unverified Skills</h4>

                <div class="analysis-tags">
                    ${
                        missingSkills.length
                            ? missingSkills.map(skill => `
                                <span class="analysis-tag missing">
                                    ${escapeHTML(skill)}
                                </span>
                            `).join("")
                            : "<span>No missing skills reported.</span>"
                    }
                </div>

                <h4>📝 AI Summary</h4>

                <p class="analysis-summary">
                    ${escapeHTML(
                        applicant.analysisSummary || "No summary available."
                    )}
                </p>

                <h4>💡 HR Follow-up Recommendations</h4>

                <ul class="recommendation-list">
                    ${
                        recommendations.length
                            ? recommendations.map(item => `
                                <li>${escapeHTML(item)}</li>
                            `).join("")
                            : "<li>No recommendations available.</li>"
                    }
                </ul>

                <p class="analysis-disclaimer">
                    AI analysis is advisory. HR should verify qualifications
                    and make the final hiring decision.
                </p>
            </div>
        `
        : `
            <div class="ai-report">
                <h3>🤖 Gemini AI Analysis</h3>
                <p>
                    No AI analysis yet. Close this window and click
                    "Analyze" in the candidate table to evaluate this candidate with Gemini.
                </p>
            </div>
        `;

    details.innerHTML = `
        <div class="modal-candidate-header">
            <div>
                <h2>${escapeHTML(applicant.name || "Unknown Candidate")}</h2>
                <p class="modal-candidate-role">${escapeHTML(applicant.role || "N/A")}</p>
            </div>

            <div class="modal-status-pill ${applicant.status ? applicant.status.toLowerCase() : 'applied'}">
                ${escapeHTML(applicant.status || "Applied")}
            </div>
        </div>

        <div class="modal-quick-decision-bar">
            <span><strong>HR Action:</strong></span>
            <button
                class="modal-decision-btn shortlist ${isShortlisted ? 'active' : ''}"
                data-action="modal-set-status"
                data-status="Shortlisted">
                ✨ Shortlist Candidate
            </button>
            <button
                class="modal-decision-btn reject ${isRejected ? 'active' : ''}"
                data-action="modal-set-status"
                data-status="Rejected">
                ✕ Reject Candidate
            </button>
            <button
                class="modal-decision-btn reset"
                data-action="modal-set-status"
                data-status="Applied">
                ↺ Reset
            </button>
        </div>

        <div class="candidate-meta-grid">
            <div><strong>Email:</strong> ${escapeHTML(applicant.email || "N/A")}</div>
            <div><strong>Phone:</strong> ${escapeHTML(applicant.phone || "N/A")}</div>
            <div><strong>AI Score:</strong> ${score}%</div>
            <div><strong>Status:</strong> ${escapeHTML(applicant.status || "Applied")}</div>
        </div>

        ${analysisHTML}

        <h3>Skills Extracted from Resume</h3>

        <div class="skills-pill-container">
            ${
                (applicant.skills || []).length
                    ? applicant.skills.map(s => `<span class="skill">${escapeHTML(s)}</span>`).join("")
                    : "<span class='skill'>No skills identified</span>"
            }
        </div>

        <h3>Resume Document</h3>

        <div class="resume-actions">
            <button
                class="resume-btn"
                data-action="view-resume"
                data-file="${escapeHTML(resumeFile)}">
                📄 View Full Resume
            </button>

            <button
                class="resume-btn"
                data-action="download-resume"
                data-file="${escapeHTML(resumeFile)}">
                ⬇ Download Resume
            </button>
        </div>

        <h3>Extracted Resume Text</h3>

        <div class="extracted-resume-text">${escapeHTML(
            applicant.resumeText || "Resume text unavailable"
        )}</div>
    `;

    // Handle resume and status buttons inside modal
    details.querySelectorAll("button[data-action]").forEach(button => {
        button.addEventListener("click", () => {
            const action = button.dataset.action;

            if (action === "view-resume") {
                viewResume(button.dataset.file);
            } else if (action === "download-resume") {
                downloadResume(button.dataset.file);
            } else if (action === "modal-set-status") {
                const newStatus = button.dataset.status;
                updateApplicantStatus(id, newStatus);
                viewCandidate(id);
            }
        });
    });

    modal.style.display = "flex";
}

/* =====================================
   ESCAPE HTML
===================================== */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

/* =====================================
   VIEW FULL RESUME
===================================== */

function viewResume(fileName) {
    if (!fileName) {
        alert("Resume file not available.");
        return;
    }

    const resumeURL = `http://localhost:5000/uploads/${encodeURIComponent(fileName)}`;
    window.open(resumeURL, "_blank", "noopener,noreferrer");
}

/* =====================================
   DOWNLOAD RESUME
===================================== */

function downloadResume(fileName) {
    if (!fileName) {
        alert("Resume file not available.");
        return;
    }

    const resumeURL = `http://localhost:5000/uploads/${encodeURIComponent(fileName)}`;
    const link = document.createElement("a");
    link.href = resumeURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

/* =====================================
   CLOSE MODAL
===================================== */

function closeModal() {
    document.getElementById("candidateModal").style.display = "none";
}

document.getElementById("candidateModal")?.addEventListener("click", function(event) {
    if (event.target === this) {
        closeModal();
    }
});

/* =====================================
   INITIALS
===================================== */

function getInitials(name) {
    if (!name) return "NA";

    return name
        .trim()
        .split(/\s+/)
        .map(word => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}

/* =====================================
   START APPLICATION
===================================== */

loadApplicants();