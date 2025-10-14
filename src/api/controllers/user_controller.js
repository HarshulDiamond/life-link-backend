const jwt = require('jsonwebtoken');
const { User } = require('../models/user_model');
const {Otp} = require('../models/otp_modal');
const { BloodRequest } = require('../models/blood_request_modal');
const mongoose = require('mongoose');
// --- Helper function to generate JWT ---
const generateToken = (id) => {
  // Use a secret key from your environment variables.
  // This token will be used to authenticate the user for future API calls.
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', // The token will expire in 30 days
  });
};



// --- 1. Send OTP Controller ---
const sendOtp = async (req, res) => {
    try {
        const { number } = req.body;
        if (!number || !/^\d{10}$/.test(number)) {
            return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required.' });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Use findOneAndUpdate with upsert to create or update the OTP for the given number
        await Otp.findOneAndUpdate(
            { number },
            { otp },
            { new: true, upsert: true }
        );

        // --- PRODUCTION NOTE ---
        // In a real application, you would integrate an SMS service like Twilio here.
        // await twilio.messages.create({ body: `Your OTP is ${otp}`, from: '+123456789', to: `+91${number}` });

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully.'+otp,
            // For development/testing purposes, we send the OTP in the response.
            // In production, you would REMOVE this line.
            otp: otp
        });

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, message: 'Server error while sending OTP.' });
    }
};


// --- 2. Verify OTP and Check Registration Status ---
const verifyOtp = async (req, res) => {
    try {
        const { number, otp } = req.body;
        if (!number || !otp) {
            return res.status(400).json({ success: false, message: 'Phone number and OTP are required.' });
        }

        // Find the OTP document. If it's not found, it's either wrong or expired.
        const otpDoc = await Otp.findOne({ number, otp });
        if (!otpDoc) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        }

        // OTP is correct, so we can delete it now to prevent reuse.
        await Otp.deleteOne({ _id: otpDoc._id });

        // Check if a user with this number already exists
        const existingUser = await User.findOne({ number });

        if (existingUser) {
            // User is already registered, so we log them in.
            const token = generateToken(existingUser._id);
            res.status(200).json({
                success: true,
                isRegistered: true,
                message: 'Login successful.',
                token: token,
                user: existingUser // Send user data to the frontend
            });
        } else {
            // User is not registered. Send a flag for the frontend to navigate to the registration screen.
            res.status(200).json({
                success: true,
                isRegistered: false,
                message: 'OTP verified. Please complete your registration.'
            });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Server error while verifying OTP.' });
    }
};

//const { protect } = require('../middleware/middleware'); // Assuming you have this middleware

// --- 5. Update/Save FCM Token ---
const updateFcmToken = async (req, res) => {
    try {
        const { fcmToken, platform, userId } = req.body;

        // 1. Validate input
        if (!fcmToken || !platform) {
            return res.status(400).json({ success: false, message: 'fcmToken and platform are required.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // 2. Check if the exact FCM token already exists in the array
        const tokenExists = user.tokens.some(token => token.fcmToken === fcmToken);

        if (tokenExists) {
            // If the token is already present, do nothing and confirm it's registered.
            return res.status(200).json({ success: true, message: 'FCM token is already registered.' });
        }

        // 3. If the token is new, add it to the array
        user.tokens.push({ fcmToken, platform, addedAt: new Date() });
        await user.save();

        res.status(200).json({ success: true, message: 'FCM token added successfully.' });

    } catch (error) {
        console.error('Error updating FCM token:', error);
        res.status(500).json({ success: false, message: 'Server error while updating token.' });
    }
};

// --- 3. Register User (Now with JWT generation) ---
const registerUser = async (req, res) => {
    try {
        const { name, number, dob, sex, email, pincode, bloodGroup, location } = req.body;

        // Basic validation
        if (!name || !number || !dob || !sex || !email || !pincode || !bloodGroup || !location) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        // Check if user already exists to prevent duplicate registrations
        const existingUser = await User.findOne({ number });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
        }

        const newUser = new User({ name, number, dob, sex, email, pincode, bloodGroup, location });
        await newUser.save();

        // After successful registration, generate a token to log them in automatically.
        const token = generateToken(newUser._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully!',
            token: token,
            user: newUser
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(' ') });
        }
        console.error('Error registering user:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid User ID format.' });
        }

        // Fetch user details and their requests in parallel for efficiency
        const [user, requests] = await Promise.all([
            User.findById(userId).select('-password -tokens'), // Exclude sensitive fields

            // MODIFIED LINE: Use .populate() to include requester details in each request
            BloodRequest.find({ requester: userId })
                .sort({ createdAt: -1 })
                // This populates the 'requester' field and selects only the specified fields.
                .populate('requester', 'name bloodGroup _id')
        ]);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({
            success: true,
            data: {
                user,
                requests
            }
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching profile.' });
    }
};

// --- 4. Get User Count (Remains the same) ---
const getUserCount = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.status(200).json({ success: true, count: totalUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};


module.exports = { sendOtp, verifyOtp, registerUser, getUserCount,updateFcmToken ,getUserProfile};



