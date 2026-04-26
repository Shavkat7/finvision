// Browser-side WebSocket client for Gemini Live API.
// Connects DIRECTLY to generativelanguage.googleapis.com using a
// short-lived ephemeral token from /api/token. No audio frames go
// through our backend.

import { TOOL_DECLARATIONS } from "./tools";
import { getSystemPrompt } from "./prompts";
import { LANGUAGE_CODES } from "./i18n";
import type { GeminiVoice, Lang } from "./types";
import type { AppContext } from "./context";

const ENDPOINT_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

export interface GeminiLiveCallbacks {
  onOpen?: () => void;
  onClose?: (e: CloseEvent) => void;
  onError?: (msg: string) => void;
  onAudio?: (base64Pcm24: string) => void;
  onUserTranscript?: (text: string, finished: boolean) => void;
  onAssistantTranscript?: (text: string, finished: boolean) => void;
  onToolCall?: (calls: Array<{ id: string; name: string; args: Record<string, unknown> }>) => void;
  onInterrupted?: () => void;
  onTurnComplete?: () => void;
  onSetupComplete?: () => void;
}

export interface GeminiLiveConfig {
  token: string;
  model: string;
  voice: GeminiVoice;
  language: Lang;
  context?: AppContext;
  uploadedDocs?: { filename: string }[];
  systemPrompt?: string;
  /** When true, automatic VAD is disabled and the client must call
   *  activityStart()/activityEnd() to bracket each user turn (push-to-talk). */
  pushToTalk?: boolean;
  /** Override response modalities. Default ["AUDIO"]. Use ["TEXT"] for
   *  STT-only sessions (operator copilot). */
  responseModalities?: ("AUDIO" | "TEXT")[];
  /** Skip the heavyweight default tools (used by transcribe-only sessions). */
  noTools?: boolean;
  callbacks: GeminiLiveCallbacks;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private cfg: GeminiLiveConfig;
  private connected = false;

  constructor(cfg: GeminiLiveConfig) {
    this.cfg = cfg;
  }

  connect(): void {
    const url = `${ENDPOINT_BASE}?access_token=${encodeURIComponent(this.cfg.token)}`;
    // eslint-disable-next-line no-console
    console.log(`[gemini-live] connecting to model ${this.cfg.model} …`);
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.connected = true;
      // eslint-disable-next-line no-console
      console.log(`[gemini-live] WS open · sending setup for ${this.cfg.model}`);
      this.sendSetup();
      this.cfg.callbacks.onOpen?.();
    };
    this.ws.onclose = (e) => {
      this.connected = false;
      // eslint-disable-next-line no-console
      console.warn(
        `[gemini-live] WS closed code=${e.code} reason=${e.reason || "(none)"}`,
      );
      this.cfg.callbacks.onClose?.(e);
    };
    this.ws.onerror = (e) => {
      // eslint-disable-next-line no-console
      console.error("[gemini-live] WS error", e);
      this.cfg.callbacks.onError?.("WebSocket error");
    };
    this.ws.onmessage = (e) => this.handleMessage(e);
  }

  disconnect(): void {
    this.connected = false;
    if (this.ws) {
      try { this.ws.close(); } catch { /* noop */ }
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  // ─── Sending ──────────────────────────────────────────────────────

  sendAudio(pcm16: ArrayBuffer): void {
    if (!this.isConnected()) return;
    this.send({
      realtimeInput: {
        audio: { data: arrayBufferToBase64(pcm16), mimeType: "audio/pcm;rate=16000" },
      },
    });
  }

  sendText(text: string): void {
    if (!this.isConnected()) return;
    this.send({ realtimeInput: { text } });
  }

  sendToolResponse(
    responses: Array<{ id: string; name: string; response: unknown }>,
  ): void {
    if (!this.isConnected()) return;
    this.send({ toolResponse: { functionResponses: responses } });
  }

  // Manual activity detection (push-to-talk). Caller wraps each utterance:
  //   activityStart()  → send PCM via sendAudio()  → activityEnd()
  activityStart(): void {
    if (!this.isConnected()) return;
    this.send({ realtimeInput: { activityStart: {} } });
  }

  activityEnd(): void {
    if (!this.isConnected()) return;
    this.send({ realtimeInput: { activityEnd: {} } });
  }

  // ─── Internal ─────────────────────────────────────────────────────

  private send(msg: object): void {
    this.ws?.send(JSON.stringify(msg));
  }

  private sendSetup(): void {
    const modalities = this.cfg.responseModalities ?? ["AUDIO"];
    const isAudio = modalities.includes("AUDIO");

    const generationConfig: Record<string, unknown> = {
      responseModalities: modalities,
      temperature: 0.7,
    };
    if (isAudio) {
      // languageCode is a STT recognition HINT — it helps Gemini Live
      // detect Uzbek speech correctly (without it the recognizer skews
      // toward English defaults and mis-transcribes Uzbek). It does NOT
      // force the response language: the strict mirror rule in the
      // system prompt overrides this when the user speaks a different
      // language than their UI preference.
      generationConfig.speechConfig = {
        languageCode: LANGUAGE_CODES[this.cfg.language],
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: this.cfg.voice },
        },
      };
    }

    const setup: Record<string, unknown> = {
      setup: {
        model: `models/${this.cfg.model}`,
        generationConfig,
        systemInstruction: {
          parts: [
            {
              text:
                this.cfg.systemPrompt ??
                getSystemPrompt({
                  language: this.cfg.language,
                  context: this.cfg.context,
                  uploadedDocCount: this.cfg.uploadedDocs?.length ?? 0,
                  uploadedDocNames: this.cfg.uploadedDocs?.map((d) => d.filename),
                }),
            },
          ],
        },
        ...(this.cfg.noTools ? {} : { tools: [{ functionDeclarations: TOOL_DECLARATIONS }] }),
        inputAudioTranscription: {},
        ...(isAudio ? { outputAudioTranscription: {} } : {}),
        realtimeInputConfig: this.cfg.pushToTalk
          ? {
              // Manual activity detection — caller drives turns via
              // activityStart() / activityEnd(). This eliminates spurious
              // interruptions from background noise.
              automaticActivityDetection: { disabled: true },
              activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
              turnCoverage: "TURN_INCLUDES_ONLY_ACTIVITY",
            }
          : {
              automaticActivityDetection: {
                disabled: false,
                silenceDurationMs: 600,
                prefixPaddingMs: 200,
                endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
                startOfSpeechSensitivity: "START_SENSITIVITY_UNSPECIFIED",
              },
              activityHandling: "ACTIVITY_HANDLING_UNSPECIFIED",
              turnCoverage: "TURN_INCLUDES_ONLY_ACTIVITY",
            },
      },
    };
    this.send(setup);
  }

  /** Public for STT-only callers that need to fire setup manually. */
  forceSendSetup(): void { this.sendSetup(); }

  private async handleMessage(e: MessageEvent): Promise<void> {
    let raw: string;
    if (e.data instanceof Blob) raw = await e.data.text();
    else if (e.data instanceof ArrayBuffer) raw = new TextDecoder().decode(e.data);
    else raw = String(e.data);

    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    const cb = this.cfg.callbacks;

    if (msg.setupComplete) {
      cb.onSetupComplete?.();
      return;
    }

    if (msg.toolCall) {
      const calls = (msg.toolCall.functionCalls ?? []).map((fc: any) => ({
        id: fc.id,
        name: fc.name,
        args: fc.args ?? {},
      }));
      cb.onToolCall?.(calls);
      return;
    }

    const sc = msg.serverContent;
    if (!sc) return;

    const parts = sc.modelTurn?.parts ?? [];
    for (const p of parts) {
      if (p.inlineData?.data) cb.onAudio?.(p.inlineData.data);
      if (p.text) cb.onAssistantTranscript?.(p.text, false);
    }

    if (sc.inputTranscription) {
      cb.onUserTranscript?.(
        sc.inputTranscription.text ?? "",
        Boolean(sc.inputTranscription.finished),
      );
    }
    if (sc.outputTranscription) {
      cb.onAssistantTranscript?.(
        sc.outputTranscription.text ?? "",
        Boolean(sc.outputTranscription.finished),
      );
    }
    if (sc.interrupted) cb.onInterrupted?.();
    if (sc.turnComplete) cb.onTurnComplete?.();
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
