const express = require("express");
const {
  getAllTours,
  getTour,
  deleteTour,
  updateTour,
  createTour,
  getTourStats,
  aliasTopTours,
  getMonthlyPlan,
  getToursWithin,
  getDistances,
} = require("../controllers/tourControllers");
const { protect, restrictTo } = require("../controllers/authControllers");
const reviewController = require("../controllers/reviewControllers");
const reviewRoutes = require("../routes/reviewRoutes");

// Router oluşturma
const router = express.Router();

// En iyi 5 f/p taneyi veren route
// aslında frontend getAllTours'a istek atıp parametreleri gönderirse aynı sonucu alabilir,
// ama aynı sonucu almak için fazla parametre getirmesi gerekli ve frontend tarafından sıklıkla istendiği için
// yeni bir route oluşuyoruz bu route'a istek atıldığında parametreleri middleware ile biz belirleyeceğiz
router
  .route("/top-five-best")
  .get(protect, restrictTo("admin"), aliasTopTours, getAllTours);

// Turların istiastiklerini almak için route
// Gerçek seneryo: Admin paneli için zorluğana göre turların istatistiklerini hesapla
router.route("/tour-stats").get(protect, restrictTo("admin"), getTourStats);

// Gerçek senaryo: belirli bir yıl için her ay başlıyacak olan turları al.
router
  .route("/monthly-plan/:year")
  .get(protect, restrictTo("admin"), getMonthlyPlan);

// Belirli bir alan içerisindeki turları al.
router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(getToursWithin);

// Turların kullanıcının konumundan ne kadar uzak olduklarını hesapla
router.route("/distances/:latlng/unit/:unit").get(getDistances);

// Router için yolları tanımlama
router
  .route("/")
  .get(getAllTours)
  .post(protect, restrictTo("guide", "lead-guide", "admin"), createTour);

router
  .route("/:id")
  .get(getTour)
  .delete(protect, restrictTo("lead-guide", "admin"), deleteTour)
  .patch(protect, restrictTo("guide", "lead-guide", "admin"), updateTour);

//! Nested Route Tanımlama
// POST /tours/124dsf466/reviews > Yeni tur ekle
// GET /tours/213412dsf4/reviews > Bir tura ait yorumları ver
// GET /tours/124asdas23/reviews/124ad324 > Bir yorumun bilgilerini al

// Review route'a istek attığımız zaman isteğin body kısmına turun ID'si eklenmeliydi
// BU endpointe istek atıldığında URL'den ID'yi alacağız
router.use("/:tourId/reviews", reviewRoutes);

// router'ı app'e tanıtmak için export et.
module.exports = router;
