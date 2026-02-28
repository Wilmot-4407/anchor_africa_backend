/**
 * utils/auditLog.js
 *
 * Lightweight fire-and-forget helper that writes a Log document after every
 * meaningful action across the API. It swallows its own errors so a logging
 * failure can never break a real request.
 *
 * Usage (inside any controller):
 *   const auditLog = require("../../utils/auditLog");
 *
 *   await auditLog({
 *     req,                         // Express request (for IP + UA)
 *     userId:  req.user?._id,      // MongoDB ObjectId of actor
 *     userName: req.user?.userName,
 *     type:   "auth",              // module slug (auth|user|team|blog|service|about|faq)
 *     action: "LOGIN",             // verb (CREATE|UPDATE|DELETE|LOGIN|LOGOUT|…)
 *     message: "User john logged in from 127.0.0.1",
 *   });
 */

const Log = require("../models/Log");

/**
 * @param {object} opts
 * @param {import("express").Request} opts.req
 * @param {string|import("mongoose").Types.ObjectId} opts.userId
 * @param {string} [opts.userName]
 * @param {string} opts.type
 * @param {string} [opts.action]
 * @param {string} opts.message
 */
const auditLog = async ({ req, userId, userName, type, action, message }) => {
  try {
    if (!userId) {
      // Some public actions (e.g. failed logins) may not have a userId yet.
      // Skip silently to avoid a validation error on the Log model.
      return;
    }

    const ip =
      req?.headers?.["x-forwarded-for"]?.split(",")[0].trim() ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      "unknown";

    const browserName = req?.headers?.["user-agent"] || "unknown";

    await Log.create({
      createdBy: userId,
      ip,
      browserName,
      userName: userName || "unknown",
      type,
      action: action || "ACTION",
      message,
    });
  } catch (err) {
    // Never let audit logging crash a real request
    console.error("[AuditLog] Failed to write log:", err.message);
  }
};

module.exports = auditLog;
