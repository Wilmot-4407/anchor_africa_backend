const express = require("express");
const { getFaq, upsertFaq, deleteFaq } = require("../../controllers/v1/faqs");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

router
  .route("/")
  .get(getFaq)
  .post(
    protect,
    authorize("admin"),
    uploadImage("backgroundImage", "whychooseus"),
    upsertFaq,
  )
  .delete(protect, authorize("admin"), deleteFaq);

module.exports = router;
