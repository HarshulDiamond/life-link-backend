const admin = require('firebase-admin');
const https = require('https');
const { User, BLOOD_GROUPS } = require('../models/user_model');
let isInitialized = false

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    // Fix newline characters in the private key


const initFirebase = () => {
  if (!isInitialized && !admin.apps.length) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    isInitialized = true
    console.log('✅ Firebase Admin initialized successfully.')
  } else {
    console.log('⚙️ Firebase Admin already initialized.')
  }

  return admin
}

function chunkArray(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}


const sendNotificationToUser = async (userId, title, body, data = {}, image) => {
  try {
    const agent = new https.Agent({ keepAlive: true })
    console.log("🌐 Testing outbound network connectivity...");
    const response = await fetch('https://api.ipify.org?format=json',{ agent });
    const result = await response.json();
    console.log(`✅ Internet reachable. Public IP: ${result.ip}`);
  } catch (e) {
    console.error('❌ FATAL: Network connectivity test failed!', e);
  }
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] - INFO: Starting notification process for user ${userId}.`);

  try {
    // --- 1. Fetch the user from the database (uncommented) ---
    const user = await User.findById(userId);

    if (!user) {
        console.log(`INFO: User with ID ${userId} not found in the database.`);
        return;
    }

    if (!user.tokens || user.tokens.length === 0) {
      console.log(`INFO: User ${userId} has no FCM tokens registered.`);
      return;
    }

    // --- 2. Extract the actual token strings from the user's token objects ---
    // The user.tokens array contains objects like { fcmToken: '...', platform: '...' }
    // We need to map this to an array of strings: ['token1', 'token2', ...]
    const tokens = user.tokens.map(tokenObj => tokenObj.fcmToken);

    if (tokens.length === 0) {
      console.log(`INFO: No valid tokens found for user ${userId}.`);
      return;
    }

    const payload = {
        notification: {
            title,
            body,
            ...(image && { imageUrl: image }),
        },
        data: data || {},
    };

    const tokenChunks = chunkArray(tokens, 500);
    console.log(`DEBUG: Sending to ${tokens.length} tokens in ${tokenChunks.length} batch(es).`);

    const responses = await Promise.all(
      tokenChunks.map(batch =>
        admin.messaging().sendEachForMulticast({ tokens: batch, ...payload })
      )
    );

    let successCount = 0;
    let failureCount = 0;

    responses.forEach(batchResponse => {
        successCount += batchResponse.successCount;
        failureCount += batchResponse.failureCount;
    });

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    console.log(`[${endTime.toISOString()}] - SUCCESS: Processed in ${duration.toFixed(2)}s. Sent: ${successCount}, Failed: ${failureCount}`);

  } catch (err) {
    console.error(`[${new Date().toISOString()}] - FATAL: FCM send error for user ${userId}`, err);
  }
}

module.exports = { sendNotificationToUser, initFirebase }