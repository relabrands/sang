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
