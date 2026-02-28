const express = require("express");
const {
  // Public
  getServices,
  getService,
  getServiceItem,
  // Admin
  getAllServicesAdmin,
  createService,
  updateService,
  deleteService,
  upsertServiceItem,
  deleteServiceItem,
  bulkCreateServices,
} = require("../../controllers/v1/services");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/v1/services
//   → all published service categories (supports ?type=clinic|institute|research)
// POST /api/v1/services  → create single service category (admin)
router
  .route("/")
  .get(getServices)
  .post(
    protect,
    authorize("admin"),
    ...uploadImage("image", "services"),
    createService,
  );

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN-ONLY STATIC SEGMENT ROUTES
// ⚠ All of these must be declared BEFORE /:slug / /:id  so Express doesn't
//   swallow "bulk" or "admin" as a dynamic parameter.
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/services/admin/all
//   → ALL service categories regardless of isPublished (admin only)
router
  .route("/admin/all")
  .get(protect, authorize("admin"), getAllServicesAdmin);

// POST /api/v1/services/bulk
//   → Create many service categories in one request
//   → Body: { "services": [ { title, type, category, shortDescription, ... }, ... ] }
//   → No file upload — JSON body only
router.route("/bulk").post(bulkCreateServices);

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC SLUG-BASED ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/services/:categorySlug/items/:itemSlug
//   → fetch a single nested service item within a category
// ⚠ More specific path — must be declared before /:slug
router.route("/:categorySlug/items/:itemSlug").get(getServiceItem);

// GET /api/v1/services/:slug
//   → fetch full service category (with all items) by slug
router.route("/:slug").get(getService);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES WITH MONGODB :id SEGMENT
// ─────────────────────────────────────────────────────────────────────────────

// PUT    /api/v1/services/:id  → update service category
// DELETE /api/v1/services/:id  → delete service category (+ all its items)
router
  .route("/:id")
  .put(
    protect,
    authorize("admin"),
    ...uploadImage("image", "services"),
    updateService,
  )
  .delete(protect, authorize("admin"), deleteService);

// POST   /api/v1/services/:id/items  → add or update a nested service item
// DELETE /api/v1/services/:id/items/:itemSlug  → remove a nested service item
router
  .route("/:id/items")
  .post(
    protect,
    authorize("admin"),
    ...uploadImage("image", "services"),
    upsertServiceItem,
  );

router
  .route("/:id/items/:itemSlug")
  .delete(protect, authorize("admin"), deleteServiceItem);

module.exports = router;
