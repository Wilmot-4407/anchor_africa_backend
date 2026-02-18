const express = require("express");
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

// Apply noCache middleware to all project routes
router.use(noCache);

//initalize users routes
router.route("/register").post(uploadImage("profilePicture"), register);

//initalize users routes
router.route("/login").post(login);
router.route("/logout").get(protect, logout);

router.route("/me").get(protect, getMe);

//generate reset password token
router.route("/forgetpassword").post(forgotPassword);

//reset password by setting a new password
router.put("/resetpassword/:resettoken", resetPassword);

module.exports = router;
