// Filtrenelecek nesneyi
// ve nesnede izin verdiğimiz alanları gönderiyoruz
// bu method ise nesneden sadecee izin verdiğimiz alnları alarak yeni bir nesne oluşturuyoruz
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
