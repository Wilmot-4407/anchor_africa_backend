const mongoose = require("mongoose");

const BlogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    image: { type: String, default: "default-blog.png" }, // S3 URL
    author: { type: String },
    date: { type: Date, default: Date.now },
    tags: [{ type: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("BlogPost", BlogPostSchema);
