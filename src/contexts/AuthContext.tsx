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
                try {
                    // 1. Check if user is in 'admins' collection
                    const adminDoc = await getDoc(doc(db, "admins", user.uid));

                    if (adminDoc.exists()) {
                        const adminData = adminDoc.data();
                        // Force role to admin
                        setUserProfile({
                            uid: user.uid,
                            fullName: adminData.fullName || user.email?.split('@')[0] || "Admin",
                            email: user.email!,
                            role: "admin",
                            reputationScore: 100,
                            createdAt: adminData.createdAt
                        });
                    } else {
                        // 2. Not in admins, check 'users' collection
                        const userDoc = await getDoc(doc(db, "users", user.uid));
                        if (userDoc.exists()) {
                            setUserProfile(userDoc.data() as UserProfile);
                        } else {
                            // Rare: Authenticated but no profile found
                            console.error("User document not found in Firestore");
                            setUserProfile(null);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }

            setLoading(false);
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
                    <p className="mt-4 text-sm text-muted-foreground animate-pulse">Cargando SANG Connect...</p>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
