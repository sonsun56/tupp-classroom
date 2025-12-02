// src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCNJ-l9uhvJP-nKvDJdO2EG6VE68MkgZo8",
  authDomain: "tupp-classroom.firebaseapp.com",
  projectId: "tupp-classroom",
  storageBucket: "tupp-classroom.firebasestorage.app",
  messagingSenderId: "166128617902",
  appId: "1:166128617902:web:04a60fbeb965ca77fd603f",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// ขอสิทธิ Notification และรับ Token
export async function requestFCMToken() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const token = await getToken(messaging, {
      vapidKey:
        "BNaIC2R90R1crksXGgcgBAeOnQStdN1rLajWGBwNo9176dYWRFectpr84bA-BhkO8butY9a_jofAptj3BZuOSWU",
    });

    console.log("FCM Token:", token);
    return token;
  } catch (err) {
    console.error("FCM token error:", err);
    return null;
  }
}

// เมื่อหน้าเว็บเปิดอยู่ (foreground)
export function listenForegroundMessage(cb) {
  onMessage(messaging, cb);
}

export default messaging;
