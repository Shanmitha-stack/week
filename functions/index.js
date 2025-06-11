
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
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    // Handle preflight request for CORS
    res.status(204).send('');
    return;
  }

  functions.logger.info("prepareLipSyncVideo: Request received.", { headers: req.headers });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    functions.logger.warn("prepareLipSyncVideo: Missing or malformed Authorization header.", { authHeader });
    return res.status(401).json({ error: 'Unauthorized', message: 'Authorization token is missing or malformed.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  functions.logger.info("prepareLipSyncVideo: Extracted ID token (first 10 chars):", idToken ? idToken.substring(0, 10) + "..." : "Token not found after split");

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    functions.logger.info(`prepareLipSyncVideo: Token verified successfully for UID: ${uid}.`);

    const { textToSpeak, imageId } = req.body;
    if (!textToSpeak || !imageId) {
        functions.logger.warn(`prepareLipSyncVideo: UID ${uid} - Missing textToSpeak or imageId in request body.`);
    }

    functions.logger.info(`prepareLipSyncVideo: UID ${uid} - Received request body (first 100 chars):`, 
      req.body ? JSON.stringify(req.body).substring(0,100) : "No body"
    );
  
    res.status(200).json({ 
        message: `Function received the request successfully for authenticated user ${uid}!`,
        mockVideoUrl: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4?t=${Date.now()}&uid=${uid}`,
        dataReceived: { textToSpeak, imageId }
    });

  } catch (error) {
    functions.logger.error("prepareLipSyncVideo: Token verification failed.", { errorMessage: error.message, errorCode: error.code, error });
    return res.status(401).json({ error: 'Unauthorized', message: `Token verification failed. Details: ${error.message}` });
  }
});

// Public information endpoint, does not require authentication
exports.getAppInfo = functions.region('us-central1').https.onRequest((req, res) => {
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
    features: ["mockLipSyncVideoPreparation (requires auth)", "getAppInfo"],
    timestamp: new Date().toISOString(),
  });
});
    
