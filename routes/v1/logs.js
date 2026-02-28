/**
 * routes/v1/logs.js
 *
 * All routes are private and restricted to admin role only.
 * Route order matters: static paths must come before /:id.
 */

const express = require("express");
const router = express.Router();

const {
  getLogs,
  getLogTypes,
  getLogsByType,
  getLogByUserId,
  getLogById,
  deleteLogs,
} = require("../../controllers/v1/logs");

const { protect } = require("../../middleware/auth");
const authorize = require("../../middleware/authorize");

// Apply protect + admin gate to every logs route
router.use(protect);
router.use(authorize("admin"));

// GET    /api/v1/logs           — all logs (paginated + filterable)
// DELETE /api/v1/logs           — bulk delete
router.route("/").get(getLogs).delete(deleteLogs);

// GET    /api/v1/logs/types     — distinct types & actions (for filters)
router.get("/types", getLogTypes);

// GET    /api/v1/logs/by-type/:type
router.get("/by-type/:type", getLogsByType);

// GET    /api/v1/logs/user/:id  — logs by user
router.get("/user/:id", getLogByUserId);

// GET    /api/v1/logs/:id       — single log entry (must come LAST)
router.get("/:id", getLogById);

module.exports = router;
