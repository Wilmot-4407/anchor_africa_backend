const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["clinic", "institute"],
      required: true,
    }, // 'clinic' for AnchorClinic, 'institute' for AnchorInstitute
    category: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    icon: { type: String }, // Icon name or URL
    features: [{ type: String }],
    duration: { type: String },
    specialists: { type: String }, // e.g., '25+ Specialists'
    benefits: [{ type: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Service", ServiceSchema);
