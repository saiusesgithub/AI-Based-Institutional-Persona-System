export type PersonaId = "reception-assistant" | "hod" | "chairman";

type ChatApiRequest = {
  message: string;
  persona: PersonaId;
};

type ChatApiResponse = {
  response: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

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
    const message = errorBody?.detail ?? "The AI service could not generate a response.";
    throw new Error(message);
  }

  return response.json() as Promise<ChatApiResponse>;
}
