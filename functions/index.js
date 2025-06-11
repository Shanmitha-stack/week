
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// It's safe to call initializeApp() multiple times; it returns the existing app if already initialized.
// However, in a typical Cloud Functions environment, calling it once at the top level is sufficient.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * @summary Mock Firebase Function to simulate preparing data for lip-sync video generation.
 * @description This function requires Firebase Authentication.
 * It expects 'textToSpeak' and 'imageId' in the request body (POST).
 * It returns a mock video URL and acknowledges receipt of the data for an authenticated user.
 */
exports.prepareLipSyncVideo = functions.region('us-central1').https.onRequest(async (req, res) => {
  // Allow CORS for local development and if calling from a different domain
  res.set('Access-Control-Allow-Origin', '*'); // For production, restrict this to your app's domain
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    // Handle preflight request for CORS
    functions.logger.info("prepareLipSyncVideo: OPTIONS request received. Responding with 204.");
    res.status(204).send('');
    return;
  }

  functions.logger.info("prepareLipSyncVideo: Request received.", { method: req.method, headers: req.headers, bodyFirst100: req.body ? JSON.stringify(req.body).substring(0,100) : "No body" });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    functions.logger.warn("prepareLipSyncVideo: Missing or malformed Authorization header.", { authHeaderPresent: !!authHeader, authHeaderStartsWithBearer: authHeader ? authHeader.startsWith('Bearer ') : false });
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Authorization token is missing or malformed. Expected format: "Bearer <token>".' 
    });
  }

  const idToken = authHeader.split('Bearer ')[1];
  functions.logger.info("prepareLipSyncVideo: Extracted ID token (first 10 chars):", idToken ? idToken.substring(0, 10) + "..." : "Token not found after split");

  if (!idToken) {
    functions.logger.warn("prepareLipSyncVideo: ID token is empty after splitting 'Bearer '.");
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'ID token is empty after splitting "Bearer " from Authorization header.' 
    });
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    functions.logger.info(`prepareLipSyncVideo: Token verified successfully for UID: ${uid}.`);

    const { textToSpeak, imageId } = req.body;
    if (!textToSpeak || !imageId) {
        functions.logger.warn(`prepareLipSyncVideo: UID ${uid} - Missing textToSpeak or imageId in request body.`);
        // Note: For a real app, you might want to return a 400 Bad Request here.
        // For now, we'll proceed to show it can work past auth if params are missing.
    }
  
    res.status(200).json({ 
        message: `Function received the request successfully for authenticated user ${uid}!`,
        mockVideoUrl: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4?t=${Date.now()}&uid=${uid}`,
        dataReceived: { textToSpeak, imageId }
    });

  } catch (error) {
    functions.logger.error("prepareLipSyncVideo: Token verification failed.", { 
        errorMessage: error.message, 
        errorCode: error.code, 
        errorStack: error.stack // Log stack for more details
    });
    return res.status(401).json({ 
        error: 'Unauthorized', 
        message: `Token verification failed. Details: ${error.message}`,
        errorCode: error.code // Include the error code from firebase-admin
    });
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
    
