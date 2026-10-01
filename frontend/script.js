const resumeInput = document.getElementById("resumes");
const analyzeBtn = document.getElementById("analyzeBtn");
const fileListContainer = document.getElementById("fileListContainer");

// Store all selected resumes
let selectedResumes = [];

function renderFileList() {
    if (!fileListContainer) return;
    if (selectedResumes.length === 0) {
        fileListContainer.innerHTML = "";
        return;
    }

    fileListContainer.innerHTML = `
        <div class="selected-files-box">
            <strong>Selected Resumes (${selectedResumes.length}):</strong>
            <ul>
                ${selectedResumes.map((f, i) => `<li>📄 ${f.name} <small>(${Math.round(f.size / 1024)} KB)</small></li>`).join("")}
            </ul>
        </div>
    `;
}

// When resumes are selected
resumeInput.addEventListener("change", function () {
    const newFiles = Array.from(resumeInput.files);
    selectedResumes = selectedResumes.concat(newFiles);
    renderFileList();
});

analyzeBtn.addEventListener("click", async function () {
    const jobDescription = document.getElementById("jobDescription").value;

    if (jobDescription.trim() === "") {
        alert("Please enter a job description or target role.");
        return;
    }

    if (selectedResumes.length === 0) {
        alert("Please upload at least one resume PDF.");
        return;
    }

    // Create FormData
    const formData = new FormData();
    formData.append("jobDescription", jobDescription.trim());

    selectedResumes.forEach((file) => {
        formData.append("resumes", file);
    });

    const originalBtnText = analyzeBtn.innerHTML;

    try {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = "⏳ Processing, Extracting & AI Screening...";

        const response = await fetch("http://localhost:5000/api/resumes/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || "Upload failed");
        }

        console.log("Backend response:", data);

        const count = data.count || selectedResumes.length;
        const goToDashboard = confirm(
            `✅ ${count} candidate resume(s) uploaded and saved to MongoDB!\n\nWould you like to open the HR Dashboard now to review AI scores and shortlist candidates?`
        );

        if (goToDashboard) {
            window.location.href = "hr-dashboard.html";
        } else {
            // Reset form
            selectedResumes = [];
            resumeInput.value = "";
            renderFileList();
        }

    } catch (error) {
        console.error("Upload error:", error);
        alert(`Upload error: ${error.message}`);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalBtnText;
    }
});