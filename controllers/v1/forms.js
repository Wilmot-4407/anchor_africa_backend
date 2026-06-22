const Form = require("../../models/Form");
const FormResponse = require("../../models/FormResponse");
const FormAnalytics = require("../../models/FormAnalytics");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const auditLog = require("../../utils/auditLog");

const ALLOWED_CREATE_FIELDS = ["title", "category", "description", "fields", "settings"];
const ALLOWED_UPDATE_FIELDS = ["title", "category", "description", "fields", "settings", "status"];

// ---------------------------------------------------------------------------
// @desc    Get all forms (admin)
// @route   GET /api/v1/forms
// @access  Admin
// ---------------------------------------------------------------------------
exports.getForms = asyncHandler(async (req, res) => {
  const { status, category, search, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [forms, total] = await Promise.all([
    Form.find(filter)
      .select("title slug category status description fields settings createdAt updatedAt createdBy")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Form.countDocuments(filter),
  ]);

  // Attach response count to each form
  const formIds = forms.map((f) => f._id);
  const responseCounts = await FormResponse.aggregate([
    { $match: { formId: { $in: formIds } } },
    { $group: { _id: "$formId", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(responseCounts.map((r) => [r._id.toString(), r.count]));

  const enriched = forms.map((f) => ({
    ...f,
    responseCount: countMap[f._id.toString()] || 0,
    fieldCount: f.fields ? f.fields.length : 0,
  }));

  res.status(200).json({
    success: true,
    count: enriched.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: enriched,
  });
});

// ---------------------------------------------------------------------------
// @desc    Get single form by ID (admin)
// @route   GET /api/v1/forms/:id
// @access  Admin
// ---------------------------------------------------------------------------
exports.getForm = asyncHandler(async (req, res, next) => {
  const form = await Form.findById(req.params.id).populate("createdBy", "name email");
  if (!form) return next(new ErrorResponse("Form not found", 404));

  const [analytics, responseCount] = await Promise.all([
    FormAnalytics.findOne({ formId: form._id }),
    FormResponse.countDocuments({ formId: form._id }),
  ]);

  res.status(200).json({
    success: true,
    data: { ...form.toObject(), analytics: analytics || {}, responseCount },
  });
});

// ---------------------------------------------------------------------------
// @desc    Create form
// @route   POST /api/v1/forms
// @access  Admin
// ---------------------------------------------------------------------------
exports.createForm = asyncHandler(async (req, res) => {
  const body = {};
  for (const key of ALLOWED_CREATE_FIELDS) {
    if (req.body[key] !== undefined) body[key] = req.body[key];
  }
  body.createdBy = req.user.id;
  body.updatedBy = req.user.id;

  const form = await Form.create(body);

  // Bootstrap analytics document for this form
  await FormAnalytics.create({ formId: form._id });

  auditLog({
    req,
    userId: req.user.id,
    userName: req.user.userName,
    type: "form",
    action: "CREATE",
    message: `Created form: "${form.title}"`,
  });

  res.status(201).json({ success: true, data: form });
});

// ---------------------------------------------------------------------------
// @desc    Update form
// @route   PUT /api/v1/forms/:id
// @access  Admin
// ---------------------------------------------------------------------------
exports.updateForm = asyncHandler(async (req, res, next) => {
  let form = await Form.findById(req.params.id);
  if (!form) return next(new ErrorResponse("Form not found", 404));

  if (form.status === "archived") {
    return next(new ErrorResponse("Cannot update an archived form. Unarchive it first.", 400));
  }

  const body = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (req.body[key] !== undefined) body[key] = req.body[key];
  }
  body.updatedBy = req.user.id;

  form = await Form.findByIdAndUpdate(req.params.id, body, {
    new: true,
    runValidators: true,
  });

  auditLog({
    req,
    userId: req.user.id,
    userName: req.user.userName,
    type: "form",
    action: "UPDATE",
    message: `Updated form: "${form.title}"`,
  });

  res.status(200).json({ success: true, data: form });
});

// ---------------------------------------------------------------------------
// @desc    Delete form (hard delete — also removes responses and analytics)
// @route   DELETE /api/v1/forms/:id
// @access  Admin
// ---------------------------------------------------------------------------
exports.deleteForm = asyncHandler(async (req, res, next) => {
  const form = await Form.findById(req.params.id);
  if (!form) return next(new ErrorResponse("Form not found", 404));

  await Promise.all([
    Form.findByIdAndDelete(req.params.id),
    FormResponse.deleteMany({ formId: req.params.id }),
    FormAnalytics.deleteOne({ formId: req.params.id }),
  ]);

  auditLog({
    req,
    userId: req.user.id,
    userName: req.user.userName,
    type: "form",
    action: "DELETE",
    message: `Deleted form: "${form.title}"`,
  });

  res.status(200).json({ success: true, data: {} });
});

// ---------------------------------------------------------------------------
// @desc    Publish form (sets status → active, isPublished → true)
// @route   PUT /api/v1/forms/:id/publish
// @access  Admin
// ---------------------------------------------------------------------------
exports.publishForm = asyncHandler(async (req, res, next) => {
  let form = await Form.findById(req.params.id);
  if (!form) return next(new ErrorResponse("Form not found", 404));

  if (form.fields.length === 0) {
    return next(new ErrorResponse("Cannot publish a form with no fields", 400));
  }

  form.status = "active";
  form.settings.isPublished = true;
  form.updatedBy = req.user.id;
  await form.save();

  auditLog({
    req,
    userId: req.user.id,
    userName: req.user.userName,
    type: "form",
    action: "UPDATE",
    message: `Published form: "${form.title}"`,
  });

  res.status(200).json({ success: true, data: form });
});

// ---------------------------------------------------------------------------
// @desc    Archive form
// @route   PUT /api/v1/forms/:id/archive
// @access  Admin
// ---------------------------------------------------------------------------
exports.archiveForm = asyncHandler(async (req, res, next) => {
  let form = await Form.findById(req.params.id);
  if (!form) return next(new ErrorResponse("Form not found", 404));

  form.status = "archived";
  form.settings.isPublished = false;
  form.updatedBy = req.user.id;
  await form.save();

  auditLog({
    req,
    userId: req.user.id,
    userName: req.user.userName,
    type: "form",
    action: "UPDATE",
    message: `Archived form: "${form.title}"`,
  });

  res.status(200).json({ success: true, data: form });
});

// ---------------------------------------------------------------------------
// @desc    Unarchive form (reverts to draft)
// @route   PUT /api/v1/forms/:id/unarchive
// @access  Admin
// ---------------------------------------------------------------------------
exports.unarchiveForm = asyncHandler(async (req, res, next) => {
  let form = await Form.findById(req.params.id);
  if (!form) return next(new ErrorResponse("Form not found", 404));

  if (form.status !== "archived") {
    return next(new ErrorResponse("Form is not archived", 400));
  }

  form.status = "draft";
  form.updatedBy = req.user.id;
  await form.save();

  res.status(200).json({ success: true, data: form });
});

// ---------------------------------------------------------------------------
// @desc    Duplicate form
// @route   POST /api/v1/forms/:id/duplicate
// @access  Admin
// ---------------------------------------------------------------------------
exports.duplicateForm = asyncHandler(async (req, res, next) => {
  const original = await Form.findById(req.params.id);
  if (!original) return next(new ErrorResponse("Form not found", 404));

  const duplicateData = {
    title: `Copy of ${original.title}`,
    category: original.category,
    description: original.description,
    fields: original.fields,
    settings: {
      isPublished: false,
      startDate: null,
      endDate: null,
      maxResponses: original.settings.maxResponses,
      allowMultipleSubmissions: original.settings.allowMultipleSubmissions,
    },
    status: "draft",
    createdBy: req.user.id,
    updatedBy: req.user.id,
  };

  const duplicate = await Form.create(duplicateData);
  await FormAnalytics.create({ formId: duplicate._id });

  auditLog({
    req,
    userId: req.user.id,
    userName: req.user.userName,
    type: "form",
    action: "CREATE",
    message: `Duplicated form: "${original.title}" → "${duplicate.title}"`,
  });

  res.status(201).json({ success: true, data: duplicate });
});
