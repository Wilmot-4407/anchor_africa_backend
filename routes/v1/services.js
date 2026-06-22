const express = require("express");
const {
  getServices,
  getService,
  getAllServicesAdmin,
  createService,
  updateService,
  deleteService,
  bulkCreateServices,
} = require("../../controllers/v1/services");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

// ── Public ────────────────────────────────────────────────────────────────────
// GET  /api/v1/services?type=clinic|institute|research
// POST /api/v1/services  (admin create)
router
  .route("/")
  .get(getServices)
  .post(
    protect,
    authorize("admin"),
    ...uploadImage("image", "services"),
    createService,
  );

// ── Admin-only static-segment routes (declare BEFORE /:slug / /:id) ──────────
router
  .route("/admin/all")
  .get(protect, authorize("admin"), getAllServicesAdmin);

// POST /api/v1/services/bulk  — seed / bulk create (no file upload)
router.route("/bulk").post(bulkCreateServices);

// ── Public slug-based route ───────────────────────────────────────────────────
// GET /api/v1/services/:slug
router.route("/:slug").get(getService);

// ── Admin id-based routes ─────────────────────────────────────────────────────
// PUT    /api/v1/services/:id
// DELETE /api/v1/services/:id
router
  .route("/:id")
  .put(
    protect,
    authorize("admin"),
    ...uploadImage("image", "services"),
    updateService,
  )
  .delete(protect, authorize("admin"), deleteService);

module.exports = router;
