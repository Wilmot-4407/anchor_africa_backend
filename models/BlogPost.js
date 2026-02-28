const mongoose = require("mongoose");

const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    // Auto-generated from title if not provided — enforced unique at DB level
    slug: { type: String, required: true, unique: true, trim: true },

    // Short excerpt shown on listing cards (auto-truncated from content if omitted)
    excerpt: { type: String, trim: true },

    // Full article body — can be rich HTML or plain text
    content: { type: String, required: true },

    // Cloudinary URL set by the upload middleware; falls back to default
    image: { type: String, default: "default-blog.png" },

    // Alt text for SEO / accessibility
    imageAlt: { type: String, trim: true },

    // Author name displayed on card + detail page
    author: { type: String, trim: true },

    // Author avatar image URL
    authorAvatar: { type: String },

    // Author bio / title shown on detail page
    authorTitle: { type: String, trim: true },

    // Explicit publish date — shown on cards and the BlogDetails header
    date: { type: Date, default: Date.now },

    // Set automatically when status transitions to "published"
    publishedAt: { type: Date },

    // Drives StatusBadge in the admin editor
    status: {
      type: String,
      enum: ["draft", "published", "scheduled"],
      default: "draft",
    },

    // Used by the sidebar category filter
    category: { type: String, trim: true },

    // Rendered in BlogDetails tags section
    tags: [{ type: String, trim: true }],

    // Reading time in minutes (auto-computed on save)
    readingTime: { type: Number },

    // View count (optional — increment via separate endpoint)
    views: { type: Number, default: 0 },

    // SEO meta fields
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },

    // Whether to feature this post (appears first / hero card)
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Pre-save hooks ────────────────────────────────────────────────────────────

BlogPostSchema.pre("save", function () {
  // Set publishedAt the first time status becomes "published"
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  // Auto-compute reading time (200 wpm average)
  if (this.isModified("content") && this.content) {
    const words = this.content.trim().split(/\s+/).length;
    this.readingTime = Math.max(1, Math.round(words / 200));
  }

  // Auto-generate excerpt from content if not provided (first 200 chars)
  if (!this.excerpt && this.content) {
    const plain = this.content.replace(/<[^>]*>/g, "");
    this.excerpt = plain.slice(0, 220).trim() + (plain.length > 220 ? "…" : "");
  }
});

// ── Indexes ───────────────────────────────────────────────────────────────────
BlogPostSchema.index({ status: 1, publishedAt: -1 });
BlogPostSchema.index({ category: 1 });

module.exports = mongoose.model("BlogPost", BlogPostSchema);
