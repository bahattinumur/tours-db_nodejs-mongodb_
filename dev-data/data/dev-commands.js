const fs = require("fs");
const Tour = require("../../models/tourModel");
const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");

const mongoose = require("mongoose");
require("dotenv").config({ path: "./config.env" });

// MongoDB veritabanı ile bağlantı sağla
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("Connection to database established"))
  .catch((err) =>
    console.log("ERROR!! There was a problem connecting to the database", err)
  );

// process.argv: node'da çalışan komut satırının argümanlarını dizi şeklinde içeren bir nesnedir

// Turlar dosyasındaki verileri oku
let tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`));
let users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`));
let reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`));

// Js formatına çevir

//! Dosyayadan verileri alıp kolleksiyona aktarırır
const importData = async () => {
  try {
    await Tour.create(tours, { validateBeforeSave: false });
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews, { validateBeforeSave: false });
    console.log("All Data Transferred");
  } catch (err) {
    console.log("Something went wrong", err);
  }

  process.exit();
};

//! Kolleksiyondaki bütün verileri temizler
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log("All Data has been deleted");
  } catch (err) {
    console.log("Something went wrong");
  }

  process.exit();
};

// Çalıştırlan komuttaki argümanlara göre yaplıcak olan işlemi belirle
if (process.argv.includes("--import")) {
  importData();
} else if (process.argv.includes("--delete")) {
  deleteData();
}
