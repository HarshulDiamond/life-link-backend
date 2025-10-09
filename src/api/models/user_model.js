const mongoose = require('mongoose');

// Define valid blood groups to be used in the schema and controller
const BLOOD_GROUPS = [
  'A_POSITIVE',
  'A_NEGATIVE',
  'B_POSITIVE',
  'B_NEGATIVE',
  'AB_POSITIVE',
  'AB_NEGATIVE',
  'O_POSITIVE',
  'O_NEGATIVE',
];

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required.'],
  },
  number: {
    type: String,
    required: [true, 'Phone number is required.'],
    unique: true, // Ensures no duplicate phone numbers
    match: [/^\d{10}$/, 'Phone number must be 10 digits.'],
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required.'],
  },
  sex: {
    type: String,
    required: [true, 'Sex is required.'],
    enum: ['Male', 'Female', 'Other'],
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    sparse: true, // Allows multiple documents to have a null email
    match: [/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please provide a valid email address.'],
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required.'],
    match: [/^\d{6}$/, 'Pincode must be 6 digits.'],
  },
  bloodGroup: {
    type: String,
    required: [true, 'Blood group is required.'],
    enum: BLOOD_GROUPS,
  },
  // Geospatial field for location searches
  location: {
    type: {
      type: String,
      enum: ['Point'], // Must be 'Point' for GeoJSON
      required: true,
    },
    coordinates: {
      type: [Number], // Array of numbers for [longitude, latitude]
      required: true,
    },
  },
}, {
  // Automatically add createdAt and updatedAt timestamps
  timestamps: true
});

// Create the 2dsphere index for geospatial queries on the location field
UserSchema.index({ location: '2dsphere' });

// Export both the model and the blood groups array for validation
module.exports = {
  User: mongoose.model('User', UserSchema),
  BLOOD_GROUPS
};
