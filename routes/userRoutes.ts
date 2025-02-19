const express = require("express");
const userController = require("../controllers/userControllers");
const authController = require("../controllers/authControllers");

const router = express.Router();

// Kullanıcıların kaydolması için
router.post("/signup", authController.signup);

// Kullanıcıların varolan hesaba giriş yapması için
router.post("/login", authController.login);

// Kullanıcı şifresini unuttuysa
router.post("/forgot-password", authController.forgotPassword);

// E-postasına gönderdiğimiz link'e istek atınca
router.patch("/reset-password/:token", authController.resetPassword);

// bu satırdan sonraki bütün route'lardan önce protect middleware çalışsın
router.use(authController.protect);

// Şifreyi güncellemek istiyorsa
router.patch("/update-password", authController.updatePassword);

// Hesabını güncellemek isteyince
router.patch(
  "/update-me",
  userController.updloadUserPhoto,
  userController.resize,
  userController.updateMe
);

// Hesabını silmek isteğidinde
router.delete("/delete-me", userController.deleteMe);

// Genellikle adminlerin kullanıcağı route'lar
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
