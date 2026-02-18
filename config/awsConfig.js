const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a signed URL for an S3 object (v3 replacement for getSignedUrlPromise)
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiry in seconds (default: 300)
 */
const getSignedUrlForKey = async (key, expiresIn = 300) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

module.exports = { s3Client, getSignedUrlForKey };
