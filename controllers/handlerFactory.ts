const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

// Delete işlemini proje içerisnide sadece model ismini değiştirerek defalarca kullanıp gereksiz kod tekrarına sebep oluyorduk bizde bu kod tekrarını önlemek için silme işlevindeki dinamik olan modeli parametre olarak alıyoruz herhangi bir ute eleman silinmesi gerektiğinde bu methodu çağırıp parametre olarak silinicek elemanın modelinni gönderiyoruz bu sayede büyük bir kod kalabalığından kurtuluyoruz
exports.deleteOne = (Model) =>
  catchAsync(async (req, res) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    // TODO CUSTOM HATA MESAJI EKLE

    res.status(204).json({
      status: "success",
      data: null,
    });
  });

// Güncelleme işlemi için ortak olarak kullanılabilecek method

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // New parametresi ile döndürülecek olan değerin dökümanın eski değil yeni değerleri olmasını istedik
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res
      .status(200)
      .json({ message: "Document updated successfully", data: updated });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.create(req.body);

    res
      .status(200)
      .json({ message: "Document created successfully", data: document });
  });

exports.getOne = (Model, popOptionts) =>
  catchAsync(async (req, res, next) => {
    // Bir sorgu oluştur
    let query = Model.findById(req.params.id);

    // Eğer populate ayarları varsa sorguya ekle
    if (popOptionts) query = query.populate(popOptionts);

    // Sorguyu çalıştır
    const found = await query;

    // Cevabı gönder
    res.status(200).json({ message: "Document found", data: found });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    //* /reviews > bütün yorumları getir
    //* /tours/tur_id/reviews > bir tura atılan yorumları getir
    let filter = {};

    // Eğer URL'de turID parametresi varsa yapılcak sorguyu bir tura ait yorumları alacak şekilde güncelle
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // APIFeatures class'ından örnek oluşturduk ve içerisndeki istediğimiz API özelliklerini çağırdık
    const features = new APIFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limit()
      .paginate();

    // Hazırldaığımız komutu çalıştır verileri al
    const docs = await features.query;

    res.status(200).json({
      message: "Documents received successfully",
      results: docs.length,
      data: docs,
    });
  });
