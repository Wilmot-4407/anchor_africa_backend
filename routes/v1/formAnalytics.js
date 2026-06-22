const express = require("express");
const router = express.Router({ mergeParams: true });
const { protect, authorize } = require("../../middleware/auth");
const { getFormAnalytics } = require("../../controllers/v1/formAnalytics");

router.use(protect);
router.use(authorize("admin"));

// Per-form analytics — mounted at /api/v1/forms/:formId/analytics
router.get("/", getFormAnalytics);

module.exports = router;
