
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { textToSpeak, imageId } = await request.json();

    if (!textToSpeak || !imageId) {
      return NextResponse.json({ message: 'Missing textToSpeak or imageId in request body' }, { status: 400 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const functionsEmulatorUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL;

    // Server-side logging for diagnostics
    console.log(`[API /api/firebase-lip-sync] NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId}`);
    console.log(`[API /api/firebase-lip-sync] NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL: ${functionsEmulatorUrl}`);

    let functionUrl: string;

    const trimmedProjectId = projectId ? projectId.trim() : "";
    const isInvalidProjectId = !trimmedProjectId ||
                               trimmedProjectId.toUpperCase().includes("YOUR_PROJECT_ID") ||
                               trimmedProjectId.toUpperCase().includes("YOUR-PROJECT") ||
                               trimmedProjectId.length < 4; 

    if (isInvalidProjectId) {
      const errorMessage = `Backend configuration error: Firebase project ID ('${projectId || 'Not found/empty'}') is missing or appears to be a placeholder. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID correctly in your .env file. This value is used to construct the Firebase Function URL.`;
      console.error(`[API /api/firebase-lip-sync] Configuration Error: ${errorMessage}`);
      return NextResponse.json({ message: errorMessage, errorType: 'CONFIG_ERROR_PROJECT_ID' }, { status: 500 });
    }

    if (functionsEmulatorUrl) {
      const trimmedEmulatorUrl = functionsEmulatorUrl.trim();
      if (trimmedEmulatorUrl.toUpperCase().includes("YOUR_PROJECT_ID") || trimmedEmulatorUrl.toUpperCase().includes("YOUR-PROJECT")) {
        const emulatorUrlError = `Backend configuration error: Firebase functions emulator URL ('${functionsEmulatorUrl}') appears to contain a placeholder project ID or path. It should be the base URL of the emulator (e.g., http://127.0.0.1:5001 or your Cloud Workstations equivalent). Please check NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL in your .env file.`;
        console.error(`[API /api/firebase-lip-sync] Configuration Error: ${emulatorUrlError}`);
        return NextResponse.json({ message: emulatorUrlError, errorType: 'CONFIG_ERROR_EMULATOR_URL' }, { status: 500 });
      }
      functionUrl = `${trimmedEmulatorUrl}/${trimmedProjectId}/us-central1/prepareLipSyncVideo`;
    } else {
      functionUrl = `https://us-central1-${trimmedProjectId}.cloudfunctions.net/prepareLipSyncVideo`;
    }
    
    const authorizationHeader = request.headers.get('Authorization');
    const fetchHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (authorizationHeader) {
      fetchHeaders['Authorization'] = authorizationHeader;
    }

    console.log(`[API /api/firebase-lip-sync] Calling Firebase Function at: ${functionUrl}`);
    console.log(`[API /api/firebase-lip-sync] Sending to Firebase Function: text (len: ${typeof textToSpeak === 'string' ? textToSpeak.length : 'N/A'}), imageId: ${imageId}`);
    console.log(`[API /api/firebase-lip-sync] Fetch Headers being sent:`, JSON.stringify(fetchHeaders));


    const firebaseResponse = await fetch(functionUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify({ textToSpeak, imageId }),
    });

    if (!firebaseResponse.ok) {
      let errorBody = `Failed to call Firebase Function at ${functionUrl}. Status: ${firebaseResponse.status}`;
      let errorData = null;
      try {
        errorData = await firebaseResponse.json();
        errorBody = errorData.message || errorData.error || errorBody; // Prefer message/error from function
        if (firebaseResponse.status === 401) {
          errorBody = `Authentication failed (401) when calling Firebase Function. Function response: ${JSON.stringify(errorData) || 'Unauthorized. Ensure a valid ID token is being sent.'}`;
        } else if (firebaseResponse.status === 404 && typeof errorData.error === 'string' && errorData.error.includes('Function not found')) {
            errorBody = `Firebase Function 'prepareLipSyncVideo' not found at ${functionUrl}. Ensure the function is deployed to region 'us-central1' or the emulator is running with the correct function name. Original error: ${errorData.error}`;
        } else if (firebaseResponse.status === 500 && typeof errorData.error === 'string' && errorData.error.includes('INTERNAL')) {
             errorBody = `Firebase Function 'prepareLipSyncVideo' encountered an internal error at ${functionUrl}. Check function logs. Original error: ${errorData.error}`;
        }
      } catch (e) {
        console.warn(`[API /api/firebase-lip-sync] Could not parse error response body from Firebase Function. Raw status text: ${firebaseResponse.statusText}`);
      }
      console.error(`[API /api/firebase-lip-sync] Firebase Function call failed: ${errorBody}`, { status: firebaseResponse.status, errorData });
      return NextResponse.json({ message: `Error from Firebase Function: ${errorBody}`, statusText: firebaseResponse.statusText, firebaseFunctionError: errorData }, { status: firebaseResponse.status });
    }

    const firebaseData = await firebaseResponse.json();
    console.log('[API /api/firebase-lip-sync] Received from Firebase Function:', firebaseData);
    return NextResponse.json(firebaseData);

  } catch (error: any) {
    console.error('[API /api/firebase-lip-sync] Critical error processing request:', error);
    
    const displayProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "UNKNOWN_PROJECT_ID";
    const emulatorUrlForError = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL;
    let detailedErrorMessage = `Critical error in the backend API when trying to communicate with Firebase Function for project '${displayProjectId}'.`;

    const targetFunctionUrlForError = emulatorUrlForError 
        ? `${emulatorUrlForError}/${displayProjectId}/us-central1/prepareLipSyncVideo` 
        : `https://us-central1-${displayProjectId}.cloudfunctions.net/prepareLipSyncVideo`;

    if (error.name === 'TypeError' && error.message.includes('fetch failed')) {
        if (emulatorUrlForError) {
            detailedErrorMessage = `Network error: Could not connect to the Firebase Function. Attempted to reach emulator at '${targetFunctionUrlForError}'. Please ensure your Firebase emulator is running, accessible, and the function 'prepareLipSyncVideo' is available. Verify NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_URL and NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file.`;
        } else {
            detailedErrorMessage = `Network error: Could not connect to the Firebase Function. Attempted to reach deployed function at '${targetFunctionUrlForError}'. Ensure the function 'prepareLipSyncVideo' for project '${displayProjectId}' is deployed to region 'us-central1', and the URL is correct. Verify NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file.`;
        }
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred in the backend API: ${error.message}`;
    }
    return NextResponse.json({ message: detailedErrorMessage, error: error.message || 'Unknown error' }, { status: 500 });
  }
}
