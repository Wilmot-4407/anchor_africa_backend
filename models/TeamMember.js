const mongoose = require("mongoose");

// ─── Schedule slot sub-document ───────────────────────────────────────────────
const ScheduleSlotSchema = new mongoose.Schema(
  {
    day: { type: String, required: true }, // e.g. "Monday - Friday"
    hours: { type: String, required: true }, // e.g. "09:30 - 17:30"
  },
  { _id: false },
);

// ─── Main TeamMember document ─────────────────────────────────────────────────
const TeamMemberSchema = new mongoose.Schema(
  {
    // Basic identity
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },

    // Primary specialty (used as the card label)
    specialty: { type: String, required: true, trim: true },

    // Profile image (Cloudinary / S3 URL)
    image: { type: String, default: "default.png" },

    // Full biography (rich text / HTML allowed)
    bio: { type: String, required: true, trim: true },

    // Short one-liner shown under the name on list pages
    tagline: { type: String, trim: true },

    // Academic / professional credentials
    education: [{ type: String, trim: true }],

    // Multiple areas of expertise (skill chips on detail page)
    specialties: [{ type: String, trim: true }],

    // Years-in-practice string, e.g. "12 years"
    experience: { type: String, trim: true },

    // Languages spoken
    languages: [{ type: String, trim: true }],

    // Awards / recognitions
    awards: [{ type: String, trim: true }],

    // Weekly schedule displayed on the sidebar of the detail page
    schedule: [ScheduleSlotSchema],

    // Contact information
    contact: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      address: { type: String, trim: true },
    },

    // Social-media profile URLs
    social: {
      linkedin: { type: String, trim: true },
      instagram: { type: String, trim: true },
      twitter: { type: String, trim: true },
      facebook: { type: String, trim: true },
      youtube: { type: String, trim: true },
    },

    // Display ordering on team listing
    order: { type: Number, default: 0 },

    // Visibility toggle
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ── Pre-validate: auto-slug from name ─────────────────────────────────────────
TeamMemberSchema.pre("validate", async function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

// ── Indexes ───────────────────────────────────────────────────────────────────
TeamMemberSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model("TeamMember", TeamMemberSchema);
