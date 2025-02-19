const express = require("express");
const reviewController = require("../controllers/reviewControllers");
const { protect } = require("../controllers/authControllers");

// MergeParams allows us to access the parameters defined in the container route in the subroute
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
