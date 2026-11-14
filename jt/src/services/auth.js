
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "./firebase";

// REGISTER USER
export const registerUser = async (name, email, password) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: name,
    email: user.email,
    role: "user",
    accountStatus: "active",
    createdAt: serverTimestamp()
  });

  return user;
};

// LOGIN USER
export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return userCredential.user;
};

// LOGOUT USER
export const logoutUser = async () => {
  await signOut(auth);
};

// RESET PASSWORD
export const resetUserPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};
