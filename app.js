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

// ✅ Enable CORS FIRST - before any other middleware
const corsOptions = {
  origin: ["https://admin.anchorafrica.org", "https://anchorafrica.org"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 200, // Some browsers (IE11) choke on 204
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight for ALL routes

// Body parser
app.use(express.json());

// Set security headers (after CORS)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // ✅ Prevent helmet from blocking cross-origin responses
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

// Sanitize data (prevent MongoDB operator injection)
app.use(mongoSanitize());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Mount v1 routes
const auth = require("./routes/v1/auth");
const users = require("./routes/v1/users");
const about = require("./routes/v1/about");
const blog = require("./routes/v1/blog");
const services = require("./routes/v1/services");
const team = require("./routes/v1/team");
const faq = require("./routes/v1/faq");

app.use("/api/v1/auth", auth);
app.use("/api/v1/users", users);
app.use("/api/v1/about", about);
app.use("/api/v1/blog", blog);
app.use("/api/v1/services", services);
app.use("/api/v1/team", team);
app.use("/api/v1/faqs", faq);

// Error handler middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(
    `Server is running in ${process.env.NODE_ENV} MODE on port ${PORT}`,
  );
});
