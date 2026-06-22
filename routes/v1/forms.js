const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../../middleware/auth");
const {
  getForms,
  getForm,
  createForm,
  updateForm,
  deleteForm,
  publishForm,
  archiveForm,
  unarchiveForm,
  duplicateForm,
} = require("../../controllers/v1/forms");
const { getAnalyticsOverview } = require("../../controllers/v1/formAnalytics");

// All routes require authentication and admin role
router.use(protect);
router.use(authorize("admin"));

router.route("/").get(getForms).post(createForm);

// Fixed-path routes must come before /:id to avoid param conflicts
router.get("/analytics/overview", getAnalyticsOverview);

router.route("/:id").get(getForm).put(updateForm).delete(deleteForm);

router.put("/:id/publish", publishForm);
router.put("/:id/archive", archiveForm);
router.put("/:id/unarchive", unarchiveForm);
router.post("/:id/duplicate", duplicateForm);

module.exports = router;
