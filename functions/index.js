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

// 2. Trigger: When an Admin is added to 'admins' collection, update their Custom Claims
exports.onAdminCreated = functions.firestore
    .document("admins/{adminId}")
    .onCreate(async (snap, context) => {
        const adminId = context.params.adminId;

        try {
            await admin.auth().setCustomUserClaims(adminId, { role: "admin" });
            console.log(`Successfully granted admin privileges to ${adminId}`);
        } catch (error) {
            console.error("Error setting admin claims:", error);
        }
    });

// 3. Trigger: When an Admin is removed, revoke privileges
exports.onAdminDeleted = functions.firestore
    .document("admins/{adminId}")
    .onDelete(async (snap, context) => {
        const adminId = context.params.adminId;

        try {
            await admin.auth().setCustomUserClaims(adminId, { role: "user" });
            console.log(`Successfully revoked admin privileges from ${adminId}`);
        } catch (error) {
            console.error("Error removing admin claims:", error);
        }
    });
