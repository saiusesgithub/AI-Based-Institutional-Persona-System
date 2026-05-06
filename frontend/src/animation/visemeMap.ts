import type { RhubarbPhoneme, VisemeShape } from "../types/avatar";

export const neutralViseme: VisemeShape = {
  jawOpen: 0,
  mouthFunnel: 0,
  mouthPucker: 0,
  mouthSmileLeft: 0,
  mouthSmileRight: 0,
  mouthShrugLower: 0,
  mouthRollLower: 0,
  mouthStretchLeft: 0,
  mouthStretchRight: 0
};

export const rhubarbVisemeMap: Record<RhubarbPhoneme, VisemeShape> = {
  X: neutralViseme,
  A: {
    jawOpen: 0.12,
    mouthShrugLower: 0.08
  },
  B: {
    jawOpen: 0.24,
    mouthFunnel: 0.18,
    mouthPucker: 0.1
  },
  C: {
    jawOpen: 0.58,
    mouthStretchLeft: 0.16,
    mouthStretchRight: 0.16
  },
  D: {
    jawOpen: 0.34,
    mouthSmileLeft: 0.18,
    mouthSmileRight: 0.18
  },
  E: {
    jawOpen: 0.22,
    mouthPucker: 0.42,
    mouthFunnel: 0.16
  },
  F: {
    jawOpen: 0.28,
    mouthRollLower: 0.24,
    mouthShrugLower: 0.18
  },
  G: {
    jawOpen: 0.42,
    mouthFunnel: 0.36
  },
  H: {
    jawOpen: 0.2,
    mouthPucker: 0.54,
    mouthFunnel: 0.28
  }
};

export function getVisemeShape(phoneme: string): VisemeShape {
  return rhubarbVisemeMap[phoneme as RhubarbPhoneme] ?? neutralViseme;
}
