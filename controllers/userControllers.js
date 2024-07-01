const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const filterObj = require("../utils/filterObj");
const factory = require("./handlerFactory");
const multer = require("multer");
const sharp = require("sharp");

// Medyayı sunucuya yüklemek için ayarları yap
// const multerStorage = multer.diskStorage({
//   // Yüklenilecek klasörü belirledik
//   destination: function (req, file, cb) {
//     cb(null, 'public/img/users');
//   },

//   // Dosyanın ismini belirledik
//   filename: function (req, file, cb) {
//     const ext = file.mimetype.split('/')[1]; // jpg

//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

// Medyayı buffer veri tipinde memory'de tutan storag'e oluşturalım
const multerStorage = multer.memoryStorage();

// Kullanıcı profil fotoğrafı olarak sadece resim tipinde medyaları kabul edicek filtre tanımlama
const multerFilter = (req, file, cb) => {
  // Eğerki dosya tipi "image" kelimesi ile başlıyorsa-
  if (file.mimetype.startsWith("image")) {
    // -yüklemeye izin ver
    cb(null, true);
  } else {
    cb(
      new AppError("Please select a file type as your profile photo.", 400),
      false
    );
  }
};

// Multer methoduna hedef klasörü verip tanımlarız
// Bu da geriye belirlenen klasöre medya yüklemeye yarayan method döndürür
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// Dosya yükler
exports.updloadUserPhoto = upload.single("photo");

// Kullanıcı 4k 30mb bir fotoğrafı profil fotoğrafı yapmaya çalışabilir.
// Projeler içerisinde profil fotoğrafları genelde 40x40 veya 80x80 boyutlarda kullanılır, ama kullanıcı fotoğraf seçerken 2500x1080 gibi yüksek kalite bir fotoğrafı seçebilir ve  herhangi bir işlemden geçirmeden sunucuya bu fotoyu kaydetmek gereksiz alan kaplar. Bu yüzden yüklenilecek olan bütün profil fotoğrafların çözünürlüğü projede kullanılacak min. boyuta indireceğiz. Bu da ort her foto için 3-10mb > 30-50kb indirmek anlamına gelecek.
exports.resize = (req, res, next) => {
  // Eğer dosya yoksa yeniden boyutlandırma yapma sonraki adıma geç
  if (!req.file) return next();

  // Diske kaydedilecek dosya ismini olutşur
  const filename = `/user-${req.user.id}-${Date.now()}.jpeg`;

  // İşlemden geçir
  sharp(req.file.buffer)
    .resize(500, 500) // boyutu belirlirle
    .toFormat("jpeg") // veri formatını belirle
    .jpeg({ quality: 30 }) // kaltiyei belirle
    .toFile(`public/img/users/${filename}`); // dosyanın kaydedileceği adresi tanımla

  // Sonraki adıma geç
  next();
};

// Kullanıcnın kendi hesabını günclelemsini sağlar
exports.updateMe = catchAsync(async (req, res, next) => {
  //1) Şifreyi güncellemeye çalışırsa hata ver
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError("You cannot update your password with this route.", 400)
    );
  }

  //2) İsteğin body kısmında güncellemesine izin verdiğimmiz değerleri al
  const filtredBody = filterObj(req.body, "name", "email");

  // Eğer fotoğraf varsa kaydedilecek veriler arasına ekle
  if (req.file) filtredBody.photo = req.file.filename;

  //3) Kullanıcnın bilgilerini güncelle
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filtredBody, {
    new: true,
  });

  //3) Kullanıcın belirli bilgilerini güncelle
  res
    .status(200)
    .json({ message: "User updated successfully", user: updatedUser });
});

// Kullanıcnın kendi hesabını kapatması
exports.deleteMe = catchAsync(async (req, res, next) => {
  //1) Kulanıcının active değerini false'a çek
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(200).json({
    message: "Account disabled",
  });
});

// Bütün kullanıcıların bilgilerini al
exports.getAllUsers = factory.getAll(User);

// Yeni kullanıcı oluştur
exports.createUser = factory.createOne(User);

// Kullanıcının hesap bilgilerini al
exports.getUser = factory.getOne(User);

// Adminin kullanıcıyı güncellemesi için
exports.updateUser = factory.updateOne(User);

// Adminin kullanıcyı tamamen kaldırması için
exports.deleteUser = factory.deleteOne(User);
