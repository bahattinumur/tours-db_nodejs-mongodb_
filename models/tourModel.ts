const { Schema, model } = require("mongoose");
const validator = require("validator");

//! Schema | Template | Mold
//* Defines the values and data types that a document added to the database should have.
//* Also determines default values, uniqueness constraints, and fields that need to be modified before being saved.
//* We can compare schemas to molds in bakeries because every product that comes out of them will be similar.
const tourSchema = new Schema(
  {
    name: {
      type: String,
      unique: [true, "Name value must be unique"],
      required: [true, "The tour must have a name field"],
      minLength: [10, "Tour name must be at least 10 characters"],
      maxLength: [40, "Tour name can be up to 50 characters"],
      validate: [
        validator.isAlpha, // We used a validation function from the Validator library
        "The name must contain only alphabetical characters.",
      ],
    },

    duration: {
      type: Number,
      required: [true, "The name must contain only alphabetical characters"],
    },

    maxGroupSize: {
      type: Number,
      required: [true, "The tour must have a duration field"],
    },

    difficulty: {
      type: String,
      required: [true, "The tour must have a difficulty field"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty level is not valid",
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.0, // If a rating is not specified when creating the tour, it will be saved as 4 by default.
    },

    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      required: [true, "The tour must be the price value"],
    },

    priceDiscount: {
      type: Number,
      // Custom validator
      // The discount value must be less than the price; otherwise, it is invalid.
      validate: {
        validator: function (value) {
          return value < this.price;
        },
        message: "The discount price cannot be greater than the original price",
      },
    },

    summary: {
      type: String,
      trim: true, // Removes spaces at the beginning and end of the stored value.
      maxLength: [1000, "Tour description can be up to 1000 characters"],
      required: [true, "The tour must have a summary value"],
    },

    description: {
      type: String,
      trim: true,
      maxLength: 2000,
    },

    imageCover: {
      type: String,
      required: [true, "The tour must have the imageCover value"],
    },

    images: [String], // An array of strings

    startDates: [Date], // An array of dates

    createdAt: {
      type: Date,
      default: Date.now(), // Adds the current date by default
    },

    hour: Number,

    // Starting location
    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      description: String,
      coordinates: [Number],
      address: String,
    },

    //* EMBEDDING
    //* The tour's visit points should be defined as an array.
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        description: String,
        day: Number,
      },
    ],

    //* Child Reference
    //* The guides of the tour should be referenced by their IDs in the users collection.
    guides: [
      {
        type: Schema.ObjectId, // The type is always Object-ID in reference definitions.
        ref: "User", // Specifies which model the reference belongs to.
      },
    ],
  },

  // Schema settings (enabled virtual properties)
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//! INDEX
// By using an index, we can respond much faster to users filtering tours by price and rating.
// Indexed fields are stored in sorted order, reducing the time required for searches.
tourSchema.index({ price: 1, ratingsAverage: -1 });

// Indexing for geospatial data
tourSchema.index({ startLocation: "2dsphere" });

//! Virtual Property
// Instead of storing unnecessary values in the database, we calculate them dynamically for client requests.
tourSchema.virtual("slug").get(function () {
  return this.name.toLowerCase().replace(/ /g, "-");
});

//! Virtual Populate
tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

//! Document Middleware
tourSchema.pre("save", function (next) {
  this.hour = this.duration * 24;
  next();
});

tourSchema.post("updateOne", function (doc, next) {
  next();
});

//! Query Middleware
tourSchema.pre(/^find/, async function (next) {
  this.find({ secret: { $ne: true } });
  next();
});

//! Populate
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordResetToken -passwordResetExpires",
  });
  next();
});

tourSchema.pre("aggregate", function (next) {
  this.pipeline().push({ $match: { secret: { $ne: true } } });
  next();
});

//! Model
// The model allows us to perform operations such as adding, removing, and retrieving data from the collection based on schema constraints.
const Tour = model("Tour", tourSchema);

// Exporting the Tour model to use it in different files
module.exports = Tour;
