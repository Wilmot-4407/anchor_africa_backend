const mongoose = require("mongoose");

const RESPONSE_STATUSES = ["new", "reviewed", "followed_up", "pending", "under_review", "approved", "rejected", "completed"];

const FormResponseSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: [true, "Form ID is required"],
    },
    // Dynamic key-value map: { fieldId: answer }
    // Values can be strings, arrays (multi-select/checkboxes), numbers, or file metadata objects
    responseData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Extracted for quick display in admin response table
    respondentName: { type: String, trim: true, default: "" },
    respondentEmail: { type: String, trim: true, lowercase: true, default: "" },
    status: {
      type: String,
      enum: { values: RESPONSE_STATUSES, message: "Invalid status: {VALUE}" },
      default: "new",
    },
    submittedAt: { type: Date, default: Date.now },
    ipAddress: { type: String },
    userAgent: { type: String },
    // Set if a logged-in user submitted (optional)
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

FormResponseSchema.index({ formId: 1, createdAt: -1 });
FormResponseSchema.index({ formId: 1, status: 1 });
FormResponseSchema.index({ respondentEmail: 1 });

module.exports = mongoose.model("FormResponse", FormResponseSchema);
