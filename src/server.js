const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const app = require('./app');

dotenv.config();
require('./../utils/cloudinary'); 

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  console.error('Shutting down due to Unhandled Promise Rejection...');
  console.error(err.name, err.message);
  process.exit(1);
});

startServer();