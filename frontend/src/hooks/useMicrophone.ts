import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MicrophoneStatus = "idle" | "requesting" | "recording" | "denied" | "unsupported" | "error";

type RecordedAudio = {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
  createdAt: Date;
};

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus"
];

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function buildUploadPayload(recording: RecordedAudio | null, transcript: string) {
  if (!recording) {
    return null;
  }

  const extension = recording.mimeType.includes("mp4")
    ? "m4a"
    : recording.mimeType.includes("ogg")
      ? "ogg"
      : "webm";

  return {
    blob: recording.blob,
    file: new File([recording.blob], `voice-input-${recording.createdAt.getTime()}.${extension}`, {
      type: recording.mimeType
    }),
    transcript,
    mimeType: recording.mimeType,
    durationMs: recording.durationMs
  };
}

export function useMicrophone() {
  const [status, setStatus] = useState<MicrophoneStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activityLevel, setActivityLevel] = useState(0);
  const [waveform, setWaveform] = useState<number[]>(Array.from({ length: 24 }, () => 0));
  const [lastRecording, setLastRecording] = useState<RecordedAudio | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  const isSupported = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined",
    []
  );

  const stopVisualizer = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
    analyserRef.current = null;
    setActivityLevel(0);
    setWaveform(Array.from({ length: 24 }, () => 0));
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startVisualizer = useCallback((stream: MediaStream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);

      const average = data.reduce((sum, value) => sum + value, 0) / data.length;
      const normalized = Math.min(1, average / 128);
      const bars = Array.from({ length: 24 }, (_, index) => {
        const bucket = data[Math.floor((index / 24) * data.length)] ?? 0;
        return Math.min(1, bucket / 180);
      });

      setActivityLevel(normalized);
      setWaveform(bars);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    tick();
  }, []);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setStatus("unsupported");
      setError("This browser does not support microphone recording.");
      return;
    }

    if (recorderRef.current?.state === "recording") {
      return;
    }

    setStatus("requesting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm"
        });
        const url = URL.createObjectURL(blob);

        setLastRecording((previous) => {
          if (previous?.url) {
            URL.revokeObjectURL(previous.url);
          }

          return {
            blob,
            url,
            mimeType: blob.type || "audio/webm",
            durationMs: Math.max(0, Math.round(performance.now() - startedAtRef.current)),
            createdAt: new Date()
          };
        });

        chunksRef.current = [];
        recorderRef.current = null;
        stopVisualizer();
        stopStream();
        setStatus("idle");
      };

      recorder.start(250);
      startVisualizer(stream);
      setStatus("recording");
    } catch (recordingError) {
      const permissionDenied =
        recordingError instanceof DOMException &&
        (recordingError.name === "NotAllowedError" || recordingError.name === "PermissionDeniedError");

      setStatus(permissionDenied ? "denied" : "error");
      setError(
        permissionDenied
          ? "Microphone permission was denied."
          : "Unable to start microphone recording."
      );
      stopVisualizer();
      stopStream();
    }
  }, [isSupported, startVisualizer, stopStream, stopVisualizer]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder?.state === "recording") {
      recorder.stop();
      return;
    }

    stopVisualizer();
    stopStream();
    setStatus("idle");
  }, [stopStream, stopVisualizer]);

  const createUploadPayload = useCallback(
    (transcript: string) => buildUploadPayload(lastRecording, transcript),
    [lastRecording]
  );

  useEffect(() => {
    return () => {
      recorderRef.current?.state === "recording" && recorderRef.current.stop();
      stopVisualizer();
      stopStream();
      if (lastRecording?.url) {
        URL.revokeObjectURL(lastRecording.url);
      }
    };
  }, [lastRecording?.url, stopStream, stopVisualizer]);

  return {
    status,
    error,
    activityLevel,
    waveform,
    lastRecording,
    isRecording: status === "recording",
    isSupported,
    startRecording,
    stopRecording,
    createUploadPayload
  };
}
