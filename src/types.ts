export interface Player {
  name: string;
  score: number;
  wins: number;
}

export interface Round {
  id: string;
  inputs: (number | null)[]; // Cards remaining for each player
  scores: number[]; // Points gained/lost in this round
  error: string | null;
  timestamp: number;
}

export interface GameState {
  players: string[];
  pointValue: number;
  baseScoreValue: number;
  rounds: Round[];
  manualAdjustments: number[];
  isSetup: boolean;
  currentRoundInputs: (number | null)[];
  activePlayerIndex: number;
}
