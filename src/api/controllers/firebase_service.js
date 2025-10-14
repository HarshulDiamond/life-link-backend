
const { User } = require('../models/user_model');

 const admin = require('firebase-admin');

 // Path to your downloaded service account key
 const serviceAccount = require('./service-account-key-firebase.json');

 admin.initializeApp({
   credential: admin.credential.cert(serviceAccount)
 });

const sendNotificationToUser = async (userId, title, body, data = {}) => {
    try {
        // 1. Find the user by their ID
        const user = await User.findById(userId);

        if (!user || !user.tokens || user.tokens.length === 0) {
            console.log(`User ${userId} not found or has no FCM tokens.`);
            return;
        }

        // 2. Extract all FCM tokens for the user
        const tokens = user.tokens.map(token => token.fcmToken);

        // 3. Construct the message payload
        const payload = {
            notification: {
                title: title, // e.g., 'New Blood Request!'
                body: body,   // e.g., 'A+ blood needed urgently at City Hospital.'
            },
            data: data, // Optional: for handling taps, e.g., { 'requestId': '12345' }
        };

        // 4. Send the notification using the Admin SDK
     const message = {
       tokens: tokens,  // list of device FCM tokens
       notification: {
         title,
         body,
       },
       data,
     };

     const response = await admin.messaging().sendEachForMulticast(message);


        console.log('Successfully sent message:', response);

        // Optional: Clean up invalid tokens
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error('Failure sending notification to', tokens[index], error);
                // Here you might want to remove tokens that are no longer valid
            }
        });

    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

module.exports = { sendNotificationToUser };
