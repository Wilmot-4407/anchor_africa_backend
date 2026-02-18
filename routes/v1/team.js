const express = require("express");
const {
  getTeamMembers,
  getTeamMember,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} = require("../../controllers/v1/team");
const { uploadImage } = require("../../middleware/upload");
const { protect, authorize } = require("../../middleware/auth");
const router = express.Router();

router
  .route("/")
  .get(getTeamMembers)
  .post(
    protect,
    authorize("admin"),
    uploadImage("image", "team"),
    createTeamMember,
  );
router.route("/:slug").get(getTeamMember);
router
  .route("/:id")
  .put(
    protect,
    authorize("admin"),
    uploadImage("image", "team"),
    updateTeamMember,
  )
  .delete(protect, authorize("admin"), deleteTeamMember);

module.exports = router;
