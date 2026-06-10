/**
 * app.admin.tsx — Layout guard para rotas /app/admin/*
 *
 * - Verifica role 'admin' lendo user_roles diretamente (RLS permite self-read).
 *   A RPC has_role não é mais executável por `authenticated` (hardening de segurança).
 * - Redireciona para /app se não for admin
 * - Renderiza <Outlet /> para as sub-rotas
 */

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin")({
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });

    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);

    if (error || !roles?.length) throw redirect({ to: "/app" });
  },
  component: () => <Outlet />,
});
