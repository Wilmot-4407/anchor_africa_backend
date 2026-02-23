const TeamMember = require("../../models/TeamMember");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");

// @desc    Get all team members
// @route   GET /api/v1/team
// @access  Public
exports.getTeamMembers = asyncHandler(async (req, res, next) => {
  const members = await TeamMember.find();
  res.status(200).json({ success: true, count: members.length, data: members });
});

// @desc    Get single team member by slug (for TeamDetails)
// @route   GET /api/v1/team/:slug
// @access  Public
exports.getTeamMember = asyncHandler(async (req, res, next) => {
  const member = await TeamMember.findOne({ slug: req.params.slug });
  if (!member) return next(new ErrorResponse("Team member not found", 404));
  res.status(200).json({ success: true, data: member });
});

// @desc    Create team member
// @route   POST /api/v1/team
// @access  Private/Admin
exports.createTeamMember = asyncHandler(async (req, res, next) => {
  if (req.file) {
    req.body.image = req.file.location;
  }

  if (!req.body.name || !req.body.name.trim()) {
    return next(new ErrorResponse("Name is required", 400));
  }

  // Auto-generate slug if not provided
  if (!req.body.slug) {
    req.body.slug = req.body.name.toLowerCase().replace(/\s+/g, "-");
  }

  // Parse arrays sent as comma-separated strings
  if (req.body.education && typeof req.body.education === "string") {
    req.body.education = req.body.education
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }

  if (req.body.specialties && typeof req.body.specialties === "string") {
    req.body.specialties = req.body.specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (req.body.languages && typeof req.body.languages === "string") {
    req.body.languages = req.body.languages
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  const allowedFields = [
    "name",
    "title",
    "slug",
    "specialty",
    "image",
    "bio",
    "education",
    "specialties",
    "experience",
    "languages",
    "contact",
    "social",
  ];
  const cleanBody = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const member = await TeamMember.create(cleanBody);
  res.status(201).json({ success: true, data: member });
});

// @desc    Update team member
// @route   PUT /api/v1/team/:id
// @access  Private/Admin
exports.updateTeamMember = asyncHandler(async (req, res, next) => {
  if (req.file) {
    req.body.image = req.file.location;
  }

  // Parse arrays sent as comma-separated strings
  if (req.body.education && typeof req.body.education === "string") {
    req.body.education = req.body.education
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }

  if (req.body.specialties && typeof req.body.specialties === "string") {
    req.body.specialties = req.body.specialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (req.body.languages && typeof req.body.languages === "string") {
    req.body.languages = req.body.languages
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  const allowedFields = [
    "name",
    "title",
    "slug",
    "specialty",
    "image",
    "bio",
    "education",
    "specialties",
    "experience",
    "languages",
    "contact",
    "social",
  ];
  const cleanBody = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const member = await TeamMember.findByIdAndUpdate(req.params.id, cleanBody, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!member) return next(new ErrorResponse("Team member not found", 404));
  res.status(200).json({ success: true, data: member });
});

// @desc    Delete team member
// @route   DELETE /api/v1/team/:id
// @access  Private/Admin
exports.deleteTeamMember = asyncHandler(async (req, res, next) => {
  const member = await TeamMember.findByIdAndDelete(req.params.id);
  if (!member) return next(new ErrorResponse("Team member not found", 404));
  res.status(200).json({ success: true, data: {} });
});
