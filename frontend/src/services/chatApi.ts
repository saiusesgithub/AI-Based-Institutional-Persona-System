import type { PhonemeCue } from "../types/avatar";

export type PersonaId = "reception-assistant" | "hod" | "chairman";

type ChatApiRequest = {
  message: string;
  persona: PersonaId;
};

type ChatApiResponse = {
  response: string;
};

type TTSApiRequest = {
  text: string;
  persona: PersonaId;
};

type TTSApiResponse = {
  audio_url: string;
  audio_base64: string;
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
