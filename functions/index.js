
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// It's safe to call initializeApp() multiple times; it returns the existing app if already initialized.
// However, in a typical Cloud Functions environment, calling it once at the top level is sufficient.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * @summary Mock Firebase Callable Function to simulate preparing data for lip-sync video generation.
 * @description This function requires Firebase Authentication (user must be signed in).
 * It expects 'textToSpeak' and 'imageId' in the `data` object.
 * It returns a mock video URL and acknowledges receipt of the data for an authenticated user.
 */
exports.prepareLipSyncVideo = functions.region('us-central1').https.onCall(async (data, context) => {
  functions.logger.info("prepareLipSyncVideo (Callable): Request received.", { data, authContextProvided: !!context.auth });

  // Authentication check
  if (!context.auth) {
    functions.logger.warn("prepareLipSyncVideo (Callable): Unauthenticated access attempt.");
    // Send back a functions.https.HttpsError to the client.
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const uid = context.auth.uid;
  functions.logger.info(`prepareLipSyncVideo (Callable): Authenticated user UID: ${uid}`);

  const { textToSpeak, imageId } = data;
  if (!textToSpeak || !imageId) {
    functions.logger.warn(`prepareLipSyncVideo (Callable): UID ${uid} - Missing textToSpeak or imageId in request data.`, {textToSpeakProvided: !!textToSpeak, imageIdProvided: !!imageId });
    // For a real app, you might want to throw an 'invalid-argument' HttpsError here.
    // For now, we'll proceed to show it can work past auth if params are missing.
  }

  // Function logic: return mock data
  return {
    message: `Function received the request successfully for authenticated user ${uid}! (Callable Function)`,
    mockVideoUrl: `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4?t=${Date.now()}&uid=${uid}`,
    dataReceived: { textToSpeak, imageId }
  };
});

// Public information endpoint, does not require authentication
exports.getAppInfo = functions.region('us-central1').https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Handle preflight request for CORS
    functions.logger.info("getAppInfo: OPTIONS request received. Responding with 204.");
    res.status(204).send('');
    return;
  }
  functions.logger.info("Request received for getAppInfo");
  res.status(200).json({
    appName: "Avatar Animation App - Firebase Backend",
    version: "1.0.0",
    description: "This is the backend for the Avatar Animation application.",
    features: ["prepareLipSyncVideo (callable, requires auth)", "getAppInfo (HTTP, public)"],
    timestamp: new Date().toISOString(),
  });
});
