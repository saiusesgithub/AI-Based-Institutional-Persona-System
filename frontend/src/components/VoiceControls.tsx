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
  const submitAttemptRef = useRef(0);
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

  useEffect(() => {
    onLiveTranscriptChange(visibleTranscript);
    transcriptRef.current = visibleTranscript;
  }, [onLiveTranscriptChange, visibleTranscript]);

  useEffect(() => {
    if (activeSessionRef.current || hasSubmittedSessionRef.current || !visibleTranscript.trim()) {
      return;
    }

    if (submitTimerRef.current !== null) {
      window.clearTimeout(submitTimerRef.current);
    }

    submitTimerRef.current = window.setTimeout(() => {
      submitStoppedTranscript();
      submitTimerRef.current = null;
    }, 350);
  }, [visibleTranscript]);

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
    submitAttemptRef.current = 0;
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

    if (!transcriptForSubmission) {
      submitAttemptRef.current += 1;

      if (submitAttemptRef.current <= 8) {
        submitTimerRef.current = window.setTimeout(() => {
          submitStoppedTranscript();
          submitTimerRef.current = null;
        }, 250);
        return;
      }

      resetTranscript();
      onLiveTranscriptChange("");
      return;
    }

    hasSubmittedSessionRef.current = true;

    if (transcriptForSubmission === lastSubmittedTranscriptRef.current) {
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
    <section className="rounded-[24px] border border-cyan-400/20 bg-slate-900/40 p-1.25 shadow-lg shadow-cyan-950/20">
      <div className="flex items-center justify-between gap-3 px-0.5 pt-0.25">
        <h2 className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-slate-300">
          Voice Input
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-[9px] uppercase tracking-[0.18em] ${
            isListening
              ? "border border-emerald-300/50 bg-emerald-300/10 text-emerald-200"
              : "border border-slate-700/70 bg-slate-950/70 text-slate-400"
          }`}
        >
          {stateLabel}
        </span>
      </div>

      <div className="mt-1 grid min-h-0 gap-2 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-start">
        <div className="flex flex-col items-center gap-1.5 pt-0.25">
          <button
            type="button"
            disabled={isUnavailable}
            aria-pressed={isListening}
            onPointerDown={handlePressStart}
            onPointerUp={handlePressEnd}
            onPointerCancel={handlePressEnd}
            className={`group relative grid h-[4.9rem] w-[4.9rem] place-items-center rounded-full border text-sm font-semibold transition duration-300 ${
              isListening
                ? "border-emerald-200/80 bg-emerald-300 text-emerald-950 shadow-[0_0_42px_rgba(52,211,153,0.38)]"
                : "border-cyan-300/40 bg-cyan-300/10 text-cyan-100 shadow-[0_0_34px_rgba(34,211,238,0.16)] hover:border-cyan-200/80 hover:bg-cyan-300/20"
            } disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500`}
          >
            <span
              className={`absolute inset-2 rounded-full border ${
                isListening ? "animate-ping border-emerald-100/35" : "border-cyan-200/10"
              }`}
            />
            <span className="absolute inset-[0.38rem] rounded-full border border-cyan-200/10" />
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-current/40 bg-slate-950/20">
              <span className="h-4.5 w-3 rounded-full border-2 border-current" />
              <span className="absolute bottom-1.75 h-2.5 w-4.5 rounded-b-full border-b-2 border-current" />
              <span className="absolute bottom-1.5 h-3 w-0.5 rounded-full bg-current" />
            </span>
            <span className="absolute bottom-1 text-[8px] uppercase tracking-[0.22em]">
              {isListening ? "Release" : "Hold"}
            </span>
          </button>
        </div>

        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-950/50 p-1.75">
            <div className="mb-1 flex items-center justify-between text-[7px] uppercase tracking-[0.18em] text-slate-500">
              <span>Input activity</span>
              <span>{Math.round(activityLevel * 100)}%</span>
            </div>
            <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-slate-900/90">
              {waveform.map((level, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-full bg-cyan-300/80 transition-all duration-100"
                  style={{ opacity: Math.max(0.12, isListening ? 0.4 + level : level) }}
                />
              ))}
            </div>
          </div>

          <div className="min-h-9 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-1.75 text-[0.72rem] text-slate-300">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {visibleTranscript ? (
                  <p className="truncate">{visibleTranscript}</p>
                ) : (
                  <p className="text-slate-500">Live speech transcript appears while listening.</p>
                )}
              </div>
              <button
                type="button"
                onClick={toggleLockedListening}
                disabled={isUnavailable}
                className="shrink-0 rounded-full border border-slate-700/80 px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-slate-300 transition hover:border-cyan-300/70 hover:text-cyan-100 disabled:cursor-not-allowed disabled:text-slate-600"
              >
                {isLocked || isListening ? "Stop" : "Toggle"}
              </button>
            </div>
          </div>

          {lastRecording ? (
            <audio className="hidden" controls src={lastRecording.url}>
              <track kind="captions" />
            </audio>
          ) : null}

          {(microphoneError || speechError || !isSpeechSupported || isUnavailable) ? (
            <p className="text-[0.64rem] text-amber-200">
              {microphoneError ||
                speechError ||
                (!isSpeechSupported
                  ? "Speech recognition is unavailable here, but microphone recording still works."
                  : "Voice input needs a browser with MediaRecorder support.")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
