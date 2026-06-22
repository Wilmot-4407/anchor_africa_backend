const mongoose = require("mongoose");

const FormAnalyticsSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
      unique: true,
    },
    views: { type: Number, default: 0, min: 0 },
    starts: { type: Number, default: 0, min: 0 },
    submissions: { type: Number, default: 0, min: 0 },
    // Stored as percentages (0-100), recomputed on each increment
    abandonmentRate: { type: Number, default: 0, min: 0, max: 100 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

// Recompute rates before every save
FormAnalyticsSchema.pre("save", function () {
  if (this.views > 0) {
    this.conversionRate = parseFloat(((this.submissions / this.views) * 100).toFixed(2));
  } else {
    this.conversionRate = 0;
  }

  if (this.starts > 0) {
    this.abandonmentRate = parseFloat((((this.starts - this.submissions) / this.starts) * 100).toFixed(2));
  } else {
    this.abandonmentRate = 0;
  }
});

module.exports = mongoose.model("FormAnalytics", FormAnalyticsSchema);
