import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionStatus = "idle" | "listening" | "unsupported" | "error";

type SpeechRecognitionResult = {
  transcript: string;
  finalTranscript: string;
  interimTranscript: string;
  status: SpeechRecognitionStatus;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
};

export function useSpeechRecognition(): SpeechRecognitionResult {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);

  const SpeechRecognitionClass = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  const isSupported = Boolean(SpeechRecognitionClass);

  const ensureRecognition = useCallback(() => {
    if (!SpeechRecognitionClass) {
      return null;
    }

    if (recognitionRef.current) {
      return recognitionRef.current;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setStatus("listening");
      setError(null);
    };

    recognition.onresult = (event) => {
      let nextFinal = "";
      let nextInterim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? "";

        if (result.isFinal) {
          nextFinal += text;
        } else {
          nextInterim += text;
        }
      }

      if (nextFinal.trim()) {
        setFinalTranscript((current) => `${current} ${nextFinal}`.trim());
      }

      setInterimTranscript(nextInterim.trim());
    };

    recognition.onerror = (event) => {
      if (["network", "not-allowed", "service-not-allowed"].includes(event.error)) {
        shouldListenRef.current = false;
      }

      setStatus("error");
      setError(
        event.error === "network"
          ? "Browser speech recognition network service is unavailable. Use text input or try Chrome/Edge with network access."
          : event.error
            ? `Speech recognition error: ${event.error}`
            : "Speech recognition failed."
      );
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          setStatus("error");
          setError("Speech recognition could not restart.");
        }
        return;
      }

      setStatus("idle");
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [SpeechRecognitionClass]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setStatus("unsupported");
      setError("Realtime speech recognition is not supported in this browser.");
      return;
    }

    const recognition = ensureRecognition();

    if (!recognition || status === "listening") {
      return;
    }

    shouldListenRef.current = true;

    try {
      recognition.start();
    } catch {
      setStatus("error");
      setError("Speech recognition is already starting.");
    }
  }, [ensureRecognition, isSupported, status]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setStatus("idle");
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    transcript: `${finalTranscript} ${interimTranscript}`.trim(),
    finalTranscript,
    interimTranscript,
    status,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript
  };
}
