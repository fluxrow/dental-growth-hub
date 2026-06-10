/**
 * app.admin.tsx — Layout guard para rotas /app/admin/*
 *
 * - Verifica se o usuário tem role = 'admin' (campo em profiles)
 * - Redireciona para /app se não for admin
 * - Renderiza <Outlet /> para as sub-rotas
 */

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/admin")({
  beforeLoad: async ({ context }) => {
    // context.supabase é disponível via middleware global
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (context as any).supabase;
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") throw redirect({ to: "/app" });
  },
  component: () => <Outlet />,
});
