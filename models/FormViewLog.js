const mongoose = require("mongoose");

const FormViewLogSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Form",
    required: true,
  },
  // UUID generated client-side or assigned via cookie to track unique visitors
  visitorId: { type: String, required: true },
  viewedAt: { type: Date, default: Date.now },
});

FormViewLogSchema.index({ formId: 1, viewedAt: -1 });
FormViewLogSchema.index({ formId: 1, visitorId: 1 });
// Auto-expire logs after 90 days to keep collection lean
FormViewLogSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.model("FormViewLog", FormViewLogSchema);
