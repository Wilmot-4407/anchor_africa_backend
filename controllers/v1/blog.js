/**
 * controllers/v1/blog.js  — with full audit trail
 */

const BlogPost = require("../../models/BlogPost");
const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const auditLog = require("../../utils/auditLog");

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    } catch (_) {}
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

const ALLOWED_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "content",
  "image",
  "imageAlt",
  "author",
  "authorAvatar",
  "authorTitle",
  "date",
  "status",
  "category",
  "tags",
  "isFeatured",
  "metaTitle",
  "metaDescription",
  "publishedAt",
];

// ─── PUBLIC CONTROLLERS ───────────────────────────────────────────────────────

// @desc    Get all PUBLISHED blog posts
// @route   GET /api/v1/blog
// @access  Public
exports.getBlogPosts = asyncHandler(async (req, res) => {
  const {
    status,
    category,
    tag,
    search,
    limit = 12,
    page = 1,
    featured,
  } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  if (featured) filter.isFeatured = featured === "true";
  if (search) {
    const rx = new RegExp(search, "i");
    filter.$or = [
      { title: rx },
      { excerpt: rx },
      { content: rx },
      { tags: rx },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const total = await BlogPost.countDocuments(filter);
  const posts = await BlogPost.find(filter)
    .sort({ publishedAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .select("-content");

  res.status(200).json({
    success: true,
    count: posts.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: posts,
  });
});

// @desc    Get single blog post by slug
// @route   GET /api/v1/blog/slug/:slug
// @access  Public
exports.getBlogPostBySlug = asyncHandler(async (req, res, next) => {
  const post = await BlogPost.findOne({ slug: req.params.slug });
  if (!post) return next(new ErrorResponse("Blog post not found", 404));
  BlogPost.findByIdAndUpdate(post._id, { $inc: { views: 1 } }).catch(() => {});
  res.status(200).json({ success: true, data: post });
});

// @desc    Get single blog post by ID
// @route   GET /api/v1/blog/:id
// @access  Private/Admin
exports.getBlogPostById = asyncHandler(async (req, res, next) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) return next(new ErrorResponse("Blog post not found", 404));
  res.status(200).json({ success: true, data: post });
});

// @desc    Get all unique categories from published posts
// @route   GET /api/v1/blog/categories
// @access  Public
exports.getBlogCategories = asyncHandler(async (req, res) => {
  const categories = await BlogPost.distinct("category", {
    status: "published",
    category: { $ne: null, $ne: "" },
  });
  res.status(200).json({ success: true, data: categories.filter(Boolean) });
});

// @desc    Get related posts
// @route   GET /api/v1/blog/:id/related
// @access  Public
exports.getRelatedPosts = asyncHandler(async (req, res, next) => {
  const post = await BlogPost.findById(req.params.id).select("category tags");
  if (!post) return next(new ErrorResponse("Blog post not found", 404));

  const { limit = 3 } = req.query;
  const related = await BlogPost.find({
    _id: { $ne: post._id },
    status: "published",
    $or: [{ category: post.category }, { tags: { $in: post.tags } }],
  })
    .sort({ publishedAt: -1 })
    .limit(Number(limit))
    .select("title slug excerpt image category date publishedAt readingTime");

  res.status(200).json({ success: true, data: related });
});

// ─── ADMIN CONTROLLERS ────────────────────────────────────────────────────────

// @desc    Get ALL blog posts (admin — any status)
// @route   GET /api/v1/blog/admin/all
// @access  Private/Admin
exports.getAllBlogPostsAdmin = asyncHandler(async (req, res) => {
  const posts = await BlogPost.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: posts.length, data: posts });
});

// @desc    Create blog post
// @route   POST /api/v1/blog
// @access  Private/Admin
exports.createBlogPost = asyncHandler(async (req, res, next) => {
  if (req.file) req.body.image = req.file.location;

  if (!req.body.title?.trim())
    return next(new ErrorResponse("Title is required", 400));
  if (!req.body.content?.trim())
    return next(new ErrorResponse("Content is required", 400));

  const baseSlug = req.body.slug
    ? slugify(req.body.slug)
    : slugify(req.body.title);
  req.body.slug = await makeUniqueSlug(baseSlug);
  req.body.tags = parseTags(req.body.tags);

  if (req.body.isFeatured !== undefined)
    req.body.isFeatured =
      req.body.isFeatured === "true" || req.body.isFeatured === true;

  const cleanBody = {};
  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }
  if (cleanBody.status === "published" && !cleanBody.publishedAt) {
    cleanBody.publishedAt = new Date();
  }

  const post = await BlogPost.create(cleanBody);

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "blog",
    action: "CREATE",
    message: `Admin ${req.user.userName} created blog post "${post.title}" (status: ${post.status})`,
  });

  res.status(201).json({ success: true, data: post });
});

// @desc    Update blog post
// @route   PUT /api/v1/blog/:id
// @access  Private/Admin
exports.updateBlogPost = asyncHandler(async (req, res, next) => {
  if (req.file) req.body.image = req.file.location;

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

  if (req.body.isFeatured !== undefined)
    req.body.isFeatured =
      req.body.isFeatured === "true" || req.body.isFeatured === true;

  const cleanBody = {};
  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const post = await BlogPost.findByIdAndUpdate(req.params.id, cleanBody, {
    returnDocument: "after",
    runValidators: true,
    new: true,
  });

  if (!post) return next(new ErrorResponse("Blog post not found", 404));

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "blog",
    action: "UPDATE",
    message: `Admin ${req.user.userName} updated blog post "${post.title}" (status: ${post.status})`,
  });

  res.status(200).json({ success: true, data: post });
});

// @desc    Delete blog post
// @route   DELETE /api/v1/blog/:id
// @access  Private/Admin
exports.deleteBlogPost = asyncHandler(async (req, res, next) => {
  const post = await BlogPost.findByIdAndDelete(req.params.id);
  if (!post) return next(new ErrorResponse("Blog post not found", 404));

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "blog",
    action: "DELETE",
    message: `Admin ${req.user.userName} deleted blog post "${post.title}"`,
  });

  res.status(200).json({ success: true, data: {} });
});
