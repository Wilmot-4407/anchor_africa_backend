const mongoose = require("mongoose");

const FormSubmissionLogSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Form",
    required: true,
  },
  responseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FormResponse",
    required: true,
  },
  submittedAt: { type: Date, default: Date.now },
  ipAddress: { type: String },
});

FormSubmissionLogSchema.index({ formId: 1, submittedAt: -1 });
// Auto-expire after 180 days
FormSubmissionLogSchema.index({ submittedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

module.exports = mongoose.model("FormSubmissionLog", FormSubmissionLogSchema);
