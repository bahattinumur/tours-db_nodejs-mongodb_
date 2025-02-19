const express = require("express");
const morgan = require("morgan");
const AppError = require("./utils/appError");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const multer = require("multer");

// Express setup
const app = express();

// Adds security headers
app.use(helmet());

// Middleware that logs request details to the console
app.use(morgan("dev"));

// Limits the number of requests from the same IP address within a certain period
const limiter = rateLimit({
  max: 100, // Maximum request limit from the same IP address
  windowMs: 60 * 60 * 1000, // 1 hour in milliseconds
  message: "You have completed your request within 1 hour. Try again later",
});

// Introduce the middleware for API routes
app.use("/api", limiter);

// Converts incoming JSON data in body, headers, etc., into a format usable in JS
app.use(express.json({ limit: "10kb" }));

// Data sanitization - Cleans data to prevent Query Injection
// Removes any operators added to the request body, params, or headers
app.use(mongoSanitize());

// Detects and neutralizes JavaScript hidden inside HTML code
app.use(xss());

// Prevents parameter pollution
app.use(hpp({ whitelist: ["duration", "ratingsQuantity"] }));

// Introduce tour and user routes to the project
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);

// Return an error when a request is made to an undefined route
app.all("*", (req, res, next) => {
  // Define error details
  const error = new AppError("You sent a request to an undefined route", 404);

  // Forward the error to the error-handling middleware
  next(error);
});

// Middleware that is triggered when an error occurs
// Captures error details and sends a response
app.use((err, req, res, next) => {
  // Log error details to the console
  console.log(err.stack);

  // Assign default values if status code or status message is not provided
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  err.message = err.message || "Sorry, an error occurred";

  // Send response
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

module.exports = app;
