/**
 * controllers/v1/about.js  — with full audit trail
 */

const About = require("../../models/About");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const auditLog = require("../../utils/auditLog");

// @desc    Get About content
// @route   GET /api/v1/about
// @access  Public
exports.getAbout = asyncHandler(async (req, res, next) => {
  const about = await About.findOne();
  res.status(200).json({ success: true, data: about || null });
});

// @desc    Create/Update About content (upsert)
// @route   POST /api/v1/about
// @access  Private/Admin
exports.upsertAbout = asyncHandler(async (req, res, next) => {
  if (req.file) req.body.image = req.file.location;

  const { title, description } = req.body;
  if (!title || !title.trim())
    return next(new ErrorResponse("Title is required", 400));
  if (!description || !description.trim())
    return next(new ErrorResponse("Description is required", 400));

  if (req.body.sections && typeof req.body.sections === "string") {
    try {
      req.body.sections = JSON.parse(req.body.sections);
    } catch {
      return next(new ErrorResponse("Invalid sections format", 400));
    }
  }
  if (req.body.openHours && typeof req.body.openHours === "string") {
    try {
      req.body.openHours = JSON.parse(req.body.openHours);
    } catch {
      return next(new ErrorResponse("Invalid openHours format", 400));
    }
  }
  if (req.body.features && typeof req.body.features === "string") {
    try {
      req.body.features = JSON.parse(req.body.features);
    } catch {
      return next(new ErrorResponse("Invalid features format", 400));
    }
  }
  if (typeof req.body.visible === "string") {
    req.body.visible = req.body.visible === "true";
  }

  const allowedFields = [
    "title",
    "description",
    "image",
    "features",
    "ctaText",
    "ctaLink",
    "phone",
    "openHours",
    "visible",
    "sections",
  ];
  const cleanBody = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const isNew = !(await About.findOne().select("_id"));

  const about = await About.findOneAndUpdate({}, cleanBody, {
    returnDocument: "after",
    upsert: true,
    runValidators: false,
  });

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "about",
    action: isNew ? "CREATE" : "UPDATE",
    message: `Admin ${req.user.userName} ${isNew ? "created" : "updated"} the About page content`,
  });

  res.status(200).json({ success: true, data: about });
});

// @desc    Delete About content
// @route   DELETE /api/v1/about
// @access  Private/Admin
exports.deleteAbout = asyncHandler(async (req, res, next) => {
  const about = await About.findOne();
  if (!about)
    return next(new ErrorResponse("No about content found to delete", 404));

  await About.deleteOne();

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "about",
    action: "DELETE",
    message: `Admin ${req.user.userName} deleted the About page content`,
  });

  res.status(200).json({ success: true, data: {} });
});
