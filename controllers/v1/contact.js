const asyncHandler = require("../../middleware/async");
const ErrorResponse = require("../../utils/errorResponse");
const { sendContactFormMail } = require("../../utils/sendEmail");

// @desc    Submit contact form (sends email to info@anchorafrica.org)
// @route   POST /api/v1/contact
// @access  Public
exports.submitContact = asyncHandler(async (req, res, next) => {
  const { name, email, phone, message } = req.body;

  if (!name || !name.trim()) {
    return next(new ErrorResponse("Name is required", 400));
  }
  if (!email || !email.trim()) {
    return next(new ErrorResponse("Email is required", 400));
  }
  if (!message || !message.trim()) {
    return next(new ErrorResponse("Message is required", 400));
  }

  const subject = `New Contact Form Submission from ${name.trim()}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8" /></head>
    <body style="font-family:Arial,sans-serif;background:#f4f7f7;margin:0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0"
            style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
            <!-- Header -->
            <tr>
              <td style="background:#058789;padding:28px 32px;">
                <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">
                  ANCHOR Africa — New Contact Message
                </h1>
                <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">
                  Africa Neuropsychiatric Center for Health, Outreach and Research
                </p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <p style="color:#444;font-size:15px;margin:0 0 24px;">
                  A visitor submitted the contact form on
                  <strong style="color:#058789;">anchorafrica.org</strong>.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:12px 16px;background:#f4f7f7;border-radius:8px 8px 0 0;border-bottom:1px solid #e0eaea;">
                      <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#888;">Full Name</span><br/>
                      <strong style="font-size:15px;color:#0d2929;">${name.trim()}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;background:#f4f7f7;border-bottom:1px solid #e0eaea;">
                      <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#888;">Email</span><br/>
                      <a href="mailto:${email.trim()}" style="font-size:15px;color:#058789;text-decoration:none;">${email.trim()}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;background:#f4f7f7;border-bottom:1px solid #e0eaea;">
                      <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#888;">Phone</span><br/>
                      <strong style="font-size:15px;color:#0d2929;">${phone ? phone.trim() : "Not provided"}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 16px;background:#f4f7f7;border-radius:0 0 8px 8px;">
                      <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#888;">Message</span><br/>
                      <p style="font-size:15px;color:#333;margin:8px 0 0;white-space:pre-wrap;">${message.trim()}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 0;font-size:13px;color:#aaa;">
                  Reply directly to <a href="mailto:${email.trim()}" style="color:#058789;">${email.trim()}</a> to respond to this enquiry.
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#0d2929;padding:16px 32px;text-align:center;">
                <p style="color:rgba(255,255,255,0.45);font-size:12px;margin:0;">
                  ANCHOR Africa · Swankamore, SKD Blvd., Paynesville, Liberia
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  await sendContactFormMail({
    fullName: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : null,
    subject,
    message: message.trim(),
    htmlContent,
  });

  res.status(200).json({
    success: true,
    message: "Your message has been sent. We will get back to you shortly.",
  });
});
