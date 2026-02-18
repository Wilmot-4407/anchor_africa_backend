const express = require("express");
const {
  getUser,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} = require("../../controllers/v1/users");
const { uploadImage } = require("../../middleware/upload");
const noCache = require("../../middleware/noCache");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

// Apply noCache middleware to all project routes
router.use(noCache);

// initalize users routes
router
  .route("/")
  .get(protect, getUsers)
  .post(protect, authorize("admin"), uploadImage("profilePicture"), createUser);

router
  .route("/:id")
  .get(protect, getUser)
  .put(protect, authorize("admin"), uploadImage("profilePicture"), updateUser)
  .delete(protect, authorize("admin"), deleteUser);

module.exports = router;
