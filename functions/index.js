
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(); // Initialize Firebase Admin SDK

/**
 * @summary Mock Firebase Function to simulate preparing data for lip-sync video generation.
 * @description This function is a placeholder. It now requires Firebase Authentication.
 * It expects 'textToSpeak' and 'imageId' in the request body (POST).
 * It returns a mock video URL and acknowledges receipt of the data for an authenticated user.
 */
exports.prepareLipSyncVideo = functions.region('us-central1').https.onRequest(async (req, res) => {
  // Allow CORS for local development and if calling from a different domain
  res.set('Access-Control-Allow-Origin', '*'); // Allow all origins (or restrict if needed for production)
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Specify allowed methods
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allow Authorization header

  if (req.method === 'OPTIONS') {
    // Handle preflight request for CORS
    res.status(204).send('');
    return;
  }

  // Firebase Admin SDK Token Verification
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    functions.logger.warn("prepareLipSyncVideo: Missing or malformed Authorization header.");
    return res.status(401).json({ error: 'Unauthorized', message: 'Authorization token is missing or malformed.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    functions.logger.info(`prepareLipSyncVideo: Authenticated successfully for UID: ${uid}.`);

    // Original mock logic (can be expanded)
    const { textToSpeak, imageId } = req.body;
    // For a mock, we don't strictly need to validate these, but it's good practice if they are expected.
    if (!textToSpeak || !imageId) {
        functions.logger.warn(`prepareLipSyncVideo: UID ${uid} - Missing textToSpeak or imageId in request body.`);
        // Depending on strictness, you might return a 400 here or proceed.
        // For this mock, we'll proceed but log it.
    }

    functions.logger.info(`prepareLipSyncVideo: UID ${uid} - Received request body (first 100 chars):`, 
      req.body ? JSON.stringify(req.body).substring(0,100) : "No body"
    );
  
    // Respond with success for authenticated user
    res.status(200).json({ 
        message: `Function received the request successfully for authenticated user ${uid}!`,
        mockVideoUrl: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4?t=${Date.now()}&uid=${uid}`, // Example mock video URL
        dataReceived: { textToSpeak, imageId } // Echo back what was received
    });

  } catch (error) {
    functions.logger.error("prepareLipSyncVideo: Token verification failed.", error);
    return res.status(401).json({ error: 'Unauthorized', message: 'Token verification failed. The token might be invalid or expired.' });
  }
});

// Public information endpoint, does not require authentication
exports.getAppInfo = functions.region('us-central1').https.onRequest((req, res) => {
   // Allow CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  functions.logger.info("Request received for getAppInfo");
  res.status(200).json({
    appName: "Avatar Animation App - Firebase Backend",
    version: "1.0.0",
    description: "This is the backend for the Avatar Animation application.",
    features: ["mockLipSyncVideoPreparation (now requires auth)", "getAppInfo"],
    timestamp: new Date().toISOString(),
  });
});
    