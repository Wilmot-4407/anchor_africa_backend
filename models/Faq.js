const mongoose = require("mongoose");

const FaqSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    backgroundImage: { type: String },
    reasons: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        type: {
          type: String,
          enum: [
            "General",
            "Services",
            "Treatment",
            "Pricing",
            "Insurance",
            "Other",
          ],
          default: "General",
        },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Faq", FaqSchema);
