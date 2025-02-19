const express = require("express");
const reviewController = require("../controllers/reviewControllers");
const { protect } = require("../controllers/authControllers");

// MergeParams kapsayıcı route'ta tanımlanmış olan parametreleri alt routeda'da erişmemizi sağlar
const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(reviewController.getAllReviews)
  .post(protect, reviewController.setRefIds, reviewController.createReview);

router
  .route("/:id")
  .get(reviewController.getReview)
  .patch(protect, reviewController.updateReview)
  .delete(protect, reviewController.deleteReview);

module.exports = router;
