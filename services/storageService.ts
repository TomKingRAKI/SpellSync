import { GameSession, UserProfile, MatchRecord, LeaderboardEntry, Difficulty } from "../types";

const STORAGE_KEY = "spellsync_guest_profile_v1";

// Default XP curve
const BASE_XP = 1000;
const XP_MULTIPLIER = 1.5;

const generateGuestName = () => {
  const num = Math.floor(Math.random() * 10000);
  return `Guest_${num}`;
};

const getInitialProfile = (): UserProfile => ({
  username: generateGuestName(),
  level: 1,
  currentXp: 0,
  nextLevelXp: 1000,
  totalScore: 0,
  matchesPlayed: 0,
  highestScore: 0,
  matchHistory: [],
});

export const getUserProfile = (): UserProfile => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load profile", e);
  }
  
  const newProfile = getInitialProfile();
  saveUserProfile(newProfile);
  return newProfile;
};

export const saveUserProfile = (profile: UserProfile) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save profile", e);
  }
};

export const processGameResult = (session: GameSession): UserProfile => {
  const profile = getUserProfile();
  
  // Calculate Accuracy
  const correctCount = session.results.filter(r => r.isCorrect).length;
  const accuracy = Math.round((correctCount / session.words.length) * 100);

  // Create Match Record
  const matchRecord: MatchRecord = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    difficulty: session.difficulty,
    score: session.score,
    accuracy: accuracy,
    wordsCount: session.words.length
  };

  // Update Stats
  profile.matchesPlayed += 1;
  profile.totalScore += session.score;
  if (session.score > profile.highestScore) {
    profile.highestScore = session.score;
  }
  
  // Update History (Keep last 20)
  profile.matchHistory = [matchRecord, ...profile.matchHistory].slice(0, 20);

  // Update Level Logic
  profile.currentXp += session.score;
  while (profile.currentXp >= profile.nextLevelXp) {
    profile.currentXp -= profile.nextLevelXp;
    profile.level += 1;
    profile.nextLevelXp = Math.floor(profile.nextLevelXp * XP_MULTIPLIER);
  }

  saveUserProfile(profile);
  return profile;
};

// Mock Data for Leaderboard to make it look alive
const MOCK_NAMES = ["WordMaster", "SpellingBee", "ProGamer99", "Lexicon", "AlphaBet", "GrammarPolice", "SynonymRoll"];

export const getLeaderboard = (timeframe: 'weekly' | 'monthly'): LeaderboardEntry[] => {
  const profile = getUserProfile();
  const entries: LeaderboardEntry[] = [];

  // Generate some fake high scores based on timeframe
  const count = 8; 
  const baseScore = timeframe === 'weekly' ? 500 : 2000;

  for (let i = 0; i < count; i++) {
    entries.push({
      rank: 0, // calculated later
      username: MOCK_NAMES[i % MOCK_NAMES.length],
      score: Math.floor(Math.random() * baseScore) + 500,
      difficulty: Difficulty.HARD, // Just random
      date: new Date().toISOString(),
      isUser: false
    });
  }

  // Add User's best score if they have played
  if (profile.highestScore > 0) {
    entries.push({
      rank: 0,
      username: profile.username + " (You)",
      score: profile.highestScore,
      difficulty: Difficulty.MEDIUM, // Simplified
      date: new Date().toISOString(),
      isUser: true
    });
  }

  // Sort by score descending
  entries.sort((a, b) => b.score - a.score);

  // Assign Ranks
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 })).slice(0, 10);
};
