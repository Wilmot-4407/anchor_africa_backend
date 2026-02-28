const express = require("express");
const {
  // Public
  getTeamMembers,
  getTeamMember,
  // Admin
  getAllTeamMembersAdmin,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} = require("../../controllers/v1/team");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — /api/v1/team
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/v1/team          → all ACTIVE members (supports ?specialty=)
// POST /api/v1/team          → create member (admin)
router
  .route("/")
  .get(getTeamMembers)
  .post(
    protect,
    authorize("admin"),
    ...uploadImage("image", "team"),
    createTeamMember,
  );

// ─────────────────────────────────────────────────────────────────────────────
// STATIC ADMIN SEGMENTS — must come BEFORE any dynamic /:param routes
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/team/admin/all → ALL members including inactive (admin only)
router
  .route("/admin/all")
  .get(protect, authorize("admin"), getAllTeamMembersAdmin);

// PUT    /api/v1/team/admin/:id  → update member by MongoDB _id
// DELETE /api/v1/team/admin/:id  → delete member by MongoDB _id
router
  .route("/admin/:id")
  .put(
    protect,
    authorize("admin"),
    ...uploadImage("image", "team"),
    updateTeamMember,
  )
  .delete(protect, authorize("admin"), deleteTeamMember);

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC DYNAMIC SEGMENT — /api/v1/team/:slug
// Must come LAST so static paths above are matched first
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/v1/team/:slug  → single active member by slug (public)
router.route("/:slug").get(getTeamMember);

module.exports = router;
