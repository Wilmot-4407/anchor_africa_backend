const express = require("express");
// mergeParams lets us access :formId from the parent router
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require("../../middleware/auth");
const {
  getResponses,
  getResponse,
  updateResponseStatus,
  deleteResponse,
  exportResponses,
} = require("../../controllers/v1/formResponses");

router.use(protect);
router.use(authorize("admin"));

// Export must be registered before /:id to avoid route conflict
router.get("/export", exportResponses);

router.route("/").get(getResponses);

router.route("/:id").get(getResponse).delete(deleteResponse);

router.put("/:id/status", updateResponseStatus);

module.exports = router;
