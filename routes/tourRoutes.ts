const express = require("express");
const {
  getAllTours,
  getTour,
  deleteTour,
  updateTour,
  createTour,
  getTourStats,
  aliasTopTours,
  getMonthlyPlan,
  getToursWithin,
  getDistances,
} = require("../controllers/tourControllers");
const { protect, restrictTo } = require("../controllers/authControllers");
const reviewController = require("../controllers/reviewControllers");
const reviewRoutes = require("../routes/reviewRoutes");

// Create Router
const router = express.Router();

// Route for the top 5 best price/performance tours
// In reality, the frontend can send a request to getAllTours with parameters to get the same result,
// but it would require many parameters, and since this request is frequently made by the frontend,
// we create a new route where we determine the parameters using middleware.
router
  .route("/top-five-best")
  .get(protect, restrictTo("admin"), aliasTopTours, getAllTours);

// Route to get tour statistics
// Real-world scenario: Calculate statistics for tours based on difficulty level for the admin panel
router.route("/tour-stats").get(protect, restrictTo("admin"), getTourStats);

// Real-world scenario: Get tours that start in each month of a specific year.
router
  .route("/monthly-plan/:year")
  .get(protect, restrictTo("admin"), getMonthlyPlan);

// Get tours within a specific area.
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(getToursWithin);

// Calculate the distance of tours from the user's location
router.route("/distances/:latlng/unit/:unit").get(getDistances);

// Define routes for the router
router
  .route("/")
  .get(getAllTours)
  .post(protect, restrictTo("guide", "lead-guide", "admin"), createTour);

router
  .route("/:id")
  .get(getTour)
  .delete(protect, restrictTo("lead-guide", "admin"), deleteTour)
  .patch(protect, restrictTo("guide", "lead-guide", "admin"), updateTour);

//! Defining Nested Routes
// POST /tours/124dsf466/reviews > Add a new review for a tour
// GET /tours/213412dsf4/reviews > Get all reviews for a specific tour
// GET /tours/124asdas23/reviews/124ad324 > Get details of a specific review

// When sending a request to the review route, the tour ID should be included in the request body.
// With this endpoint, we will extract the tour ID from the URL.
router.use("/:tourId/reviews", reviewRoutes);

// Export the router to use it in the app
module.exports = router;
