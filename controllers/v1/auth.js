/**
 * controllers/v1/auth.js  — with full audit trail
 */

const User = require("../../models/User");
const ErrorResponse = require("../../utils/errorResponse");
const asyncHandler = require("../../middleware/async");
const sendEmail = require("../../utils/sendEmail");
const auditLog = require("../../utils/auditLog");
const crypto = require("crypto");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    sameSite: "Strict",
  };
  if (process.env.NODE_ENV === "production") options.secure = true;

  // Token is delivered via httpOnly cookie only — never in the response body
  res.status(statusCode).cookie("token", token, options).json({
    success: true,
  });
};

// ─── Register ─────────────────────────────────────────────────────────────────

// @desc    Register new User
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const {
    userName,
    email,
    password,
    dob,
    firstName,
    lastName,
    address,
    phoneNumber,
  } = req.body;
  // role and status are intentionally excluded — model defaults apply
  // to prevent privilege escalation via the public registration endpoint

  if (!userName || !email || !dob || !password || !firstName || !lastName) {
    return next(new ErrorResponse("Please provide all required fields", 400));
  }

  const user = await User.create({
    userName,
    email,
    password,
    dob,
    firstName,
    lastName,
    address,
    phoneNumber,
    profilePicture: req.file ? req.file.location : "default.png",
  });

  await auditLog({
    req,
    userId: user._id,
    userName: user.userName,
    type: "auth",
    action: "REGISTER",
    message: `New user registered: ${user.userName} (${user.email}) with role "${user.role}"`,
  });

  sendTokenResponse(user, 201, res);
});

// ─── Login ────────────────────────────────────────────────────────────────────

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  const isMatch = await user.matchPassword(password.trim());

  if (!isMatch) {
    // Log failed login attempt using the found user's id so createdBy is valid
    await auditLog({
      req,
      userId: user._id,
      userName: user.userName,
      type: "auth",
      action: "LOGIN_FAILED",
      message: `Failed login attempt for ${email}`,
    });
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Update lastLogin
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await auditLog({
    req,
    userId: user._id,
    userName: user.userName,
    type: "auth",
    action: "LOGIN",
    message: `User ${user.userName} logged in successfully`,
  });

  sendTokenResponse(user, 200, res);
});

// ─── Get Me ───────────────────────────────────────────────────────────────────

// @desc    Get current logged-in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return next(new ErrorResponse("User not found", 404));
  res.status(200).json({ success: true, data: user });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "auth",
    action: "LOGOUT",
    message: `User ${req.user.userName} logged out`,
  });

  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: "Strict",
    secure: process.env.NODE_ENV === "production",
  });

  res.status(200).json({ success: true, data: {} });
});

// ─── Update Password ──────────────────────────────────────────────────────────

// @desc    Update password (while logged in)
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse("Password is incorrect", 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  await auditLog({
    req,
    userId: user._id,
    userName: user.userName,
    type: "auth",
    action: "PASSWORD_UPDATE",
    message: `User ${user.userName} changed their password`,
  });

  sendTokenResponse(user, 200, res);
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

// @desc    Forgot password — generate reset token + send email
// @route   POST /api/v1/auth/forgetpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    // Return generic response to prevent user enumeration
    return res.status(200).json({
      success: true,
      data: "If that email is registered, a reset link has been sent.",
    });
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const message = `You are receiving this email because you (or someone else) has requested a password reset. Please make a PUT request to:\n\n${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password reset token",
      message,
    });

    await auditLog({
      req,
      userId: user._id,
      userName: user.userName,
      type: "auth",
      action: "PASSWORD_RESET_REQUEST",
      message: `Password reset email sent to ${user.email}`,
    });

    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    console.error("Email send error:", err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse("Email could not be sent", 500));
  }
});

// ─── Reset Password ───────────────────────────────────────────────────────────

// @desc    Reset password via token
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resettoken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse("Invalid or expired token", 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  await auditLog({
    req,
    userId: user._id,
    userName: user.userName,
    type: "auth",
    action: "PASSWORD_RESET",
    message: `Password successfully reset for user ${user.userName}`,
  });

  sendTokenResponse(user, 200, res);
});
