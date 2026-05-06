import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { useMicrophone } from "../hooks/useMicrophone";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

type VoiceControlsProps = {
  onTranscriptFinalized: (transcript: string) => void;
  onLiveTranscriptChange: (transcript: string) => void;
  onListeningChange: (isListening: boolean) => void;
};

export default function VoiceControls({
  onTranscriptFinalized,
  onLiveTranscriptChange,
  onListeningChange
}: VoiceControlsProps) {
  const [isLocked, setIsLocked] = useState(false);
  const lastSubmittedTranscriptRef = useRef("");
  const transcriptRef = useRef("");
  const activeSessionRef = useRef(false);
  const hasSubmittedSessionRef = useRef(false);
  const submitTimerRef = useRef<number | null>(null);
  const {
    status: microphoneStatus,
    error: microphoneError,
    activityLevel,
    waveform,
    lastRecording,
    isRecording,
    isSupported: isMicrophoneSupported,
    startRecording,
    stopRecording,
    createUploadPayload
  } = useMicrophone();
  const {
    transcript,
    status: speechStatus,
    error: speechError,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();

  const isListening = isRecording || speechStatus === "listening";
  const isUnavailable = !isMicrophoneSupported;
  const visibleTranscript = transcript;
  const stateLabel = microphoneStatus === "requesting"
    ? "Requesting permission"
    : isListening
      ? "Listening"
      : lastRecording
        ? "Ready"
        : "Standby";
  const visualState = isListening
    ? "listening"
    : microphoneStatus === "requesting"
      ? "thinking"
      : lastRecording
        ? "speaking"
        : "idle";

  useEffect(() => {
    onLiveTranscriptChange(visibleTranscript);
    transcriptRef.current = visibleTranscript;
  }, [onLiveTranscriptChange, visibleTranscript]);

  useEffect(() => {
    onListeningChange(isListening);
  }, [isListening, onListeningChange]);

  useEffect(() => {
    return () => {
      if (submitTimerRef.current !== null) {
        window.clearTimeout(submitTimerRef.current);
      }
    };
  }, []);

  const startVoiceInput = () => {
    if (activeSessionRef.current) {
      return;
    }

    if (submitTimerRef.current !== null) {
      window.clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }

    activeSessionRef.current = true;
    hasSubmittedSessionRef.current = false;
    lastSubmittedTranscriptRef.current = "";
    transcriptRef.current = "";
    resetTranscript();
    startRecording();
    if (isSpeechSupported) {
      startListening();
    }
  };

  const submitStoppedTranscript = () => {
    if (hasSubmittedSessionRef.current) {
      return;
    }

    const transcriptForSubmission = transcriptRef.current.trim();

    hasSubmittedSessionRef.current = true;

    if (!transcriptForSubmission || transcriptForSubmission === lastSubmittedTranscriptRef.current) {
      resetTranscript();
      onLiveTranscriptChange("");
      return;
    }

    lastSubmittedTranscriptRef.current = transcriptForSubmission;
    onTranscriptFinalized(transcriptForSubmission);
    createUploadPayload(transcriptForSubmission);
    resetTranscript();
    onLiveTranscriptChange("");
  };

  const stopVoiceInput = () => {
    if (!activeSessionRef.current) {
      return;
    }

    transcriptRef.current = visibleTranscript.trim();
    activeSessionRef.current = false;
    stopRecording();
    stopListening();
    setIsLocked(false);

    if (submitTimerRef.current !== null) {
      window.clearTimeout(submitTimerRef.current);
    }

    submitTimerRef.current = window.setTimeout(() => {
      submitStoppedTranscript();
      submitTimerRef.current = null;
    }, 900);
  };

  const handlePressStart = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (isLocked || isUnavailable) {
      return;
    }

    startVoiceInput();
  };

  const handlePressEnd = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (isLocked) {
      return;
    }

    stopVoiceInput();
  };

  const toggleLockedListening = () => {
    if (isUnavailable) {
      return;
    }

    if (isLocked || isListening) {
      stopVoiceInput();
      return;
    }

    setIsLocked(true);
    startVoiceInput();
  };

  return (
    <section className="glass-card border-cyan-400/20" data-voice-state={visualState}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Voice Input
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${
            isListening
              ? "border border-emerald-300/50 bg-emerald-300/10 text-emerald-200"
              : "border border-slate-700/70 bg-slate-950/70 text-slate-400"
          }`}
        >
          {stateLabel}
        </span>
      </div>

      <div className="mt-5 flex flex-col items-center">
        <motion.button
          type="button"
          disabled={isUnavailable}
          aria-pressed={isListening}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onPointerDown={handlePressStart}
          onPointerUp={handlePressEnd}
          onPointerCancel={handlePressEnd}
          className={`group relative grid h-36 w-36 place-items-center rounded-full border text-sm font-semibold transition duration-300 ${
            isListening
              ? "border-emerald-200/80 bg-emerald-300 text-emerald-950 shadow-[0_0_70px_rgba(52,211,153,0.45)]"
              : "border-cyan-300/40 bg-cyan-300/10 text-cyan-100 shadow-[0_0_55px_rgba(34,211,238,0.2)] hover:border-cyan-200/80 hover:bg-cyan-300/20"
          } disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500`}
        >
          <span className={`absolute inset-0 rounded-full ${isListening ? "mic-pulse" : ""}`} />
          <span
            className={`absolute inset-2 rounded-full border ${
              isListening ? "animate-ping border-emerald-100/40" : "border-cyan-200/10"
            }`}
          />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-current/40 bg-slate-950/20">
            <span className="h-8 w-5 rounded-full border-2 border-current" />
            <span className="absolute bottom-4 h-3 w-8 rounded-b-full border-b-2 border-current" />
            <span className="absolute bottom-2 h-3 w-0.5 rounded-full bg-current" />
          </span>
          <span className="relative mt-20 text-[10px] uppercase tracking-[0.22em]">
            {isListening ? "Release" : "Hold"}
          </span>
        </motion.button>

        <button
          type="button"
          onClick={toggleLockedListening}
          disabled={isUnavailable}
          className="mt-4 rounded-md border border-slate-700/80 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-300 transition hover:border-cyan-300/70 hover:text-cyan-100 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          {isLocked || isListening ? "Stop toggle mode" : "Toggle listening"}
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-cyan-400/10 bg-slate-950/70 p-3">
        <div className="flex h-12 items-end gap-1">
          {waveform.map((level, index) => (
            <span
              key={index}
              className={`flex-1 rounded-full transition-all duration-100 ${
                isListening ? "bg-cyan-300" : "bg-slate-700"
              }`}
              style={{ height: `${Math.max(10, level * 100)}%`, opacity: isListening ? 0.45 + level : 0.35 }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Audio activity</span>
          <span>{Math.round(activityLevel * 100)}%</span>
        </div>
      </div>

      <div className="mt-3 min-h-16 rounded-lg border border-slate-800/70 bg-slate-950/60 p-3 text-sm text-slate-300">
        {visibleTranscript ? (
          <p>{visibleTranscript}</p>
        ) : (
          <p className="text-slate-500">Live speech transcript appears while listening.</p>
        )}
      </div>

      {lastRecording ? (
        <div className="mt-3 rounded-lg border border-slate-800/70 bg-slate-950/60 p-3 text-xs text-slate-400">
          <div className="flex items-center justify-between gap-3">
            <span>Recorded audio saved in memory</span>
            <span>{(lastRecording.blob.size / 1024).toFixed(1)} KB</span>
          </div>
          <audio className="mt-2 w-full" controls src={lastRecording.url}>
            <track kind="captions" />
          </audio>
        </div>
      ) : null}

      {(microphoneError || speechError || !isSpeechSupported || isUnavailable) ? (
        <p className="mt-3 text-xs text-amber-200">
          {microphoneError ||
            speechError ||
            (!isSpeechSupported
              ? "Speech recognition is unavailable here, but microphone recording still works."
              : "Voice input needs a browser with MediaRecorder support.")}
        </p>
      ) : null}
    </section>
  );
}
