import type { PhonemeCue } from "../types/avatar";

export type PersonaId = "reception-assistant" | "hod" | "chairman";

type ChatApiRequest = {
  message: string;
  persona: PersonaId;
};

type ChatApiResponse = {
  response: string;
};

type StreamChatOptions = {
  signal?: AbortSignal;
  onToken: (token: string) => void;
};

type TTSApiRequest = {
  text: string;
  persona: PersonaId;
};

type TTSApiResponse = {
  audio_url: string;
  audio_base64: string | null;
  duration_seconds: number | null;
};

type LipSyncApiRequest = {
  audio_base64: string;
  audio_format: "wav";
};

type LipSyncApiResponse = {
  phonemes: PhonemeCue[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

function getErrorMessage(errorBody: unknown, fallback: string) {
  if (
    typeof errorBody === "object" &&
    errorBody !== null &&
    "detail" in errorBody &&
    typeof errorBody.detail === "string"
  ) {
    return errorBody.detail;
  }

  return fallback;
}

export async function sendChatMessage(payload: ChatApiRequest): Promise<ChatApiResponse> {
  const response = await fetch(`${apiBaseUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = getErrorMessage(
      errorBody,
      response.status === 503
        ? "The AI model is temporarily overloaded. Please try again in a moment."
        : "The AI service could not generate a response."
    );
    throw new Error(message);
  }

  return response.json() as Promise<ChatApiResponse>;
}

export async function streamChatMessage(
  payload: ChatApiRequest,
  options: StreamChatOptions
): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify(payload),
    signal: options.signal
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(getErrorMessage(errorBody, "The AI stream could not start."));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventText of events) {
      const event = parseSseEvent(eventText);

      if (!event) {
        continue;
      }

      if (event.event === "error") {
        throw new Error(event.data.message || "The AI stream failed.");
      }

      if (event.event === "done") {
        await reader.cancel().catch(() => undefined);
        return fullText.trim();
      }

      if (event.event === "token" && event.data.text) {
        fullText += event.data.text;
        options.onToken(event.data.text);
      }
    }
  }

  return fullText.trim();
}

export async function generateSpeech(payload: TTSApiRequest): Promise<TTSApiResponse> {
  const response = await fetch(`${apiBaseUrl}/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = getErrorMessage(errorBody, "The voice service could not generate audio.");
    throw new Error(message);
  }

  return response.json() as Promise<TTSApiResponse>;
}

export async function generateLipSync(payload: LipSyncApiRequest): Promise<LipSyncApiResponse> {
  const response = await fetch(`${apiBaseUrl}/lipsync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = getErrorMessage(errorBody, "Lip sync generation failed.");
    throw new Error(message);
  }

  return response.json() as Promise<LipSyncApiResponse>;
}

function parseSseEvent(rawEvent: string): { event: string; data: Record<string, string> } | null {
  const eventLine = rawEvent
    .split("\n")
    .find((line) => line.startsWith("event:"));
  const dataLine = rawEvent
    .split("\n")
    .find((line) => line.startsWith("data:"));

  if (!eventLine || !dataLine) {
    return null;
  }

  try {
    return {
      event: eventLine.replace("event:", "").trim(),
      data: JSON.parse(dataLine.replace("data:", "").trim()) as Record<string, string>
    };
  } catch {
    return null;
  }
}
