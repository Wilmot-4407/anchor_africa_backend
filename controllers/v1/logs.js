/**
 * controllers/v1/logs.js
 *
 * HTTP handlers for the /api/v1/logs routes.
 * The exported `createLog` function is also used internally by other
 * controllers as a lightweight audit helper (prefer utils/auditLog.js
 * for fire-and-forget calls from within controllers).
 */

const asyncHandler = require("../../middleware/async");
const Log = require("../../models/Log");
const ErrorResponse = require("../../utils/errorResponse");

// ─── Internal utility (used by other controllers) ─────────────────────────────

/**
 * Programmatically create a log entry (not an HTTP route handler).
 *
 * @param {object} info  Fields matching the Log schema
 * @returns {Promise<import("mongoose").Document|string>}
 */
exports.createLog = async (info) => {
  if (!info) return "error creating log";
  try {
    const newLog = await Log.create(info);
    return newLog;
  } catch (err) {
    console.error("[createLog] Error:", err.message);
    return `error creating log: ${err.message}`;
  }
};

// ─── GET /api/v1/logs  (admin only) ──────────────────────────────────────────

/**
 * @desc    Get all logs with pagination
 * @route   GET /api/v1/logs?page=1&limit=50&type=auth&action=LOGIN
 * @access  Private/Admin
 */
exports.getLogs = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.userName) filter.userName = new RegExp(req.query.userName, "i");

  // Date range filter
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [logs, total] = await Promise.all([
    Log.find(filter)
      .populate("createdBy", "firstName lastName email userName role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "browserName ip type action message userName createdAt createdBy",
      ),
    Log.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: logs,
  });
});

// ─── GET /api/v1/logs/types  ──────────────────────────────────────────────────

/**
 * @desc    Get all distinct log types (for filter dropdowns)
 * @route   GET /api/v1/logs/types
 * @access  Private/Admin
 */
exports.getLogTypes = asyncHandler(async (req, res) => {
  const types = await Log.distinct("type");
  const actions = await Log.distinct("action");
  res.status(200).json({ success: true, data: { types, actions } });
});

// ─── GET /api/v1/logs/by-type/:type  ─────────────────────────────────────────

/**
 * @desc    Get logs filtered by type
 * @route   GET /api/v1/logs/by-type/:type
 * @access  Private/Admin
 */
exports.getLogsByType = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;

  const [logs, total] = await Promise.all([
    Log.find({ type: req.params.type })
      .populate("createdBy", "firstName lastName email userName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Log.countDocuments({ type: req.params.type }),
  ]);

  if (!logs.length) {
    return next(
      new ErrorResponse(`No logs found for type "${req.params.type}"`, 404),
    );
  }

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: logs,
  });
});

// ─── GET /api/v1/logs/user/:id  ──────────────────────────────────────────────

/**
 * @desc    Get logs by the user who performed the action
 * @route   GET /api/v1/logs/user/:id
 * @access  Private (own logs) or Admin (any user)
 */
exports.getLogByUserId = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;

  const [logs, total] = await Promise.all([
    Log.find({ createdBy: req.params.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Log.countDocuments({ createdBy: req.params.id }),
  ]);

  res.status(200).json({
    success: true,
    count: logs.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: logs,
  });
});

// ─── GET /api/v1/logs/:id  ───────────────────────────────────────────────────

/**
 * @desc    Get a single log entry by its own _id
 * @route   GET /api/v1/logs/:id
 * @access  Private/Admin
 */
exports.getLogById = asyncHandler(async (req, res, next) => {
  const log = await Log.findById(req.params.id).populate(
    "createdBy",
    "firstName lastName email userName",
  );

  if (!log) {
    return next(
      new ErrorResponse(`Log not found with id ${req.params.id}`, 404),
    );
  }

  res.status(200).json({ success: true, data: log });
});

// ─── DELETE /api/v1/logs  (admin — bulk clear) ───────────────────────────────

/**
 * @desc    Delete all logs (or filtered subset) — use with caution
 * @route   DELETE /api/v1/logs?type=auth&olderThanDays=30
 * @access  Private/Admin
 */
exports.deleteLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.olderThanDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(req.query.olderThanDays, 10));
    filter.createdAt = { $lt: cutoff };
  }

  const result = await Log.deleteMany(filter);
  res.status(200).json({
    success: true,
    deleted: result.deletedCount,
  });
});
