const mongoose = require('mongoose');
const app = require('./app');
require('dotenv').config({ path: './config.env' });

// MongoDB veritabanı ile bağlantı sağla
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log('Connection to database established'))
  .catch((err) =>
    console.log('ERROR!! There was a problem connecting to the database', err)
  );

// Server'ı ayağa kaldır
app.listen(process.env.PORT, () => {
  console.log(`The application started listeining on port ${process.env.PORT}`);
});
