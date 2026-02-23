const express = require("express");
const {
  getBlogPosts,
  getBlogPost,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} = require("../../controllers/v1/blog");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────

// GET /api/v1/blog           → all posts (sorted newest first)
// POST /api/v1/blog          → create post (admin)
router
  .route("/")
  .get(getBlogPosts)
  .post(
    protect,
    authorize("admin"),
    uploadImage("image", "blog"),
    createBlogPost,
  );

// GET /api/v1/blog/slug/:slug → fetch by slug (used by BlogDetails page)
// Placed BEFORE /:id so Express doesn't treat "slug" as an ObjectId
router.route("/slug/:slug").get(getBlogPost);

// ── Admin routes (by MongoDB _id) ────────────────────────────────────────────

// GET  /api/v1/blog/:id  → fetch single by ID
// PUT  /api/v1/blog/:id  → update
// DEL  /api/v1/blog/:id  → delete
router
  .route("/:id")
  .get(protect, authorize("admin"), getBlogPostById)
  .put(
    protect,
    authorize("admin"),
    uploadImage("image", "blog"),
    updateBlogPost,
  )
  .delete(protect, authorize("admin"), deleteBlogPost);

module.exports = router;
