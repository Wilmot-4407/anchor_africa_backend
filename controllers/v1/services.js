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
  if (req.files && req.files.image) {
    req.body.image = req.files.image[0].location;
  }
  const service = await Service.create(req.body);
  res.status(201).json({ success: true, data: service });
});

// @desc    Update service
// @route   PUT /api/v1/services/:id
// @access  Private/Admin
exports.updateService = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.image) {
    req.body.image = req.files.image[0].location;
  }
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
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
