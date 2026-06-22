const mongoose = require("mongoose");
const slugify = require("slugify");

const FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "date",
  "time",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "yes_no",
  "rating",
  "file",
  "heading",
];

const FormFieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: [true, "Field id is required"] },
    type: {
      type: String,
      required: [true, "Field type is required"],
      enum: { values: FIELD_TYPES, message: "Invalid field type: {VALUE}" },
    },
    question: {
      type: String,
      required: [true, "Field question is required"],
      trim: true,
      maxlength: [500, "Question cannot exceed 500 characters"],
    },
    helpText: { type: String, trim: true, maxlength: [300, "Help text cannot exceed 300 characters"] },
    placeholder: { type: String, trim: true, maxlength: [200, "Placeholder cannot exceed 200 characters"] },
    required: { type: Boolean, default: false },
    options: [{ type: String, trim: true }],
  },
  { _id: false }
);

const FormSettingsSchema = new mongoose.Schema(
  {
    isPublished: { type: Boolean, default: false },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    maxResponses: { type: Number, default: null, min: [1, "Max responses must be at least 1"] },
    allowMultipleSubmissions: { type: Boolean, default: false },
  },
  { _id: false }
);

const FormSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Form title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: { type: String, unique: true, lowercase: true },
    category: {
      type: String,
      enum: {
        values: ["Intake", "Survey", "Registration", "Contact", "Feedback", "Custom"],
        message: "Invalid category: {VALUE}",
      },
      default: "Custom",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: { values: ["draft", "active", "archived"], message: "Invalid status: {VALUE}" },
      default: "draft",
    },
    settings: { type: FormSettingsSchema, default: () => ({}) },
    fields: [FormFieldSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

FormSchema.index({ status: 1, createdAt: -1 });
FormSchema.index({ category: 1 });

// Auto-generate unique slug from title
FormSchema.pre("validate", async function () {
  if (!this.isModified("title") && this.slug) return;

  const base = slugify(this.title, { lower: true, strict: true });
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await mongoose.models.Form.findOne({ slug, _id: { $ne: this._id } });
    if (!existing) break;
    slug = `${base}-${counter++}`;
  }

  this.slug = slug;
});

module.exports = mongoose.model("Form", FormSchema);
