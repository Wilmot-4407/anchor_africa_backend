const BlogPost = require("../../models/BlogPost");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const { getSignedUrlForKey } = require("../../config/awsConfig");

// Helper for signed URL (optional)
const attachSignedUrl = async (post) => {
  if (post.image && post.image.includes(".amazonaws.com/")) {
    const fileKey = post.image.split(".com/")[1];
    post.image = await getSignedUrlForKey(fileKey, 300);
  }
  return post;
};

// @desc    Get all blog posts
// @route   GET /api/v1/blog
// @access  Public
exports.getBlogPosts = asyncHandler(async (req, res, next) => {
  let posts = await BlogPost.find();
  posts = await Promise.all(posts.map(attachSignedUrl));
  res.status(200).json({ success: true, count: posts.length, data: posts });
});

// @desc    Get single blog post by slug (for BlogDetails)
// @route   GET /api/v1/blog/:slug
// @access  Public
exports.getBlogPost = asyncHandler(async (req, res, next) => {
  let post = await BlogPost.findOne({ slug: req.params.slug });
  if (!post) return next(new ErrorResponse("Blog post not found", 404));
  post = await attachSignedUrl(post);
  res.status(200).json({ success: true, data: post });
});

// @desc    Create blog post
// @route   POST /api/v1/blog
// @access  Private/Admin
exports.createBlogPost = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.image) {
    req.body.image = req.files.image[0].location;
  }
  const post = await BlogPost.create(req.body);
  res.status(201).json({ success: true, data: post });
});

// @desc    Update blog post
// @route   PUT /api/v1/blog/:id
// @access  Private/Admin
exports.updateBlogPost = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.image) {
    req.body.image = req.files.image[0].location;
  }
  const post = await BlogPost.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!post) return next(new ErrorResponse("Blog post not found", 404));
  res.status(200).json({ success: true, data: post });
});

// @desc    Delete blog post
// @route   DELETE /api/v1/blog/:id
// @access  Private/Admin
exports.deleteBlogPost = asyncHandler(async (req, res, next) => {
  const post = await BlogPost.findByIdAndDelete(req.params.id);
  if (!post) return next(new ErrorResponse("Blog post not found", 404));
  res.status(200).json({ success: true, data: {} });
});
