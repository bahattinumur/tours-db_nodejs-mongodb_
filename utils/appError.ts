// Let's create an advanced version of the built-in JavaScript error class 
// that has additional properties and parameters.

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    
    // Determine the status value based on the status code: 
    // If it starts with 4xx, it should be "fail", and if it starts with 5xx, it should be "error".
    this.status = String(this.statusCode).startsWith("4") ? "fail" : "error";

    // Capture the error details and the stack trace of the operations leading to the error.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
