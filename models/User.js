const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "Please provide a valid username"],
      unique: true,
      trim: true,
      minlength: [4, "Username should be at least 4 characters long"],
      maxlength: [20, "Username cannot be more than 20 characters long"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    dob: {
      type: Date,
      required: [true, "Please add your date of birth"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    password: {
      type: String,
      minlength: [8, "Password should be at least 8 characters long"],
      required: true,
      select: false,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "First name cannot be more than 50 characters long"],
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Last name cannot be more than 50 characters long"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],
    phoneNumber: {
      type: String,
      maxlength: [25, "Phone number cannot be more than 25 characters"],
    },
    address: {
      type: String,
      maxlength: [100, "Address cannot be more than 100 characters"],
    },

    profilePicture: {
      type: String,
      default: "default.png",
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    deviceToken: String,
  },
  { timestamps: true }
);

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
