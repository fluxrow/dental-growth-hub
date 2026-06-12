import type { DifyChatRequest, DifyChatResponse, DifyClientConfig } from "./types";

export function createDifyClient(config: DifyClientConfig) {
  async function chat(req: DifyChatRequest): Promise<DifyChatResponse> {
    const res = await fetch(`${config.apiUrl}/v1/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: req.inputs ?? {},
        query: req.query,
        response_mode: "blocking",
        user: req.user,
        ...(req.conversation_id ? { conversation_id: req.conversation_id } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Dify API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<DifyChatResponse>;
  }

  return { chat };
}

export type DifyClient = ReturnType<typeof createDifyClient>;
