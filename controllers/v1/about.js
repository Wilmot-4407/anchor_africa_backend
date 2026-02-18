// Updated controllers/v1/about.js (add image handling)
const About = require("../../models/About");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");

// @desc    Get About content
// @route   GET /api/v1/about
// @access  Public
exports.getAbout = asyncHandler(async (req, res, next) => {
  const about = await About.findOne(); // Assuming singleton
  if (!about) return next(new ErrorResponse("About content not found", 404));
  res.status(200).json({ success: true, data: about });
});

// @desc    Create/Update About content (upsert)
// @route   POST /api/v1/about
// @access  Private/Admin
exports.upsertAbout = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.image) {
    req.body.image = req.files.image[0].location;
  }
  const about = await About.findOneAndUpdate({}, req.body, {
    new: true,
    upsert: true,
    runValidators: true,
  });
  res.status(200).json({ success: true, data: about });
});

// @desc    Delete About content
// @route   DELETE /api/v1/about
// @access  Private/Admin
exports.deleteAbout = asyncHandler(async (req, res, next) => {
  await About.deleteOne();
  res.status(200).json({ success: true, data: {} });
});
