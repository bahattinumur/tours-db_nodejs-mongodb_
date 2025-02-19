const Review = require("../models/reviewModel");
const factory = require("./handlerFactory");

exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review);

exports.setRefIds = (req, res, next) => {
  // If the tour ID is in the body of the request, do nothing, but if the tour ID is not in the body of the request, get the tour ID in the URL and add it to the body.
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
