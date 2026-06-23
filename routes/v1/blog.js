const express = require("express");
const {
  // Public
  getBlogPosts,
  getBlogPostBySlug,
  getBlogPostById,
  getBlogCategories,
  getRelatedPosts,
  // Admin
  getAllBlogPostsAdmin,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} = require("../../controllers/v1/blog");
const { uploadFields } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/v1/blog
//   → all published posts (supports ?status=&category=&tag=&search=&limit=&page=&featured=)
// POST /api/v1/blog  → create post (admin)
router
  .route("/")
  .get(getBlogPosts)
  .post(
    protect,
    authorize("admin"),
    ...uploadFields(["image", "authorAvatar"], "blog"),
    createBlogPost,
  );

// GET /api/v1/blog/categories
//   → distinct category list from published posts
// ⚠ Must be declared BEFORE /:id / /:slug so Express doesn't swallow "categories"
router.route("/categories").get(getBlogCategories);

// GET /api/v1/blog/admin/all
//   → ALL posts regardless of status (admin only)
router
  .route("/admin/all")
  .get(protect, authorize("admin"), getAllBlogPostsAdmin);

// GET /api/v1/blog/slug/:slug
//   → fetch full post by slug (used by BlogDetails page)
// ⚠ Must be declared BEFORE /:id so "slug" isn't treated as an ObjectId
router.route("/slug/:slug").get(getBlogPostBySlug);

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES WITH DYNAMIC :id SEGMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/v1/blog/:id/related  → related posts (same category / tags)
router.route("/:id/related").get(getRelatedPosts);

// GET  /api/v1/blog/:id  → fetch single post by MongoDB _id (admin use)
// PUT  /api/v1/blog/:id  → update post
// DEL  /api/v1/blog/:id  → delete post
router
  .route("/:id")
  .get(protect, authorize("admin"), getBlogPostById)
  .put(
    protect,
    authorize("admin"),
    ...uploadFields(["image", "authorAvatar"], "blog"),
    updateBlogPost,
  )
  .delete(protect, authorize("admin"), deleteBlogPost);

module.exports = router;
