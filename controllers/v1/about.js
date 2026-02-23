const About = require("../../models/About");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");

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
  // BUG FIX: The upload middleware uses multer's .single("image") which puts
  // the uploaded file in req.file (singular), NOT req.files (plural).
  // req.files is only populated when using .fields([...]) or .array().
  // Previous code checked req.files.image[0].location which was always
  // undefined, meaning the Cloudinary URL was silently never saved from upload.
  if (req.file) {
    req.body.image = req.file.location;
  }

  const { title, description } = req.body;

  if (!title || !title.trim()) {
    return next(new ErrorResponse("Title is required", 400));
  }
  if (!description || !description.trim()) {
    return next(new ErrorResponse("Description is required", 400));
  }

  // Parse JSON-stringified arrays (sent as text fields in multipart/form-data)
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

  // Coerce "true"/"false" strings sent via multipart into actual booleans
  if (typeof req.body.visible === "string") {
    req.body.visible = req.body.visible === "true";
  }

  // Strip to known fields to avoid Mongoose strict-mode warnings
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

  // Use `returnDocument: 'after'` — correct for Mongoose 7+.
  // (new: true is deprecated in Mongoose 7+ and triggers a console warning)
  const about = await About.findOneAndUpdate({}, cleanBody, {
    returnDocument: "after",
    upsert: true,
    runValidators: false,
  });

  res.status(200).json({ success: true, data: about });
});

// @desc    Delete About content
// @route   DELETE /api/v1/about
// @access  Private/Admin
exports.deleteAbout = asyncHandler(async (req, res, next) => {
  const about = await About.findOne();

  if (!about) {
    return next(new ErrorResponse("No about content found to delete", 404));
  }

  await About.deleteOne();
  res.status(200).json({ success: true, data: {} });
});
