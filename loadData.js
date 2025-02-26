const mongoose = require("mongoose");
const fs = require("fs");
const dotenv = require("dotenv");
const Restaurant = require("./models/Restaurant");

dotenv.config();

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ✅ Import Data Function
const importData = async () => {
  try {
    const data = JSON.parse(fs.readFileSync("file1.json", "utf-8"));

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("❌ Invalid JSON structure: Expected an array at the root.");
    }

    let restaurants = [];

    data.forEach((entry) => {
      if (Array.isArray(entry.restaurants)) {
        const extractedRestaurants = entry.restaurants.map((r) => {
          const rest = r.restaurant;
          if (!rest || !rest.location) {
            console.warn("⚠️ Skipping invalid restaurant entry:", r);
            return null;
          }

          return {
            id: rest.id || null,
            name: rest.name || "Unknown",
            cuisines: rest.cuisines || "Not specified",
            location: {
              type: "Point",
              coordinates: [
                parseFloat(rest.location.longitude) || 0,
                parseFloat(rest.location.latitude) || 0,
              ], // GeoJSON format
              address: rest.location.address || "No address provided",
              city: rest.location.city || "Unknown",
            },
            average_cost_for_two: rest.average_cost_for_two || 0,
            price_range: rest.price_range || 1,
            user_rating: {
              aggregate_rating: parseFloat(rest.user_rating?.aggregate_rating) || 0,
              rating_text: rest.user_rating?.rating_text || "No Rating",
              votes: parseInt(rest.user_rating?.votes) || 0,
            },
            featured_image: rest.featured_image || "",
            menu_url: rest.menu_url || "",
          };
        }).filter(item => item !== null); // Remove invalid entries

        restaurants = restaurants.concat(extractedRestaurants);
      }
    });

    if (restaurants.length === 0) {
      throw new Error("❌ No valid restaurants found in the JSON file.");
    }

    await Restaurant.insertMany(restaurants);
    console.log(`✅ Successfully imported ${restaurants.length} restaurants.`);
    process.exit();
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

// ✅ Run the Import Function
importData();
