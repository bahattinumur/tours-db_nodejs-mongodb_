// Comment content / Star rating / Creation date / Reference to which tour it belongs to / Reference to which user posted it

const mongoose = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, "A comment is required"],
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: "Tour",
    required: [true, "Please specify which tour the comment is for"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Indicate which user posted the comment"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

// Populate tour and user references with actual documents in queries
reviewSchema.pre(/^find/, function (next) {
  // Apply populate to the user field
  this.populate({ path: "user", select: "name photo" });

  next();
});

// Function to calculate the average rating for a tour
reviewSchema.statics.calcAverage = async function (tourId) {
  // Calculate statistics using aggregate
  const stats = await this.aggregate([
    // 1) Retrieve comments matching the provided tour ID
    { $match: { tour: tourId } },
    // 2) Calculate the total number of comments and the average rating
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 }, // Total number of comments
        avgRating: { $avg: "$rating" }, // Average rating of the comments
      },
    },
  ]);

  // If there are comments for the tour
  // Save the calculated statistics to the tour document
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    // If there are no comments for the tour, define default values
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4,
      ratingsQuantity: 0,
    });
  }
};

// TODO: We should prevent a user from posting a second comment on the same tour

// Since we continuously update tours, let's index the schema to prevent unnecessary document scans during updates
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Calculate the rating every time a new comment is posted
reviewSchema.post("save", function () {
  // Call the method that calculates the tour's average rating
  Review.calcAverage(this.tour);
});

// Recalculate the rating when a comment is deleted or updated
// The post middleware function takes the document as a parameter
reviewSchema.post(/^findOneAnd/, function (doc) {
  Review.calcAverage(doc.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
