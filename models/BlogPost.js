const mongoose = require("mongoose");

const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    // Auto-generated from title if not provided — enforced unique at DB level
    slug: { type: String, required: true, unique: true, trim: true },

    // Full article body
    content: { type: String, required: true },

    // Cloudinary URL set by the upload middleware; falls back to default
    image: { type: String, default: "default-blog.png" },

    // Visible on card date badge and BlogDetails header
    author: { type: String, trim: true },

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

    // Used by the sidebar category filter in Blog.jsx and admin editor chips
    category: { type: String, trim: true },

    // Rendered in BlogDetails tags section and sidebar tagcloud
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true },
);

// Auto-set publishedAt the first time status becomes "published"
BlogPostSchema.pre("save", async function () {
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }
});

module.exports = mongoose.model("BlogPost", BlogPostSchema);
