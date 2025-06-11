
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// It's safe to call initializeApp() multiple times; it returns the existing app if already initialized.
// However, in a typical Cloud Functions environment, calling it once at the top level is sufficient.
if (admin.apps.length === 0) {
  functions.logger.info("functions/index.js: Initializing Firebase Admin SDK...");
  try {
    admin.initializeApp();
    functions.logger.info("functions/index.js: Firebase Admin SDK initialized successfully.");
  } catch (e) {
    functions.logger.error("functions/index.js: Firebase Admin SDK initialization FAILED", e);
  }
}


/**
 * @summary Mock Firebase Callable Function to simulate preparing data for lip-sync video generation.
 * @description This function expects 'textToSpeak' and 'imageId' in the `data` object.
 * It returns a mock video URL and acknowledges receipt of the data.
 * Requires user to be authenticated.
 */
exports.prepareLipSyncVideo = functions.region('us-central1').https.onCall(async (data, context) => {
  functions.logger.info("prepareLipSyncVideo (Callable): Request received.", { dataIsPresent: !!data, authContextProvided: !!context.auth, authUid: context.auth?.uid });

  // Authentication check
  if (!context.auth) {
    functions.logger.warn("prepareLipSyncVideo (Callable): Unauthenticated access attempt.");
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  functions.logger.info(`prepareLipSyncVideo (Callable): Authenticated user UID: ${context.auth.uid}`);

  const { textToSpeak, imageId } = data;
  if (!textToSpeak || !imageId) {
    functions.logger.warn(`prepareLipSyncVideo (Callable): Missing textToSpeak or imageId in request data.`, {textToSpeakProvided: !!textToSpeak, imageIdProvided: !!imageId });
    // For a real app, you might want to throw an 'invalid-argument' HttpsError here.
    // For now, we'll let it proceed to show that auth passed.
  }

  // Function logic: return mock data
  // Using Date.now() to ensure the URL is unique for React keying and to avoid browser caching issues if the same inputs are used.
  // Also including text length and imageId for potential debugging/distinction in the mock URL.
  const mockVideoUrl = `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4?t=${Date.now()}&textLength=${textToSpeak?.length || 0}&imageId=${imageId || 'unknown'}`;
  
  return {
    message: `Function received the request successfully! Authenticated as UID: ${context.auth.uid}`,
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
    features: ["prepareLipSyncVideo (callable, auth enabled)", "getAppInfo (HTTP, public)"],
    timestamp: new Date().toISOString(),
  });
});
