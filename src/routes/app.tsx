import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const done = localStorage.getItem("dentalflux:onboarded");
      if (!done) {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
    } catch {}
    setReady(true);
  }, [navigate]);

  if (!ready) return null;
  return (
    <>
      <Outlet />
      <Toaster position="top-right" />
    </>
  );
}
