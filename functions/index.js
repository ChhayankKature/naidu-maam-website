// OPTIONAL. Stops accounts for other emails from being created at all.
//
// Without this, anyone can technically create a Firebase account with any email
// (Firebase has no allow-list setting). That account is useless: every rule in
// firestore.rules / storage.rules rejects it, and the sign-in page signs it out.
// This function just closes the door earlier, so no stray accounts pile up.
//
// ADMINS: an admin may use a non-college email. Create admin accounts by hand in the Firebase
// console (Authentication > Users > Add user), then add admins/{uid}. Sign-in is allowed for a
// non-college email only when that admins/{uid} document exists. (Untested: blocking functions
// are not expected to run for accounts created in the console, but check this once.)
//
// Needs: the Blaze plan + "Upgrade to Identity Platform" in Authentication > Settings.
// To use it, add this to firebase.json and run `firebase deploy --only functions`:
//   "functions": [{ "source": "functions", "codebase": "default" }]
const { beforeUserCreated, beforeUserSignedIn, HttpsError } = require("firebase-functions/v2/identity");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const ALLOWED = /^[^+@\s]+@(rbunagpur\.in|rknec\.edu)$/;
const reject = () => new HttpsError("invalid-argument", "Only @rbunagpur.in and @rknec.edu emails are allowed.");

function checkCreate(event) {
  const email = (event.data.email || "").toLowerCase();
  if (!ALLOWED.test(email)) throw reject();
}

async function checkSignIn(event) {
  const email = (event.data.email || "").toLowerCase();
  if (ALLOWED.test(email)) return;
  const admin = await getFirestore().doc(`admins/${event.data.uid}`).get();
  if (!admin.exists) throw reject();
}

exports.onlyCollegeEmailsCreate = beforeUserCreated(checkCreate);
exports.onlyCollegeEmailsSignIn = beforeUserSignedIn(checkSignIn);
