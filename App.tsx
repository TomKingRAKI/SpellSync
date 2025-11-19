
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Difficulty, GameSession, RoundResult, WordChallenge, UserProfile, MatchRecord } from './types';
import { generateWords, generatePronunciation } from './services/geminiService';
import { playPCMAudio } from './services/audioUtils';
import { getUserProfile, processGameResult, getLeaderboard } from './services/storageService';
import { Button } from './components/Button';

// Icons
const SpeakerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
);

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
);

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
);

// --- Sub-Components ---

interface LeaderboardViewProps {
  onBack: () => void;
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
  const data = getLeaderboard(activeTab);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="w-full flex justify-between items-center mb-8">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
        <div className="w-24"></div>
      </div>

      <div className="flex p-1 bg-slate-800 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'weekly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Weekly Top
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'monthly' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          All Time
        </button>
      </div>

      <div className="w-full bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 text-center">Rank</th>
              <th className="p-4">Player</th>
              <th className="p-4 text-right">Score</th>
              <th className="p-4 hidden sm:table-cell">Mode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {data.map((entry, idx) => (
              <tr key={idx} className={`${entry.isUser ? 'bg-indigo-900/20' : 'hover:bg-slate-800/30'} transition-colors`}>
                <td className="p-4 text-center">
                  {entry.rank === 1 && <span className="text-yellow-400 font-bold text-xl">🥇</span>}
                  {entry.rank === 2 && <span className="text-slate-300 font-bold text-xl">🥈</span>}
                  {entry.rank === 3 && <span className="text-amber-700 font-bold text-xl">🥉</span>}
                  {entry.rank > 3 && <span className="text-slate-500 font-mono font-bold">#{entry.rank}</span>}
                </td>
                <td className="p-4 font-medium text-white">
                  {entry.username}
                  {entry.isUser && <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">YOU</span>}
                </td>
                <td className="p-4 text-right font-mono font-bold text-emerald-400">{entry.score.toLocaleString()}</td>
                <td className="p-4 hidden sm:table-cell text-slate-500 text-sm">{entry.difficulty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [session, setSession] = useState<GameSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Gameplay State
  const [userInput, setUserInput] = useState('');
  const [timer, setTimer] = useState(15);
  const [countdown, setCountdown] = useState(3);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{current: number, total: number} | null>(null);
  
  // Audio Context ref to persist across renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize App Data
  useEffect(() => {
    setUserProfile(getUserProfile());
  }, [gameState]); // Reload profile when returning to menu/changing state

  // Initialize AudioContext
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    // Always try to resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(err => console.warn("Audio resume failed", err));
    }
  };

  // Start Game Flow - Now Preloads Audio in PARALLEL
  const startGame = async (difficulty: Difficulty) => {
    initAudio();
    setGameState(GameState.LOADING_WORDS);
    setLoadingProgress({ current: 0, total: 5 }); // Assuming 5 words
    
    try {
      // 1. Get Words
      const words = await generateWords(difficulty);
      const totalWords = words.length;
      setLoadingProgress({ current: 0, total: totalWords });

      // 2. Preload Audio for ALL words concurrently
      const audioPromises = words.map(async (wordObj) => {
        try {
          const audioData = await generatePronunciation(wordObj.word);
          setLoadingProgress(prev => prev ? { ...prev, current: prev.current + 1 } : null);
          return {
            ...wordObj,
            audioData: audioData || undefined
          };
        } catch (e) {
          console.error(`Failed to generate audio for ${wordObj.word}`, e);
          return { ...wordObj, audioData: undefined };
        }
      });

      // Wait for all parallel requests to finish
      const wordsWithAudio = await Promise.all(audioPromises);

      setSession({
        difficulty,
        words: wordsWithAudio,
        currentRoundIndex: 0,
        results: [],
        score: 0,
      });
      
      setCountdown(3);
      setGameState(GameState.COUNTDOWN);
    } catch (error) {
      console.error("Failed to load game:", error);
      alert("Could not connect to the magic spell book (API Error). Please try again.");
      setGameState(GameState.MENU);
    }
  };

  // Handle Round Start
  const startRound = useCallback(async () => {
    if (!session) return;
    const currentWord = session.words[session.currentRoundIndex];
    
    setGameState(GameState.PLAYING);
    setUserInput('');
    setFeedback(null);
    setTimer(15);

    setTimeout(() => inputRef.current?.focus(), 100);

    if (currentWord.audioData && audioContextRef.current) {
      await playPCMAudio(currentWord.audioData, audioContextRef.current);
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    timerIntervalRef.current = window.setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          handleSubmit(true); // Time's up
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [session]);

  // Countdown Effect Logic
  useEffect(() => {
    if (gameState === GameState.COUNTDOWN) {
      if (countdown > 0) {
        const timerId = setTimeout(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearTimeout(timerId);
      } else {
        startRound();
      }
    }
  }, [gameState, countdown, startRound]);

  // Handle User Submission
  const handleSubmit = useCallback((timeOut: boolean = false) => {
    if (!session || !timerIntervalRef.current) return;
    clearInterval(timerIntervalRef.current);

    const currentWordObj = session.words[session.currentRoundIndex];
    const targetWord = currentWordObj.word.trim().toLowerCase();
    const input = userInput.trim().toLowerCase();
    const isCorrect = !timeOut && input === targetWord;

    const points = isCorrect ? (100 + (timer * 10)) : 0;

    const newResult: RoundResult = {
      word: currentWordObj.word,
      userInput: userInput,
      isCorrect,
      timeUsed: 15 - timer
    };

    const updatedSession = {
        ...session,
        results: [...session.results, newResult],
        score: session.score + points
    };

    setSession(updatedSession);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setGameState(GameState.ROUND_RESULT);

  }, [session, timer, userInput]);

  // Next Round Logic
  const handleNextButton = () => {
    if (!session) return;
    if (session.currentRoundIndex + 1 >= session.words.length) {
       // Game Over - Save Data
       processGameResult(session);
       setGameState(GameState.GAME_OVER);
    } else {
       const nextSession = {
         ...session,
         currentRoundIndex: session.currentRoundIndex + 1
       };
       setSession(nextSession);
       setGameState(GameState.COUNTDOWN);
       setCountdown(2);
    }
  };

  const replayAudio = async () => {
    if (!session || !audioContextRef.current) return;
    const currentWord = session.words[session.currentRoundIndex];
    if (currentWord.audioData) {
        playPCMAudio(currentWord.audioData, audioContextRef.current);
    }
  };

  // --- VIEWS ---

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-12 max-w-4xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-2xl">
          SpellSync
        </h1>
        <p className="text-xl text-slate-400 font-light max-w-lg mx-auto">
          Master your English spelling.
        </p>
      </div>

      {/* Level / Profile Summary */}
      {userProfile && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-full px-6 py-2 flex items-center gap-4">
           <div className="flex items-center gap-2">
             <UserIcon />
             <span className="font-bold text-indigo-400">{userProfile.username}</span>
           </div>
           <div className="h-4 w-[1px] bg-slate-600"></div>
           <span className="text-slate-300 text-sm">Lvl {userProfile.level}</span>
           <div className="h-4 w-[1px] bg-slate-600"></div>
           <span className="text-slate-300 text-sm">{userProfile.matchesPlayed} Matches</span>
        </div>
      )}

      {/* Difficulty Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {Object.values(Difficulty).map((diff) => (
          <button
            key={diff}
            onClick={() => startGame(diff)}
            className="group relative overflow-hidden bg-slate-800/50 border border-slate-700 hover:border-indigo-500 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xl font-bold text-white mb-1">{diff}</h3>
            <p className="text-xs text-slate-400">
              {diff === 'EASY' ? '3-5 letters' : 
               diff === 'MEDIUM' ? '6-8 letters' : 
               diff === 'HARD' ? 'Complex words' : 'Scientific & Rare'}
            </p>
          </button>
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-4 w-full max-w-md justify-center">
        <Button variant="secondary" onClick={() => setGameState(GameState.PROFILE)} className="w-full flex items-center justify-center gap-2">
           <UserIcon /> My Profile
        </Button>
        <Button variant="secondary" onClick={() => setGameState(GameState.LEADERBOARD)} className="w-full flex items-center justify-center gap-2">
           <TrophyIcon /> Leaderboard
        </Button>
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!userProfile) return null;
    const xpProgress = Math.min(100, (userProfile.currentXp / userProfile.nextLevelXp) * 100);

    return (
      <div className="min-h-screen flex flex-col items-center p-6 max-w-3xl mx-auto animate-fade-in">
        <div className="w-full flex justify-between items-center mb-8">
            <Button variant="outline" onClick={() => setGameState(GameState.MENU)}>← Back</Button>
            <h2 className="text-2xl font-bold text-white">Player Profile</h2>
            <div className="w-24"></div> {/* Spacer */}
        </div>

        <div className="w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 shadow-2xl mb-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar / Level */}
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                        {userProfile.username.charAt(0)}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-slate-900 text-indigo-400 border border-indigo-500/50 rounded-full px-3 py-1 text-xs font-bold">
                        Lvl {userProfile.level}
                    </div>
                </div>

                {/* Stats Info */}
                <div className="flex-1 w-full space-y-4">
                    <div className="flex justify-between items-end">
                        <h3 className="text-2xl font-bold text-white">{userProfile.username}</h3>
                        <span className="text-indigo-300 text-sm">{userProfile.currentXp} / {userProfile.nextLevelXp} XP</span>
                    </div>
                    
                    {/* XP Bar */}
                    <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${xpProgress}%` }}></div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-2">
                         <div className="bg-slate-900/50 p-3 rounded-xl text-center">
                             <div className="text-2xl font-bold text-white">{userProfile.matchesPlayed}</div>
                             <div className="text-xs text-slate-500 uppercase tracking-wider">Matches</div>
                         </div>
                         <div className="bg-slate-900/50 p-3 rounded-xl text-center">
                             <div className="text-2xl font-bold text-emerald-400">{userProfile.highestScore}</div>
                             <div className="text-xs text-slate-500 uppercase tracking-wider">Best Score</div>
                         </div>
                         <div className="bg-slate-900/50 p-3 rounded-xl text-center">
                             <div className="text-2xl font-bold text-purple-400">
                                 {userProfile.matchesPlayed > 0 
                                    ? Math.round(userProfile.totalScore / userProfile.matchesPlayed) 
                                    : 0}
                             </div>
                             <div className="text-xs text-slate-500 uppercase tracking-wider">Avg Score</div>
                         </div>
                    </div>
                </div>
            </div>
        </div>

        <h3 className="text-xl font-bold text-slate-300 mb-4 w-full text-left pl-2">Recent Matches</h3>
        <div className="w-full space-y-3">
            {userProfile.matchHistory.length === 0 ? (
                <div className="text-center text-slate-500 py-8 italic">No matches played yet. Go play!</div>
            ) : (
                userProfile.matchHistory.map((match) => (
                    <div key={match.id} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:bg-slate-800/60 transition-colors">
                        <div>
                            <div className="font-bold text-white">{match.difficulty} Mode</div>
                            <div className="text-xs text-slate-500">{new Date(match.date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                             <div className="font-bold text-indigo-400">{match.score} pts</div>
                             <div className="text-xs text-emerald-400">{match.accuracy}% Acc</div>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    );
  };

  const renderPlaying = () => {
    if (!session) return null;
    const currentWord = session.words[session.currentRoundIndex];
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-2xl mx-auto">
        <div className="w-full bg-slate-800/50 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-8">
          
          {/* Header Info */}
          <div className="flex justify-between items-center text-slate-400">
             <span className="font-mono">Round {session.currentRoundIndex + 1}/{session.words.length}</span>
             <span className="font-mono text-indigo-400">Score: {session.score}</span>
          </div>

          {/* Timer Bar */}
          <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden">
             <div 
                className={`h-full transition-all duration-1000 ease-linear ${timer < 5 ? 'bg-red-500' : 'bg-indigo-500'}`}
                style={{ width: `${(timer / 15) * 100}%` }}
             />
          </div>

          {/* Audio Interaction */}
          <div className="flex flex-col items-center space-y-6 py-8">
            <button 
              onClick={replayAudio}
              className="relative group w-32 h-32 flex items-center justify-center rounded-full bg-slate-900 border-4 border-slate-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
            >
               <SpeakerIcon />
               <span className="absolute -bottom-8 text-sm text-slate-500 group-hover:text-indigo-400 transition-colors">Replay Audio</span>
            </button>
            
            <p className="text-slate-300 italic text-center px-4 opacity-75">
               Hint: "{currentWord.definition}"
            </p>
          </div>

          {/* Input Area */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="relative w-full"
          >
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type the word here..."
              className="w-full bg-slate-900 text-center text-2xl font-bold text-white p-6 rounded-2xl border-2 border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <div className="mt-6 flex justify-center">
                <Button type="submit" disabled={!userInput}>Submit Answer</Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!session) return null;
    const currentResult = session.results[session.results.length - 1];
    const currentWordObj = session.words[session.currentRoundIndex]; 
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-lg mx-auto animate-fade-in">
        <div className={`w-full p-8 rounded-3xl border-2 shadow-2xl text-center space-y-6 ${feedback === 'correct' ? 'bg-emerald-900/20 border-emerald-500' : 'bg-red-900/20 border-red-500'}`}>
            
            <div className="text-6xl mb-4">
                {feedback === 'correct' ? '🎉' : '🫠'}
            </div>

            <h2 className={`text-4xl font-black ${feedback === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                {feedback === 'correct' ? 'Excellent!' : 'Not quite...'}
            </h2>

            <div className="bg-slate-900/50 p-6 rounded-xl space-y-2">
                <p className="text-slate-400 text-sm uppercase tracking-widest">Correct Word</p>
                <p className="text-3xl font-bold text-white tracking-wider">{currentResult.word}</p>
                
                <div className="pt-2 border-t border-slate-800 mt-4">
                    <p className="text-indigo-300 text-sm mb-1">Translation (PL)</p>
                    <p className="text-xl font-medium text-slate-300 italic">
                        {currentWordObj.polishTranslation}
                    </p>
                </div>
            </div>

            {feedback === 'wrong' && (
                <div className="bg-red-500/10 p-4 rounded-xl">
                    <p className="text-red-300 text-sm">You typed:</p>
                    <p className="text-xl font-mono text-red-200 line-through">{currentResult.userInput || "(nothing)"}</p>
                </div>
            )}
            
            <div className="pt-4">
                <Button onClick={handleNextButton} className="w-full">
                    {session.currentRoundIndex + 1 >= session.words.length ? 'Finish Game' : 'Next Word →'}
                </Button>
            </div>
        </div>
      </div>
    );
  };

  const renderGameOver = () => {
    if (!session) return null;
    const accuracy = Math.round((session.results.filter(r => r.isCorrect).length / session.words.length) * 100);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-4xl mx-auto">
        <div className="w-full bg-slate-800 p-10 rounded-3xl border border-slate-700 shadow-2xl text-center space-y-8">
           <h2 className="text-5xl font-black text-white">Game Over</h2>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-4 rounded-xl">
                  <p className="text-slate-400 text-sm">Total Score</p>
                  <p className="text-3xl font-bold text-indigo-400">{session.score}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl">
                  <p className="text-slate-400 text-sm">Accuracy</p>
                  <p className="text-3xl font-bold text-emerald-400">{accuracy}%</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl">
                  <p className="text-slate-400 text-sm">Difficulty</p>
                  <p className="text-3xl font-bold text-white">{session.difficulty}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl">
                  <p className="text-slate-400 text-sm">Words</p>
                  <p className="text-3xl font-bold text-white">{session.words.length}</p>
              </div>
           </div>

           <div className="bg-slate-900 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 text-sm uppercase">
                        <tr>
                            <th className="p-4">Word</th>
                            <th className="p-4">Your Answer</th>
                            <th className="p-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                        {session.results.map((res, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                                <td className="p-4 font-medium text-white">
                                  <div>{res.word}</div>
                                  <div className="text-xs text-slate-500">{session.words[idx].polishTranslation}</div>
                                </td>
                                <td className={`p-4 font-mono ${res.isCorrect ? 'text-slate-400' : 'text-red-400'}`}>
                                    {res.userInput}
                                </td>
                                <td className="p-4 text-right">
                                    {res.isCorrect ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900 text-emerald-400">
                                            Correct
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-400">
                                            Missed
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
           </div>

           <div className="flex justify-center pt-4 gap-4">
              <Button onClick={() => setGameState(GameState.MENU)} variant="outline">
                  <span className="flex items-center gap-2">
                      <RefreshIcon /> Menu & Stats
                  </span>
              </Button>
           </div>
        </div>
      </div>
    );
  };

  const renderLoading = () => (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-8 max-w-md mx-auto px-6 text-center">
          <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-4 border-t-4 border-purple-500 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-white">
                  {loadingProgress && loadingProgress.total > 0
                    ? `${Math.round((loadingProgress.current / loadingProgress.total) * 100)}%` 
                    : '0%'}
              </div>
          </div>
          <div className="space-y-2">
              <h2 className="text-2xl font-bold text-indigo-300">Summoning Words...</h2>
              <p className="text-slate-400 text-sm">
                {loadingProgress && loadingProgress.total > 0
                  ? `Parallel processing: ${loadingProgress.current} / ${loadingProgress.total} audio streams ready`
                  : "Consulting the ancient dictionary..."}
              </p>
          </div>
          {loadingProgress && loadingProgress.total > 0 && (
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300 ease-out" 
                style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
              />
            </div>
          )}
      </div>
  );

  const renderCountdown = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 overflow-hidden">
        <div key={countdown} className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-600 animate-[ping_1s_cubic-bezier(0,0,0.2,1)_1]">
            {countdown > 0 ? countdown : "GO!"}
        </div>
        <p className="mt-12 text-slate-400 text-xl font-medium tracking-widest uppercase">Get Ready</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500 selection:text-white">
      {gameState === GameState.MENU && renderMenu()}
      {gameState === GameState.PROFILE && renderProfile()}
      {gameState === GameState.LEADERBOARD && <LeaderboardView onBack={() => setGameState(GameState.MENU)} />}
      {gameState === GameState.LOADING_WORDS && renderLoading()}
      {gameState === GameState.COUNTDOWN && renderCountdown()}
      {gameState === GameState.PLAYING && renderPlaying()}
      {gameState === GameState.ROUND_RESULT && renderResult()}
      {gameState === GameState.GAME_OVER && renderGameOver()}
    </div>
  );
};

export default App;
