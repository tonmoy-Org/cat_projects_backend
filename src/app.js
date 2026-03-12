const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const carouselRoutes = require('./routes/carouselRoutes');
const blogRoute = require("./routes/blogRoutes");
const socialVideoRouter = require("./routes/socialVideoRoutes");
const catRoutes = require('./routes/catRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();

app.use(
  cors({
    origin: [
      'https://fatherofmeow.com',
      'https://www.fatherofmeow.com',
      'https://api.fatherofmeow.com',
      'http://localhost:5173'
    ],
    credentials: true,
  })
);

// Increase body size limits to handle large files
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/carousel', carouselRoutes);
app.use('/api/blogs', blogRoute);
app.use("/api/videos", socialVideoRouter);
app.use('/api/cats', catRoutes);
app.use('/api/products', productRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ success: false, message: 'Internal server error' });
});

module.exports = app;