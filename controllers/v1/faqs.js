// Updated controllers/v1/faq.js (add image handling)
const Faq = require("../../models/Faq");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");

// @desc    Get Faq content
// @route   GET /api/v1/faqs
// @access  Public
exports.getFaq = asyncHandler(async (req, res, next) => {
  const content = await Faq.findOne();
  res.status(200).json({ success: true, data: content || null });
});

// @desc    Create/Update Faq content
// @route   POST /api/v1/faqs
// @access  Private/Admin
exports.upsertFaq = asyncHandler(async (req, res, next) => {
  if (req.file) {
    req.body.backgroundImage = req.file.location;
  }

  if (!req.body.title || !req.body.title.trim()) {
    return next(new ErrorResponse("Title is required", 400));
  }

  // Parse reasons if sent as JSON string
  if (req.body.reasons && typeof req.body.reasons === "string") {
    try {
      req.body.reasons = JSON.parse(req.body.reasons);
    } catch {
      return next(new ErrorResponse("Invalid reasons format", 400));
    }
  }

  const allowedFields = ["title", "backgroundImage", "reasons"];
  const cleanBody = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const content = await Faq.findOneAndUpdate({}, cleanBody, {
    returnDocument: "after",
    upsert: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: content });
});

// @desc    Delete Faq content
// @route   DELETE /api/v1/faqs
// @access  Private/Admin
exports.deleteFaq = asyncHandler(async (req, res, next) => {
  await Faq.deleteOne();
  res.status(200).json({ success: true, data: {} });
});
