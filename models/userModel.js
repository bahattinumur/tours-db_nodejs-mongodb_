const { Schema, model } = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Kullanıcı şemasını oluştur
const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"],
  },

  email: {
    type: String,
    required: [true, "Please enter your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please enter a valid e-mail address."],
  },

  photo: {
    type: String,
    default: "defaultpic.webp",
  },

  password: {
    type: String,
    required: [true, "Please enter a password"],
    minLength: [8, "Password must contain at least 8 characters"],
    validate: [
      validator.isStrongPassword,
      "Your password is not strong enough",
    ],
    select: false, // Kullanıcı verisi çağrıldığında göndermediğimiz değer
  },

  passwordConfirm: {
    type: String,
    required: [true, "Please enter your password confirmation"],
    validate: {
      validator: function (value) {
        return value == this.password;
      },
      message: "Your confirmation password does not match",
    },
  },

  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },

  active: {
    type: Boolean,
    default: true,
    select: false,
  },

  passwordChangedAt: Date,

  passwordResetToken: String,

  passwordResetExpires: Date,
});

//1) Veritabanında kullanıcyı kaydetmeden önce password
// alınınan şifreleme algoritmalarından geçir ve şifrele
// passwordConfirm alanını kaldır.
userSchema.pre("save", async function (next) {
  // Daha önce şifre hash'lendiyse bu fonksiyon çalışmasın
  if (!this.isModified("password")) return next();

  //* Şifreyi hash'le ve salt'la
  this.password = await bcrypt.hash(this.password, 12);

  //* Onay şifresini kaldır
  this.passwordConfirm = undefined;
});

//2) Todo şifre değişince tarihi güncelle
userSchema.pre("save", function (next) {
  // Eğer şifre değişmediyse veya dökümanı yeni oluşturulduysa bir şey yapma
  if (!this.isModified("password") || this.isNew) return next();

  // Şifre sonrdan değiştiyse şifre değişim tarihini belirle
  this.passwordChangedAt = Date.now() - 1000;

  next();
});

//3) Kullanıcı veritbanından alınmaya çalışıldığında hesap inaktif ise erişimini engelle
userSchema.pre(/^find/, function (next) {
  // Bundan sonraki işlemde yapılcak olan sorguda active olmayanları dahil etme koşulu giriyoruz
  this.find({ active: { $ne: false } });

  // Sonraki işleme devam et
  next();
});

//4) Hashlenmiş şifre ile normal şifreyi karşılaştırma özelliğini bir method olarak tanımlayalım
// Tanımladığımız bu method sadece user belgeleri üzerinden erişilebilir
userSchema.methods.correctPass = async function (candidatePass, userPass) {
  return await bcrypt.compare(candidatePass, userPass);
};

//5) JWT oluşturulma tarihinden sonra şifre değiştirilimiş mi kontrol et
userSchema.methods.controlPassDate = function (JWTTime) {
  if (this.passwordChangedAt && JWTTime) {
    // Şifre değiştirme tarihini saniye formatına çevirme
    const changeTime = parseInt(this.passwordChangedAt.getTime() / 1000);

    // JWT şifre sıfırlandıktan önce mi oluşmuş
    // Eğer JWT verilme tarihi şifre sıfırlama tarihinden küçükse, şifre değiştirme tarihi ileri tarihlidir ve ortada sorun vardır bu yüzden true döndürür.
    // JWT verilme tarihi şifre sıfırlama tarihinden büyükse sorun yoktur false döndürür.
    return JWTTime < changeTime;
  }

  return false;
};

//6) Şifre sıfırlama tokeni oluştur.
// Bu token daha sonra kullanıcı mailine gönderilecek ve kullanıcı şifersini
// Sıfırlarken kimliğini doğrulama amaçlı bu tokeni kullanacak
// 10 dakikkalık geçerlilik süresi olucak
userSchema.methods.createPasswordResetToken = function () {
  //1) 32 Byte'lık rastgele veri oluşturur ve onu hexadecimal bir diziye dönüştürür
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2) Tokeni hashle ve user dökümanı içerisine ekle
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 3) Tokenin son geçerlilik tarihihini kullanıcının dökümanına ekle
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // 4) Tokenin normal halini return et
  return resetToken;
};

// Kullanıcı modelini oluştur
const User = model("User", userSchema);

module.exports = User;
