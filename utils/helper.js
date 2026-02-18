const { getSignedUrlForKey } = require("../config/awsConfig");

/**
 * Generate a signed S3 URL from a full S3 URL or return as-is
 * @param {string} imageUrl - S3 URL or "default.png"
 * @param {number} expiresIn - Expiry in seconds (default: 3600)
 */
const generateSignedUrl = async (imageUrl, expiresIn = 3600) => {
  if (!imageUrl || imageUrl === "default.png") {
    return imageUrl;
  }

  try {
    if (imageUrl.includes(".amazonaws.com/")) {
      const fileKey = imageUrl.split(".com/")[1];
      return await getSignedUrlForKey(fileKey, expiresIn);
    }
    return imageUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return imageUrl; // Fallback to original URL
  }
};

module.exports = { generateSignedUrl };
