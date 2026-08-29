const mongoose = require("mongoose");

const bookmarks = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  bookmarks: {
    type: [String], // Array of problem slugs
    default: [],
  },
}, { timestamps: true })

module.exports = mongoose.model("Bookmarks", bookmarks)
