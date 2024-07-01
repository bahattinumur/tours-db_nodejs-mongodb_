// Javascript'teki yerleşik hata class'ının bütün özelliklerinin dışarısında ekstra özelliklere ve parametrelere sahip olan  gelişmiş versiyonu oluşturlaralım.

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // Durum koduna göre status değerini belirle: 4xx şeklindeyse fail 5xx şeklindeyse error olmalı
    this.status = String(this.statusCode).startsWith("4") ? "fail" : "error";

    // Hata'nın detayı ve hata oluşana kadar çalışan detayların bilgisini al
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
