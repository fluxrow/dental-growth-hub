import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createDifyClient } from "@/integrations/dify/client";
import { createDifyMockClient } from "@/integrations/dify/mock";
import type { DifyChatResponse } from "@/integrations/dify/types";

function getDifyClient() {
  const apiUrl = process.env.DIFY_API_URL;
  const apiKey = process.env.DIFY_API_KEY;

  if (!apiUrl || !apiKey) {
    console.warn("[Dify] DIFY_API_URL ou DIFY_API_KEY não configurados — usando mock.");
    return createDifyMockClient();
  }

  return createDifyClient({ apiUrl, apiKey });
}

export const sendDifyMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { query: string; conversationId?: string; clinicId: string }) => {
    if (!input?.query?.trim()) throw new Error("query é obrigatório");
    if (!input?.clinicId) throw new Error("clinicId é obrigatório");
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }): Promise<DifyChatResponse> => {
    const client = getDifyClient();

    return client.chat({
      query: data.query,
      user: `clinic-${data.clinicId}`,
      conversation_id: data.conversationId,
    });
  });
