const Tour = require("../models/tourModel");

// Bütün turları alır
exports.getAllTours = async (req, res) => {
  try {
    //* URL'den alınan parametreler { duration: { gt: '14' }, price: { lte: '600' } }
    //* Mongoose'un isteği format   { duration: { $gt: '14' }, price: { $lte: '600' } }
    // Bizim yapmamız gereken URL'den alınan parametrelerde eğer ki kullanılan bir mongoDB operatörü varsa operatöün başına + koymalıyız

    //! 1) FİLTRELEME
    //1.1) İstek ile gelen parametreler
    const queryObj = { ...req.query };

    //1.2) Filtreleme dışarısında kullanmıcğımız parametreleri queryObj'den kaldır
    const excludedFields = ["sort", "limit", "page", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    //1.3) Replace kullanbilmek için nesneyi stringe çevir
    let queryString = JSON.stringify(queryObj);

    //1.4) Bütün operatörlerin başına $ ekle
    queryString = queryString.replace(
      /\b(gte|gt|lte|lt|ne)\b/g,
      (found) => `$${found}`
    );

    //1.5) Tur verilerini filtrele
    let query = Tour.find(JSON.parse(queryString));

    //! 2) SIRALAMA
    if (req.query.sort) {
      //2.1) params.sort geldiyse gelen değere göre sırala
      // gelen:      -ratingsAverage,duration
      // istediğimiz: -ratingsAverage duration
      const sortBy = req.query.sort.split(",").join(" ");

      query = query.sort(sortBy);
    } else {
      //2.1) params.sort gelmediyse tarihe göre sırala
      query = query.sort("-createdAt");
    }

    //! 3) ALAN LİMİTLEME
    if (req.query.fields) {
      //3.1) params.fields geldiyse  istenmeyen alanları kaldır
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      //3.2) fields gelmediyse __v değerini kaldır
      query.select("-__v");
    }

    //! 4) SAYFALAMA
    // skip > kaç tane döküman atlanıcak
    // limit > max kaç döküman alıncak
    const page = Number(req.query.page) || 1; // Sayfa değeri 5 olduğunu varsayalım
    const limit = Number(req.query.limit) || 10; // Limit değeri 20 olsun
    const skip = (page - 1) * limit; // 5.sayfadakileri görmek için atlanıcak eleman 80'dir

    // Veritabanına yapılcak olan isteği güncelle
    query = query.skip(skip).limit(limit);

    // SON) - Hazırladığımız komutu çalıştır verileri al
    const tours = await query;

    res.status(200).json({
      message: "Data received successfully",
      results: tours.length,
      data: tours,
    });
  } catch (err) {
    console.log(err);

    res.status(400).json({
      message: "Sorry, an error occurred while retrieving data.",
    });
  }
};

// Yeni bir tur oluşturur
exports.createTour = async (req, res) => {
  //* 1.yol
  // Const yeniTur = new Tour({ ...req.body });
  // YeniTur.save();

  try {
    //* 2.yol
    const newTour = await Tour.create(req.body);

    res.status(200).json({ message: "Data saved successfully", data: newTour });
  } catch (err) {
    res.status(400).json({
      message: "Sorry, an error occurred while trying to save the data.",
    });
  }
};

// Sadece bir tur alır
exports.getTour = async (req, res) => {
  try {
    //* 1.yol) findOne(): ID dışarısında değerleri de destekler
    // const foundTour = await Tour.findOne({ _id: req.params.id });

    //* 2.yol) findById(): sadeceye ID'yi destekler
    const founddTour = await Tour.findById(req.params.id);

    res.status(200).json({ message: "Tour found", data: founddTour });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Sorry, an error occurred while retrieving the tour." });
  }
};

// Bir turu günceller
exports.updateTour = async (req, res) => {
  try {
    // New parametresi ile döndürülecek olan değerin dökümanın eski değil yeni değerleri olmasını istedik
    const updatedTour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.status(200).json({ message: "Tour updated", data: updatedTour });
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({ message: "Sorry, an error occurred while updating the tour." });
  }
};

// Bir tur kaldırır
exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({});
  } catch (err) {
    res.status(400).json({ message: "Deletion failed" });
  }
};
