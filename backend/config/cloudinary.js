const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');

// Ensure environment variables are loaded if server didn't already call dotenv
dotenv.config();

if (!process.env.CLOUDINARY_URL && !(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
  console.warn('CLOUDINARY credentials not found. Image uploads will fail until CLOUDINARY_URL or CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET are set.');
}

// cloudinary.v2 will automatically read CLOUDINARY_URL if present
cloudinary.config({
  secure: true,
});

module.exports = cloudinary;
