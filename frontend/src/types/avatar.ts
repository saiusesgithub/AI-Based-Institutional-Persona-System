export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

export type AssistantState = AvatarState | "generating-voice" | "processing-lipsync";

export type RhubarbPhoneme = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";

export type PhonemeCue = {
  start: number;
  end: number;
  value: RhubarbPhoneme;
};

export type VisemeShape = Partial<Record<string, number>>;

export type LipSyncPlayback = {
  id: string;
  phonemes: PhonemeCue[];
  startedAtMs: number;
  offsetSeconds: number;
};

export type LipSyncDebugState = {
  currentTime: number;
  currentPhoneme: string;
  currentViseme: string;
  morphTargets: Record<string, number>;
  isSpeaking: boolean;
};
