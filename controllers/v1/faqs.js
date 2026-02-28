/**
 * controllers/v1/faqs.js  — with full audit trail
 */

const Faq = require("../../models/Faq");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const auditLog = require("../../utils/auditLog");

// @desc    Get FAQ content
// @route   GET /api/v1/faqs
// @access  Public
exports.getFaq = asyncHandler(async (req, res, next) => {
  const content = await Faq.findOne();
  res.status(200).json({ success: true, data: content || null });
});

// @desc    Create/Update FAQ content (upsert)
// @route   POST /api/v1/faqs
// @access  Private/Admin
exports.upsertFaq = asyncHandler(async (req, res, next) => {
  if (req.file) req.body.backgroundImage = req.file.location;

  if (!req.body.title || !req.body.title.trim()) {
    return next(new ErrorResponse("Title is required", 400));
  }

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

  const isNew = !(await Faq.findOne().select("_id"));

  const content = await Faq.findOneAndUpdate({}, cleanBody, {
    returnDocument: "after",
    upsert: true,
    runValidators: true,
  });

  const reasonCount = cleanBody.reasons?.length ?? 0;

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "faq",
    action: isNew ? "CREATE" : "UPDATE",
    message: `Admin ${req.user.userName} ${isNew ? "created" : "updated"} FAQ content with ${reasonCount} question(s)`,
  });

  res.status(200).json({ success: true, data: content });
});

// @desc    Delete FAQ content
// @route   DELETE /api/v1/faqs
// @access  Private/Admin
exports.deleteFaq = asyncHandler(async (req, res, next) => {
  await Faq.deleteOne();

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "faq",
    action: "DELETE",
    message: `Admin ${req.user.userName} deleted all FAQ content`,
  });

  res.status(200).json({ success: true, data: {} });
});
