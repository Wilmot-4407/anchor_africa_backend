const TeamMember = require("../../models/TeamMember");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const { getSignedUrlForKey } = require("../../config/awsConfig");

// Helper for signed URL
const attachSignedUrl = async (member) => {
  if (member.image && member.image.includes(".amazonaws.com/")) {
    const fileKey = member.image.split(".com/")[1];
    member.image = await getSignedUrlForKey(fileKey, 300);
  }
  return member;
};

// @desc    Get all team members
// @route   GET /api/v1/team
// @access  Public
exports.getTeamMembers = asyncHandler(async (req, res, next) => {
  let members = await TeamMember.find();
  members = await Promise.all(members.map(attachSignedUrl));
  res.status(200).json({ success: true, count: members.length, data: members });
});

// @desc    Get single team member by slug (for TeamDetails)
// @route   GET /api/v1/team/:slug
// @access  Public
exports.getTeamMember = asyncHandler(async (req, res, next) => {
  let member = await TeamMember.findOne({ slug: req.params.slug });
  if (!member) return next(new ErrorResponse("Team member not found", 404));
  member = await attachSignedUrl(member);
  res.status(200).json({ success: true, data: member });
});

// @desc    Create team member
// @route   POST /api/v1/team
// @access  Private/Admin
exports.createTeamMember = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.image) {
    req.body.image = req.files.image[0].location;
  }
  const member = await TeamMember.create(req.body);
  res.status(201).json({ success: true, data: member });
});

// @desc    Update team member
// @route   PUT /api/v1/team/:id
// @access  Private/Admin
exports.updateTeamMember = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.image) {
    req.body.image = req.files.image[0].location;
  }
  const member = await TeamMember.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
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
