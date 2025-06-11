
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { textToSpeak, imageId } = await request.json();

    if (!textToSpeak || !imageId) {
      return NextResponse.json({ message: 'Missing textToSpeak or imageId in request body' }, { status: 400 });
    }

    // Construct Firebase Function URL
    // Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in your .env.local or environment variables
    // For local emulator, use something like: http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1/prepareLipSyncVideo
    // For deployed, use the actual function URL.
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const functionsEmulatorUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL; // e.g., http://127.0.0.1:5001

    if (!projectId && !functionsEmulatorUrl) {
      console.error('Firebase project ID or Emulator URL is not configured. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL.');
      return NextResponse.json({ message: 'Backend configuration error: Firebase project ID or Emulator URL missing.' }, { status: 500 });
    }
    
    // Prefer emulator URL if available, otherwise construct deployed URL
    const functionUrl = functionsEmulatorUrl 
      ? `${functionsEmulatorUrl}/${projectId}/us-central1/prepareLipSyncVideo`
      : `https://us-central1-${projectId}.cloudfunctions.net/prepareLipSyncVideo`;

    console.log(`[API /api/firebase-lip-sync] Calling Firebase Function at: ${functionUrl}`);
    console.log(`[API /api/firebase-lip-sync] Sending to Firebase Function: text (len: ${textToSpeak.length}), imageId: ${imageId}`);


    const firebaseResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ textToSpeak, imageId }),
    });

    if (!firebaseResponse.ok) {
      let errorBody = 'Failed to call Firebase Function.';
      try {
        const fbErrorData = await firebaseResponse.json();
        errorBody = fbErrorData.message || fbErrorData.error || errorBody;
      } catch (e) {
        // Ignore if parsing error body fails
      }
      console.error(`[API /api/firebase-lip-sync] Firebase Function call failed with status ${firebaseResponse.status}: ${errorBody}`);
      return NextResponse.json({ message: `Error from Firebase Function: ${errorBody}`, statusText: firebaseResponse.statusText }, { status: firebaseResponse.status });
    }

    const firebaseData = await firebaseResponse.json();
    console.log('[API /api/firebase-lip-sync] Received from Firebase Function:', firebaseData);

    return NextResponse.json(firebaseData);

  } catch (error: any) {
    console.error('[API /api/firebase-lip-sync] Error processing request:', error);
    return NextResponse.json({ message: 'Error processing backend request to Firebase Function', error: error.message || 'Unknown error' }, { status: 500 });
  }
}
