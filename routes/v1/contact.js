const express = require("express");
const { submitContact } = require("../../controllers/v1/contact");
const expressRateLimit = require("express-rate-limit");

const router = express.Router();

// Stricter rate limit for contact form: 5 submissions per 15 minutes per IP
const contactLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many messages sent from this IP. Please try again in 15 minutes.",
});

// POST /api/v1/contact
router.post("/", contactLimiter, submitContact);

module.exports = router;
