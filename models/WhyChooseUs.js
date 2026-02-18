const mongoose = require("mongoose");

const WhyChooseUsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    backgroundImage: { type: String },
    reasons: [
      {
        icon: String,
        title: String,
        description: String,
      },
    ], // Array of reasons from WhyChooseUs.jsx
  },
  { timestamps: true },
);

module.exports = mongoose.model("WhyChooseUs", WhyChooseUsSchema);
