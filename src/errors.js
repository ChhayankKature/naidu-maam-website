// Turns Firebase error codes into plain sentences.
export function friendlyError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "The email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead.";
    case "auth/weak-password":
      return "That password is too weak. Use at least 8 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
    case "unavailable":
    case "storage/retry-limit-exceeded":
      return "Can't reach the server. Check your connection and try again.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "The Firebase API key is not valid. Re-copy it from the Firebase console into src/firebase.js.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not switched on in the Firebase console.";
    case "auth/unauthorized-domain":
      return "This website's address is not on the Firebase authorized domains list.";
    case "permission-denied":
    case "storage/unauthorized":
      return "The server refused this. You may have already used your upload, lost your seat, or been blocked. Refresh and try again.";
    case "storage/canceled":
      return "The upload was cancelled.";
    case "storage/quota-exceeded":
      return "The storage quota for this project is used up. Contact the admin.";
    default:
      return err?.message ? `Something went wrong: ${err.message}` : "Something went wrong. Try again.";
  }
}
