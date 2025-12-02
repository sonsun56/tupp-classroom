// public/firebase-messaging-sw.js
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCNJ-l9uhvJP-nKvDJdO2EG6VE68MkgZo8",
  authDomain: "tupp-classroom.firebaseapp.com",
  projectId: "tupp-classroom",
  storageBucket: "tupp-classroom.firebasestorage.app",
  messagingSenderId: "166128617902",
  appId: "1:166128617902:web:04a60fbeb965ca77fd603f",
});

const messaging = firebase.messaging();

// แจ้งเตือนตอน background (เว็บถูกปิด)
messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification("📢 ประกาศใหม่!", {
    body: payload.notification.body,
    icon: "/logo192.png",
    tag: "tupp-announcement",
    data: {
      url: "/?open=announcement",
    },
  });
});

// เมื่อผู้ใช้กด Notification → เปิดเว็บเข้าหน้าประกาศ
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
