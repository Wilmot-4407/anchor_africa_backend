/**
 * Export Service — generates CSV and Excel exports of form responses.
 * Excel export requires the `xlsx` package: npm install xlsx
 */

/**
 * Builds the column header list from form fields, skipping layout-only types.
 */
function buildHeaders(fields) {
  const meta = [
    { key: "submissionId", label: "Submission ID" },
    { key: "respondentName", label: "Respondent Name" },
    { key: "respondentEmail", label: "Email" },
    { key: "status", label: "Status" },
    { key: "submittedAt", label: "Submitted At" },
  ];

  const fieldHeaders = fields
    .filter((f) => f.type !== "heading")
    .map((f) => ({ key: f.id, label: f.question }));

  return [...meta, ...fieldHeaders];
}

/**
 * Converts a single response document into a flat row object.
 */
function responseToRow(response, headers) {
  const data = response.responseData instanceof Map
    ? Object.fromEntries(response.responseData)
    : response.responseData || {};

  const row = {};
  for (const h of headers) {
    switch (h.key) {
      case "submissionId":
        row[h.label] = response._id.toString();
        break;
      case "respondentName":
        row[h.label] = response.respondentName || "";
        break;
      case "respondentEmail":
        row[h.label] = response.respondentEmail || "";
        break;
      case "status":
        row[h.label] = response.status || "";
        break;
      case "submittedAt":
        row[h.label] = response.submittedAt
          ? new Date(response.submittedAt).toISOString()
          : "";
        break;
      default: {
        const val = data[h.key];
        if (Array.isArray(val)) {
          row[h.label] = val.join(", ");
        } else if (val && typeof val === "object" && val.url) {
          // File field — store the URL
          row[h.label] = val.url;
        } else {
          row[h.label] = val !== undefined && val !== null ? String(val) : "";
        }
      }
    }
  }
  return row;
}

/**
 * Exports responses to a CSV string.
 *
 * @param {Array} responses - Array of FormResponse documents
 * @param {Array} fields    - Form fields array
 * @returns {string} CSV content
 */
function exportToCSV(responses, fields) {
  const headers = buildHeaders(fields);
  const labelRow = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(",");

  const rows = responses.map((response) => {
    const row = responseToRow(response, headers);
    return headers
      .map((h) => {
        const val = row[h.label] !== undefined ? String(row[h.label]) : "";
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(",");
  });

  return [labelRow, ...rows].join("\r\n");
}

/**
 * Exports responses to an Excel buffer.
 * Requires: npm install xlsx
 *
 * @param {Array} responses - Array of FormResponse documents
 * @param {Array} fields    - Form fields array
 * @param {string} formTitle - Used as sheet name
 * @returns {Buffer} Excel file buffer
 */
function exportToExcel(responses, fields, formTitle = "Responses") {
  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    throw new Error("Excel export requires the xlsx package. Run: npm install xlsx");
  }

  const headers = buildHeaders(fields);
  const rows = responses.map((r) => responseToRow(r, headers));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: headers.map((h) => h.label),
  });

  // Auto-width columns
  const colWidths = headers.map((h) => ({
    wch: Math.max(h.label.length, 15),
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  const sheetName = formTitle.slice(0, 31); // Excel sheet name limit
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

module.exports = { exportToCSV, exportToExcel };
