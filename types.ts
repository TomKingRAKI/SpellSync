
export enum GameState {
  MENU = 'MENU',
  LOADING_WORDS = 'LOADING_WORDS',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  ROUND_RESULT = 'ROUND_RESULT',
  GAME_OVER = 'GAME_OVER',
  PROFILE = 'PROFILE',
  LEADERBOARD = 'LEADERBOARD'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  INSANE = 'INSANE'
}

export interface WordChallenge {
  word: string;
  definition: string; // Helpful hint
  polishTranslation: string; // New field for translation
  audioData?: string | null; // Base64 PCM audio
}

export interface RoundResult {
  word: string;
  userInput: string;
  isCorrect: boolean;
  timeUsed: number;
}

export interface GameSession {
  difficulty: Difficulty;
  words: WordChallenge[];
  currentRoundIndex: number;
  results: RoundResult[];
  score: number;
}

// --- NEW TYPES FOR USER ACCOUNTS & STATS ---

export interface MatchRecord {
  id: string;
  date: string;
  difficulty: Difficulty;
  score: number;
  accuracy: number;
  wordsCount: number;
}

export interface UserProfile {
  username: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  totalScore: number;
  matchesPlayed: number;
  highestScore: number;
  matchHistory: MatchRecord[];
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  difficulty: Difficulty;
  date: string;
  isUser: boolean; // To highlight the current user
}
