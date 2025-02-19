const Tour = require("../models/tourModel");

// Retrieves all tours
exports.getAllTours = async (req, res) => {
  try {
    //* Parameters received from the URL { duration: { gt: '14' }, price: { lte: '600' } }
    //* Mongoose request format   { duration: { $gt: '14' }, price: { $lte: '600' } }
    // Our task is to add a $ sign before the MongoDB operators if they exist in the parameters received from the URL.

    //! 1) FILTERING
    //1.1) Parameters received with the request
    const queryObj = { ...req.query };

    //1.2) Remove parameters that will not be used for filtering from queryObj
    const excludedFields = ["sort", "limit", "page", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    //1.3) Convert the object to a string to use replace
    let queryString = JSON.stringify(queryObj);

    //1.4) Add $ before all operators
    queryString = queryString.replace(
      /\b(gte|gt|lte|lt|ne)\b/g,
      (found) => `$${found}`
    );

    //1.5) Filter tour data
    let query = Tour.find(JSON.parse(queryString));

    //! 2) SORTING
    if (req.query.sort) {
      //2.1) If params.sort is provided, sort accordingly
      // Received:      -ratingsAverage,duration
      // Desired: -ratingsAverage duration
      const sortBy = req.query.sort.split(",").join(" ");

      query = query.sort(sortBy);
    } else {
      //2.1) If params.sort is not provided, sort by date
      query = query.sort("-createdAt");
    }

    //! 3) FIELD LIMITING
    if (req.query.fields) {
      //3.1) If params.fields is provided, remove unwanted fields
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      //3.2) If fields is not provided, remove the __v value
      query.select("-__v");
    }

    //! 4) PAGINATION
    // skip > number of documents to skip
    // limit > maximum number of documents to retrieve
    const page = Number(req.query.page) || 1; // Assume page value is 5
    const limit = Number(req.query.limit) || 10; // Assume limit value is 20
    const skip = (page - 1) * limit; // To see the 5th page, skip 80 elements

    // Update the request to the database
    query = query.skip(skip).limit(limit);

    // FINAL STEP - Execute the prepared command and retrieve the data
    const tours = await query;

    res.status(200).json({
      message: "Data received successfully",
      results: tours.length,
      data: tours,
    });
  } catch (err) {
    console.log(err);

    res.status(400).json({
      message: "Sorry, an error occurred while retrieving data.",
    });
  }
};

// Creates a new tour
exports.createTour = async (req, res) => {
  //* Method 1
  // const newTour = new Tour({ ...req.body });
  // newTour.save();

  try {
    //* Method 2
    const newTour = await Tour.create(req.body);

    res.status(200).json({ message: "Data saved successfully", data: newTour });
  } catch (err) {
    res.status(400).json({
      message: "Sorry, an error occurred while trying to save the data.",
    });
  }
};

// Retrieves a single tour
exports.getTour = async (req, res) => {
  try {
    //* Method 1) findOne(): Supports values other than ID
    // const foundTour = await Tour.findOne({ _id: req.params.id });

    //* Method 2) findById(): Only supports ID
    const foundTour = await Tour.findById(req.params.id);

    res.status(200).json({ message: "Tour found", data: foundTour });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Sorry, an error occurred while retrieving the tour." });
  }
};

// Updates a tour
exports.updateTour = async (req, res) => {
  try {
    // By using the "new" parameter, we ensure that the returned value contains the updated document instead of the old one
    const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.status(200).json({ message: "Tour updated", data: updatedTour });
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({ message: "Sorry, an error occurred while updating the tour." });
  }
};

// Deletes a tour
exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({});
  } catch (err) {
    res.status(400).json({ message: "Deletion failed" });
  }
};
