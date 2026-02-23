const mongoose = require("mongoose");

const OpenHourSchema = new mongoose.Schema(
  {
    day: { type: String, required: true }, // e.g. "Monday"
    hours: { type: String, required: true }, // e.g. "09:30 - 07:30"
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const AboutSchema = new mongoose.Schema(
  {
    // Hero copy
    title: { type: String, required: true },
    description: { type: String, required: true },

    // Main about image (left column photo)
    image: { type: String },

    // Feature / checklist items rendered as bullet list
    features: [{ type: String }],

    // CTA button
    ctaText: { type: String, default: "Appointment" },
    ctaLink: { type: String, default: "/appointment" },

    // Phone widget
    phone: { type: String },

    // Open hours widget (overlaid card on the image)
    openHours: [OpenHourSchema],

    // Section visibility on the public website
    visible: { type: Boolean, default: true },

    // Generic sub-sections (kept for extensibility)
    sections: [
      {
        title: String,
        content: String,
        icon: String,
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("About", AboutSchema);
