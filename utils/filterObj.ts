// We send the object to be filtered
// and the fields we allow in the object
// In this method, we create a new object by taking only the fields we allow from the object
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

module.exports = filterObj;
