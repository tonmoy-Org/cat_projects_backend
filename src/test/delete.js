const mongoose = require("mongoose");
const Blog = require("../models/Blog");
const Carousel = require("../models/Carousel");
const Cat = require("../models/Cat");
const Product = require("../models/Product");

async function deleteAllData() {
  try {
    await mongoose.connect("mongodb://shamz-db:Me%40shameem143%40eM@145.223.22.69:27017/FatherOfMeowDB?authSource=admin");

    console.log("MongoDB Connected");

    await Blog.deleteMany({});
    await Carousel.deleteMany({});
    await Cat.deleteMany({});
    await Product.deleteMany({});

    console.log("All documents deleted successfully");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error deleting documents:", error);
  }
}

deleteAllData();