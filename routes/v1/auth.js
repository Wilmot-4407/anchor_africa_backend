const express = require("express");
const expressRateLimit = require("express-rate-limit");
const { uploadImage } = require("../../middleware/upload");
const {
  login,
  register,
  getMe,
  forgotPassword,
  resetPassword,
  logout,
} = require("../../controllers/v1/auth");
const noCache = require("../../middleware/noCache");
const { protect } = require("../../middleware/auth");
const router = express.Router();

// Strict rate limiter for the login endpoint only
const loginLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true,
  message: { success: false, error: "Too many login attempts. Try again in 15 minutes." },
});

// Apply noCache middleware to all auth routes
router.use(noCache);

// POST /api/v1/auth/register  → register new user (with optional profile picture)
router
  .route("/register")
  .post(...uploadImage("profilePicture", "avatars"), register);

// POST /api/v1/auth/login
router.route("/login").post(loginLimiter, login);

// GET  /api/v1/auth/logout
router.route("/logout").get(protect, logout);

// GET  /api/v1/auth/me  → get currently logged-in user
router.route("/me").get(protect, getMe);

// POST /api/v1/auth/forgetpassword  → generate reset token + send email
router.route("/forgetpassword").post(forgotPassword);

// PUT  /api/v1/auth/resetpassword/:resettoken  → set new password
router.put("/resetpassword/:resettoken", resetPassword);

module.exports = router;
