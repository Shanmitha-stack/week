
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

    // Validate Project ID
    if (!projectId || projectId === "YOUR_PROJECT_ID_HERE" || projectId.trim() === "") {
      const errorMessage = 'Backend configuration error: Firebase project ID is missing or invalid. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file.';
      console.error(`[API /api/firebase-lip-sync] ${errorMessage}`);
      return NextResponse.json({ message: errorMessage }, { status: 500 });
    }

    if (functionsEmulatorUrl) {
      functionUrl = `${functionsEmulatorUrl}/${projectId}/us-central1/prepareLipSyncVideo`;
    } else {
      functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/prepareLipSyncVideo`;
    }

    console.log(`[API /api/firebase-lip-sync] Calling Firebase Function at: ${functionUrl}`);
    console.log(`[API /api/firebase-lip-sync] Sending to Firebase Function: text (len: ${typeof textToSpeak === 'string' ? textToSpeak.length : 'N/A'}), imageId: ${imageId}`);


    const firebaseResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ textToSpeak, imageId }),
    });

    if (!firebaseResponse.ok) {
      let errorBody = `Failed to call Firebase Function at ${functionUrl}. Status: ${firebaseResponse.status}`;
      try {
        const fbErrorData = await firebaseResponse.json();
        errorBody = fbErrorData.message || fbErrorData.error || errorBody;
         // Add more specific check for common function errors like "Function not found"
        if (firebaseResponse.status === 404 && typeof fbErrorData.error === 'string' && fbErrorData.error.includes('Function not found')) {
            errorBody = `Firebase Function 'prepareLipSyncVideo' not found at ${functionUrl}. Ensure the function is deployed to region 'us-central1' or the emulator is running with the correct function name. Original error: ${fbErrorData.error}`;
        } else if (firebaseResponse.status === 500 && typeof fbErrorData.error === 'string' && fbErrorData.error.includes('INTERNAL')) {
             errorBody = `Firebase Function 'prepareLipSyncVideo' encountered an internal error at ${functionUrl}. Check function logs. Original error: ${fbErrorData.error}`;
        }

      } catch (e) {
        console.warn(`[API /api/firebase-lip-sync] Could not parse error response body from Firebase Function. Raw status text: ${firebaseResponse.statusText}`);
      }
      console.error(`[API /api/firebase-lip-sync] Firebase Function call failed: ${errorBody}`);
      return NextResponse.json({ message: `Error from Firebase Function: ${errorBody}`, statusText: firebaseResponse.statusText }, { status: firebaseResponse.status });
    }

    const firebaseData = await firebaseResponse.json();
    console.log('[API /api/firebase-lip-sync] Received from Firebase Function:', firebaseData);

    return NextResponse.json(firebaseData);

  } catch (error: any) {
    console.error('[API /api/firebase-lip-sync] Critical error processing request:', error);
    let detailedErrorMessage = 'Critical error in the backend API when trying to communicate with Firebase Function.';
    
    // Attempt to get projectId and functionsEmulatorUrl again for more contextual error messages,
    // as they might not be in scope if the error occurred before their declaration in the try block.
    // However, in this structure, they are declared before the fetch call.
    const projectIdForError = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const emulatorUrlForError = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL;
    const targetFunctionUrlForError = emulatorUrlForError 
        ? `${emulatorUrlForError}/${projectIdForError}/us-central1/prepareLipSyncVideo` 
        : `https://us-central1-${projectIdForError}.cloudfunctions.net/prepareLipSyncVideo`;

    if (error.name === 'TypeError' && error.message.includes('fetch failed')) {
        if (emulatorUrlForError) {
            detailedErrorMessage = `Network error: Could not connect to the Firebase Function. Attempted to reach emulator at '${targetFunctionUrlForError}'. Please ensure your Firebase emulator is running, accessible, and the function 'prepareLipSyncVideo' is available. Verify NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL and NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file.`;
        } else {
            detailedErrorMessage = `Network error: Could not connect to the Firebase Function. Attempted to reach deployed function at '${targetFunctionUrlForError}'. Ensure the function 'prepareLipSyncVideo' for project '${projectIdForError}' is deployed to region 'us-central1', and the URL is correct. Verify NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file.`;
        }
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred in the backend API: ${error.message}`;
    }
    return NextResponse.json({ message: detailedErrorMessage, error: error.message || 'Unknown error' }, { status: 500 });
  }
}
