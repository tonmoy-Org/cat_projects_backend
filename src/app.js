const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const carouselRoutes = require("./routes/carouselRoutes");
const blogRoute = require("./routes/blogRoutes");
const socialVideoRouter = require("./routes/socialVideoRoutes");
const catRoutes = require("./routes/catRoutes");
const productRoutes = require("./routes/productRoutes");

const app = express();

/*
CORS CONFIGURATION
*/
const allowedOrigins = [
  "http://localhost:5173",
  "https://fatherofmeow.com",
  "https://www.fatherofmeow.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* Handle preflight requests */
app.options("*", cors());

/*
BODY PARSER
*/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
ROUTES
*/
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/carousel", carouselRoutes);
app.use("/api/blogs", blogRoute);
app.use("/api/videos", socialVideoRouter);
app.use("/api/cats", catRoutes);
app.use("/api/products", productRoutes);

/*
HEALTH CHECK
*/
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

/*
ERROR HANDLING
*/
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;