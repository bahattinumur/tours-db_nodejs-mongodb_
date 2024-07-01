const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendMail = require("../utils/email");
const crypto = require("crypto");

// Token oluşturur
const signToken = (user_id) => {
  return jwt.sign({ id: user_id }, process.env.JWT_SECRET, {
    expiresIn: "90d",
  });
};

// Token oluşturup gönderir
const createSendToken = (user, statusCode, res) => {
  // Yeni token oluştur
  const token = signToken(user._id);

  // Tokeni sadece HTTP üzerinde seyahat eden çerezler üzerinde gönder
  res.cookie("jwt", token, {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    // secure: true,
  });

  // Şifreyi kaldır
  user.password = undefined;

  // Cevap olarak gönder
  res.status(statusCode).json({
    message: "Logged In",
    user,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // JWT tokeni oluştur ve gönder
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) E-mail ve şifre düzgün mü kontrol et
  if (!email || !password) {
    return next(new AppError("Please enter your email and password", 401));
  }

  //2) Gönderilen e-mailde kullanıcı var mı kontrol et
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(
      new AppError("There is no user with the email address you entered", 404)
    );
  }

  //3) Şifresi doğru mu kontrol et
  // Veri tabanında saklanan hashlenmiş şifre ile kullanıcının girdiği normal şifreyi katşılaştırır
  const isValid = await user.correctPass(password, user.password);

  if (!isValid) {
    return next(new AppError("The password you entered is incorrect", 400));
  }

  //4) Her şey tamamsa JWT tokenini oluştur ve gönder
  createSendToken(user, 200, res);
});

// Kullanıcın tokeni üzerinden token geçerliliğini doğrulayıp
// ardından geçerliyse ve rolü uygunsa route'a erişime izin vericek
// aksi takdirde yetkiniz yok hatası vericek bir middleware
exports.protect = async (req, res, next) => {
  //1) Tokeni al ve tokenin tanımlı geldiğinden emin ol
  let token = req.headers.authorization;

  if (token && token.startsWith("Bearer")) {
    // Tokenin Bearer kelimesinden sonraki kısmını al
    token = token.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("You are not authorized for this action", 403));
  }

  //2) Tokenin geçerliliğini doğrula
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.message === "jwt expired") {
      return next(
        new AppError("Your session has expired. Please log in again.", 403)
      );
    } else {
      return next(new AppError("The token you sent is invalid", 403));
    }
  }

  //3) Kullanıcının hesabı duruyor mu konrtol et
  const activeUser = await User.findById(decoded.id);

  if (!activeUser) {
    return next(
      new AppError("The user's account is no longer accessible", 403)
    );
  }

  // 4) Tokeni verdikten sonra şifresini değiştirdi mi kontrol et
  if (activeUser.controlPassDate(decoded.iat)) {
    return next(
      new AppError(
        "You have recently changed your password. Please log in again."
      )
    );
  }

  // Bir sonraki aşamaya aktif kullanıcının bilgileini aktar
  req.user = activeUser;
  next();
};

// parametre olarak gelen roldeki kullanıcıların route'a erişmesini engelleyen middleware
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // 1) Kullanıcının rolü geçerli roller arasında yoksa, erişimi engelle
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission to perform this action (role incompetent).",
          401
        )
      );
    }

    // 2) Kullanıncın rolü geçerli roller arasında varsa erişime izin vericez
    next();
  };

//1) Kullanıcı şifresini unuttuysa
//a) E-postasına şifre sıfırlama bağlantısı gönder
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) E-postaya göre kullanıcnın hesabına eriş
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("No user found with this email address"));
  }

  // 2) Şifre sıfırlama tokeni oluştur
  const resetToken = user.createPasswordResetToken();

  // 3) Veritabanına tokenin şifrelenmiş halini ve son geçerlilik tarihini kaydet
  // şifre alanını göndermediğimiz için doğrulamaları devre dışı bıraktık
  await user.save({ validateBeforeSave: false });

  //4) Kullanıcının mailine tokeni link ile gönder
  try {
    const link = `${req.protocol}://${req.headers.host}/api/v1/users/reset-password/${resetToken}`;

    const html = `
     <h1>Hello, ${user.name}</h1>
     <p>The password reset link for the tourify account linked to your email address is ${user.email}  below.<p>

     <p>
     <a href="${link}">${link}</a>
     You can update your password by sending a PATCH request to this URL with your new password within 10 minutes.
     </p>

     <p>If you did not send this email, please just ignore it.</p>
     <p>Tourify Team</p>
   `;

    await sendMail({
      email: user.email,
      subject: "Password reset token: (Duration 10 minutes)",
      html,
    });
  } catch (err) {
    // Mail atılamazsa veritabanına kaydedilen değerleri kaldır
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError("There was a problem trying to send the mail"));
  }

  // Cevap gönder
  res.status(200).json({
    message:
      "The encrypted version of the token was saved to the database and the normal version of the token was sent to the mail.",
  });
});

//b) Kullanıcnın yeni şifresini kaydet
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Tokenden yola çıkarak kullanıcıyı bul
  const token = req.params.token;

  //a) Elimizde normal token olduğu ve veritabanında hash'lenmiş hali kaydedildiği için kullanıcıya erişmek adına aldığımız tokeni hashe'leriz
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  //b) Hash'lenmiş token değerine sahip kullanıcyı al
  // Son geçerlilik tarihi henüz dolmamış olmasını kontrol et
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //3) Token geçersiz veya süresi dolmuşsa uyarı gönder
  if (!user) {
    return next(new AppError("Token is invalid or expired"));
  }

  //4) Kullanıcının şifre değiştirme tarihini güncelle
  user.password = req.body.password;
  user.passwordConfirm = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  return res.status(200).json({
    message: "Your new password has been set",
  });
});

//2) Kullanıcı şifresini biliyor ama değiştirmek istiyorsa
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Kullanıcıyı al
  const user = await User.findById(req.user._id).select("+password");

  //2) Gelen mevcut şifre doğru mu kontrol et
  if (!(await user.correctPass(req.body.currentPassword, user.password))) {
    return next(new AppError("The current password you entered is incorrect."));
  }

  //3) Doğruysa şifreyi güncelle
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPassword;

  await user.save();

  //4) Yeni JWT Tokeni oluştur ve gönder
  createSendToken(user, 200, res);
});
