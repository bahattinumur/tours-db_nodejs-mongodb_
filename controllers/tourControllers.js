const Tour = require("../models/tourModel");
const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");

// Aylık planı hesaplar
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  // Parametre olarak gelen yılı al
  const year = Number(req.params.year);

  // Raporlama adımları
  const plan = await Tour.aggregate([
    //1) Turların başlangıç tarihlerini böl her turun bir tarihi olsun
    { $unwind: "$startDates" },
    //2) Belirli bir yılda başlayanları al
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    // 3) Turları ay'lara göre gruplandır
    {
      $group: {
        _id: { $month: "$startDates" }, // Aylara göre grupla
        numTourStarts: { $sum: 1 }, // Her ay başlayan tur sayısını hesapla
        tours: { $push: "$name" }, // Her turun ismini diziye aktar
      },
    },
    // 4) Rapordaki nesnelere ay elemanı ekle
    {
      $addFields: { month: "$_id" },
    },
    // 5) Rapordaki nesnlerden eleman çıkarma
    {
      $project: {
        _id: 0,
      },
    },
    // 6) Aylaara göre artan sıralama
    {
      $sort: {
        month: 1,
      },
    },
  ]);

  res.status(200).json({
    message: "Monthly plan created successfully",
    data: plan,
  });
});

// Alias Route (Takma Ad)
exports.aliasTopTours = (req, res, next) => {
  // Get all tours'un en iyi beş tanesini vermesi için gerekli parametreleri ekledik
  req.query.sort = "-ratingsAvarage,price";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  req.query.limit = "5";

  // Bir sonraki adım olan getAllTour'un çalışmasını söyledik
  next();
};

// İstatisktikleri hesaplar
exports.getTourStats = catchAsync(async (req, res, next) => {
  // Aggregation Pipeline
  // Raporlama Adımları
  const stats = await Tour.aggregate([
    // 1.Adım ) Ratingi 4 ve üstü olanları al
    {
      $match: { ratingsAverage: { $gte: 4.0 } },
    },
    // 2.Adım ) Zorluklarına göre gruplandır ve ortalama değerlerini hesapla
    {
      $group: {
        _id: "$difficulty",
        elemanSayisi: { $sum: 1 }, // Döküman sayısı kadar toplama yapar
        avgRating: { $avg: "$ratingsAverage" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    // 3.Adım ) Gruplanan veriyi fiyatlarına göre artan sıralar
    {
      $sort: { avgPrice: 1 },
    },
    // 4.Adım ) Fiyatı 400 den küçük olanları kaldır
    {
      $match: { minPrice: { $gte: 400 } },
    },
  ]);

  console.log(stats);

  res
    .status(200)
    .json({
      message: "Your report has been created successfully",
      data: stats,
    });
});

// Bütün turları alır
exports.getAllTours = factory.getAll(Tour);

// Yeni bir tur oluşturur
exports.createTour = factory.createOne(Tour);

// Sadece bir tur alır
exports.getTour = factory.getOne(Tour, "reviews");

// Bir turu günceller
exports.updateTour = factory.updateOne(Tour);

// Bir tur kaldırır
exports.deleteTour = factory.deleteOne(Tour);

// Sınırlar içerisindeki turları alır
exports.getToursWithin = async (req, res, next) => {
  const { latlng, distance, unit } = req.params;

  // Enlem ve boylamı değişkenlere aktar
  const [lat, lng] = latlng.split(",");

  // Gelen unite göre yarı çap hesapla
  const radius = unit == "mi" ? distance / 3963.2 : distance / 6378.1;

  // Merkez noktası gönderilmediyse hata ver
  if (!lat || !lng) return next(new AppError("Please identify the centre"));

  // Sınırlar içerisndeki turları al
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lat, lng], radius] } },
  });

  // Cevap gönder
  res.status(200).json({
    message: "Verilen sınırlar içersindeki turlar bulundu",
    tours,
  });
};

// Uzaklıkları hesapla
exports.getDistances = async (req, res, next) => {
  // URL'deki paramlara eriş
  const { latlng, unit } = req.params;

  // Enlem ve boylamı ayır
  const [lat, lng] = latlng.split(",");

  // Enleme ve boylam var mı kontrol et
  if (!lat | !lng)
    return next(new AppError("Please provide valid latitude and longitude"));

  // Unite göre multiplier hesapla
  const multiplier = unit === "mi" ? 0.000621371192 : 0.001;

  // Turların kullanıcın konumundan uzaklıklarını hesapla
  const distances = await Tour.aggregate([
    // 1) Merkez noktayı verip turların o konumdan uzaklıklarını hesapla
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [+lat, +lng],
        },
        distanceField: "distance",
        distanceMultiplier: multiplier, // Metre cevabını istenen formata çevirmek için çarp
      },
    },

    // 2) Nesneden istediğimiz değerleri seçme
    {
      $project: {
        name: 1,
        distance: 1,
      },
    },
  ]);

  // Clienta cevap gönder
  res.status(200).json({
    message:
      "The distances of the tours to the location you provided have been calculated.",
    data: distances,
    unit,
  });
};
