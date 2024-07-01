// Bir fonksiyonu parametre olarak alır
// Fonksiyonu çalıştırır
// Hata oluşursa hata middleware'ine yönlendir
// Bütün async fonksiyonları bu fonksiyon ile sarmalayacağız
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
