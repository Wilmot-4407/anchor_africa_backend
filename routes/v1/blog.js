const express = require("express");
const {
  getBlogPosts,
  getBlogPost,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
} = require("../../controllers/v1/blog");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

router
  .route("/")
  .get(getBlogPosts)
  .post(
    protect,
    authorize("admin"),
    uploadImage("image", "blog"),
    createBlogPost,
  );
router.route("/:slug").get(getBlogPost);
router
  .route("/:id")
  .put(
    protect,
    authorize("admin"),
    uploadImage("image", "blog"),
    updateBlogPost,
  )
  .delete(protect, authorize("admin"), deleteBlogPost);

module.exports = router;
