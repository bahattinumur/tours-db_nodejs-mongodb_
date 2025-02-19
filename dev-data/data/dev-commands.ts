const fs = require("fs");
const Tour = require("../../models/tourModel");
const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");

const mongoose = require("mongoose");
require("dotenv").config({ path: "./config.env" });

// Establish connection to MongoDB database
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Connection to database established"))
  .catch((err) =>
    console.log("ERROR!! There was a problem connecting to the database", err)
  );

// process.argv: An object that contains the command line arguments in Node.js as an array

// Read data from the tour files
let tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`));
let users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`));
let reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`));

// Convert to JS format

//! Retrieves data from the file and transfers it to the collection
const importData = async () => {
  try {
    await Tour.create(tours, { validateBeforeSave: false });
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews, { validateBeforeSave: false });
    console.log("All Data Transferred");
  } catch (err) {
    console.log("Something went wrong", err);
  }

  process.exit();
};

//! Clears all data from the collection
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log("All Data has been deleted");
  } catch (err) {
    console.log("Something went wrong");
  }

  process.exit();
};

// Determine the operation based on the arguments in the executed command
if (process.argv.includes("--import")) {
  importData();
} else if (process.argv.includes("--delete")) {
  deleteData();
}
