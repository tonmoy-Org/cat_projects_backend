const cloudinary = require('../../utils/cloudinary'); // adjust path

cloudinary.api.ping()
  .then(result => {
    console.log("✅ Cloudinary is working!");
    console.log(result);
  })
  .catch(error => {
    console.error("❌ Cloudinary error:");
    console.error(error);
  });