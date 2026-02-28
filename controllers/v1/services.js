/**
 * controllers/v1/services.js  — with full audit trail
 */

const Service = require("../../models/Service");
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
    const existing = await Service.findOne(query).select("_id");
    if (!existing) return slug;
    counter++;
    slug = `${base}-${counter}`;
  }
}

function parseCommaArray(raw) {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw.map((v) => v.trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed))
        return parsed.map((v) => v.trim()).filter(Boolean);
    } catch (_) {}
    return raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return undefined;
}

function parseItems(raw) {
  if (!raw) return undefined;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map((item) => ({
      ...item,
      slug: item.slug || slugify(item.name || ""),
      features: Array.isArray(item.features)
        ? item.features
        : parseCommaArray(item.features) || [],
      benefits: Array.isArray(item.benefits)
        ? item.benefits
        : parseCommaArray(item.benefits) || [],
    }));
  } catch (_) {
    return undefined;
  }
}

const ALLOWED_FIELDS = [
  "title",
  "type",
  "category",
  "slug",
  "shortDescription",
  "fullDescription",
  "image",
  "icon",
  "features",
  "benefits",
  "order",
  "isPublished",
];

// ─── PUBLIC CONTROLLERS ───────────────────────────────────────────────────────

// @desc    Get all published service categories
// @route   GET /api/v1/services?type=clinic|institute|research
// @access  Public
exports.getServices = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const filter = { isPublished: true };
  if (type) filter.type = type;

  const services = await Service.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .select("-items");

  res
    .status(200)
    .json({ success: true, count: services.length, data: services });
});

// @desc    Get single service category by slug
// @route   GET /api/v1/services/:slug
// @access  Public
exports.getService = asyncHandler(async (req, res, next) => {
  const service = await Service.findOne({ slug: req.params.slug });
  if (!service) return next(new ErrorResponse("Service not found", 404));
  res.status(200).json({ success: true, data: service });
});

// @desc    Get a single nested service item
// @route   GET /api/v1/services/:categorySlug/items/:itemSlug
// @access  Public
exports.getServiceItem = asyncHandler(async (req, res, next) => {
  const category = await Service.findOne({ slug: req.params.categorySlug });
  if (!category)
    return next(new ErrorResponse("Service category not found", 404));
  const item = category.items.find((i) => i.slug === req.params.itemSlug);
  if (!item) return next(new ErrorResponse("Service item not found", 404));
  res.status(200).json({ success: true, data: { category, item } });
});

// ─── ADMIN CONTROLLERS ────────────────────────────────────────────────────────

// @desc    Get ALL services (admin — includes unpublished)
// @route   GET /api/v1/services/admin/all
// @access  Private/Admin
exports.getAllServicesAdmin = asyncHandler(async (req, res) => {
  const services = await Service.find().sort({ order: 1, createdAt: -1 });
  res
    .status(200)
    .json({ success: true, count: services.length, data: services });
});

// @desc    Create service category
// @route   POST /api/v1/services
// @access  Private/Admin
exports.createService = asyncHandler(async (req, res, next) => {
  if (req.file) req.body.image = req.file.location;

  if (!req.body.title?.trim())
    return next(new ErrorResponse("Title is required", 400));
  if (!req.body.type) return next(new ErrorResponse("Type is required", 400));
  if (!req.body.category?.trim())
    return next(new ErrorResponse("Category is required", 400));
  if (!req.body.shortDescription?.trim())
    return next(new ErrorResponse("Short description is required", 400));

  const baseSlug = req.body.slug
    ? slugify(req.body.slug)
    : slugify(req.body.title);
  req.body.slug = await makeUniqueSlug(baseSlug);

  if (req.body.features !== undefined)
    req.body.features = parseCommaArray(req.body.features) ?? [];
  if (req.body.benefits !== undefined)
    req.body.benefits = parseCommaArray(req.body.benefits) ?? [];
  if (req.body.isPublished !== undefined)
    req.body.isPublished =
      req.body.isPublished === "true" || req.body.isPublished === true;

  const cleanBody = {};
  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const service = await Service.create(cleanBody);

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "service",
    action: "CREATE",
    message: `Admin ${req.user.userName} created service category "${service.title}" (type: ${service.type})`,
  });

  res.status(201).json({ success: true, data: service });
});

// @desc    Bulk-create service categories
// @route   POST /api/v1/services/bulk
// @access  Private/Admin
exports.bulkCreateServices = asyncHandler(async (req, res, next) => {
  const entries = req.body.services;

  if (!Array.isArray(entries) || entries.length === 0) {
    return next(
      new ErrorResponse(
        'Request body must contain a non-empty "services" array',
        400,
      ),
    );
  }
  if (entries.length > 200) {
    return next(
      new ErrorResponse("Bulk limit is 200 services per request", 400),
    );
  }

  const created = [];
  const skipped = [];
  const errors = [];

  for (let i = 0; i < entries.length; i++) {
    const raw = entries[i];
    const missing = [];
    if (!raw.title?.trim()) missing.push("title");
    if (!raw.type) missing.push("type");
    if (!raw.category?.trim()) missing.push("category");
    if (!raw.shortDescription?.trim()) missing.push("shortDescription");

    if (missing.length) {
      errors.push({
        index: i,
        input: raw,
        reason: `Missing required fields: ${missing.join(", ")}`,
      });
      continue;
    }

    const validTypes = ["clinic", "institute", "research"];
    if (!validTypes.includes(raw.type)) {
      errors.push({
        index: i,
        input: raw,
        reason: `Invalid type "${raw.type}"`,
      });
      continue;
    }

    try {
      const baseSlug = raw.slug ? slugify(raw.slug) : slugify(raw.title);
      if (raw.slug) {
        const exists = await Service.findOne({ slug: baseSlug }).select("_id");
        if (exists) {
          skipped.push({
            index: i,
            slug: baseSlug,
            title: raw.title,
            reason: "Slug already exists",
          });
          continue;
        }
      }

      const uniqueSlug = await makeUniqueSlug(baseSlug);
      const doc = {};
      for (const key of ALLOWED_FIELDS) {
        if (raw[key] !== undefined) doc[key] = raw[key];
      }
      doc.slug = uniqueSlug;
      doc.features =
        raw.features !== undefined ? (parseCommaArray(raw.features) ?? []) : [];
      doc.benefits =
        raw.benefits !== undefined ? (parseCommaArray(raw.benefits) ?? []) : [];
      doc.isPublished =
        raw.isPublished === undefined
          ? true
          : raw.isPublished === "true" || raw.isPublished === true;
      doc.order = raw.order !== undefined ? Number(raw.order) : i;

      const service = await Service.create(doc);
      created.push({
        index: i,
        id: service._id,
        slug: service.slug,
        title: service.title,
      });
    } catch (err) {
      errors.push({ index: i, title: raw.title, reason: err.message });
    }
  }

  // Audit the bulk operation
  if (created.length > 0) {
    await auditLog({
      req,
      userId: req.user?._id,
      userName: req.user?.userName,
      type: "service",
      action: "BULK_CREATE",
      message: `Admin ${req.user?.userName} bulk-created ${created.length} services (${skipped.length} skipped, ${errors.length} failed)`,
    });
  }

  res.status(created.length > 0 ? 201 : 400).json({
    success: created.length > 0,
    summary: {
      total: entries.length,
      created: created.length,
      skipped: skipped.length,
      failed: errors.length,
    },
    created,
    skipped,
    errors,
  });
});

// @desc    Update service category
// @route   PUT /api/v1/services/:id
// @access  Private/Admin
exports.updateService = asyncHandler(async (req, res, next) => {
  if (req.file) req.body.image = req.file.location;

  if (req.body.slug) {
    req.body.slug = await makeUniqueSlug(slugify(req.body.slug), req.params.id);
  } else if (req.body.title) {
    req.body.slug = await makeUniqueSlug(
      slugify(req.body.title),
      req.params.id,
    );
  }

  if (req.body.features !== undefined)
    req.body.features = parseCommaArray(req.body.features) ?? [];
  if (req.body.benefits !== undefined)
    req.body.benefits = parseCommaArray(req.body.benefits) ?? [];
  if (req.body.isPublished !== undefined)
    req.body.isPublished =
      req.body.isPublished === "true" || req.body.isPublished === true;

  const cleanBody = {};
  for (const key of ALLOWED_FIELDS) {
    if (req.body[key] !== undefined) cleanBody[key] = req.body[key];
  }

  const service = await Service.findByIdAndUpdate(req.params.id, cleanBody, {
    returnDocument: "after",
    runValidators: true,
    new: true,
  });

  if (!service) return next(new ErrorResponse("Service not found", 404));

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "service",
    action: "UPDATE",
    message: `Admin ${req.user.userName} updated service category "${service.title}"`,
  });

  res.status(200).json({ success: true, data: service });
});

// @desc    Add / update a nested service item
// @route   POST /api/v1/services/:id/items
// @access  Private/Admin
exports.upsertServiceItem = asyncHandler(async (req, res, next) => {
  const category = await Service.findById(req.params.id);
  if (!category)
    return next(new ErrorResponse("Service category not found", 404));
  if (!req.body.name?.trim())
    return next(new ErrorResponse("Item name is required", 400));

  const itemSlug = req.body.slug
    ? slugify(req.body.slug)
    : slugify(req.body.name);
  if (req.file) req.body.image = req.file.location;

  const itemData = {
    name: req.body.name,
    slug: itemSlug,
    shortDescription: req.body.shortDescription || "",
    fullDescription: req.body.fullDescription || "",
    icon: req.body.icon || "",
    image: req.body.image || "default-service.png",
    duration: req.body.duration || "",
    specialists: req.body.specialists || "",
    order: Number(req.body.order) || 0,
    features: parseCommaArray(req.body.features) ?? [],
    benefits: parseCommaArray(req.body.benefits) ?? [],
  };

  const existingIdx = category.items.findIndex((i) => i.slug === itemSlug);
  const isUpdate = existingIdx >= 0;

  if (isUpdate) {
    category.items[existingIdx] = {
      ...category.items[existingIdx].toObject(),
      ...itemData,
    };
  } else {
    category.items.push(itemData);
  }

  await category.save();

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "service",
    action: isUpdate ? "UPDATE_ITEM" : "CREATE_ITEM",
    message: `Admin ${req.user.userName} ${isUpdate ? "updated" : "added"} item "${itemData.name}" in service "${category.title}"`,
  });

  res.status(200).json({ success: true, data: category });
});

// @desc    Delete a nested service item
// @route   DELETE /api/v1/services/:id/items/:itemSlug
// @access  Private/Admin
exports.deleteServiceItem = asyncHandler(async (req, res, next) => {
  const category = await Service.findById(req.params.id);
  if (!category)
    return next(new ErrorResponse("Service category not found", 404));

  const before = category.items.length;
  const deletedItem = category.items.find(
    (i) => i.slug === req.params.itemSlug,
  );
  category.items = category.items.filter((i) => i.slug !== req.params.itemSlug);

  if (category.items.length === before)
    return next(new ErrorResponse("Service item not found", 404));

  await category.save();

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "service",
    action: "DELETE_ITEM",
    message: `Admin ${req.user.userName} deleted item "${deletedItem?.name}" from service "${category.title}"`,
  });

  res.status(200).json({ success: true, data: category });
});

// @desc    Delete service category (and all its items)
// @route   DELETE /api/v1/services/:id
// @access  Private/Admin
exports.deleteService = asyncHandler(async (req, res, next) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  if (!service) return next(new ErrorResponse("Service not found", 404));

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "service",
    action: "DELETE",
    message: `Admin ${req.user.userName} deleted service category "${service.title}" and all its items`,
  });

  res.status(200).json({ success: true, data: {} });
});
