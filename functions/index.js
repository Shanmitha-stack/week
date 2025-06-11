
const functions = require('firebase-functions');
// const admin = require('firebase-admin');
// admin.initializeApp(); // Initialize if using Firebase Admin SDK features

/**
 * @summary Mock Firebase Function to simulate preparing data for lip-sync video generation.
 * @description This function is a placeholder. In a real application, this might
 * trigger a more complex backend process for video generation.
 * It expects 'textToSpeak' and 'imageId' in the request body (POST).
 * It returns a mock video URL and acknowledges receipt of the data.
 */
exports.prepareLipSyncVideo = functions.region('us-central1').https.onRequest(async (req, res) => {
  // Allow CORS for local development and if calling from a different domain
  res.set('Access-Control-Allow-Origin', '*'); // Allow all origins (or restrict if needed for production)
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); // Specify allowed methods
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Handle preflight request for CORS
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed. Please use POST.');
    return;
  }

  const { textToSpeak, imageId } = req.body;

  if (!textToSpeak || !imageId) {
    res.status(400).send('Bad Request: Missing textToSpeak or imageId in JSON request body.');
    return;
  }

  functions.logger.info("Received request for prepareLipSyncVideo:", {
    textToSpeak: typeof textToSpeak === 'string' ? textToSpeak.substring(0, 100) : '[Invalid textToSpeak format]', // Log first 100 chars
    imageId: imageId,
    timestamp: new Date().toISOString(),
  });

  // Simulate processing delay (e.g., AI model processing)
  await new Promise(resolve => setTimeout(resolve, 2500)); // 2.5 seconds delay

  // In a real scenario, you would generate a video and get its URL.
  // For this mock, we'll use a placeholder video URL.
  const mockVideoUrl = `https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4?mock_id=${Date.now()}&text=${encodeURIComponent(typeof textToSpeak === 'string' ? textToSpeak.substring(0,20) : 'default')}`;

  functions.logger.info("Mock processing complete for prepareLipSyncVideo. Returning mock video URL.");

  res.status(200).json({
    message: "Lip-sync video preparation (mock) initiated successfully.",
    textReceived: textToSpeak,
    imageIdReceived: imageId,
    mockVideoUrl: mockVideoUrl,
    processedAt: new Date().toISOString(),
  });
});

// You can add more Firebase Functions exports here as needed.
// For example, a simple HTTP GET function:
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
    features: ["mockLipSyncVideoPreparation"],
    timestamp: new Date().toISOString(),
  });
});
