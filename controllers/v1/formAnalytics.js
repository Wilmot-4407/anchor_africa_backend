const Form = require("../../models/Form");
const FormAnalytics = require("../../models/FormAnalytics");
const FormViewLog = require("../../models/FormViewLog");
const FormSubmissionLog = require("../../models/FormSubmissionLog");
const FormResponse = require("../../models/FormResponse");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");

// ---------------------------------------------------------------------------
// @desc    Get analytics dashboard for a specific form
// @route   GET /api/v1/forms/:formId/analytics
// @access  Admin
// ---------------------------------------------------------------------------
exports.getFormAnalytics = asyncHandler(async (req, res, next) => {
  const form = await Form.findById(req.params.formId).select("title fields createdAt");
  if (!form) return next(new ErrorResponse("Form not found", 404));

  const analytics = await FormAnalytics.findOne({ formId: req.params.formId });
  if (!analytics) {
    return res.status(200).json({
      success: true,
      data: {
        formId: req.params.formId,
        formTitle: form.title,
        views: 0,
        starts: 0,
        submissions: 0,
        conversionRate: 0,
        abandonmentRate: 0,
        dailyMetrics: [],
        statusBreakdown: [],
      },
    });
  }

  // Daily metrics for the last 14 days from submission logs
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const [dailyViews, dailySubmissions, statusBreakdown] = await Promise.all([
    FormViewLog.aggregate([
      { $match: { formId: form._id, viewedAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: "$viewedAt" },
            month: { $month: "$viewedAt" },
            day: { $dayOfMonth: "$viewedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]),
    FormSubmissionLog.aggregate([
      { $match: { formId: form._id, submittedAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: "$submittedAt" },
            month: { $month: "$submittedAt" },
            day: { $dayOfMonth: "$submittedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]),
    FormResponse.aggregate([
      { $match: { formId: form._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  // Build a 14-day calendar merging views and submissions
  const dailyMetrics = buildDailyCalendar(since, dailyViews, dailySubmissions);

  res.status(200).json({
    success: true,
    data: {
      formId: form._id,
      formTitle: form.title,
      views: analytics.views,
      starts: analytics.starts,
      submissions: analytics.submissions,
      conversionRate: analytics.conversionRate,
      abandonmentRate: analytics.abandonmentRate,
      dailyMetrics,
      statusBreakdown: statusBreakdown.map((s) => ({ status: s._id, count: s.count })),
    },
  });
});

// ---------------------------------------------------------------------------
// @desc    Get analytics overview for all forms (admin dashboard)
// @route   GET /api/v1/forms/analytics/overview
// @access  Admin
// ---------------------------------------------------------------------------
exports.getAnalyticsOverview = asyncHandler(async (req, res) => {
  const [totalForms, statusCounts, topForms] = await Promise.all([
    Form.countDocuments(),
    Form.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    FormAnalytics.find()
      .sort({ submissions: -1 })
      .limit(5)
      .populate("formId", "title slug category"),
  ]);

  const [totalViews, totalSubmissions] = await Promise.all([
    FormAnalytics.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }]),
    FormAnalytics.aggregate([{ $group: { _id: null, total: { $sum: "$submissions" } } }]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalForms,
      totalViews: totalViews[0]?.total || 0,
      totalSubmissions: totalSubmissions[0]?.total || 0,
      formsByStatus: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
      topForms: topForms.map((a) => ({
        formId: a.formId?._id,
        title: a.formId?.title,
        slug: a.formId?.slug,
        category: a.formId?.category,
        views: a.views,
        submissions: a.submissions,
        conversionRate: a.conversionRate,
      })),
    },
  });
});

// ---------------------------------------------------------------------------
// Internal helper — builds a 14-entry daily array filling missing days with 0
// ---------------------------------------------------------------------------
function buildDailyCalendar(since, viewsAgg, submissionsAgg) {
  const viewMap = {};
  for (const v of viewsAgg) {
    const key = `${v._id.year}-${String(v._id.month).padStart(2, "0")}-${String(v._id.day).padStart(2, "0")}`;
    viewMap[key] = v.count;
  }

  const submissionMap = {};
  for (const s of submissionsAgg) {
    const key = `${s._id.year}-${String(s._id.month).padStart(2, "0")}-${String(s._id.day).padStart(2, "0")}`;
    submissionMap[key] = s.count;
  }

  const result = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    result.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      views: viewMap[key] || 0,
      responses: submissionMap[key] || 0,
    });
  }
  return result;
}
