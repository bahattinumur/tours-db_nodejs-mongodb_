const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendMail = require("../utils/email");
const crypto = require("crypto");

// Create tokens
const signToken = (user_id) => {
  return jwt.sign({ id: user_id }, process.env.JWT_SECRET, {
    expiresIn: "90d",
  });
};

// Create and sends token
const createSendToken = (user, statusCode, res) => {
  // Create new token
  const token = signToken(user._id);

  // Send token only on cookies over HTTP
  res.cookie("jwt", token, {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    // secure: true,
  });

  // Remove Password
  user.password = undefined;

  // Send as an answer
  res.status(statusCode).json({
    message: "Logged In",
    user,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // Create JWT token and send it
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) Check if your email and password are correct
  if (!email || !password) {
    return next(new AppError("Please enter your email and password", 401));
  }

  //2) Check if the user is in the email has send
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(
      new AppError("There is no user with the email address you entered", 404)
    );
  }

  //3) Check if the password is correct
// Compares the hashed password stored in the database with the normal password entered by the user
  const isValid = await user.correctPass(password, user.password);

  if (!isValid) {
    return next(new AppError("The password you entered is incorrect", 400));
  }

  //4) If everything is OK, create and send the JWT token
  createSendToken(user, 200, res);
});

// A middleware that will verify the validity of the token via the user's token
// then allow access to the route if it is valid and the role is appropriate
// otherwise give an error saying you do not have permission
exports.protect = async (req, res, next) => {
  //1) Get the token and make sure the token is defined
  let token = req.headers.authorization;

  if (token && token.startsWith("Bearer")) {
    // Get the part after the word Token Bearer
    token = token.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("You are not authorized for this action", 403));
  }

  //2) Verify the validity of the token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.message === "jwt expired") {
      return next(
        new AppError("Your session has expired. Please log in again.", 403)
      );
    } else {
      return next(new AppError("The token you sent is invalid", 403));
    }
  }

  //3) Check if the user's account is still there
  const activeUser = await User.findById(decoded.id);

  if (!activeUser) {
    return next(
      new AppError("The user's account is no longer accessible", 403)
    );
  }

  // 4) Check if the user changed their password after giving the token
  if (activeUser.controlPassDate(decoded.iat)) {
    return next(
      new AppError(
        "You have recently changed your password. Please log in again."
      )
    );
  }

  // Transfer the active user's information to the next stage
  req.user = activeUser;
  next();
};

// Middleware that prevents users with the role that comes as a parameter from accessing the route
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // 1) If the user's role is not among the valid roles, deny access
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission to perform this action (role incompetent).",
          401
        )
      );
    }

    // 2) If the user's role is among the valid roles, we will allow access.
    next();
  };

//1) If the user forgets their password 
// a) Send a password reset link to their email
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Access user's account by email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("No user found with this email address"));
  }

  // 2) Creating a password reset token
  const resetToken = user.createPasswordResetToken();

  // 3) Save the encrypted version of the token and its expiration date to the database 
  // We disabled the verifications because we did not send the password field
  await user.save({ validateBeforeSave: false });

  //4) Send the token to the user's email with a link
  try {
    const link = `${req.protocol}://${req.headers.host}/api/v1/users/reset-password/${resetToken}`;

    const html = `
     <h1>Hello, ${user.name}</h1>
     <p>The password reset link for the tourify account linked to your email address is ${user.email}  below.<p>

     <p>
     <a href="${link}">${link}</a>
     You can update your password by sending a PATCH request to this URL with your new password within 10 minutes.
     </p>

     <p>If you did not send this email, please just ignore it.</p>
     <p>Tourify Team</p>
   `;

    await sendMail({
      email: user.email,
      subject: "Password reset token: (Duration 10 minutes)",
      html,
    });
  } catch (err) {
    // Sending mail removes the values ​​saved in the database
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError("There was a problem trying to send the mail"));
  }

  // Send the answer
  res.status(200).json({
    message:
      "The encrypted version of the token was saved to the database and the normal version of the token was sent to the mail.",
  });
});

//b) Save user's new password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Find the user based on Token
  const token = req.params.token;

  //a) Since we have a normal token and its hashed form is recorded in the database, 
  // we hash the token we received to access the user.
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  //b) Get user with hashed token value 
  //  Check if expiration date has not expired yet
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //3) Send alert if token is invalid or expired
  if (!user) {
    return next(new AppError("Token is invalid or expired"));
  }

  //4) Update the user's password change date
  user.password = req.body.password;
  user.passwordConfirm = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  return res.status(200).json({
    message: "Your new password has been set",
  });
});

//2) If users know their password but want to change it
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Take the user
  const user = await User.findById(req.user._id).select("+password");

  //2) Check if the current password is correct
  if (!(await user.correctPass(req.body.currentPassword, user.password))) {
    return next(new AppError("The current password you entered is incorrect."));
  }

  //3) If true, update the password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPassword;

  await user.save();

  //4) Create and send new JWT Token
  createSendToken(user, 200, res);
});
