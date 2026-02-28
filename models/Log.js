const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      trim: true,
    },
    ip: {
      type: String,
      trim: true,
      // required: true,
    },
    browserName: {
      type: String,
      trim: true,
    },
    userName: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
      required: true,
    },
    action: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Log", logSchema);
