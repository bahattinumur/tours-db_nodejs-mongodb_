const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// Previously, we were causing unnecessary code repetition by changing only the model name for each delete operation within the project.  
// To prevent this code repetition, we take the model as a parameter in the delete function.  
// Whenever we need to delete an element, we call this method and pass the model of the element to be deleted as a parameter.  
// This way, we eliminate excessive code clutter.
exports.deleteOne = (Model) =>
  catchAsync(async (req, res) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    // TODO: ADD CUSTOM ERROR MESSAGE

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

// A common method that can be used for update operations.
exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // By using the "new" parameter, we ensure that the returned value contains the updated document instead of the old one.
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res
      .status(200)
      .json({ message: "Document updated successfully", data: updated });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.create(req.body);

    res
      .status(200)
      .json({ message: "Document created successfully", data: document });
  });

exports.getOne = (Model, popOptionts) =>
  catchAsync(async (req, res, next) => {
    // Create a query
    let query = Model.findById(req.params.id);

    // If populate options exist, add them to the query
    if (popOptionts) query = query.populate(popOptionts);

    // Execute the query
    const found = await query;

    // Send the response
    res.status(200).json({ message: "Document found", data: found });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //* /reviews > Retrieve all reviews
    //* /tours/tour_id/reviews > Retrieve reviews related to a specific tour
    let filter = {};

    // If there is a tourID parameter in the URL, update the query to retrieve reviews for a specific tour
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // Create an instance of the APIFeatures class and call the necessary API features
    const features = new APIFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limit()
      .paginate();

    // Execute the prepared query and retrieve the data
    const docs = await features.query;

    res.status(200).json({
      message: "Documents received successfully",
      results: docs.length,
      data: docs,
    });
  });
