const { Schema, model } = require("mongoose");
const validator = require("validator");

//! Şema | Şablon | Kalıp
//* Veri tabanına ekleceğimiz dökümanın hangi değerlere ve hangi tipteki verilere sahip olmasını belirldiğimiz. varsayılan değerini benzersiz olma durmunu + verinin kaydedilmeden önce değişmesi gereken alanlarını belirlediğimiz yapı.
//* Şemaları fırınlardaki kalıplara benzetebiliriz çünkü şemlardan çıkıcak olan her ürün birbirinin benzeri olucak.
const tourSchema = new Schema(
  {
    name: {
      type: String,
      unique: [true, "Name value must be unique"],
      required: [true, "The tour must have a name field"],
      minLength: [10, "Tour name must be at least 10 characters"],
      maxLength: [40, "Tour name can be up to 50 characters"],
      validate: [
        validator.isAlpha, // Validator kütüphanesindeki doğrulama fonksiyonunu kullandık
        "The name must contain only alphabetical characters.",
      ],
    },

    duration: {
      type: Number,
      required: [true, "The name must contain only alphabetical characters"],
    },

    maxGroupSize: {
      type: Number,
      required: [true, "The tour must have a duration field"],
    },

    difficulty: {
      type: String,
      required: [true, "The tour must have a difficulty field"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty level is not valid",
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.0, // Tur oluştururken rating'i söylemesek de default 4 olarak kaydedilecek
    },

    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      required: [true, "The tour must be the price value"],
    },

    priceDiscount: {
      type: Number,
      // Custom validator (kendi yazdığımız doğrulayıcılar)
      // İndirim değeri fiyatttan düşükse geçerli değilse geçersizdir
      validate: {
        validator: function (value) {
          return value < this.price;
        },
        message: "The discount price cannot be greater than the original price",
      },
    },

    summary: {
      type: String,
      trim: true, // kaydedilen verinin baş ve sonundaki boşlukları siler
      maxLength: [1000, "Tour description can be up to 1000 characters"],
      required: [true, "The tour must have a summary value"],
    },

    description: {
      type: String,
      trim: true,
      maxLength: 2000,
    },

    imageCover: {
      type: String,
      required: [true, "The tour must have the imageCover value"],
    },

    images: [String], // Metinlerden oluşan bir dizi

    startDates: [Date], // Tarihlerde oluşan bir dizi

    createdAt: {
      type: Date,
      default: Date.now(), // Varsayılan olarak bugünün tarihini ekle
    },

    hour: Number,

    // Başlangıç noktası
    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      description: String,
      coordinates: [Number],
      adress: String,
    },

    //* EMBEDDING
    //* Turun ziyaret noktaları dizi olarak tanımlanmalı
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        description: String,
        day: Number,
      },
    ],

    //* Child Refferance
    //* Turun ilgili reheberleri kullanıcların dizisindeki ID'leri ile referans gösterilmeli
    guides: [
      {
        type: Schema.ObjectId, // Referans tanımında tip her zaman Object-ID'dir
        ref: "User", // Hangi model ile tanımlanmış verinin referansını aldığımızı belirtiyoruz
      },
    ],
  },

  // Şema ayarları (sanal değreleri aktif ettik)
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//! INDEX
// Turları alırken fiyat ve rating ortalamasına göre filtre yapan kullanıcılara index sayesinde artık çok daha hızlı bir şekilde cevap vereceğiz. Index yapılan değerler veritabanında belirlediğimiz yöne göre sıralanır ve sıralanmış hali saklanır (belirli bir alan kaplar) ve bu değere göre filtreleme yapıldığında mongoDB'nin, verileri zaten sıralı olduğu için bütün dökümanları kontrol etmesine gerek kalmaz, sadece bulunan sayıda döküman incelenir bu sayede yüklenmesi süresini azaltırız.
tourSchema.index({ price: 1, ratingsAverage: -1 });

// Coğrafi veri için indexleme
tourSchema.index({ startLocation: "2dsphere" });

//! Virtual Property (Sanal Değer)
// Veri tabanında tutmamıza değmeyecek ama client tarafından
// Yapılan isteklerde göndermemiz gereken verileri veri tabanında tutmayıp
// Client'a gönderirken hesaplama işlemidir.
// Normal function kullanmamımızın sebebi this anahtar kelimesine erişim
// This aracılığı ile turların değerlerine erişebiliyoruz
// Fonksiyon hesaplama sonucu return edilen veri eklenilecek olan sanal değer olur.
tourSchema.virtual("slug").get(function () {
  return this.name.toLowerCase().replace(/ /g, "-");
});

//! Virtual Populate
// Normalde yorumları parent refferance ile turlara bağlamıştı ama bu yüzden turları aldığımız zaman o tura ait olan yorumlara erişemiyoruz.
tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour", // Dökümanın hangi alanına göre referans alıcaz
  localField: "_id", // Diğer dökümandaki alanın mevcut dökümandaki karşılığı olan alma
});

//! Document Middleware
// Middleware, iki olay arasında çalışan yapı
// Örn: Verinin alınıp veritabanına kaydedilmesi sırasında
tourSchema.pre("save", function (next) {
  // Veritabanına kaydedilmek üzere olan veriye yeni değer ekledik
  this.hour = this.duration * 24;

  // Sonraki adıma geçiş izni
  next();
});

// Fonksiyonu sadece bir işlemden önce değil sonra da çalıştırabiliyoruz
tourSchema.post("updateOne", function (doc, next) {
  //console.log('saved doc.', doc);
  //Örn: Kullanıcı yeni bir rapor oluşturduktan hemen sonra bu ay rapor sayısı + 1
  //Örn: Kullanıcı yeni bir hesap oluşturduktan hemen sonra mail göndermek isteyebiliriz
  //Örn: Kullanıcı şifresini güncellediğinde şifre değiştirme maili gönderilebilir.

  next();
});

//! Query Middleware (Sorgu Arayazılımı)
// Sorgulardan önce veya sonra devreye giren arayazılımlar
tourSchema.pre(/^find/, async function (next) {
  // Find isteklerinde secret değeri true olanları aradan çıkar
  this.find({ secret: { $ne: true } });

  next();
});

//! Populate
// Sorgulardan önce middleware ile populate'i tanımlarız.
// MongoDB'de populate bir belgedeki belirli bir alanın o alana referans verilen diğer bir kolleksiyondaki belgelerle dolduruluması anlamına gelir. Yani populating, referansları gerçek verilerle doldurmayı sağlar.
tourSchema.pre(/^find/, function (next) {
  this.populate({
    // Doldurulması gereken alanın ismi
    path: "guides",
    // Doldururken istemediğimiz alanlar
    select: "-__v -passwordResetToken -passwordResetExpires",
  });

  next();
});

// Hiçbir rapora gizli olanları dahil etme
tourSchema.pre("aggregate", function (next) {
  // Raporun ilk adımını belirle
  this.pipeline().push({ $match: { secret: { $ne: true } } });

  next();
});

//! Model
// Model şemadaki kısıtlamara göre kollekisyona yeni veri ekleme çıkarma kolleksiyondan veri alma gibi işlemleri yapmamıza olanak sağlar
const Tour = model("Tour", tourSchema);

// Tur modelini farklı dosyalarda kullanabilmek için export ediyoruz.
module.exports = Tour;
