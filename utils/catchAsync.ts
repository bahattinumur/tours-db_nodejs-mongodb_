// Takes a function as a parameter
// Executes the function
// If an error occurs, forward it to the error middleware
// We will wrap all async functions with this function
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
