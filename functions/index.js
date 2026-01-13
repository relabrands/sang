const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// 1. On New User Sign Up: Set default role 'user'
exports.processSignUp = functions.auth.user().onCreate(async (user) => {
    const customClaims = {
        role: "user",
    };

    try {
        // Set custom user claims on this newly created user.
        await admin.auth().setCustomUserClaims(user.uid, customClaims);

        // Create a user document in Firestore for consistency if not done by frontend
        const userRef = admin.firestore().collection("users").doc(user.uid);
        const snapshot = await userRef.get();

        if (!snapshot.exists) {
            await userRef.set({
                uid: user.uid,
                email: user.email,
                role: "user",
                reputationScore: 100, // Default score
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                fullName: user.displayName || "Usuario Nuevo"
            });
        }

    } catch (error) {
        console.error(error);
    }
});

// 2. Trigger: When 'admins' collection is written to (Create, Update, Delete)
// This handles setting AND revoking admin privileges dynamically
exports.onAdminChange = functions.firestore
    .document("admins/{adminId}")
    .onWrite(async (change, context) => {
        const adminId = context.params.adminId;
        const exists = change.after.exists;

        try {
            if (exists) {
                // Admin created or updated -> Grant Granular Admin Privileges
                await admin.auth().setCustomUserClaims(adminId, { role: "admin" });
                console.log(`Granted admin privileges to ${adminId}`);
            } else {
                // Admin deleted -> Revoke
                await admin.auth().setCustomUserClaims(adminId, { role: "user" });
                console.log(`Revoked admin privileges from ${adminId}`);
            }
        } catch (error) {
            console.error("Error managing admin claims:", error);
        }
    });

// 3. Send Broadcast Notification (Callable by Admin)
exports.sendBroadcast = functions.https.onCall(async (data, context) => {
    // 1. Verify Authentication & Admin Role
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Solo los administradores pueden enviar notificaciones.'
        );
    }

    const { title, body } = data;
    if (!title || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'Título y mensaje son requeridos.');
    }

    try {
        // 2. Fetch all users with FCM tokens
        // Note: '!=' inequality queries can be expensive or require indexes. 
        // Iterate or assume most users have one. Easier: just fetch all users for now if straightforward, or use where.
        // Actually, where("fcmToken", ">", "") covers non-null/non-empty strings.
        const snapshot = await admin.firestore().collection("users").orderBy("fcmToken").startAfter("").get();
        // Alternative if no index: fetch all and filter in memory (only for small user bases)

        // Since we might not have the index, let's just fetch users who likely have it (e.g. recently active) or just fetch all for MVP.
        // BUT, user asked "how to send to ALL".
        // Let's rely on simple fetch for MVP. If index issue, we'll fix it.
        // Using a simpler query that might not require composite index:
        // const snapshot = await admin.firestore().collection("users").get(); 
        // Filter in memory for safety if index missing

        const allUsers = await admin.firestore().collection("users").get();
        const tokens = allUsers.docs
            .map(doc => doc.data().fcmToken)
            .filter(token => !!token && typeof token === 'string');

        if (tokens.length === 0) {
            return { success: true, count: 0, message: "No registered tokens found." };
        }

        // 3. Send Multicast Message (Batched in 500s by Firebase Admin SDK automatically? No, sendMulticast handles up to 500)
        // If > 500, need to chunk.

        const chunks = [];
        while (tokens.length > 0) {
            chunks.push(tokens.splice(0, 500));
        }

        let successCount = 0;
        let failureCount = 0;

        for (const chunk of chunks) {
            const message = {
                notification: { title, body },
                tokens: chunk
            };
            const response = await admin.messaging().sendMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;
        }

        return {
            success: true,
            count: successCount,
            failed: failureCount
        };

    } catch (error) {
        console.error("Broadcast Logic Error:", error);
        throw new functions.https.HttpsError('internal', 'Error enviando notificaciones: ' + error.message);
    }
});
