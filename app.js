const express = require("express");
const morgan = require("morgan");
const AppError = require("./utils/appError");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const multer = require("multer");

// Express kurulum
const app = express();

// Güvenlik için headerlar ekler
app.use(helmet());

// İstek detaylarını consola yazan middlware
app.use(morgan("dev"));

// Bir IP adresinden belirli süre içerinde gelecek olan istekleri sınırla
const limiter = rateLimit({
  max: 100, // Aynı IP adresinden gelecek max istek sınırı
  windowMs: 60 * 60 * 1000, // ms cinsinden 1 saat
  message: "You have completed your request within 1 hour. Try again later",
});

// Middleware'i API route'ları için tanıtma
app.use("/api", limiter);

// body headers vs. gelen json verisini js'de kullanbilir formata getirir
app.use(express.json({ limit: "10kb" }));

// Data sanitization - Verileri Sterelize Etme - Query Injection
// İsteğin body / params / header kısmına eklenen her türlü opeatörü kaldır
app.use(mongoSanitize());

// HTML kodunun içeriesinde saklanan js'yi tespit eder ve bozar
app.use(xss());

// Parametre kirliliğini önler
app.use(hpp({ whitelist: ["duration", "ratingsQuantity"] }));

// Tour ve user route'larını projeye tanıt
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);

// Tanımlanmayan bir route'a istek atıldığında hata ver
app.all("*", (req, res, next) => {
  // Hata detaylarını belirle
  const error = new AppError("You sent a request to an undefined route", 404);

  // Hata middlware'ine yönlendir ve hata bilgilerini gönder
  next(error);
});

// Hata olduğunda devreye giren bir middleware
// hata bilgilerini alır ve cevap olarak gönderir
app.use((err, req, res, next) => {
  // hata detaylarını konsola yaz
  console.log(err.stack);

  // Durum kodu veya durum değerleri gönderilmediğinde varsayılan değerler devreye girsin
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  err.message = err.message || "Sorry, an error occurred";

  // Cevap gönder
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

module.exports = app;
