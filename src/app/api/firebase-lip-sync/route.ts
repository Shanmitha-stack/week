
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { textToSpeak, imageId } = await request.json();

    if (!textToSpeak || !imageId) {
      return NextResponse.json({ message: 'Missing textToSpeak or imageId in request body' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const functionsEmulatorUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL;

    let functionUrl: string;

    if (functionsEmulatorUrl) {
      if (!projectId || projectId === "YOUR_PROJECT_ID_HERE" || projectId.trim() === "") {
        console.error('[API /api/firebase-lip-sync] Firebase project ID is missing or invalid for emulator URL. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file.');
        return NextResponse.json({ message: 'Backend configuration error: Firebase project ID is required for emulator connection. Please update your .env file.' }, { status: 500 });
      }
      functionUrl = `${functionsEmulatorUrl}/${projectId}/us-central1/prepareLipSyncVideo`;
    } else {
      if (!projectId || projectId === "YOUR_PROJECT_ID_HERE" || projectId.trim() === "") {
        console.error('[API /api/firebase-lip-sync] Firebase project ID is missing or invalid for deployed function URL. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file.');
        return NextResponse.json({ message: 'Backend configuration error: Firebase project ID is required for deployed function. Please update your .env file.' }, { status: 500 });
      }
      functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/prepareLipSyncVideo`;
    }

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
    // This error message is what the frontend currently receives if fetch() itself throws.
    let detailedErrorMessage = 'Error processing backend request to Firebase Function.';
    if (error.message) {
        // Check for common fetch errors to provide more specific guidance
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
            detailedErrorMessage = 'Could not connect to the Firebase Function. Ensure the emulator is running or the deployed function URL is correct and accessible.';
        } else if (error.message.includes('Invalid URL')) {
            detailedErrorMessage = 'The Firebase Function URL is invalid. Check project ID and emulator configuration.';
        } else {
            detailedErrorMessage = `An unexpected error occurred in the backend API: ${error.message}`;
        }
    }
    return NextResponse.json({ message: detailedErrorMessage, error: error.message || 'Unknown error' }, { status: 500 });
  }
}

