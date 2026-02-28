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
const ALLOWED_FORMATS = {
  image: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
  video: ["mp4", "mov", "avi", "mkv"],
  document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"],
};

const ALL_ALLOWED = [
  ...ALLOWED_FORMATS.image,
  ...ALLOWED_FORMATS.video,
  ...ALLOWED_FORMATS.document,
];

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
        const ext = file.originalname.split(".").pop().toLowerCase();
        if (ALL_ALLOWED.includes(ext)) {
          cb(null, true);
        } else {
          cb(new ErrorResponse(`File type .${ext} is not allowed`, 400), false);
        }
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
