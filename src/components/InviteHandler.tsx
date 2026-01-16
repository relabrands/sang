import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function InviteHandler() {
    const { code } = useParams();
    const { currentUser, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (loading) return;

        if (currentUser) {
            // User is logged in, redirect to Join Page with code
            // We assume /join takes a query param, e.g. /join?code=XYZ
            // Or we can implement auto-join if we want, but letting them review is safer.
            navigate(`/join-sang?code=${code}`);
        } else {
            // User not logged in, redirect to Register with return URL
            // We encode the return path so after auth they come back here
            const returnUrl = encodeURIComponent(`/invite/${code}`);
            navigate(`/register?redirect=${returnUrl}`);
        }
    }, [currentUser, loading, code, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h2 className="text-lg font-semibold">Procesando invitación...</h2>
            <p className="text-muted-foreground text-sm">Te estamos redirigiendo al SANG.</p>
        </div>
    );
}
