const Review = require("../models/reviewModel");
const factory = require("./handlerFactory");

exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review);

exports.setRefIds = (req, res, next) => {
  // Eğer ki atılan isteğin body'sinde tur ID'si varsa bir şey yapma ama isteğin body kısmında tur ID'si gelmediyse URL'deki tur ID'sini al ve body'ye ekle
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);

exports.deleteReview = factory.deleteOne(Review);
