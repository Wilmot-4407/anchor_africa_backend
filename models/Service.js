const mongoose = require("mongoose");

// ─── Main Service (category-level) document ───────────────────────────────────
const ServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["clinic", "institute", "research"],
      required: true,
    },
    category: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    fullDescription: { type: String, trim: true },
    image: { type: String, default: "default-service.png" },
    icon: { type: String },
    features: [{ type: String, trim: true }],
    benefits: [{ type: String, trim: true }],
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────────────────────
// Auto-generate slug
// ─────────────────────────────────────────────────────────────────────────────
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
