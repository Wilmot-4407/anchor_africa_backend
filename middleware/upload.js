const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const ErrorResponse = require("../utils/errorResponse");

// S3 client (credentials from env)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Local disk storage for temporary files
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

// Sanitize filename
const sanitizeFileName = (filename) => {
  return filename.replace(/\s+/g, "-").toLowerCase();
};

// Upload file to S3
const uploadToS3 = async (file, key) => {
  const fileContent = fs.createReadStream(file.path);

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: fileContent,
    ContentType: file.mimetype,
  };

  const upload = new Upload({
    client: s3Client,
    params,
  });

  const result = await upload.done();

  // Clean up local file
  fs.unlinkSync(file.path);

  return result;
};

// Upload middleware factory
exports.uploadImage = (field, folder = "general") => [
  multer({ storage: diskStorage }).fields([{ name: field, maxCount: 1 }]),
  async (req, res, next) => {
    if (!req.files || !req.files[field]) {
      return next(); // No file uploaded, proceed
    }

    try {
      const uploads = await Promise.all(
        req.files[field].map((file) => {
          const key = `${folder}/${sanitizeFileName(file.originalname)}`;
          return uploadToS3(file, key);
        }),
      );
      req.files[field] = uploads.map((result, idx) => ({
        ...req.files[field][idx],
        location: result.Location,
      }));
      next();
    } catch (err) {
      console.error("S3 upload error:", err);
      return next(new ErrorResponse(err.message || "File upload error", 500));
    }
  },
];
