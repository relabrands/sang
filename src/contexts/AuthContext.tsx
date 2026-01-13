import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
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

                // Allow UI to render immediately
                setLoading(false);

                // 2. Fetch detailed profile in background for updates (reputation, etc.)
                try {
                    const docSnap = await getDoc(doc(db, "users", user.uid));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserProfile(prev => ({
                            ...prev!, // Keep existing (like role from token if authoritative)
                            ...data as UserProfile,
                            // Ensure role matches token if token is fresher or logic dictates
                            role: role || (data.role as "admin" | "user")
                        }));
                    }
                } catch (err) {
                    console.error("Background profile fetch error", err);
                }
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
