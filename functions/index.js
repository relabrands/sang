const functions = require("firebase-functions/v1");
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

// Helper: Send Email via Resend
async function sendEmail(to, templateId, data) {
    if (!to) {
        console.log("No email provided for notification");
        return;
    }

    try {
        // Dynamic import for ESM compatibility
        const { Resend } = await import('resend');
        const resend = new Resend('re_Eh8ZGZy4_5kf3v2xby9oCwBxLUs3THEa5');

        const templateSnap = await admin.firestore().collection('email_templates').doc(templateId).get();
        if (!templateSnap.exists) {
            console.log(`Template '${templateId}' not found. Skipping email.`);
            return;
        }

        const { subject, bodyHtml } = templateSnap.data();

        // Basic string interpolation {{key}}
        let content = bodyHtml || "";
        let subj = subject || "Notificación SANG Connect";

        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            content = content.replace(regex, value || '');
            subj = subj.replace(regex, value || '');
        }

        await resend.emails.send({
            from: 'TodosPonen <todosponen@nomi.do>',
            to,
            subject: subj,
            html: content
        });
        console.log(`Email sent to ${to} [${templateId}]`);
    } catch (error) {
        console.error("Resend Error:", error);
    }
}

// 4. On Member Status Update (Accept/Reject/Paid)
exports.onMemberUpdate = functions.firestore
    .document("sangs/{sangId}/members/{memberId}")
    .onUpdate(async (change, context) => {
        const after = change.after.data();
        const before = change.before.data();
        const sangId = context.params.sangId;

        // Determine Email
        let email = after.email;
        if (!email && after.userId) {
            try {
                const userRecord = await admin.auth().getUser(after.userId);
                email = userRecord.email;
            } catch (e) {
                console.error("Could not fetch user email", e);
            }
        }

        if (!email) return;

        // Get SANG details
        const sangSnap = await admin.firestore().collection('sangs').doc(sangId).get();
        const sangName = sangSnap.exists ? sangSnap.data().name : "SANG";

        const templateData = {
            memberName: after.name || "Miembro",
            sangName: sangName,
            role: after.role === 'organizer' ? 'Organizador' : 'Participante'
        };

        // Scenario 1: Request Accepted (Pending -> Active)
        if (before.status === 'pending' && after.status === 'active') {
            await sendEmail(email, 'request_accepted', templateData);
        }

        // Scenario 2: Request Rejected (Pending -> Rejected)
        if (before.status === 'pending' && after.status === 'rejected') {
            await sendEmail(email, 'request_rejected', templateData);
        }

        // Scenario 3: Payment Confirmed (Paid)
        if (before.paymentStatus !== 'paid' && after.paymentStatus === 'paid') {
            await sendEmail(email, 'payment_received', templateData);
        }
    });

// 5. On SANG Update (Started / Turn Assigned / Payout)
exports.onSangUpdate = functions.firestore
    .document("sangs/{sangId}")
    .onUpdate(async (change, context) => {
        const after = change.after.data();
        const before = change.before.data();
        const sangId = context.params.sangId;

        // Scenario: SANG Started (Pending -> Active)
        if (before.status === 'pending' && after.status === 'active') {
            const membersSnap = await admin.firestore().collection(`sangs/${sangId}/members`).where('status', '==', 'active').get();

            // Send to all active members
            const emailPromises = membersSnap.docs.map(async (docSnap) => {
                const mData = docSnap.data();
                let email = mData.email;
                if (!email && mData.userId) {
                    try {
                        const u = await admin.auth().getUser(mData.userId);
                        email = u.email;
                    } catch (e) { }
                }

                if (email) {
                    return sendEmail(email, 'sang_started', {
                        memberName: mData.name || "Miembro",
                        sangName: after.name,
                        turnNumber: mData.turnNumber || "?",
                        startDate: after.startDate ? new Date(after.startDate.toDate()).toLocaleDateString('es-DO') : "Pronto"
                    });
                }
            });

            await Promise.all(emailPromises);
        }

        // Scenario: Payout Confirmed (Recollecting -> Paid Out)
        // Notify the member who owns the current turn
        if (before.payoutStatus !== 'paid_out' && after.payoutStatus === 'paid_out') {
            const currentTurn = after.currentTurn;

            try {
                const membersSnap = await admin.firestore().collection(`sangs/${sangId}/members`).where('turnNumber', '==', currentTurn).limit(1).get();

                if (!membersSnap.empty) {
                    const memberDoc = membersSnap.docs[0];
                    const mData = memberDoc.data();
                    let email = mData.email;

                    if (!email && mData.userId) {
                        try {
                            const u = await admin.auth().getUser(mData.userId);
                            email = u.email;
                        } catch (e) { }
                    }

                    if (email) {
                        await sendEmail(email, 'payout_processed', {
                            memberName: mData.name || "Miembro",
                            sangName: after.name,
                            turnNumber: currentTurn,
                            amount: (after.contributionAmount * after.numberOfParticipants).toLocaleString()
                        });
                    }
                }
            } catch (error) {
                console.error("Error sending payout notification:", error);
            }
        }
    });

// 6. On User Created (Firestore) -> Send Welcome Email
// Triggers when the frontend writes to users/{userId}
exports.onUserCreate = functions.firestore
    .document("users/{userId}")
    .onCreate(async (snap, context) => {
        const userData = snap.data();

        // 7. Reset Database (Admin Only)
        exports.resetDatabase = functions.https.onCall(async (data, context) => {
            // 1. Verify Authentication & Admin Role
            if (!context.auth || context.auth.token.role !== 'admin') {
                throw new functions.https.HttpsError(
                    'permission-denied',
                    'Solo los administradores pueden resetear la base de datos.'
                );
            }

            try {
                const db = admin.firestore();
                const batch = db.batch();

                // 1. Delete all SANGs (and subcollections)
                // Note: recursiveDelete is better for subcollections, but for MVP we'll try standard approaches or use tools.
                // admin.firestore().recursiveDelete is available in Admin SDK v11+

                console.log("Starting Database Reset...");

                // Delete 'sangs' collection recursively
                const sangsRef = db.collection('sangs');
                await db.recursiveDelete(sangsRef);

                // Delete 'users' collection (except current admin)
                const usersRef = db.collection('users');
                const usersSnap = await usersRef.get();

                const deleteUserPromises = [];
                usersSnap.docs.forEach(doc => {
                    if (doc.id !== context.auth.uid) {
                        // We can't use recursiveDelete if we want to filter specific docs easily without a Query
                        // But users usually don't have deep subcollections in this app yet.
                        // Actually, let's just delete the doc.
                        deleteUserPromises.push(doc.ref.delete());

                        // Also delete from Auth?
                        // data.deleteAuth is optional flag? Let's assume yes for a full reset.
                        // But deleting from Auth requires admin.auth().deleteUser(uid)
                        deleteUserPromises.push(admin.auth().deleteUser(doc.id).catch(e => console.log("Auth delete error", e)));
                    }
                });

                await Promise.all(deleteUserPromises);

                console.log("Database Reset Complete.");
                return { success: true, message: "Base de datos reseteada con éxito." };

            } catch (error) {
                console.error("Reset Error:", error);
                throw new functions.https.HttpsError('internal', 'Error reseteando base de datos: ' + error.message);
            }
        });
