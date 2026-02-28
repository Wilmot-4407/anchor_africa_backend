const express = require("express");
const {
  getAbout,
  upsertAbout,
  deleteAbout,
} = require("../../controllers/v1/about");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

router
  .route("/")
  .get(getAbout)
  .post(protect, ...uploadImage("image", "about"), upsertAbout)
  .delete(protect, authorize("admin"), deleteAbout);

module.exports = router;
