export interface DifyChatRequest {
  query: string;
  user: string;
  conversation_id?: string;
  inputs?: Record<string, unknown>;
}

export interface DifyChatResponse {
  id: string;
  message_id: string;
  conversation_id: string;
  answer: string;
  created_at: number;
}

export interface DifyClientConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
