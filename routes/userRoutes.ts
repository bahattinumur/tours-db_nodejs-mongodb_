const express = require("express");
const userController = require("../controllers/userControllers");
const authController = require("../controllers/authControllers");

const router = express.Router();

// For user registration
router.post("/signup", authController.signup);

// For users to log in to an existing account
router.post("/login", authController.login);

// If the user forgot their password
router.post("/forgot-password", authController.forgotPassword);

// When the user clicks the link sent to their email
router.patch("/reset-password/:token", authController.resetPassword);

// From this line onward, the protect middleware should run before all routes
router.use(authController.protect);

// If the user wants to update their password
router.patch("/update-password", authController.updatePassword);

// When the user wants to update their account
router.patch(
  "/update-me",
  userController.updloadUserPhoto,
  userController.resize,
  userController.updateMe
);

// When the user wants to delete their account
router.delete("/delete-me", userController.deleteMe);

// Routes generally used by admins
router
  .route("/")
  .get(userController.getAllUsers) //
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .put(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
