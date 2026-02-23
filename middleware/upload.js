const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const ErrorResponse = require("../utils/errorResponse");

// Configure Cloudinary using env variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_FORMATS = {
  image: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
  video: ["mp4", "mov", "avi", "mkv"],
  document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"],
};

const getResourceType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "raw";
};

exports.uploadImage = (field, folder = "general") => {
  return [
    (req, res, next) => {
      if (typeof next !== "function") {
        return;
      }

      const storage = new CloudinaryStorage({
        cloudinary,
        params: async (req, file) => {
          const resourceType = getResourceType(file.mimetype);
          const result = {
            folder: `uploads/${folder}`,
            resource_type: resourceType,
            use_filename: true,
            unique_filename: true,
          };
          return result;
        },
      });

      const upload = multer({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
          const allAllowed = [
            ...ALLOWED_FORMATS.image,
            ...ALLOWED_FORMATS.video,
            ...ALLOWED_FORMATS.document,
          ];
          const ext = file.originalname.split(".").pop().toLowerCase();
          if (allAllowed.includes(ext)) {
            cb(null, true);
          } else {
            cb(
              new ErrorResponse(`File type .${ext} is not allowed`, 400),
              false,
            );
          }
        },
      }).single(field);

      upload(req, res, (err) => {
        if (err) {
          return next(
            new ErrorResponse(err.message || "File upload error", 500),
          );
        }
        next();
      });
    },

    // Middleware 2: normalise req.file.location
    (req, res, next) => {
      if (typeof next !== "function") {
        return;
      }

      if (req.file) {
        req.file = {
          ...req.file,
          location: req.file.path,
        };
      }
      next();
    },
  ];
};
