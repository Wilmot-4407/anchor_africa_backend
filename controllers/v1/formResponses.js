const Form = require("../../models/Form");
const FormResponse = require("../../models/FormResponse");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const auditLog = require("../../utils/auditLog");
const { exportToCSV, exportToExcel } = require("../../services/exportService");

const ALLOWED_STATUSES = ["new", "reviewed", "followed_up", "pending", "under_review", "approved", "rejected", "completed"];

// ---------------------------------------------------------------------------
// @desc    Get paginated responses for a form
// @route   GET /api/v1/forms/:formId/responses
// @access  Admin
// ---------------------------------------------------------------------------
exports.getResponses = asyncHandler(async (req, res, next) => {
  const form = await Form.findById(req.params.formId).select("title fields");
  if (!form) return next(new ErrorResponse("Form not found", 404));

  const { status, search, page = 1, limit = 10 } = req.query;
  const filter = { formId: req.params.formId };

  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { respondentName: { $regex: search, $options: "i" } },
      { respondentEmail: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [responses, total] = await Promise.all([
    FormResponse.find(filter)
      .select("respondentName respondentEmail status submittedAt ipAddress")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    FormResponse.countDocuments(filter),
  ]);

  // Status counts for the summary cards in admin UI
  const statusCounts = await FormResponse.aggregate([
    { $match: { formId: form._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));

  res.status(200).json({
    success: true,
    count: responses.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    statusSummary: countByStatus,
    data: responses,
  });
});

// ---------------------------------------------------------------------------
// @desc    Get single response details
// @route   GET /api/v1/forms/:formId/responses/:id
// @access  Admin
// ---------------------------------------------------------------------------
exports.getResponse = asyncHandler(async (req, res, next) => {
  const [form, response] = await Promise.all([
    Form.findById(req.params.formId).select("title fields"),
    FormResponse.findOne({ _id: req.params.id, formId: req.params.formId }),
  ]);

  if (!form) return next(new ErrorResponse("Form not found", 404));
  if (!response) return next(new ErrorResponse("Response not found", 404));

  // Build a structured answer list matching field definitions
  const responseData =
    response.responseData instanceof Map
      ? Object.fromEntries(response.responseData)
      : response.responseData || {};

  const answers = form.fields
    .filter((f) => f.type !== "heading")
    .map((field) => ({
      fieldId: field.id,
      question: field.question,
      type: field.type,
      answer: responseData[field.id] !== undefined ? responseData[field.id] : null,
    }));

  res.status(200).json({
    success: true,
    data: {
      ...response.toObject(),
      answers,
      formTitle: form.title,
    },
  });
});

// ---------------------------------------------------------------------------
// @desc    Update response status (workflow advancement)
// @route   PUT /api/v1/forms/:formId/responses/:id/status
// @access  Admin
// ---------------------------------------------------------------------------
exports.updateResponseStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return next(new ErrorResponse(`Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`, 400));
  }

  const response = await FormResponse.findOne({ _id: req.params.id, formId: req.params.formId });
  if (!response) return next(new ErrorResponse("Response not found", 404));

  response.status = status;
  await response.save();

  auditLog({
    createdBy: req.user.id,
    userName: req.user.name,
    type: "form",
    action: "UPDATE",
    message: `Updated response ${response._id} status to "${status}"`,
    ip: req.ip,
    browserName: req.headers["user-agent"],
  });

  res.status(200).json({ success: true, data: response });
});

// ---------------------------------------------------------------------------
// @desc    Delete a single response
// @route   DELETE /api/v1/forms/:formId/responses/:id
// @access  Admin
// ---------------------------------------------------------------------------
exports.deleteResponse = asyncHandler(async (req, res, next) => {
  const response = await FormResponse.findOne({ _id: req.params.id, formId: req.params.formId });
  if (!response) return next(new ErrorResponse("Response not found", 404));

  await FormResponse.findByIdAndDelete(req.params.id);

  auditLog({
    createdBy: req.user.id,
    userName: req.user.name,
    type: "form",
    action: "DELETE",
    message: `Deleted response ${req.params.id} from form ${req.params.formId}`,
    ip: req.ip,
    browserName: req.headers["user-agent"],
  });

  res.status(200).json({ success: true, data: {} });
});

// ---------------------------------------------------------------------------
// @desc    Export responses as CSV or Excel
// @route   GET /api/v1/forms/:formId/responses/export?format=csv|xlsx
// @access  Admin
// ---------------------------------------------------------------------------
exports.exportResponses = asyncHandler(async (req, res, next) => {
  const form = await Form.findById(req.params.formId).select("title fields");
  if (!form) return next(new ErrorResponse("Form not found", 404));

  const format = (req.query.format || "csv").toLowerCase();
  if (!["csv", "xlsx"].includes(format)) {
    return next(new ErrorResponse("Format must be csv or xlsx", 400));
  }

  const { status } = req.query;
  const filter = { formId: req.params.formId };
  if (status) filter.status = status;

  const responses = await FormResponse.find(filter).sort({ submittedAt: -1 }).lean();

  const filename = `${form.title.replace(/\s+/g, "_")}_responses_${Date.now()}`;

  if (format === "xlsx") {
    const buffer = exportToExcel(responses, form.fields, form.title);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  }

  const csv = exportToCSV(responses, form.fields);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send(csv);
});
