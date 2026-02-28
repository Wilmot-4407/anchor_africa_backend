const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { protect, authorize } = require("../../middleware/auth");

// ─────────────────────────────────────────────────────────────
// Configurable model (add to your .env for easy future updates)
// ─────────────────────────────────────────────────────────────
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log(`🚀 Using Gemini model: ${GEMINI_MODEL}`);

// ── POST /api/v1/ai/suggest-icon ─────────────────────────────────────────────
// Body:    { title, shortDescription, fullDescription, icons: string[] }
// Returns: { success: true, suggestions: [{ icon, reason, score }] }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/suggest-icon", protect, authorize("admin"), async (req, res) => {
  const {
    title = "",
    shortDescription = "",
    fullDescription = "",
    icons = [],
  } = req.body;

  if (!title.trim() && !shortDescription.trim()) {
    return res.status(400).json({
      success: false,
      error: "Provide at least a title or short description.",
    });
  }

  const prompt = `You are a UI icon expert for a healthcare/medical platform that uses Lucide React icons.

Given this service, pick the BEST 8 Lucide icons from the list below that visually represent it.

SERVICE TITLE: ${title || "(none)"}
SHORT DESCRIPTION: ${shortDescription || "(none)"}
FULL DESCRIPTION: ${fullDescription || "(none)"}

AVAILABLE ICONS (pick ONLY from this exact list):
${icons.join(", ")}

Respond ONLY with a JSON array of exactly 8 objects. No markdown fences, no extra text.
Format: [{"icon":"IconName","reason":"why it fits in 8 words or less","score":1-10}, ...]
Sort by score descending.`;

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    // Clean possible markdown fences
    const clean = raw.replace(/```json|```/g, "").trim();
    const suggestions = JSON.parse(clean);

    // Ensure it's an array
    if (!Array.isArray(suggestions)) {
      throw new Error("AI did not return a valid array");
    }

    return res.status(200).json({
      success: true,
      suggestions: suggestions.slice(0, 8), // safety limit
    });
  } catch (err) {
    console.error("[AI /suggest-icon]", err?.message || err);

    let errorMsg = "AI suggestion failed. Please try again.";

    if (err.message?.includes("404") || err.message?.includes("not found")) {
      errorMsg = `Model "${GEMINI_MODEL}" not available. Check GEMINI_MODEL in .env`;
    }

    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

module.exports = router;
