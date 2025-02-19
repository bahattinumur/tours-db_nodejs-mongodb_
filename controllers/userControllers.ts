const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const filterObj = require("../utils/filterObj");
const factory = require("./handlerFactory");
const multer = require("multer");
const sharp = require("sharp");

// Configure settings for uploading media to the server
// const multerStorage = multer.diskStorage({
//   // Define the folder where files will be uploaded
//   destination: function (req, file, cb) {
//     cb(null, 'public/img/users');
//   },

//   // Define the file name
//   filename: function (req, file, cb) {
//     const ext = file.mimetype.split('/')[1]; // jpg

//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

// Create a storage that keeps media in memory as a buffer data type
const multerStorage = multer.memoryStorage();

// Define a filter that only allows image-type media for user profile photos
const multerFilter = (req, file, cb) => {
  // If the file type starts with "image"
  if (file.mimetype.startsWith("image")) {
    // - allow the upload
    cb(null, true);
  } else {
    cb(
      new AppError("Please select a file type as your profile photo.", 400),
      false
    );
  }
};

// Provide the target folder to the Multer method
// This returns a method that allows uploading media to the specified folder
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// Upload file
exports.updloadUserPhoto = upload.single("photo");

// A user might try to set a 4K 30MB photo as their profile picture.
// In projects, profile pictures are usually used in sizes like 40x40 or 80x80,
// but users may select high-resolution images like 2500x1080.
// Saving such images without processing would take up unnecessary space.
// Therefore, all uploaded profile photos will be resized to a minimum size
// used in the project, reducing them from 3-10MB to 30-50KB on average.
exports.resize = (req, res, next) => {
  // If there is no file, skip resizing and proceed to the next step
  if (!req.file) return next();

  // Create the filename for the file to be saved on disk
  const filename = `/user-${req.user.id}-${Date.now()}.jpeg`;

  // Process the image
  sharp(req.file.buffer)
    .resize(500, 500) // Set the dimensions
    .toFormat("jpeg") // Set the format
    .jpeg({ quality: 30 }) // Set the quality
    .toFile(`public/img/users/${filename}`); // Define the file path

  // Proceed to the next step
  next();
};

// Allows users to update their own account
exports.updateMe = catchAsync(async (req, res, next) => {
  //1) Throw an error if the user attempts to update their password
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError("You cannot update your password with this route.", 400)
    );
  }

  //2) Retrieve only the allowed fields from the request body
  const filtredBody = filterObj(req.body, "name", "email");

  // If a photo is provided, add it to the fields to be saved
  if (req.file) filtredBody.photo = req.file.filename;

  //3) Update the user's information
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filtredBody, {
    new: true,
  });

  //3) Send response with updated user info
  res
    .status(200)
    .json({ message: "User updated successfully", user: updatedUser });
});

// Allows users to deactivate their own account
exports.deleteMe = catchAsync(async (req, res, next) => {
  //1) Set the user's "active" field to false
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(200).json({
    message: "Account disabled",
  });
});

// Retrieve information of all users
exports.getAllUsers = factory.getAll(User);

// Create a new user
exports.createUser = factory.createOne(User);

// Retrieve a user's account details
exports.getUser = factory.getOne(User);

// Allows admin to update a user
exports.updateUser = factory.updateOne(User);

// Allows admin to completely remove a user
exports.deleteUser = factory.deleteOne(User);
