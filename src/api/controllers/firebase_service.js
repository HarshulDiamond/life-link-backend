const admin = require('firebase-admin');
const https = require('https');

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
    // ✅ Use a stable open API instead of Google
    const response = await fetch('https://api.ipify.org?format=json',{ agent });
    const result = await response.json();
    console.log(`✅ Internet reachable. Public IP: ${result.ip}`);
  } catch (e) {
    console.error('❌ FATAL: Network connectivity test failed!', e);
  }
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] - INFO: Starting notification process for user ${userId}.`);

  try {
    // For testing, using a hardcoded token.
    const tokens = ["e6YHmaZ6RM6BSqnN-FPKgm:APA91bELIORGpDQH4I1AQAuanOTQOummXHiK7Xa-HvFTCY3AkyNkSjPvO3hNzc5NxGzQyEq2ZmNBDRKI1vqBAk6Ca1XGfLAiv-0ATnOOrHEAwn1gji_1VOg"];
    if (tokens.length === 0) {
      console.log(`INFO: No valid tokens found for user ${userId}.`);
      return;
    }

    const payload = {
        notification: {
            title,
            body,
            // Use 'imageUrl' for better compatibility across platforms
            ...(image && { imageUrl: image }),
        },
        data: data || {},
    };

    const tokenChunks = chunkArray(tokens, 500); // FCM batch limit is 500
    console.log(`DEBUG: Sending to ${tokens.length} tokens in ${tokenChunks.length} batch(es).`);

    // **CRITICAL FIX**: Use Promise.all to send all batches and wait for all to complete.
    const responses = await Promise.all(
      tokenChunks.map(batch =>
        admin.messaging().sendEachForMulticast({ tokens: batch, ...payload })
      )
    );

    let successCount = 0;
    let failureCount = 0;

    // Aggregate results from all batches
    responses.forEach(batchResponse => {
        successCount += batchResponse.successCount;
        failureCount += batchResponse.failureCount;
    });

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    console.log(`[${endTime.toISOString()}] - SUCCESS: Processed in ${duration.toFixed(2)}s. Sent: ${successCount}, Failed: ${failureCount}`);

  } catch (err) {
    // This will catch errors from initialization or sending.
    console.error(`[${new Date().toISOString()}] - FATAL: FCM send error for user ${userId}`, err);
  }
}

module.exports = { sendNotificationToUser, initFirebase }