const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const ErrorResponse = require("../utils/errorResponse");

// ── Cloudinary config ─────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Allowed file types ────────────────────────────────────────────────────────
// SVG excluded — can contain embedded <script> tags (stored XSS vector)
const ALLOWED_FORMATS = {
  image: ["jpg", "jpeg", "png", "webp", "gif"],
  video: ["mp4", "mov", "avi", "mkv"],
  document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"],
};

const ALL_ALLOWED = [
  ...ALLOWED_FORMATS.image,
  ...ALLOWED_FORMATS.video,
  ...ALLOWED_FORMATS.document,
];

// Allowed MIME types keyed to the extensions above — checked in addition to extension
const ALLOWED_MIMETYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

const getResourceType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "raw";
};

// ── uploadImage ───────────────────────────────────────────────────────────────
// Returns an array of two Express middlewares:
//   [0] multer / Cloudinary upload handler
//   [1] normalises req.file.location so controllers can use req.file.location
//
// Usage in routes (spread operator):
//   router.post("/", protect, ...uploadImage("image", "blog"), createPost);
//
// The array spread works seamlessly with router.route().post(...middlewares).
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadImage = (field, folder = "general") => {
  // ── Middleware 1: Multer + Cloudinary upload ──
  const uploadMiddleware = (req, res, next) => {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => ({
        folder: `uploads/${folder}`,
        resource_type: getResourceType(file.mimetype),
        use_filename: true,
        unique_filename: true,
      }),
    });

    const upload = multer({
      storage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        // Check MIME type (from stream) first, then extension as secondary guard
        if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
          return cb(new ErrorResponse(`File type not allowed`, 400), false);
        }
        const ext = file.originalname.split(".").pop().toLowerCase();
        if (!ALL_ALLOWED.includes(ext)) {
          return cb(new ErrorResponse(`File extension .${ext} is not allowed`, 400), false);
        }
        cb(null, true);
      },
    }).single(field);

    upload(req, res, (err) => {
      if (err) {
        return next(
          new ErrorResponse(
            err.message || "File upload error",
            err.status || 500,
          ),
        );
      }
      next();
    });
  };

  // ── Middleware 2: Normalise req.file.location ──
  // Cloudinary via multer-storage-cloudinary sets req.file.path (the secure URL).
  // We normalise it to req.file.location so all controllers use one property name.
  const normaliseMiddleware = (req, res, next) => {
    if (req.file && req.file.path && !req.file.location) {
      req.file.location = req.file.path;
    }
    next();
  };

  return [uploadMiddleware, normaliseMiddleware];
};

// ── uploadFields ──────────────────────────────────────────────────────────────
// Like uploadImage but accepts multiple named fields in one multipart request.
// fieldNames: string[]  e.g. ["image", "authorAvatar"]
// All files land in the same Cloudinary folder.
//
// Usage in routes:
//   router.post("/", protect, ...uploadFields(["image", "authorAvatar"], "blog"), createPost);
//
// Controllers read files from req.files:
//   req.files?.image?.[0].location
//   req.files?.authorAvatar?.[0].location
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadFields = (fieldNames, folder = "general") => {
  const uploadMiddleware = (req, res, next) => {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: async (_req, file) => ({
        folder: `uploads/${folder}`,
        resource_type: getResourceType(file.mimetype),
        use_filename: true,
        unique_filename: true,
      }),
    });

    const upload = multer({
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
          return cb(new ErrorResponse(`File type not allowed`, 400), false);
        }
        const ext = file.originalname.split(".").pop().toLowerCase();
        if (!ALL_ALLOWED.includes(ext)) {
          return cb(new ErrorResponse(`File extension .${ext} is not allowed`, 400), false);
        }
        cb(null, true);
      },
    }).fields(fieldNames.map((name) => ({ name, maxCount: 1 })));

    upload(req, res, (err) => {
      if (err) {
        return next(new ErrorResponse(err.message || "File upload error", err.status || 500));
      }
      next();
    });
  };

  const normaliseMiddleware = (req, res, next) => {
    if (req.files) {
      for (const fileArr of Object.values(req.files)) {
        if (fileArr?.[0]?.path && !fileArr[0].location) {
          fileArr[0].location = fileArr[0].path;
        }
      }
    }
    next();
  };

  return [uploadMiddleware, normaliseMiddleware];
};
