/**
 * controllers/v1/team.js  — with full audit trail
 */

const TeamMember = require("../../models/TeamMember");
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

function parseSchedule(raw) {
  if (!raw) return undefined;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "object") {
      return Object.entries(parsed).map(([day, hours]) => ({ day, hours }));
    }
  } catch (_) {}
  return undefined;
}

function parseNested(raw) {
  if (!raw) return undefined;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return undefined;
  }
}

const ALLOWED_FIELDS = [
  "name",
  "title",
  "slug",
  "specialty",
  "image",
  "bio",
  "tagline",
  "education",
  "specialties",
  "experience",
  "languages",
  "awards",
  "schedule",
  "contact",
  "social",
  "order",
  "isActive",
];

function buildCleanBody(body) {
  const clean = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) clean[key] = body[key];
  }
  return clean;
}

// ─── PUBLIC CONTROLLERS ───────────────────────────────────────────────────────

// @desc    Get all active team members
// @route   GET /api/v1/team?specialty=Psychologist
// @access  Public
exports.getTeamMembers = asyncHandler(async (req, res) => {
  const { specialty } = req.query;
  const filter = { isActive: true };
  if (specialty) filter.specialty = new RegExp(specialty, "i");

  const members = await TeamMember.find(filter)
    .sort({ order: 1, createdAt: -1 })
    .select("-bio -education -specialties -awards -schedule -contact");

  res.status(200).json({ success: true, count: members.length, data: members });
});

// @desc    Get single team member by slug
// @route   GET /api/v1/team/:slug
// @access  Public
exports.getTeamMember = asyncHandler(async (req, res, next) => {
  const member = await TeamMember.findOne({
    slug: req.params.slug,
    isActive: true,
  });
  if (!member) return next(new ErrorResponse("Team member not found", 404));
  res.status(200).json({ success: true, data: member });
});

// ─── ADMIN CONTROLLERS ────────────────────────────────────────────────────────

// @desc    Get ALL team members (admin — including inactive)
// @route   GET /api/v1/team/admin/all
// @access  Private/Admin
exports.getAllTeamMembersAdmin = asyncHandler(async (req, res) => {
  const members = await TeamMember.find().sort({ order: 1, createdAt: -1 });
  res.status(200).json({ success: true, count: members.length, data: members });
});

// @desc    Create team member
// @route   POST /api/v1/team
// @access  Private/Admin
exports.createTeamMember = asyncHandler(async (req, res, next) => {
  if (req.file) req.body.image = req.file.location;

  if (!req.body.name?.trim())
    return next(new ErrorResponse("Name is required", 400));
  if (!req.body.title?.trim())
    return next(new ErrorResponse("Title is required", 400));
  if (!req.body.specialty?.trim())
    return next(new ErrorResponse("Specialty is required", 400));
  if (!req.body.bio?.trim())
    return next(new ErrorResponse("Bio is required", 400));

  if (!req.body.slug) req.body.slug = slugify(req.body.name);

  // Ensure slug uniqueness
  let slug = req.body.slug;
  let counter = 1;
  while (await TeamMember.findOne({ slug }).select("_id")) {
    slug = `${req.body.slug}-${counter++}`;
  }
  req.body.slug = slug;

  if (req.body.education !== undefined)
    req.body.education = parseCommaArray(req.body.education) ?? [];
  if (req.body.specialties !== undefined)
    req.body.specialties = parseCommaArray(req.body.specialties) ?? [];
  if (req.body.languages !== undefined)
    req.body.languages = parseCommaArray(req.body.languages) ?? [];
  if (req.body.awards !== undefined)
    req.body.awards = parseCommaArray(req.body.awards) ?? [];
  if (req.body.contact !== undefined)
    req.body.contact = parseNested(req.body.contact) ?? {};
  if (req.body.social !== undefined)
    req.body.social = parseNested(req.body.social) ?? {};
  if (req.body.schedule !== undefined)
    req.body.schedule = parseSchedule(req.body.schedule) ?? [];
  if (req.body.isActive !== undefined)
    req.body.isActive =
      req.body.isActive === "true" || req.body.isActive === true;

  const member = await TeamMember.create(buildCleanBody(req.body));

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "team",
    action: "CREATE",
    message: `Admin ${req.user.userName} created team member "${member.name}" (${member.specialty})`,
  });

  res.status(201).json({ success: true, data: member });
});

// @desc    Update team member
// @route   PUT /api/v1/team/admin/:id
// @access  Private/Admin
exports.updateTeamMember = asyncHandler(async (req, res, next) => {
  if (req.file) req.body.image = req.file.location;

  if (req.body.education !== undefined)
    req.body.education = parseCommaArray(req.body.education) ?? [];
  if (req.body.specialties !== undefined)
    req.body.specialties = parseCommaArray(req.body.specialties) ?? [];
  if (req.body.languages !== undefined)
    req.body.languages = parseCommaArray(req.body.languages) ?? [];
  if (req.body.awards !== undefined)
    req.body.awards = parseCommaArray(req.body.awards) ?? [];
  if (req.body.contact !== undefined)
    req.body.contact = parseNested(req.body.contact) ?? {};
  if (req.body.social !== undefined)
    req.body.social = parseNested(req.body.social) ?? {};
  if (req.body.schedule !== undefined)
    req.body.schedule = parseSchedule(req.body.schedule) ?? [];
  if (req.body.isActive !== undefined)
    req.body.isActive =
      req.body.isActive === "true" || req.body.isActive === true;

  const member = await TeamMember.findByIdAndUpdate(
    req.params.id,
    buildCleanBody(req.body),
    { returnDocument: "after", runValidators: true, new: true },
  );

  if (!member) return next(new ErrorResponse("Team member not found", 404));

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "team",
    action: "UPDATE",
    message: `Admin ${req.user.userName} updated team member "${member.name}"`,
  });

  res.status(200).json({ success: true, data: member });
});

// @desc    Delete team member
// @route   DELETE /api/v1/team/admin/:id
// @access  Private/Admin
exports.deleteTeamMember = asyncHandler(async (req, res, next) => {
  const member = await TeamMember.findByIdAndDelete(req.params.id);
  if (!member) return next(new ErrorResponse("Team member not found", 404));

  await auditLog({
    req,
    userId: req.user._id,
    userName: req.user.userName,
    type: "team",
    action: "DELETE",
    message: `Admin ${req.user.userName} deleted team member "${member.name}"`,
  });

  res.status(200).json({ success: true, data: {} });
});
