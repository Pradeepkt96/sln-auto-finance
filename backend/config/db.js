const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use Atlas (prod) URI in production, local URI in development
    const uri =
      process.env.NODE_ENV === 'production'
        ? process.env.MONGO_URI_PROD
        : process.env.MONGO_URI;

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected [${process.env.NODE_ENV || 'development'}]: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
