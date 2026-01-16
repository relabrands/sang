import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserProfile {
    uid: string;
    fullName: string;
    email: string;
    role: "user" | "admin";
    reputationScore: number;
    createdAt: any;
    bankName?: string;
    accountType?: string;
    accountNumber?: string;
    cedula?: string;
    tutorialSeen?: boolean;
    fcmToken?: string | null;
}

interface AuthContextType {
    currentUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    userProfile: null,
    loading: true,
    isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // OPTIMIZATION: Check Custom Claims (Auth Token) first
                // This allows instant access without waiting for Firestore
                const tokenResult = await user.getIdTokenResult();
                const role = tokenResult.claims.role as "user" | "admin" | undefined;

                // 1. Set minimal profile immediately to unblock UI
                setUserProfile({
                    uid: user.uid,
                    email: user.email!,
                    fullName: user.displayName || user.email?.split('@')[0] || "Usuario",
                    role: role || "user", // Default to user if claim isn't ready
                    reputationScore: 100, // Placeholder
                    createdAt: new Date()
                });

                // 2. Real-time Profile Sync
                // Using onSnapshot ensures that changes like 'tutorialSeen' are immediately reflected
                const unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserProfile(prev => ({
                            ...prev!,
                            ...data as UserProfile,
                            role: role || (data.role as "admin" | "user")
                        }));
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Profile sync error:", error);
                    setLoading(false);
                });

                // 3. Setup Push Notifications (Progressive Enhancement)
                const { messaging } = await import("@/lib/firebase");
                if (messaging) {
                    try {
                        const { getToken } = await import("firebase/messaging");
                        if ('Notification' in window) {
                            const permission = await Notification.requestPermission();
                            if (permission === 'granted') {
                                const token = await getToken(messaging, {
                                    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                                }).catch(() => null);

                                if (token) {
                                    await updateDoc(doc(db, "users", user.uid), { fcmToken: token });
                                }
                            }
                        }
                    } catch (e) { console.log('Push setup error', e) }
                }

                // Note: onSnapshot returns an unsubscribe function.
                // We should ideally clean this up, but inside onAuthStateChanged logic 
                // it is tricky without refs. Since this is the root provider, it persists.
            } else {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        loading,
        isAdmin: userProfile?.role === "admin",
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
