const mongoose = require('mongoose');

const bloodCampSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Camp name is required.'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Camp venue or address is required.'],
      trim: true,
    },
    dateTime: {
      type: Date,
      required: [true, 'Camp date and time are required.'],
    },
    // The S3 URL for the optional uploaded image
    imageUrl: {
      type: String,
      trim: true,
    },
    // To track who organized the camp
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const BloodCamp = mongoose.model('BloodCamp', bloodCampSchema);

module.exports = { BloodCamp };
