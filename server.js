const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data"); // Required for sending images to Python API
const dotenv = require("dotenv");

const app = express();
const port = process.env.PORT || 5000;
dotenv.config();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Define Restaurant Schema
const RestaurantSchema = new mongoose.Schema({
  restaurant_id: Number,  // use restaurant_id for consistency
  name: String,
  cuisines: String,
  location: {
    type: { type: String, default: "Point" },
    coordinates: {
      type: [Number],
      index: "2dsphere",
    },
    address: String,
    city: String,
  },
  average_cost_for_two: Number,
  price_range: Number,
  user_rating: {
    aggregate_rating: Number, // Updated to Number type for consistency
    rating_text: String,
    votes: Number,  // Updated to Number type for consistency
  },
  featured_image: String,
  menu_url: String,
});

RestaurantSchema.index({ location: "2dsphere" });

const Restaurant = mongoose.model("Restaurant", RestaurantSchema); // Collection name

// ✅ API: Get Restaurant by ID
app.get("/api/restaurantss/:id", async (req, res) => {
  try {
    const restaurantId = req.params.id.toString();

    const restaurant = await Restaurant.findOne({
      id: restaurantId,
    });

    if (!restaurant) {
      console.log("❌ No matching restaurant found.");
      return res.status(404).json({ message: "Restaurant Not Found" });
    }

    res.json(restaurant);
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// ✅ API: Get Restaurants with Pagination
app.get("/api/restaurants", async (req, res) => {
  try {
    let { page, limit } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    let query = {};

    // Fetch restaurants with pagination
    const restaurants = await Restaurant.find(query)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Restaurant.countDocuments(query);

    res.json({
      totalRestaurants: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      restaurants,
    });
  } catch (error) {
    console.error("❌ Error fetching restaurants:", error);
    res.status(500).json({ message: "Server Error", error });
  }
});

// ✅ API: Find Nearby Restaurants
app.get("/api/nearby", async (req, res) => {
  try {
    let { latitude, longitude, distance } = req.query;

    if (!latitude || !longitude || !distance) {
      return res.status(400).json({ message: "Latitude, longitude, and distance are required!" });
    }

    latitude = parseFloat(latitude);
    longitude = parseFloat(longitude);
    distance = parseFloat(distance) * 1000; // Convert km to meters

    // Query MongoDB using $near
    const restaurants = await Restaurant.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: distance,
        },
      },
    });

    res.json({ total: restaurants.length, restaurants });
  } catch (error) {
    console.error("❌ Error fetching nearby restaurants:", error);
    res.status(500).json({ message: "Server Error", error });
  }
});

// ✅ Configure Multer for File Uploads (Image Search)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// ✅ API: Image-Based Restaurant Search
app.post("/api/image-search", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded!" });
  }

  const imagePath = req.file.path;

  try {
    // Send the image to the Python API for classification
    const formData = new FormData();
    formData.append("file", req.file);

    const response = await axios.post(
      "http://localhost:8000/classify-image/",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    const detectedFood = response.data.detected_food;

    // Search for restaurants serving the detected food
    const restaurants = await Restaurant.find({
      cuisines: { $regex: new RegExp(detectedFood, "i") },
    });

    res.json({ detectedFood, total: restaurants.length, restaurants });
  } catch (error) {
    console.error("❌ Error in image classification:", error);
    res.status(500).json({ message: "Error processing image", error });
  }
});

// ✅ Start Server
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
 