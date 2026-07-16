const express = require("express");
const env = require("dotenv");
const morgan = require("morgan");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss");
const expressRateLimit = require("express-rate-limit");
const cors = require("cors");
const path = require("path");

// Load env vars
env.config({ path: "./.env" });

// Connect to database
connectDB();

// Init express
const app = express();

// Trust the first proxy hop (Hostinger/nginx) so req.ip and secure-cookie
// detection are correct, and so express-rate-limit doesn't misbehave.
app.set("trust proxy", 1);

// The admin/frontend apps send the httpOnly auth cookie cross-subdomain
// (withCredentials: true), which requires the CORS response to echo back
// the exact requesting origin (not "*") and set credentials:true.
const allowedOrigins = [
  "https://admin.anchorafrica.org",
  "https://anchorafrica.org",
  "https://www.anchorafrica.org",
  "https://forms.anchorafrica.org",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no Origin header (curl, server-to-server, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.log(`❌ CORS blocked origin: ${origin}`);
    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// Handle preflight requests for all routes
app.options("*", cors(corsOptions));

// Tell CDN/proxies never to cache API responses (prevents stale/missing CORS headers)
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("Surrogate-Control", "no-store");
  next();
});

// Body parser — strict limit to block large JSON payloads
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use((req, res, next) => {
  if (req.body) {
    req.body = JSON.parse(xss(JSON.stringify(req.body)));
  }
  next();
});

// Rate limiting - 100 requests per 10 minutes
const limiter = expressRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 10 minutes",
});
app.use(limiter);

// Sanitize data
app.use(mongoSanitize());

// Cookie parser
app.use(cookieParser());

// Dev logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log("🚀 Running in DEVELOPMENT mode - CORS allows localhost");
}

// Mount v1 routes
const auth = require("./routes/v1/auth");
const users = require("./routes/v1/users");
const about = require("./routes/v1/about");
const blog = require("./routes/v1/blog");
const services = require("./routes/v1/services");
const team = require("./routes/v1/team");
const faq = require("./routes/v1/faq");
const aiRoutes = require("./routes/v1/ai");
const logs = require("./routes/v1/logs");
const contact = require("./routes/v1/contact");

// Campaign Forms module
const forms = require("./routes/v1/forms");
const publicForms = require("./routes/v1/publicForms");
const formResponses = require("./routes/v1/formResponses");
const formAnalytics = require("./routes/v1/formAnalytics");

app.use("/api/v1/auth", auth);
app.use("/api/v1/users", users);
app.use("/api/v1/about", about);
app.use("/api/v1/blog", blog);
app.use("/api/v1/services", services);
app.use("/api/v1/team", team);
app.use("/api/v1/faqs", faq);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/logs", logs);
app.use("/api/v1/contact", contact);

// Campaign Forms — sub-resource routes mount before the parent so Express
// exact-matches /forms/:formId/responses before /forms/:id catches anything
app.use("/api/v1/forms/:formId/responses", formResponses);
app.use("/api/v1/forms/:formId/analytics", formAnalytics);
app.use("/api/v1/forms", forms);
app.use("/api/v1/public/forms", publicForms);

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(
    `✅ Server is running in ${process.env.NODE_ENV || "development"} MODE on port ${PORT}`,
  );
  console.log(`📍 Allowed CORS origins: ${allowedOrigins.join(", ")}`);
});
