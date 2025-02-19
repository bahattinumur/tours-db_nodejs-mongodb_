const { Schema, model } = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Create the user schema
const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"],
  },

  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please enter a valid e-mail address."],
  },

  photo: {
    type: String,
    default: "defaultpic.webp",
  },

  password: {
    type: String,
    required: [true, "Please enter a password"],
    minLength: [8, "Password must contain at least 8 characters"],
    validate: [
      validator.isStrongPassword,
      "Your password is not strong enough",
    ],
    select: false, // This field will not be included when retrieving user data
  },

  passwordConfirm: {
    type: String,
    required: [true, "Please enter your password confirmation"],
    validate: {
      validator: function (value) {
        return value == this.password;
      },
      message: "Your confirmation password does not match",
    },
  },

  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },

  active: {
    type: Boolean,
    default: true,
    select: false,
  },

  passwordChangedAt: Date,

  passwordResetToken: String,

  passwordResetExpires: Date,
});

//1) Encrypt and hash the password before saving the user to the database
// Remove the passwordConfirm field.
userSchema.pre("save", async function (next) {
  // If the password has already been hashed, skip this function
  if (!this.isModified("password")) return next();

  //* Hash and salt the password
  this.password = await bcrypt.hash(this.password, 12);

  //* Remove the confirmation password field
  this.passwordConfirm = undefined;
});

//2) Update the password change timestamp when the password is modified
userSchema.pre("save", function (next) {
  // If the password was not modified or the document is newly created, do nothing
  if (!this.isModified("password") || this.isNew) return next();

  // If the password was modified later, set the password change timestamp
  this.passwordChangedAt = Date.now() - 1000;

  next();
});

//3) Prevent access to inactive accounts when retrieving users from the database
userSchema.pre(/^find/, function (next) {
  // Modify the query to exclude users with inactive accounts
  this.find({ active: { $ne: false } });

  // Continue with the next operation
  next();
});

//4) Define a method to compare a plain password with the hashed password
// This method can only be accessed from user documents
userSchema.methods.correctPass = async function (candidatePass, userPass) {
  return await bcrypt.compare(candidatePass, userPass);
};

//5) Check if the password was changed after the JWT was issued
userSchema.methods.controlPassDate = function (JWTTime) {
  if (this.passwordChangedAt && JWTTime) {
    // Convert the password change timestamp to seconds
    const changeTime = parseInt(this.passwordChangedAt.getTime() / 1000);

    // Check if the JWT was issued before the password reset
    // If the JWT timestamp is earlier than the password change timestamp, return true (indicating an issue)
    // If the JWT timestamp is later than the password change timestamp, return false (indicating no issue)
    return JWTTime < changeTime;
  }

  return false;
};

//6) Generate a password reset token
// This token will later be sent to the user via email
// The user will use this token to verify their identity when resetting their password
// The token will be valid for 10 minutes
userSchema.methods.createPasswordResetToken = function () {
  //1) Generate a 32-byte random value and convert it to a hexadecimal string
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2) Hash the token and store it in the user document
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 3) Set the expiration time for the token
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // 4) Return the original token
  return resetToken;
};

// Create the user model
const User = model("User", userSchema);

module.exports = User;
