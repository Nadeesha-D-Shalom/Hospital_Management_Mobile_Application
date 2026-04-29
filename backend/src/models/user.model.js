const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String
        },
        role: {
            type: String,
            enum: ["patient", "doctor", "admin"],
            default: "patient"
        },
        phone: {
            type: String
        },
        address: {
            type: String
        },
        profileImage: {
            type: String
        },
        emailVerified: {
            type: Boolean,
            default: false
        },
        emailVerificationOtpHash: {
            type: String
        },
        emailVerificationOtpExpiresAt: {
            type: Date
        },
        resetPasswordOtpHash: {
            type: String
        },
        resetPasswordOtpExpiresAt: {
            type: Date
        },
        resetPasswordOtpVerified: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
