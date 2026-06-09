import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data, isLoading: profileLoading } = useProfile(user?.id);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    if (profileLoading) return;
    if (!data?.clinic || !data.clinic.onboarded) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [user, loading, profileLoading, data, navigate]);

  if (loading || profileLoading || !user || !data?.clinic?.onboarded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Outlet />
      <Toaster position="top-right" />
    </>
  );
}
