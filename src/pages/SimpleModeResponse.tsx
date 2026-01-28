import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, RefreshCw, AlertTriangle } from "lucide-react";

export default function SimpleModeResponse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "generating">("loading");
  const [message, setMessage] = useState("");
  const [responseData, setResponseData] = useState<any>(null);

  useEffect(() => {
    if (token && action) {
      handleResponse();
    } else {
      setStatus("error");
      setMessage("Missing token or action");
    }
  }, [token, action]);

  const handleResponse = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-simple-mode-response`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, action }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process response");
      }

      setResponseData(result);

      if (result.alreadyProcessed) {
        setStatus("success");
        setMessage(result.message);
        return;
      }

      if (result.action === "approved") {
        setStatus("generating");
        setMessage("Generating your lesson plan and worksheet...");
        
        // Auto-redirect to Questions page to trigger generation
        setTimeout(() => {
          navigate(
            `/questions?simpleMode=true&topic=${encodeURIComponent(result.topic)}&standard=${encodeURIComponent(result.standard || "")}`
          );
        }, 2000);
      } else if (result.action === "rejected") {
        setStatus("success");
        setMessage("Got it! A new suggestion will be generated.");
        
        // Redirect to simple mode to get new suggestion
        setTimeout(() => {
          navigate("/simple-mode");
        }, 2000);
      }
    } catch (error) {
      console.error("Error handling response:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "loading" && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                Processing...
              </>
            )}
            {status === "generating" && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                Generating Materials
              </>
            )}
            {status === "success" && action === "approve" && (
              <>
                <Check className="h-6 w-6 text-green-600" />
                Approved!
              </>
            )}
            {status === "success" && action === "reject" && (
              <>
                <RefreshCw className="h-6 w-6 text-blue-600" />
                New Suggestion Coming
              </>
            )}
            {status === "error" && (
              <>
                <AlertTriangle className="h-6 w-6 text-destructive" />
                Error
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>

          {responseData?.topic && status !== "error" && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{responseData.topic}</p>
              {responseData.standard && (
                <p className="text-sm text-muted-foreground">{responseData.standard}</p>
              )}
            </div>
          )}

          {status === "error" && (
            <Button onClick={() => navigate("/simple-mode")}>
              Go to Simple Mode
            </Button>
          )}

          {status === "success" && (
            <p className="text-sm text-muted-foreground">
              Redirecting you shortly...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
