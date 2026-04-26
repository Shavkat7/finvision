// Shared types for SQB OvozAI.

export type Lang = "uz" | "ru" | "en";

export type SessionState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

export interface TranscriptEntry {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  text: string;
  partial?: boolean;
  timestamp: number;
  toolName?: string;
  toolResult?: unknown;
}

export interface ToolInvocation {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "pending" | "ok" | "error";
  timestamp: number;
}

export type GeminiVoice = "Aoede" | "Puck" | "Charon" | "Kore" | "Fenrir";

export interface SessionConfig {
  voice: GeminiVoice;
  language: Lang;
  systemPrompt: string;
  model: string;
  userLocation?: GeoCoords;
}

export interface EphemeralTokenResponse {
  token: string;
  expiresAt: string;
  model: string;
}

export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy_m?: number;
}

export interface UserDocument {
  id: string;
  filename: string;
  uploaded_at: number;
  characters: number;
  chunks: string[];
  preview: string;
}
