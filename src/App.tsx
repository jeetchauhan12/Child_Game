/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Link as LinkIcon, 
  Trophy, 
  Zap, 
  Timer, 
  ChevronRight, 
  Star, 
  Info, 
  Lightbulb,
  Home,
  Map,
  Settings,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Palette,
  Target,
  Calendar,
  Coins,
  X
} from 'lucide-react';
import { 
  PlayerState, 
  AIResponse, 
  AIRequest, 
  Category,
  KingdomTheme,
  DailyQuest
} from './types';
import { generateGameContent } from './services/aiService';

const THEMES: Record<KingdomTheme, { bg: string, border: string, text: string, cardBg: string, accent: string }> = {
  classic: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-brand-dark', cardBg: 'bg-white', accent: 'text-brand-primary' },
  neon: { bg: 'bg-slate-900', border: 'border-purple-500/50', text: 'text-white', cardBg: 'bg-slate-800 shadow-[0_0_15px_rgba(168,85,247,0.2)]', accent: 'text-purple-400' },
  fantasy: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', cardBg: 'bg-white shadow-amber-100', accent: 'text-amber-600' },
  space: { bg: 'bg-indigo-950', border: 'border-indigo-500/30', text: 'text-indigo-100', cardBg: 'bg-indigo-900 shadow-[0_0_15px_rgba(99,102,241,0.2)]', accent: 'text-indigo-400' },
  night: { bg: 'bg-slate-950', border: 'border-slate-800', text: 'text-slate-300', cardBg: 'bg-slate-900', accent: 'text-indigo-400' }
};

const generateDailyQuests = (): DailyQuest[] => {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: 'q1',
      type: 'questions_answered',
      description: 'Answer 5 questions',
      target: 5,
      progress: 0,
      rewardXP: 50,
      completed: false,
      date: today
    },
    {
      id: 'q2',
      type: 'correct_answers',
      description: 'Get 3 correct answers',
      target: 3,
      progress: 0,
      rewardXP: 75,
      completed: false,
      date: today
    },
    {
      id: 'q3',
      type: 'streak',
      description: 'Achieve a streak of 3',
      target: 3,
      progress: 0,
      rewardXP: 100,
      completed: false,
      date: today
    }
  ];
};

const INITIAL_STATE: PlayerState = {
  age: 0,
  level: 1,
  xp: 0,
  coins: 0,
  streak: 0,
  questionNumber: 1,
  kingdom: [],
  accuracyRate: 0,
  totalQuestions: 0,
  correctQuestions: 0,
  weakCategories: [],
  theme: 'night',
  dailyQuests: [],
  lastPlayDate: '',
};

export default function App() {
  const [player, setPlayer] = useState<PlayerState>(() => {
    const saved = localStorage.getItem('curiochain_player');
    const parsed = saved ? JSON.parse(saved) : INITIAL_STATE;
    return { ...INITIAL_STATE, ...parsed, coins: parsed.coins || 0 };
  });
  
  const [gameState, setGameState] = useState<'onboarding' | 'dashboard' | 'playing' | 'feedback'>('onboarding');
  const [currentQuestion, setCurrentQuestion] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [selectedBuildingIndex, setSelectedBuildingIndex] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (player.age > 0 && gameState === 'onboarding') {
      setGameState('dashboard');
    }
  }, [player.age, gameState]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setPlayer(prev => {
      if (prev.lastPlayDate !== today) {
        return {
          ...prev,
          lastPlayDate: today,
          dailyQuests: generateDailyQuests()
        };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('curiochain_player', JSON.stringify(player));
  }, [player]);

  const startTimer = useCallback((seconds: number) => {
    setTimeLeft(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAnswer(-1, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const fetchNextQuestion = async (result: 'correct' | 'wrong' | 'timeout' | 'none' = 'none', practiceMode = false, forceCategory?: Category) => {
    setLoading(true);
    try {
      const request: AIRequest = {
        requestType: practiceMode ? 'question' : ((player.questionNumber % 3 === 0) ? 'chain' : 'question'),
        playerAge: player.age,
        playerLevel: player.level,
        currentStreak: player.streak,
        totalXP: player.xp,
        lastResult: result === 'none' ? 'correct' : result,
        lastCategory: player.lastCategory || 'General',
        weakCategories: player.weakCategories,
        questionNumber: player.questionNumber,
        accuracyRate: player.accuracyRate,
        practiceMode,
        forceCategory
      };

      const response = await generateGameContent(request);
      setCurrentQuestion(response);
      setSelectedOption(null);
      setShowHint(false);
      setGameState('playing');
      startTimer(response.timeLimit);
    } catch (error) {
      console.error("Failed to fetch question:", error);
    } finally {
      setLoading(false);
    }
  };

  const startTargetedPractice = () => {
    if (player.weakCategories.length === 0) return;
    const targetCategory = player.weakCategories[Math.floor(Math.random() * player.weakCategories.length)];
    fetchNextQuestion('none', true, targetCategory);
  };

  const handleAnswer = (index: number, isTimeout = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (selectedOption !== null && !isTimeout) return;

    setSelectedOption(index);
    const isCorrect = !isTimeout && index === currentQuestion?.correctIndex;
    const result = isTimeout ? 'timeout' : (isCorrect ? 'correct' : 'wrong');
    
    setLastResult(result);
    setFeedbackData(currentQuestion);

    setPlayer(prev => {
      const newCorrect = isCorrect ? prev.correctQuestions + 1 : prev.correctQuestions;
      const newTotal = prev.totalQuestions + 1;
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      
      let newLevel = prev.level;
      
      // Calculate passive bonuses from buildings
      const category = currentQuestion?.modeType === 'curio' ? currentQuestion.category : null;
      let bonusMultiplier = 0;
      if (category) {
        const categoryBuildings = prev.kingdom.filter(b => b.category === category);
        bonusMultiplier = categoryBuildings.reduce((acc, b) => acc + ((b.level || 1) * 0.05), 0);
      }

      const baseXP = (currentQuestion?.xp || 0) + (currentQuestion?.xpBonus || 0);
      const finalXP = Math.round(baseXP * (1 + bonusMultiplier));
      const earnedCoins = Math.round(baseXP / 2);

      let newXP = prev.xp + (isCorrect ? finalXP : 0);
      let newCoins = prev.coins + (isCorrect ? earnedCoins : 0);
      
      const xpNeeded = prev.level * 100;
      if (newXP >= xpNeeded) {
        newXP -= xpNeeded;
        newLevel += 1;
      }

      const newKingdom = [...prev.kingdom];
      if (isCorrect && currentQuestion?.modeType === 'curio' && currentQuestion.kingdom) {
        const exists = newKingdom.some(b => b.buildingUnlocked === currentQuestion.kingdom.buildingUnlocked);
        if (!exists) {
          newKingdom.push({ ...currentQuestion.kingdom, category: currentQuestion.category, level: 1 });
        } else {
          newCoins += 10; // Bonus for duplicate building
        }
      }

      // Update Daily Quests
      const newQuests = prev.dailyQuests.map(quest => {
        if (quest.completed) return quest;
        
        let newProgress = quest.progress;
        if (quest.type === 'questions_answered') {
          newProgress += 1;
        } else if (quest.type === 'correct_answers' && isCorrect) {
          newProgress += 1;
        } else if (quest.type === 'streak') {
          if (newStreak > newProgress) newProgress = newStreak;
        }
        
        const completed = newProgress >= quest.target;
        if (completed && !quest.completed) {
          newXP += quest.rewardXP;
        }
        
        return { ...quest, progress: newProgress, completed };
      });

      // Update Weak Categories
      let newWeakCategories = [...prev.weakCategories];
      if (currentQuestion?.modeType === 'curio') {
        const cat = currentQuestion.category;
        if (!isCorrect && !newWeakCategories.includes(cat)) {
          newWeakCategories.push(cat);
        } else if (isCorrect && newWeakCategories.includes(cat)) {
          newWeakCategories = newWeakCategories.filter(c => c !== cat);
        }
      }

      return {
        ...prev,
        xp: newXP,
        coins: newCoins,
        level: newLevel,
        streak: newStreak,
        totalQuestions: newTotal,
        correctQuestions: newCorrect,
        accuracyRate: Math.round((newCorrect / newTotal) * 100),
        questionNumber: prev.questionNumber + 1,
        kingdom: newKingdom,
        lastCategory: currentQuestion?.modeType === 'curio' ? currentQuestion.category : prev.lastCategory,
        dailyQuests: newQuests,
        weakCategories: newWeakCategories
      };
    });

    setGameState('feedback');
  };

  const handleAgeSelect = (age: number) => {
    setPlayer(prev => ({ ...prev, age }));
  };

  const changeTheme = (theme: KingdomTheme) => {
    setPlayer(prev => ({ ...prev, theme }));
    setShowThemeSelector(false);
  };

  const handleUpgrade = (index: number) => {
    setPlayer(prev => {
      const building = prev.kingdom[index];
      const cost = (building.level || 1) * 100;
      if (prev.coins >= cost) {
        const newKingdom = [...prev.kingdom];
        newKingdom[index] = { ...building, level: (building.level || 1) + 1 };
        return { ...prev, coins: prev.coins - cost, kingdom: newKingdom };
      }
      return prev;
    });
  };

  const currentTheme = THEMES[player.theme || 'classic'];

  const renderOnboarding = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-brand-secondary/20 to-brand-primary/20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 max-w-md w-full text-center"
      >
        <div className="w-20 h-20 bg-brand-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-float">
          <Brain className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-2 text-brand-dark">CurioChain AI</h1>
        <p className="text-slate-600 mb-8">Welcome, young explorer! How old are you?</p>
        
        <div className="grid grid-cols-2 gap-4">
          {[6, 9, 12, 15].map((age) => (
            <button
              key={age}
              onClick={() => handleAgeSelect(age)}
              className="p-4 rounded-2xl border-2 border-brand-secondary/30 hover:border-brand-secondary hover:bg-brand-secondary/10 transition-all font-bold text-xl"
            >
              {age === 15 ? "15-18" : age === 12 ? "12-14" : age === 9 ? "9-11" : "6-8"}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderDashboard = () => (
    <div className={`min-h-screen pb-24 transition-colors duration-500 ${currentTheme.bg} ${currentTheme.text}`}>
      {/* Header Stats */}
      <div className={`${currentTheme.cardBg} border-b ${currentTheme.border} p-4 sticky top-0 z-10 transition-colors duration-500`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white font-bold">
              {player.level}
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider opacity-60`}>Level</p>
              <div className="w-32 h-2 bg-slate-200/50 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-brand-primary transition-all duration-500" 
                  style={{ width: `${(player.xp / (player.level * 100)) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Coins className="text-yellow-500 fill-yellow-500 w-5 h-5" />
              <span className="font-bold">{player.coins}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="text-brand-accent fill-brand-accent w-5 h-5" />
              <span className="font-bold">{player.streak}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="text-brand-secondary fill-brand-secondary w-5 h-5" />
              <span className="font-bold">{player.xp} XP</span>
            </div>
            <button onClick={() => setShowThemeSelector(!showThemeSelector)} className="p-2 rounded-full hover:bg-black/5 transition-colors">
              <Palette className={`${currentTheme.accent} w-5 h-5`} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-6">
        {showThemeSelector && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${currentTheme.cardBg} border ${currentTheme.border} rounded-2xl p-4 mb-8 flex gap-4 overflow-x-auto`}
          >
            {(Object.keys(THEMES) as KingdomTheme[]).map(theme => (
              <button
                key={theme}
                onClick={() => changeTheme(theme)}
                className={`px-4 py-2 rounded-xl font-bold capitalize border-2 transition-all ${player.theme === theme ? 'border-brand-primary' : 'border-transparent hover:border-slate-300'}`}
              >
                {theme}
              </button>
            ))}
          </motion.div>
        )}

        {/* Daily Quests */}
        <div className="mb-8">
          <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
            <Calendar className={currentTheme.accent} /> Daily Quests
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {player.dailyQuests.map(quest => (
              <div key={quest.id} className={`${currentTheme.cardBg} border ${currentTheme.border} rounded-2xl p-4 relative overflow-hidden`}>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-sm">{quest.description}</p>
                    {quest.completed && <CheckCircle2 className="text-emerald-500 w-5 h-5" />}
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-xs opacity-60">{quest.progress} / {quest.target}</p>
                    <p className="text-xs font-bold text-brand-accent">+{quest.rewardXP} XP</p>
                  </div>
                </div>
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (quest.progress / quest.target) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2">
            <Map className={`${currentTheme.accent} w-6 h-6`} /> Your Kingdom
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {player.kingdom.length === 0 ? (
              <div className={`col-span-full py-12 text-center rounded-3xl border-2 border-dashed ${currentTheme.border} opacity-60`}>
                <p>Answer questions to build your kingdom!</p>
              </div>
            ) : (
              player.kingdom.map((building, i) => (
                <motion.div 
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  onClick={() => setSelectedBuildingIndex(i)}
                  className={`aspect-square ${currentTheme.cardBg} rounded-2xl flex flex-col items-center justify-center p-2 border ${currentTheme.border} cursor-pointer hover:scale-105 transition-transform relative`}
                >
                  <div className="absolute top-1 right-2 text-[10px] font-bold opacity-50">Lvl {building.level || 1}</div>
                  <span className="text-3xl mb-1">{building.buildingEmoji}</span>
                  <span className="text-[10px] text-center font-bold uppercase leading-tight opacity-80">
                    {building.buildingUnlocked}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Upgrade Modal */}
        <AnimatePresence>
          {selectedBuildingIndex !== null && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedBuildingIndex(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className={`${currentTheme.cardBg} border ${currentTheme.border} p-6 rounded-3xl max-w-sm w-full relative`}
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setSelectedBuildingIndex(null)}
                  className="absolute top-4 right-4 opacity-50 hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>
                
                {(() => {
                  const b = player.kingdom[selectedBuildingIndex];
                  const lvl = b.level || 1;
                  const cost = lvl * 100;
                  const canAfford = player.coins >= cost;
                  return (
                    <div className="text-center mt-4">
                      <div className="text-6xl mb-4">{b.buildingEmoji}</div>
                      <h3 className="text-2xl font-bold mb-1">{b.buildingUnlocked}</h3>
                      <p className="text-sm opacity-60 mb-6">Level {lvl} {b.category} Building</p>
                      
                      <div className="bg-black/10 rounded-xl p-4 mb-6">
                        <p className="font-bold mb-2">Passive Bonus:</p>
                        <p className="text-sm text-emerald-500">+{lvl * 5}% XP for {b.category} questions</p>
                        <p className="text-xs opacity-50 mt-2">Next level: +{(lvl + 1) * 5}% XP</p>
                      </div>

                      <button 
                        onClick={() => handleUpgrade(selectedBuildingIndex)}
                        disabled={!canAfford}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                          ${canAfford ? 'bg-brand-accent text-brand-dark hover:scale-105 shadow-lg' : 'bg-slate-200/10 text-slate-400 cursor-not-allowed'}
                        `}
                      >
                        <Coins className="w-5 h-5" /> Upgrade for {cost}
                      </button>
                    </div>
                  )
                })()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`${currentTheme.cardBg} border ${currentTheme.border} p-6 rounded-3xl flex flex-col items-center text-center`}>
            <div className="w-16 h-16 bg-brand-secondary/20 rounded-2xl flex items-center justify-center mb-4">
              <Brain className="text-brand-secondary w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Brain Training</h3>
            <p className="text-sm opacity-60 mb-6">Keep your mind sharp with personalized challenges.</p>
            <button 
              onClick={() => fetchNextQuestion()}
              disabled={loading}
              className="btn-secondary w-full flex items-center justify-center gap-2 mt-auto"
            >
              {loading ? "Loading..." : "Start"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className={`${currentTheme.cardBg} border ${currentTheme.border} p-6 rounded-3xl flex flex-col items-center text-center`}>
            <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl flex items-center justify-center mb-4">
              <LinkIcon className="text-brand-primary w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Logic Chains</h3>
            <p className="text-sm opacity-60 mb-6">Master patterns and sequences to unlock rewards.</p>
            <button 
              onClick={() => fetchNextQuestion()}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-auto"
            >
              {loading ? "Loading..." : "Solve"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className={`${currentTheme.cardBg} border ${currentTheme.border} p-6 rounded-3xl flex flex-col items-center text-center ${player.weakCategories.length === 0 ? 'opacity-50 grayscale' : ''}`}>
            <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4">
              <Target className="text-amber-500 w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Targeted Practice</h3>
            <p className="text-sm opacity-60 mb-6">
              {player.weakCategories.length > 0 
                ? `Review your weakest topics: ${player.weakCategories.join(', ')}` 
                : "You have no weak topics yet! Keep playing."}
            </p>
            <button 
              onClick={startTargetedPractice}
              disabled={loading || player.weakCategories.length === 0}
              className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform active:scale-95 w-full flex items-center justify-center gap-2 mt-auto disabled:hover:scale-100 disabled:active:scale-100"
            >
              {loading ? "Loading..." : "Practice"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <div className={`${currentTheme.cardBg} border-t ${currentTheme.border} fixed bottom-0 left-0 right-0 p-4 flex justify-around items-center transition-colors duration-500`}>
        <button className={`flex flex-col items-center gap-1 ${currentTheme.accent}`}>
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
          <Trophy className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Leaderboard</span>
        </button>
        <button className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Profile</span>
        </button>
        <button className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Settings</span>
        </button>
      </div>
    </div>
  );

  const renderPlaying = () => {
    if (!currentQuestion) return null;

    const isChain = currentQuestion.modeType === 'chain';
    const q = currentQuestion as any;

    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        {/* Game Header */}
        <div className="p-6 flex items-center justify-between">
          <button 
            onClick={() => setGameState('dashboard')}
            className="text-white/60 hover:text-white transition-colors"
          >
            Quit
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
              <Timer className={`w-5 h-5 ${timeLeft < 5 ? 'text-red-400 animate-pulse' : 'text-brand-accent'}`} />
              <span className="text-white font-mono font-bold text-xl">{timeLeft}s</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-full text-white font-bold">
              Q{player.questionNumber}
            </div>
          </div>
        </div>

        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
          <motion.div 
            key={player.questionNumber}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full"
          >
            <div className="text-center mb-8">
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 ${isChain ? 'bg-brand-primary text-white' : 'bg-brand-secondary text-white'}`}>
                {isChain ? 'ThinkChain Mode' : `CurioBrain: ${q.category}`}
              </span>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">
                {q.question}
              </h2>
              {isChain && q.sequence && (
                <div className="mt-6 flex justify-center gap-3">
                  {q.sequence.map((item: any, i: number) => (
                    <div key={i} className="w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white text-xl md:text-2xl font-bold border border-white/20">
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 w-full">
              {q.options.map((option: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={selectedOption !== null}
                  className={`p-5 rounded-2xl text-left font-bold text-lg transition-all flex items-center justify-between group
                    ${selectedOption === null 
                      ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10' 
                      : i === q.correctIndex 
                        ? 'bg-emerald-500 text-white border-emerald-400' 
                        : selectedOption === i 
                          ? 'bg-red-500 text-white border-red-400' 
                          : 'bg-white/5 text-white/30 border-white/5'
                    }
                  `}
                >
                  <span>{option}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                    ${selectedOption === null 
                      ? 'border-white/20 group-hover:border-white/50' 
                      : i === q.correctIndex 
                        ? 'border-white bg-white/20' 
                        : 'border-transparent'
                    }
                  `}>
                    {selectedOption !== null && i === q.correctIndex && <CheckCircle2 className="w-4 h-4" />}
                    {selectedOption === i && i !== q.correctIndex && <XCircle className="w-4 h-4" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setShowHint(true)}
                disabled={showHint || selectedOption !== null}
                className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors ${showHint ? 'text-brand-accent' : 'text-white/40 hover:text-white'}`}
              >
                <Lightbulb className="w-4 h-4" /> {showHint ? q.hint : "Need a hint?"}
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  };

  const renderFeedback = () => {
    if (!feedbackData) return null;
    const isCorrect = lastResult === 'correct';
    const isTimeout = lastResult === 'timeout';
    
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 max-w-md w-full"
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg
            ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}
          `}>
            {isCorrect ? <Trophy className="text-white w-10 h-10" /> : <AlertCircle className="text-white w-10 h-10" />}
          </div>

          <h2 className="text-3xl font-display font-bold mb-2 text-brand-dark">
            {isCorrect ? "Brilliant!" : isTimeout ? "Time's Up!" : "Not Quite!"}
          </h2>
          <p className="text-slate-600 mb-6">{feedbackData.feedback}</p>

          <div className="bg-slate-100 rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Explanation</p>
            <p className="text-sm text-slate-700 leading-relaxed">{feedbackData.explanation}</p>
            {feedbackData.funFact && (
              <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                <Info className="text-brand-secondary w-4 h-4 shrink-0" />
                <p className="text-xs italic text-slate-500">{feedbackData.funFact}</p>
              </div>
            )}
          </div>

          {isCorrect && feedbackData.kingdom && (
            <div className="bg-brand-secondary/10 rounded-2xl p-4 mb-6 flex items-center gap-4 text-left">
              <span className="text-4xl">{feedbackData.kingdom.buildingEmoji}</span>
              <div>
                <p className="text-xs font-bold text-brand-secondary uppercase">New Building!</p>
                <p className="font-bold text-brand-dark">{feedbackData.kingdom.buildingUnlocked}</p>
                <p className="text-[10px] text-slate-500">{feedbackData.kingdom.kingdomMessage}</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase">XP Gained</p>
              <p className="text-xl font-bold text-brand-primary">+{isCorrect ? (feedbackData.xp + feedbackData.xpBonus) : 0}</p>
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Streak</p>
              <p className="text-xl font-bold text-brand-accent">{player.streak}</p>
            </div>
          </div>

          <button 
            onClick={() => fetchNextQuestion(lastResult || 'none')}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? "Loading..." : "Next Challenge"} <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="font-sans antialiased">
      <AnimatePresence mode="wait">
        {gameState === 'onboarding' && renderOnboarding()}
        {gameState === 'dashboard' && renderDashboard()}
        {gameState === 'playing' && renderPlaying()}
        {gameState === 'feedback' && renderFeedback()}
      </AnimatePresence>
    </div>
  );
}
