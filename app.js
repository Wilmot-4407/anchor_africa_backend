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

// ====================== CORS CONFIG (FIXED FOR LOCAL DEV) ======================
const allowedOrigins = [
  "https://admin.anchorafrica.org",
  "https://anchorafrica.org",
  "http://localhost:5173", // default Vite port
  "http://localhost:5174", // your current frontend port
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  // Add any other ports/IPs you use (e.g. mobile testing)
  // "http://192.168.1.100:5174",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};

// ✅ Apply CORS (MUST be FIRST middleware)
const corsMiddleware = cors(corsOptions);
app.use(corsMiddleware);

// Handle preflight requests for ALL routes
app.options("*", corsMiddleware);
// =============================================================================

// Body parser
app.use(express.json());

// Set security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

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

app.use("/api/v1/auth", auth);
app.use("/api/v1/users", users);
app.use("/api/v1/about", about);
app.use("/api/v1/blog", blog);
app.use("/api/v1/services", services);
app.use("/api/v1/team", team);
app.use("/api/v1/faqs", faq);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/logs", logs);

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
