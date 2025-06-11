
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
 * @description This function (currently with auth temporarily disabled for testing) expects 'textToSpeak' and 'imageId' in the `data` object.
 * It returns a mock video URL and acknowledges receipt of the data.
 */
exports.prepareLipSyncVideo = functions.region('us-central1').https.onCall(async (data, context) => {
  functions.logger.info("prepareLipSyncVideo (Callable): Request received.", { data, authContextProvided: !!context.auth, authUid: context.auth?.uid });

  // 🔴 Authentication check temporarily disabled for testing
  // if (!context.auth) {
  //   functions.logger.warn("prepareLipSyncVideo (Callable): Unauthenticated access attempt (auth check currently disabled).");
  //   // Normally, you would throw an error for unauthenticated access:
  //   // throw new functions.https.HttpsError(
  //   //   'unauthenticated',
  //   //   'The function must be called while authenticated.'
  //   // );
  // } else {
  //   functions.logger.info(`prepareLipSyncVideo (Callable): Authenticated user UID: ${context.auth.uid}`);
  // }

  const { textToSpeak, imageId } = data;
  if (!textToSpeak || !imageId) {
    functions.logger.warn(`prepareLipSyncVideo (Callable): Missing textToSpeak or imageId in request data.`, {textToSpeakProvided: !!textToSpeak, imageIdProvided: !!imageId });
    // For a real app, you might want to throw an 'invalid-argument' HttpsError here.
  }

  // Function logic: return mock data
  const mockVideoUrl = `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4?t=${Date.now()}&textLength=${textToSpeak?.length || 0}&imageId=${imageId || 'unknown'}`;
  
  return {
    message: `Function received the request successfully! (Auth check currently disabled for testing). UID from context (if present): ${context.auth?.uid || 'N/A'}`,
    mockVideoUrl: mockVideoUrl,
    dataReceived: { textToSpeak, imageId }
  };
});

// Public information endpoint, does not require authentication
exports.getAppInfo = functions.region('us-central1').https.onRequest(async (req, res) => {
  // Set CORS headers for all responses from this function
  res.set('Access-Control-Allow-Origin', '*'); // Allows all origins
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS'); // Specifies allowed methods
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Specifies allowed headers

  // Handle preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    functions.logger.info("getAppInfo: OPTIONS request received. Responding with 204.");
    res.status(204).send('');
    return;
  }

  functions.logger.info("getAppInfo: GET request received.");
  res.status(200).json({
    appName: "Avatar Animation App - Firebase Backend",
    version: "1.0.0",
    description: "This is the backend for the Avatar Animation application.",
    features: ["prepareLipSyncVideo (callable, auth check currently disabled for testing)", "getAppInfo (HTTP, public)"],
    timestamp: new Date().toISOString(),
  });
});
