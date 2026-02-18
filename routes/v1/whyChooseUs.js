const express = require("express");
const {
  getWhyChooseUs,
  upsertWhyChooseUs,
  deleteWhyChooseUs,
} = require("../../controllers/v1/whyChooseUs");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

router
  .route("/")
  .get(getWhyChooseUs)
  .post(
    protect,
    authorize("admin"),
    uploadImage("backgroundImage", "whychooseus"),
    upsertWhyChooseUs,
  )
  .delete(protect, authorize("admin"), deleteWhyChooseUs);

module.exports = router;
