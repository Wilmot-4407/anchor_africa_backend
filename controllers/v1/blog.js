const BlogPost = require("../../models/BlogPost");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function makeUniqueSlug(base, excludeId = null) {
  let slug = base;
  let counter = 1;
  while (true) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await BlogPost.findOne(query).select("_id");
    if (!existing) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}

function parseTags(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((t) => t.trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed))
        return parsed.map((t) => t.trim()).filter(Boolean);
    } catch {}
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

// @desc    Get all blog posts
// @route   GET /api/v1/blog
exports.getBlogPosts = asyncHandler(async (req, res, next) => {
  const posts = await BlogPost.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: posts.length, data: posts });
});

// @desc    Get single blog post by slug
// @route   GET /api/v1/blog/slug/:slug
exports.getBlogPost = asyncHandler(async (req, res, next) => {
  const post = await BlogPost.findOne({ slug: req.params.slug });
  if (!post) return next(new ErrorResponse("Blog post not found", 404));
  res.status(200).json({ success: true, data: post });
});

// @desc    Get single blog post by ID
// @route   GET /api/v1/blog/:id
exports.getBlogPostById = asyncHandler(async (req, res, next) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return next(new ErrorResponse("Blog post not found", 404));
  res.status(200).json({ success: true, data: post });
});

// @desc    Create blog post
// @route   POST /api/v1/blog
exports.createBlogPost = asyncHandler(async (req, res, next) => {
  if (req.file) {
    req.body.image = req.file.location;
  }

  if (!req.body.title || !req.body.title.trim()) {
    return next(new ErrorResponse("Title is required", 400));
  }
  if (!req.body.content || !req.body.content.trim()) {
    return next(new ErrorResponse("Content is required", 400));
  }

  const baseSlug = req.body.slug
    ? slugify(req.body.slug)
    : slugify(req.body.title);
  req.body.slug = await makeUniqueSlug(baseSlug);

  req.body.tags = parseTags(req.body.tags);

  const allowedFields = [
    "title",
    "slug",
    "content",
    "image",
    "author",
    "date",
    "status",
    "category",
    "tags",
    "publishedAt",
  ];
  const cleanBody = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  if (cleanBody.status === "published" && !cleanBody.publishedAt) {
    cleanBody.publishedAt = new Date();
  }

  let post;
  try {
    post = await BlogPost.create(cleanBody);
  } catch (mongoErr) {
    return next(mongoErr);
  }
  res.status(201).json({ success: true, data: post });
});

// @desc    Update blog post
// @route   PUT /api/v1/blog/:id
exports.updateBlogPost = asyncHandler(async (req, res, next) => {
  if (req.file) {
    req.body.image = req.file.location;
  }

  if (req.body.slug) {
    req.body.slug = await makeUniqueSlug(slugify(req.body.slug), req.params.id);
  } else if (req.body.title) {
    req.body.slug = await makeUniqueSlug(
      slugify(req.body.title),
      req.params.id,
    );
  }

  req.body.tags = parseTags(req.body.tags);

  if (req.body.status === "published") {
    const existing = await BlogPost.findById(req.params.id).select(
      "status publishedAt",
    );
    if (existing && existing.status !== "published" && !existing.publishedAt) {
      req.body.publishedAt = new Date();
    }
  }

  const allowedFields = [
    "title",
    "slug",
    "content",
    "image",
    "author",
    "date",
    "status",
    "category",
    "tags",
    "publishedAt",
  ];
  const cleanBody = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const post = await BlogPost.findByIdAndUpdate(req.params.id, cleanBody, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!post) return next(new ErrorResponse("Blog post not found", 404));
  res.status(200).json({ success: true, data: post });
});

// @desc    Delete blog post
// @route   DELETE /api/v1/blog/:id
exports.deleteBlogPost = asyncHandler(async (req, res, next) => {
  const post = await BlogPost.findByIdAndDelete(req.params.id);
  if (!post) return next(new ErrorResponse("Blog post not found", 404));
  res.status(200).json({ success: true, data: {} });
});
