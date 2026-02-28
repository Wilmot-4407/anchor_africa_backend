/**
 * routes/v1/users.js
 *
 * Admin-only CRUD for user accounts.
 * All routes require authentication + admin role.
 */

const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require("../../controllers/v1/users");

const { protect } = require("../../middleware/auth");
const authorize = require("../../middleware/authorize");

// Apply protect + admin gate to every users route
router.use(protect);
router.use(authorize("admin"));

// GET  /api/v1/users        — list all users
// POST /api/v1/users        — create user
router.route("/").get(getUsers).post(createUser);

// GET    /api/v1/users/:id  — single user
// PUT    /api/v1/users/:id  — update user
// DELETE /api/v1/users/:id  — delete user
router.route("/:id").get(getUser).put(updateUser).delete(deleteUser);

module.exports = router;
