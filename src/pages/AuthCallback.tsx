import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Supabase client automatically processes hash fragments from URL
        // when the page loads. We just need to check for a valid session.
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("Failed to process authentication. Please try again.");
          setIsProcessing(false);
          return;
        }

        if (data.session) {
          // Session exists - redirect to set password page
          navigate("/set-password", { replace: true });
        } else {
          // No session found - might be an invalid or expired link
          setError("Invalid or expired link. Please request a new invite.");
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("An unexpected error occurred. Please try again.");
        setIsProcessing(false);
      }
    };

    processAuthCallback();
  }, [navigate]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Processing your invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <div className="text-destructive text-lg font-medium">{error}</div>
          <Button onClick={() => navigate("/auth")} variant="default">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
