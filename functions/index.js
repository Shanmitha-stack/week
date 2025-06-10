const functions = require('firebase-functions');

// Example: Hello World API
exports.helloWorld = functions.https.onRequest((req, res) => {
  res.send("Hello from your Firebase backend!");
});
