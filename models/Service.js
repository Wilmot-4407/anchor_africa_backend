const mongoose = require("mongoose");

// ─── Pricing Tier Sub-document ─────────────────────────────────────────────────
const PricingTierSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    price: { type: String, required: true, trim: true }, // e.g. "$50", "FREE", "Contact Us"
    note: { type: String, trim: true },
  },
  { _id: false },
);

// ─── Module/Course Outline Sub-document ───────────────────────────────────────
const CourseModuleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false },
);

// ─── Main Service document ────────────────────────────────────────────────────
const ServiceSchema = new mongoose.Schema(
  {
    // ── Core identification ───────────────────────────────────────────────────
    title: { type: String, required: true, trim: true },

    /** Which wing of ANCHOR: clinic | institute | research */
    type: {
      type: String,
      enum: ["clinic", "institute", "research"],
      required: true,
    },

    category: { type: String, required: true, trim: true },

    slug: { type: String, required: true, unique: true, trim: true },

    // ── Descriptions ─────────────────────────────────────────────────────────
    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, trim: true },

    // ── Media ────────────────────────────────────────────────────────────────
    image: { type: String, default: "default-service.png" },
    icon: { type: String },

    // ── Listing metadata ─────────────────────────────────────────────────────
    features: [{ type: String, trim: true }],
    benefits: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },

    programType: { type: String, trim: true },

    /** Duration string, e.g. "5 Months (10 Modules)" */
    duration: { type: String, trim: true },

    /** Schedule or number of specialists, e.g. "Mon–Thu & Sun, 6–9 PM" */
    specialists: { type: String, trim: true },

    // ── Detail page: Learning Objectives, Modules, Pricing ───────────────────
    learningObjectives: [{ type: String, trim: true }],
    modules: [CourseModuleSchema],
    pricing: [PricingTierSchema],
  },
  { timestamps: true },
);

// ─── Auto-generate slug from title ───────────────────────────────────────────
ServiceSchema.pre("validate", async function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

module.exports = mongoose.model("Service", ServiceSchema);
