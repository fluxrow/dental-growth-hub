/**
 * app.admin.tsx — Layout guard para rotas /app/admin/*
 *
 * - Verifica se o usuário tem role 'admin' na tabela user_roles (via RPC has_role)
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

    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (error || !isAdmin) throw redirect({ to: "/app" });
  },
  component: () => <Outlet />,
});
