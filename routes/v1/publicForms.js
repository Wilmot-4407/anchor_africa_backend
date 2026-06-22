const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { getFormBySlug, submitForm, trackView, trackStart } = require("../../controllers/v1/publicForms");
const { formFileUpload } = require("../../middleware/formUpload");

// Strict rate limiter for public submissions — prevents spam
const submissionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: { success: false, error: "Too many submissions. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lighter rate limiter for tracking events
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, error: "Too many requests." },
});

// Public form retrieval — no auth
router.get("/:slug", getFormBySlug);

// Public form submission — includes file upload middleware + spam limiter
router.post("/:slug/submit", submissionLimiter, ...formFileUpload, submitForm);

// Analytics tracking — no auth, light rate limit
router.post("/:slug/track-view", trackingLimiter, trackView);
router.post("/:slug/track-start", trackingLimiter, trackStart);

module.exports = router;
