const Tour = require("../models/tourModel");
const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

// Calculates the monthly plan
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  // Get the year from parameters
  const year = Number(req.params.year);

  // Reporting steps
  const plan = await Tour.aggregate([
    //1) Split tour start dates so that each tour has a separate date
    { $unwind: "$startDates" },
    //2) Filter tours that start within the specified year
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    // 3) Group tours by month
    {
      $group: {
        _id: { $month: "$startDates" }, // Group by month
        numTourStarts: { $sum: 1 }, // Count the number of tours starting each month
        tours: { $push: "$name" }, // Store the tour names in an array
      },
    },
    // 4) Add a month field to the report objects
    {
      $addFields: { month: "$_id" },
    },
    // 5) Remove unnecessary fields from report objects
    {
      $project: {
        _id: 0,
      },
    },
    // 6) Sort by month in ascending order
    {
      $sort: {
        month: 1,
      },
    },
  ]);

  res.status(200).json({
    message: "Monthly plan created successfully",
    data: plan,
  });
});

// Alias Route
exports.aliasTopTours = (req, res, next) => {
  // Set parameters to return the top five tours for getAllTours
  req.query.sort = "-ratingsAvarage,price";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  req.query.limit = "5";

  // Proceed to the next step, getAllTour
  next();
};

// Calculates tour statistics
exports.getTourStats = catchAsync(async (req, res, next) => {
  // Aggregation Pipeline
  // Reporting steps
  const stats = await Tour.aggregate([
    // Step 1 ) Filter tours with ratings of 4.0 and above
    {
      $match: { ratingsAverage: { $gte: 4.0 } },
    },
    // Step 2 ) Group by difficulty and calculate average values
    {
      $group: {
        _id: "$difficulty",
        totalTours: { $sum: 1 }, // Count the number of documents
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    // Step 3 ) Sort grouped data by average price in ascending order
    {
      $sort: { avgPrice: 1 },
    },
    // Step 4 ) Remove tours with a minimum price below 400
    {
      $match: { minPrice: { $gte: 400 } },
    },
  ]);

  console.log(stats);

  res
    .status(200)
    .json({
      message: "Your report has been created successfully",
      data: stats,
    });
});

// Retrieves all tours
exports.getAllTours = factory.getAll(Tour);

// Creates a new tour
exports.createTour = factory.createOne(Tour);

// Retrieves a single tour
exports.getTour = factory.getOne(Tour, "reviews");

// Updates a tour
exports.updateTour = factory.updateOne(Tour);

// Deletes a tour
exports.deleteTour = factory.deleteOne(Tour);

// Retrieves tours within given boundaries
exports.getToursWithin = async (req, res, next) => {
  const { latlng, distance, unit } = req.params;

  // Extract latitude and longitude
  const [lat, lng] = latlng.split(",");

  // Calculate radius based on given unit
  const radius = unit == "mi" ? distance / 3963.2 : distance / 6378.1;

  // Return error if center point is not provided
  if (!lat || !lng) return next(new AppError("Please identify the centre"));

  // Fetch tours within the boundaries
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lat, lng], radius] } },
  });

  // Send response
  res.status(200).json({
    message: "Tours found within the specified boundaries",
    tours,
  });
};

// Calculates distances to tours
exports.getDistances = async (req, res, next) => {
  // Access parameters from URL
  const { latlng, unit } = req.params;

  // Split latitude and longitude
  const [lat, lng] = latlng.split(",");

  // Check if latitude and longitude are provided
  if (!lat | !lng)
    return next(new AppError("Please provide valid latitude and longitude"));

  // Calculate multiplier based on unit
  const multiplier = unit === "mi" ? 0.000621371192 : 0.001;

  // Calculate distances of tours from user's location
  const distances = await Tour.aggregate([
    // Step 1) Provide a central point and calculate distances of tours
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [+lat, +lng],
        },
        distanceField: "distance",
        distanceMultiplier: multiplier, // Convert meter response to desired format
      },
    },

    // Step 2) Select required fields from the object
    {
      $project: {
        name: 1,
        distance: 1,
      },
    },
  ]);

  // Send response to client
  res.status(200).json({
    message:
      "The distances of the tours to the location you provided have been calculated.",
    data: distances,
    unit,
  });
};