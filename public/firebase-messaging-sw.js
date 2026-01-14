importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyB8AqPt1jX0QaMkeKXp9fvIFMPJde_XTnM",
    authDomain: "sang-rd.firebaseapp.com",
    projectId: "sang-rd",
    storageBucket: "sang-rd.firebasestorage.app",
    messagingSenderId: "797187958429",
    appId: "1:797187958429:web:686acd2ba5632303561674"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/pwa-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
