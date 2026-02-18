// models/TeamMember.js
const mongoose = require("mongoose");

const TeamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    specialty: { type: String, required: true },
    image: { type: String, default: "default.png" }, // S3 URL
    bio: { type: String, required: true },
    education: [{ type: String }],
    specialties: [{ type: String }],
    experience: { type: String },
    languages: [{ type: String }],
    schedule: { type: Object, default: {} },
    contact: {
      phone: String,
      email: String,
      address: String,
    },
    social: {
      linkedin: String,
      instagram: String,
      twitter: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("TeamMember", TeamMemberSchema);
