/**
 * Dynamic Form Validation Engine
 * Validates form submission data against the stored field schema.
 * No hardcoded per-form logic — validation rules are derived entirely from
 * the field definitions returned by the Form model.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates a single field answer against the field definition.
 * Returns an error message string or null if valid.
 */
function validateField(field, answer) {
  const isEmpty =
    answer === undefined ||
    answer === null ||
    answer === "" ||
    (Array.isArray(answer) && answer.length === 0);

  // Layout-only fields (headings) are never validated
  if (field.type === "heading") return null;

  if (field.required && isEmpty) {
    return `"${field.question}" is required`;
  }

  // If field is empty and not required, skip further type checks
  if (isEmpty) return null;

  switch (field.type) {
    case "email":
      if (!EMAIL_REGEX.test(String(answer).trim())) {
        return `"${field.question}" must be a valid email address`;
      }
      break;

    case "phone":
      if (!PHONE_REGEX.test(String(answer).trim())) {
        return `"${field.question}" must be a valid phone number`;
      }
      break;

    case "number":
      if (isNaN(Number(answer))) {
        return `"${field.question}" must be a valid number`;
      }
      break;

    case "date": {
      const d = new Date(answer);
      if (isNaN(d.getTime())) {
        return `"${field.question}" must be a valid date`;
      }
      break;
    }

    case "time": {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
      if (!timeRegex.test(String(answer))) {
        return `"${field.question}" must be a valid time (HH:MM)`;
      }
      break;
    }

    case "rating": {
      const rating = Number(answer);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return `"${field.question}" rating must be between 1 and 5`;
      }
      break;
    }

    case "yes_no":
      if (!["yes", "no", true, false].includes(answer)) {
        return `"${field.question}" must be yes or no`;
      }
      break;

    case "multiple_choice":
    case "dropdown":
      if (field.options && field.options.length > 0) {
        if (!field.options.includes(String(answer))) {
          return `"${field.question}" contains an invalid option`;
        }
      }
      break;

    case "checkboxes": {
      const answers = Array.isArray(answer) ? answer : [answer];
      if (field.options && field.options.length > 0) {
        const invalid = answers.filter((a) => !field.options.includes(String(a)));
        if (invalid.length > 0) {
          return `"${field.question}" contains invalid option(s): ${invalid.join(", ")}`;
        }
      }
      break;
    }

    case "file": {
      // answer is metadata object uploaded by formUpload middleware
      // { url, originalName, mimetype, size }
      if (typeof answer === "object" && answer !== null) {
        if (answer.size && answer.size > MAX_FILE_SIZE_BYTES) {
          return `"${field.question}" file exceeds the 10 MB limit`;
        }
        if (answer.mimetype && !ALLOWED_FILE_TYPES.includes(answer.mimetype)) {
          return `"${field.question}" file type is not allowed`;
        }
      }
      break;
    }

    default:
      break;
  }

  return null;
}

/**
 * Validates the full submission data object against the form's field array.
 *
 * @param {Array}  fields     - Form.fields array from the Form document
 * @param {Object} submission - Key-value map of { fieldId: answer }
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateSubmission(fields, submission) {
  const errors = [];

  for (const field of fields) {
    const answer = submission[field.id];
    const error = validateField(field, answer);
    if (error) errors.push(error);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Extracts the respondent display name and email from submission data.
 * Scans for the first short_text field (name) and first email field.
 *
 * @param {Array}  fields
 * @param {Object} submission
 * @returns {{ respondentName: string, respondentEmail: string }}
 */
function extractRespondentInfo(fields, submission) {
  let respondentName = "";
  let respondentEmail = "";

  for (const field of fields) {
    if (!respondentName && field.type === "short_text") {
      respondentName = String(submission[field.id] || "").trim();
    }
    if (!respondentEmail && field.type === "email") {
      respondentEmail = String(submission[field.id] || "").trim().toLowerCase();
    }
    if (respondentName && respondentEmail) break;
  }

  return { respondentName, respondentEmail };
}

module.exports = { validateSubmission, extractRespondentInfo };
