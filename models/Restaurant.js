const mongoose = require("mongoose");

const RestaurantSchema = new mongoose.Schema({
  id: String,
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
    aggregate_rating: String,
    rating_text: String,
    votes: String,
  },
  featured_image: String,
  menu_url: String,
});

module.exports = mongoose.model("Restaurant", RestaurantSchema);