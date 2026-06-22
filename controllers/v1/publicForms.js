const Form = require("../../models/Form");
const FormResponse = require("../../models/FormResponse");
const FormAnalytics = require("../../models/FormAnalytics");
const FormViewLog = require("../../models/FormViewLog");
const FormSubmissionLog = require("../../models/FormSubmissionLog");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const { validateSubmission, extractRespondentInfo } = require("../../services/formValidationEngine");
const { v4: uuidv4 } = require("uuid");
const xss = require("xss");

// Recursively XSS-sanitize all string values in an object
function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") {
      clean[key] = xss(val);
    } else if (Array.isArray(val)) {
      clean[key] = val.map((v) => (typeof v === "string" ? xss(v) : v));
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

// ---------------------------------------------------------------------------
// @desc    Get published form by slug (public)
// @route   GET /api/v1/public/forms/:slug
// @access  Public
// ---------------------------------------------------------------------------
exports.getFormBySlug = asyncHandler(async (req, res, next) => {
  const form = await Form.findOne({ slug: req.params.slug }).select(
    "title slug category description status settings fields createdAt"
  );

  if (!form) return next(new ErrorResponse("Form not found", 404));

  if (!form.settings.isPublished || form.status !== "active") {
    return next(new ErrorResponse("This form is not available", 403));
  }

  const now = new Date();
  if (form.settings.startDate && now < new Date(form.settings.startDate)) {
    return next(new ErrorResponse("This form is not open yet", 403));
  }
  if (form.settings.endDate && now > new Date(form.settings.endDate)) {
    return next(new ErrorResponse("This form has closed", 403));
  }

  // Return only fields needed to render the form; omit internal metadata
  res.status(200).json({
    success: true,
    data: {
      id: form._id,
      title: form.title,
      slug: form.slug,
      category: form.category,
      description: form.description,
      fields: form.fields,
      settings: {
        allowMultipleSubmissions: form.settings.allowMultipleSubmissions,
        endDate: form.settings.endDate,
      },
    },
  });
});

// ---------------------------------------------------------------------------
// @desc    Submit form response (public)
// @route   POST /api/v1/public/forms/:slug/submit
// @access  Public
// ---------------------------------------------------------------------------
exports.submitForm = asyncHandler(async (req, res, next) => {
  const form = await Form.findOne({ slug: req.params.slug });
  if (!form) return next(new ErrorResponse("Form not found", 404));

  if (!form.settings.isPublished || form.status !== "active") {
    return next(new ErrorResponse("This form is not accepting submissions", 403));
  }

  const now = new Date();
  if (form.settings.startDate && now < new Date(form.settings.startDate)) {
    return next(new ErrorResponse("This form is not open yet", 403));
  }
  if (form.settings.endDate && now > new Date(form.settings.endDate)) {
    return next(new ErrorResponse("Submission deadline has passed", 403));
  }

  // Check max responses limit
  if (form.settings.maxResponses) {
    const count = await FormResponse.countDocuments({ formId: form._id });
    if (count >= form.settings.maxResponses) {
      return next(new ErrorResponse("This form has reached its maximum number of responses", 403));
    }
  }

  // Check duplicate submissions by IP when not allowed
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress;
  if (!form.settings.allowMultipleSubmissions) {
    const existing = await FormResponse.findOne({ formId: form._id, ipAddress: clientIp });
    if (existing) {
      return next(new ErrorResponse("You have already submitted this form", 409));
    }
  }

  // Merge text body with any uploaded files.
  // Sanitize text fields here because multer-parsed bodies bypass the global XSS middleware.
  const submission = sanitizeObject({ ...req.body });
  if (req.uploadedFiles) {
    for (const [fieldId, fileMeta] of Object.entries(req.uploadedFiles)) {
      submission[fieldId] = fileMeta;
    }
  }

  // Dynamic validation against form schema
  const { valid, errors } = validateSubmission(form.fields, submission);
  if (!valid) {
    return res.status(422).json({ success: false, errors });
  }

  const { respondentName, respondentEmail } = extractRespondentInfo(form.fields, submission);

  const response = await FormResponse.create({
    formId: form._id,
    responseData: submission,
    respondentName,
    respondentEmail,
    status: "new",
    submittedAt: now,
    ipAddress: clientIp,
    userAgent: req.headers["user-agent"],
  });

  // Fire-and-forget: log submission and update analytics
  _postSubmissionTasks(form._id, response._id, clientIp).catch(() => {});

  res.status(201).json({
    success: true,
    message: "Form submitted successfully",
    data: { submissionId: response._id },
  });
});

// ---------------------------------------------------------------------------
// @desc    Track form view (public) — called when form page loads
// @route   POST /api/v1/public/forms/:slug/track-view
// @access  Public
// ---------------------------------------------------------------------------
exports.trackView = asyncHandler(async (req, res, next) => {
  const form = await Form.findOne({ slug: req.params.slug }).select("_id settings status");
  if (!form || !form.settings.isPublished || form.status !== "active") {
    return res.status(200).json({ success: true }); // Silently ignore for unpublished forms
  }

  const visitorId = req.body.visitorId || uuidv4();

  await Promise.all([
    FormViewLog.create({ formId: form._id, visitorId }),
    FormAnalytics.findOneAndUpdate(
      { formId: form._id },
      { $inc: { views: 1 } },
      { upsert: true }
    ),
  ]);

  // Recompute rates after increment
  _recomputeRates(form._id).catch(() => {});

  res.status(200).json({ success: true, visitorId });
});

// ---------------------------------------------------------------------------
// @desc    Track form start (public) — called when user begins filling the form
// @route   POST /api/v1/public/forms/:slug/track-start
// @access  Public
// ---------------------------------------------------------------------------
exports.trackStart = asyncHandler(async (req, res, next) => {
  const form = await Form.findOne({ slug: req.params.slug }).select("_id settings status");
  if (!form || !form.settings.isPublished || form.status !== "active") {
    return res.status(200).json({ success: true });
  }

  await FormAnalytics.findOneAndUpdate(
    { formId: form._id },
    { $inc: { starts: 1 } },
    { upsert: true }
  );

  _recomputeRates(form._id).catch(() => {});

  res.status(200).json({ success: true });
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _postSubmissionTasks(formId, responseId, ipAddress) {
  await Promise.all([
    FormSubmissionLog.create({ formId, responseId, ipAddress }),
    FormAnalytics.findOneAndUpdate(
      { formId },
      { $inc: { submissions: 1 } },
      { upsert: true }
    ),
  ]);
  await _recomputeRates(formId);
}

async function _recomputeRates(formId) {
  const analytics = await FormAnalytics.findOne({ formId });
  if (!analytics) return;
  // Pre-save hook on FormAnalytics handles the rate computation
  await analytics.save();
}
