const express = require("express");
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
} = require("../../controllers/v1/services");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

router
  .route("/")
  .get(getServices)
  .post(
    protect,
    authorize("admin"),
    uploadImage("image", "services"),
    createService,
  );
router.route("/:slug").get(getService);
router
  .route("/:id")
  .put(
    protect,
    authorize("admin"),
    uploadImage("image", "services"),
    updateService,
  )
  .delete(protect, authorize("admin"), deleteService);

module.exports = router;
