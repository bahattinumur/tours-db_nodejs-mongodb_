// Yorum içeriği / Yıldız / Oluşturulma tarihi / Hangi tura atıldığının referansı/ Hangi kullanıcının attığının referansı

const mongoose = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = new mongoose.Schema({
  review: {
    type: String,
    required: [true, "A comment is required"],
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: "Tour",
    required: [true, "Please specify which tour the comment is for"],
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Indicate which user posted the comment"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

// Yapılan sorgularda tour ve user referanslarını gerçek belgelerle doldur
reviewSchema.pre(/^find/, function (next) {
  // User alanına populate uygular
  this.populate({ path: "user", select: "name photo" });

  next();
});

// Bir tur için rating ortalamasını hesaplayan bir fonksiyon yazalım
reviewSchema.statics.calcAverage = async function (tourId) {
  // Aggragate ile istatistik hesaplama
  const stats = await this.aggregate([
    // 1) Gönderilen tur ID'si ile eşleşen yorumları al
    { $match: { tour: tourId } },
    // 2) Toplam yorum sayısı ve yorumların ortalama rating değerini hesapla
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 }, // Toplam yorum sayısı
        avgRating: { $avg: "$rating" }, // Yorumların ortalama rating'i
      },
    },
  ]);

  // Eğer tura atılan yorum varsa
  // Hesaplanan istatistiklerin sonuçların tur belgesine kaydet
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    // Eğer tura atılan yorum yoksa varsayılan değerleri tanımla
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4,
      ratingsQuantity: 0,
    });
  }
};

// TODO bir kullanıcının aynı tura ikinci yorumu atmasını engellemeliyiz

// Sürekli olarak turları güncellediğimiz için, index'leyerek güncelleme aşamasında bütün tur dökümanlarının gereksiz yere incelenmesinin önüne geçelim
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Her yeni yorum atıldığında rating'i hesapla
reviewSchema.post("save", function () {
  // Turun ortalamasını hesaplayan methodu çağır
  Review.calcAverage(this.tour);
});

// Yorum silindiğinde veya güncellendiğinde rating'i tekrar hesapla
// Post mw'sinin fonksiyonu parametre olarak kaydedilen dökümanı alır
reviewSchema.post(/^findOneAnd/, function (doc) {
  Review.calcAverage(doc.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
