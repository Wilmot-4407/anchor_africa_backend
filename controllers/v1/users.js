const User = require("../../models/User");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const bcrypt = require("bcryptjs");

// @desc    Create a new user
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const {
    userName,
    email,
    dob,
    role,
    password,
    firstName,
    lastName,
    phoneNumber,
    address,
  } = req.body;

  if (!userName || !email || !dob || !password || !firstName || !lastName) {
    return next(new ErrorResponse("Please provide all required fields", 400));
  }

  const user = await User.create({
    userName,
    email,
    dob,
    role,
    password,
    firstName,
    lastName,
    phoneNumber,
    address,
    profilePicture: req.file ? req.file.location : "default.png",
  });

  res.status(201).json({ success: true, data: user });
});

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find();

  // Cloudinary URLs are direct public URLs — no signing needed
  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404),
    );
  }

  // Cloudinary URLs are direct public URLs — no signing needed
  res.status(200).json({ success: true, data: user });
});

// @desc    Update User
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const updatedData = {};

  const allowedFields = [
    "userName",
    "email",
    "firstName",
    "lastName",
    "role",
    "status",
    "phoneNumber",
    "address",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updatedData[field] = req.body[field];
  });

  if (req.body.dob) {
    const formattedDob = new Date(req.body.dob);
    if (!isNaN(formattedDob.getTime())) {
      updatedData.dob = formattedDob;
    }
  }

  if (req.file) {
    updatedData.profilePicture = req.file.location;
  }

  if (req.body.password && req.body.password.trim() !== "") {
    const salt = await bcrypt.genSalt(12);
    updatedData.password = await bcrypt.hash(req.body.password, salt);
  }

  const user = await User.findByIdAndUpdate(req.params.id, updatedData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404),
    );
  }

  res.status(200).json({ success: true, data: user });
});

// @desc    Delete User
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404),
    );
  }

  res.status(200).json({ success: true, data: {} });
});
