const Service = require("../../models/Service");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");

// @desc    Get all services (optionally filter by type: clinic or institute)
// @route   GET /api/v1/services?type=clinic (or institute)
// @access  Public
exports.getServices = asyncHandler(async (req, res, next) => {
  const { type } = req.query;
  const filter = type ? { type } : {};
  const services = await Service.find(filter);
  res
    .status(200)
    .json({ success: true, count: services.length, data: services });
});

// @desc    Get single service by slug (for ServiceDetails)
// @route   GET /api/v1/services/:slug
// @access  Public
exports.getService = asyncHandler(async (req, res, next) => {
  const service = await Service.findOne({ slug: req.params.slug });
  if (!service) return next(new ErrorResponse("Service not found", 404));
  res.status(200).json({ success: true, data: service });
});

// @desc    Create service
// @route   POST /api/v1/services
// @access  Private/Admin
exports.createService = asyncHandler(async (req, res, next) => {
  if (req.file) {
    req.body.image = req.file.location;
  }

  if (!req.body.title || !req.body.title.trim()) {
    return next(new ErrorResponse("Title is required", 400));
  }
  if (!req.body.category || !req.body.category.trim()) {
    return next(new ErrorResponse("Category is required", 400));
  }

  // Auto-generate slug if not provided
  if (!req.body.slug) {
    req.body.slug = req.body.title.toLowerCase().replace(/\s+/g, "-");
  }

  // Parse arrays sent as comma-separated strings
  if (req.body.features && typeof req.body.features === "string") {
    req.body.features = req.body.features
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
  }

  if (req.body.benefits && typeof req.body.benefits === "string") {
    req.body.benefits = req.body.benefits
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
  }

  const allowedFields = [
    "title",
    "type",
    "category",
    "slug",
    "shortDescription",
    "fullDescription",
    "icon",
    "image",
    "features",
    "duration",
    "specialists",
    "benefits",
  ];
  const cleanBody = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const service = await Service.create(cleanBody);
  res.status(201).json({ success: true, data: service });
});

// @desc    Update service
// @route   PUT /api/v1/services/:id
// @access  Private/Admin
exports.updateService = asyncHandler(async (req, res, next) => {
  if (req.file) {
    req.body.image = req.file.location;
  }

  // Parse arrays sent as comma-separated strings
  if (req.body.features && typeof req.body.features === "string") {
    req.body.features = req.body.features
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
  }

  if (req.body.benefits && typeof req.body.benefits === "string") {
    req.body.benefits = req.body.benefits
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);
  }

  const allowedFields = [
    "title",
    "type",
    "category",
    "slug",
    "shortDescription",
    "fullDescription",
    "icon",
    "image",
    "features",
    "duration",
    "specialists",
    "benefits",
  ];
  const cleanBody = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const service = await Service.findByIdAndUpdate(req.params.id, cleanBody, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!service) return next(new ErrorResponse("Service not found", 404));
  res.status(200).json({ success: true, data: service });
});

// @desc    Delete service
// @route   DELETE /api/v1/services/:id
// @access  Private/Admin
exports.deleteService = asyncHandler(async (req, res, next) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) return next(new ErrorResponse("Service not found", 404));
  res.status(200).json({ success: true, data: {} });
});
