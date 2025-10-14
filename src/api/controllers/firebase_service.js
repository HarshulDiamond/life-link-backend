const admin = require('firebase-admin');

// 🚨 SECURITY WARNING: Hardcoding credentials is not recommended for production.
// It's better to use AWS Secrets Manager or encrypted environment variables.
const serviceAccount = {
  "type": "service_account",
  "project_id": "blood-near-by-1b36e",
  "private_key_id": "3e05dec90a34de3442a7bd9738fd07f6da86b39a",
  // The private key is correctly formatted with \n for use in a single string.
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCErJuyEjYzTTMS\ncfHA5SipPlfCAb6qksLiLqLB1GfPUikuaV8XTY5LJBU6IKwdloAnGZd/j98eU7pn\n46+pj9Ion8bowgPispWXgv2ZEK9kGIspvLmiObxkXOAuC9GDuCJVFN2twKsXLkEF\n5iLzfgHuiuWRox2DfcPXa9VijRpf2uBiRvuLbWhrdKFgVnE4yTYkM1jqMZzQ0qkY\nykS9j1fLtCqXUj5FGmfqr3xzzmfkP65Lwh0Xb+Nu/lm+UFetIxB1i1XEOnGF/khe\n2mCOIdkcm6C9lHP4G6pzhPbgwAjOp7f6WeECx8YHM5CXte5tL8sSI90fNPY8IuC3\nTxuiSruHAgMBAAECggEAA8Ap1WwvxxFMIjd0nHDkaBOgmuK+V23qf3o1B+JWBIwW\nKPJtCaiCHy97QCQgHLGeZTyTRiJn+tOZuSOJJqbi5VrnxLjs/JgmCkORB4yes+dm\n67xvlp2OOcIcZLQMOlTwXe2Tx++V7QPvbgspYS8AC/sDB82pYTtWPkoVaegcq9zN\nDOhVjyURoAkfNK05rmSpy1nm0M59xO2cUT+1+Bqi/cuAgufJF0WhkUotk12yP4Ko\n4UHi4hL4/rXOSTqmD/K/NRmFcovhMytUCoWidMzTw21+QRukhNsjycGZvoGmYrkU\n8E1rMXOFZ8kMKzz1GcjuMTCqlT6zfLjctm1d726xiQKBgQC5gqvJf+l3NzvJJYFn\nN1vRNQ9C2AIKoFaDuEFiV9pNpQYQ82g7RcwzFwqrg0OMECav+z4oGoli6mErnkho\nxD02bndmG/2y8Ms/mOGCWVz8lU3b/bWW994cmbv4SVtHMozoj+CBQkEdNj+engCE\neCO2u63q1BH6ZTSGcZG3stSxaQKBgQC3FlqdxTwfQfbRboURdu05KGNcpouSi8Rr\ngeL8phjDLd2+HGsf4dDHI6DFujcYEpgI0EdAF6hTp4f4d14hCmsS76qxuxg7Vfc+\naBWcm91rpPZm4snJoPWghNl3ERKjkuukWTGwRZMLypNdszGE06VD7EcUpIZ+gpTI\nHE2t/4p3bwKBgAlVIpFLhxJBTBetdFod9deLhM4HEes478FGprts0gWv9KMrq6W3\nuDMlyJqiSuaj9V5LFHBuDVVVlzfbiacDoFS5r/YKGHRFGuSDK20kU8I9PKKBm/4R\nUDI+Ja+y+Q2W5HHasx+tlpsCnKa9Kid/58QMow46RwFC0CanVf5Y18xpAoGBAI3x\nRbWVaSQupuT9kyrUEdxDZK067XBi7ZgPreQD/aSsFYLDU4X3Mz6Ab697zCTcnYQP\nvX2CGd0pQDAwkwh4pESdDLAYBhRSdImsdjzhVguTa/ieEKVCJcwZ0uMNmG66g/f5\nsp0fg34bwp5dQ6Hf1/vN3dmyKBdCs4hk8RBZ0ob/AoGAdcJgU8N0578bc9bcC2X7\n8MtXnBeMni0waK550zqiFr/XjWgfNOIHP7AUHrFZ3Ot7opTrcJKZpPV5wsrBNepa\ngb9yDCA/173nNzYovH+tvi9hxJzZwFmIumRDXXGiz5q6vM1cj6PlF6260rclngZF\nT8NpVBFSKh2MwZFwgGDQGag=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@blood-near-by-1b36e.iam.gserviceaccount.com",
  "client_id": "103339551750945829486",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40blood-near-by-1b36e.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Initialize Firebase Admin only ONCE, outside the handler function.
// This allows Lambda to reuse the initialized app across invocations (warm starts).
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized successfully.');
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
    console.log("Testing outbound network connectivity...");
    const response = await fetch('https://www.google.com');
    console.log(`✅ Network test successful. Status: ${response.status}`);
} catch (e) {
    console.error('❌ FATAL: Network connectivity test failed!', e);
    // Stop the function if it can't even reach Google
    return;
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
};

module.exports = { sendNotificationToUser };