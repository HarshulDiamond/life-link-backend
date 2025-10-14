// otp_modal.js
const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '5m' },
});

const Otp = mongoose.model('Otp', OtpSchema);

module.exports = { Otp }; // <-- export as object
