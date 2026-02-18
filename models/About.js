const mongoose = require("mongoose");

const AboutSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String }, // Background or main image
    sections: [
      {
        title: String,
        content: String,
        icon: String,
      },
    ], // For sub-sections like widgets
    // Add more fields based on About.jsx content
  },
  { timestamps: true },
);

// Since About is likely a singleton, we can use findOneOrCreate logic in controller
module.exports = mongoose.model("About", AboutSchema);
