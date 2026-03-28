const mongoose = require("mongoose");
const Cart = require("../models/Cart");

async function fixCartCollection() {
  try {
    await mongoose.connect("mongodb://shamz-db:Me%40shameem143%40eM@145.223.22.69:27017/FatherOfMeowDB?authSource=admin");

    console.log("MongoDB Connected");

    // 🔥 Drop wrong index
    try {
      await mongoose.connection.db.collection('carts').dropIndex('userId_1');
      console.log("Dropped old userId index");
    } catch (err) {
      console.log("No old index found");
    }

    // 🧹 Clean bad data
    await Cart.deleteMany({ user: null });

    // ✅ Ensure correct index
    await mongoose.connection.db.collection('carts').createIndex(
      { user: 1 },
      { unique: true }
    );

    console.log("Cart collection fixed ✅");

    await mongoose.disconnect();

  } catch (error) {
    console.error(error);
  }
}

fixCartCollection();