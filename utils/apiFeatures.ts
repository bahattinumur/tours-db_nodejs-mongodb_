// Defining operations like Filtering, Sorting, Pagination, and Field Limiting in a reusable way 
// will save us from excessive code clutter as the project progresses.
class APIFeatures {
  constructor(query, queryParams) {
    this.query = query; // The request to be sent to the database
    this.queryParams = queryParams; // Search parameters
  }

  //! 1) FILTERING
  filter() {
    //* Parameters received from the URL { duration: { gt: '14' }, price: { lte: '600' } }
    //* The format required by Mongoose { duration: { $gt: '14' }, price: { $lte: '600' } }
    // What we need to do is add a "$" before any MongoDB operator found in the URL parameters.

    //1.1) Parameters received with the request
    const queryObj = { ...this.queryParams };

    //1.2) Remove parameters that we will not use outside of filtering from queryObj
    const excludedFields = ["sort", "limit", "page", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    //1.3) Convert the object to a string to use the replace function
    let queryString = JSON.stringify(queryObj);

    //1.4) Add a "$" prefix to all operators
    queryString = queryString.replace(
      /\b(gte|gt|lte|lt|ne)\b/g,
      (found) => `$${found}`
    );

    //1.5) Filter tour data
    this.query = this.query.find(JSON.parse(queryString));

    return this;
  }

  //! 2) SORTING
  sort() {
    if (this.queryParams.sort) {
      //2.1) If params.sort exists, sort by the given value
      // Received: -ratingsAverage,duration
      // Desired: -ratingsAverage duration
      const sortBy = this.queryParams.sort.split(",").join(" ");

      this.query = this.query.sort(sortBy);
    } else {
      //2.2) If params.sort does not exist, sort by date
      this.query = this.query.sort("-createdAt");
    }
    return this;
  }

  //! 3) FIELD LIMITING
  limit() {
    if (this.queryParams.fields) {
      //3.1) If params.fields exists, remove unwanted fields
      const fields = this.queryParams.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      //3.2) If fields are not provided, remove the __v field
      this.query = this.query.select("-__v");
    }

    return this;
  }

  //! 4) PAGINATION
  paginate() {
    // skip > how many documents to skip
    // limit > max number of documents to retrieve
    const page = Number(this.queryParams.page) || 1; // Assume the page value is 5
    const limit = Number(this.queryParams.limit) || 10; // Assume the limit value is 20
    const skip = (page - 1) * limit; // To view items on page 5, skip count would be 80

    // Update the request to the database
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
