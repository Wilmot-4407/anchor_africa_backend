// Updated controllers/v1/whyChooseUs.js (add image handling)
const WhyChooseUs = require("../../models/WhyChooseUs");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");

// @desc    Get WhyChooseUs content
// @route   GET /api/v1/why-choose-us
// @access  Public
exports.getWhyChooseUs = asyncHandler(async (req, res, next) => {
  const content = await WhyChooseUs.findOne();
  if (!content)
    return next(new ErrorResponse("WhyChooseUs content not found", 404));
  res.status(200).json({ success: true, data: content });
});

// @desc    Create/Update WhyChooseUs content
// @route   POST /api/v1/why-choose-us
// @access  Private/Admin
exports.upsertWhyChooseUs = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.backgroundImage) {
    req.body.backgroundImage = req.files.backgroundImage[0].location;
  }
  const content = await WhyChooseUs.findOneAndUpdate({}, req.body, {
    new: true,
    upsert: true,
    runValidators: true,
  });
  res.status(200).json({ success: true, data: content });
});

// @desc    Delete WhyChooseUs content
// @route   DELETE /api/v1/why-choose-us
// @access  Private/Admin
exports.deleteWhyChooseUs = asyncHandler(async (req, res, next) => {
  await WhyChooseUs.deleteOne();
  res.status(200).json({ success: true, data: {} });
});
