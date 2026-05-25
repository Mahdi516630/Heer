import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App gracefully
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const googleAuth = getAuth(app);

// In-memory access token cache
let cachedAccessToken: string | null = null;

export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/meetings.space.created",
  "https://www.googleapis.com/auth/chat.messages",
  "https://www.googleapis.com/auth/chat.spaces"
];

export async function connectGoogleWorkspace(): Promise<{ user: any; accessToken: string } | null> {
  try {
    const provider = new GoogleAuthProvider();
    
    // Request all required Gmail, Meet, and Chat scopes
    SCOPES.forEach(scope => provider.addScope(scope));

    // Force prompt to ensure scopes are requested
    provider.setCustomParameters({
      prompt: "select_account"
    });

    const result = await signInWithPopup(googleAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error("Impossible d'obtenir le jeton d'accès OAuth Google");
    }

    cachedAccessToken = credential.accessToken;
    return {
      user: result.user,
      accessToken: cachedAccessToken
    };
  } catch (error) {
    console.error("Workspace Authentication Error:", error);
    throw error;
  }
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export async function disconnectGoogle(): Promise<void> {
  await signOut(googleAuth);
  cachedAccessToken = null;
}
