const { User } = require('../models/user_model');
const admin = require('firebase-admin');

// Parse the JSON string from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Fix newline characters in private key
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized using single JSON env variable');
}

const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    const user = await User.findById(userId);

    if (!user || !user.tokens || user.tokens.length === 0) {
      console.log(`User ${userId} not found or has no FCM tokens.`);
      return;
    }

    const tokens = user.tokens.map(t => t.fcmToken);

    const message = {
      tokens,
      notification: { title, body },
      data,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log('✅ Successfully sent message:', response);

    response.responses.forEach((result, index) => {
      if (result.error) {
        console.error('❌ Error sending notification to', tokens[index], result.error);
      }
    });
  } catch (error) {
    console.error('🔥 Error sending notification:', error);
  }
};

module.exports = { sendNotificationToUser };
