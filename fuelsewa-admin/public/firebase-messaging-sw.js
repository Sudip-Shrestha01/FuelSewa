importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Must match your Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyAEz9ts_A8dWbMlUGK_F1XShFw3lRJ7bvM",
  authDomain: "fuelsewa.firebaseapp.com",
  projectId: "fuelsewa",
  storageBucket: "fuelsewa.firebasestorage.app",
  messagingSenderId: "15774739998",
  appId: "1:15774739998:web:4d6c7f057eb073cbf1880f",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);

  const { title, body } = payload.notification ?? {};
  if (!title) return;

  self.registration.showNotification(title, {
    body: body ?? "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: "fuelsewa-order",
    data: payload.data,
  });
});
