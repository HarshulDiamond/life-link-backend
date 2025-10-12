const mongoose = require('mongoose');
const { BLOOD_GROUPS } = require('./user_model'); // Re-using the blood groups from your user model

// Define the possible statuses for a blood request
const REQUEST_STATUSES = ['ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED'];

const BloodRequestSchema = new mongoose.Schema({
  // Link to the user who created the request. This is a reference to the User collection.
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A requester user ID is required.'],
  },
  patientName: {
    type: String,
    required: [true, 'Patient name is required.'],
  },
  bloodGroup: {
    type: String,
    required: [true, 'Blood group is required.'],
    enum: BLOOD_GROUPS, // Ensures the blood group is one of the valid types
  },
  unitsRequired: {
    type: Number,
    required: [true, 'Number of units is required.'],
    min: [1, 'At least 1 unit must be required.'],
  },
  hospitalName: {
    type: String,
    required: [true, 'Hospital name is required.'],
  },
  hospitalAddress: {
    type: String,
    required: [true, 'Hospital address is required.'],
  },
  contactNumber: {
    type: String,
    required: [true, 'A contact phone number is required.'],
    match: [/^\d{10}$/, 'Contact number must be 10 digits.'],
  },
  reason: {
    type: String,
    trim: true,
  },
  // We don't store the file in the DB, just the path to where it's saved on the server.
  doctorPrescriptionUrl: {
    type: String,
    required: [true, 'A doctor prescription PDF is required.'],
  },
  status: {
    type: String,
    enum: REQUEST_STATUSES,
    default: 'ACTIVE', // A new request is active by default
  },
  // Geospatial field, same as in the User model, to find nearby requests
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
}, {
  // Automatically add createdAt and updatedAt timestamps
  timestamps: true
});

// Create the 2dsphere index for geospatial queries
BloodRequestSchema.index({ location: '2dsphere' });

module.exports = {
  BloodRequest: mongoose.model('BloodRequest', BloodRequestSchema),
  REQUEST_STATUSES,
};
