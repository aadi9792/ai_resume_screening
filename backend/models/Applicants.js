
const mongoose = require("mongoose");

const applicantSchema = new mongoose.Schema(
    {
        // Applicant details
        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true
        },

        phone: {
            type: String
        },

        // Job role applied for
        role: {
            type: String,
            required: true
        },

        // Uploaded resume
        resumeFile: {
            type: String,
            required: true
        },

        resumeText: {
            type: String,
            default: ""
        },

        // Skills extracted from the resume
        skills: {
            type: [String],
            default: []
        },

        // Gemini AI screening results
        matchScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        matchedSkills: {
            type: [String],
            default: []
        },

        missingSkills: {
            type: [String],
            default: []
        },

        analysisSummary: {
            type: String,
            default: ""
        },

        analysisRecommendations: {
            type: [String],
            default: []
        },

        analyzedAt: {
            type: Date,
            default: null
        },

        // HR application status
        status: {
            type: String,
            enum: ["Applied", "Shortlisted", "Rejected"],
            default: "Applied"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Applicant",
    applicantSchema
);