const mongoose = require('mongoose');
const app = require('./app');
require('dotenv').config({ path: './config.env' });

// Connect to the MongoDB database
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log('Connection to database established'))
  .catch((err) =>
    console.log('ERROR!! There was a problem connecting to the database', err)
  );

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`The application started listening on port ${process.env.PORT}`);
});
