/**
 * Form Submission File Upload Middleware
 * Handles file uploads for form submissions with file-type fields.
 * Uses Cloudinary via multer-storage-cloudinary.
 * Attaches uploaded file metadata to req.uploadedFiles (keyed by field ID).
 */

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const ErrorResponse = require("../utils/errorResponse");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let resourceType = "raw";
    if (file.mimetype.startsWith("image/")) resourceType = "image";

    return {
      folder: "anchor-africa/form-submissions",
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    };
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ErrorResponse(`File type "${file.mimetype}" is not allowed`, 400), false);
    }
  },
});

/**
 * Accepts any number of files across any field names (matches form file fields).
 * After upload, normalises req.files into req.uploadedFiles:
 * { [fieldId]: { url, originalName, mimetype, size } }
 */
const formFileUpload = [
  multerUpload.any(),
  (req, _res, next) => {
    req.uploadedFiles = {};

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        req.uploadedFiles[file.fieldname] = {
          url: file.path || file.location,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        };
      }
    }

    next();
  },
];

module.exports = { formFileUpload };
