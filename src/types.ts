export type ModeType = 'curio' | 'chain';
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Genius';
export type Category = 'Science' | 'Math' | 'History' | 'Nature' | 'Technology';
export type ChainType = 'number_sequence' | 'letter_pattern' | 'word_chain' | 'logic_deduction' | 'odd_one_out' | 'analogy' | 'visual_pattern';
export type KingdomTheme = 'classic' | 'neon' | 'fantasy' | 'space' | 'night';

export interface KingdomBuilding {
  buildingUnlocked: string;
  buildingEmoji: string;
  kingdomMessage: string;
  kingdomPower: number;
  category: Category;
  level: number;
}

export interface DailyQuest {
  id: string;
  type: 'questions_answered' | 'correct_answers' | 'streak';
  description: string;
  target: number;
  progress: number;
  rewardXP: number;
  completed: boolean;
  date: string;
}

export interface QuestionResponse {
  modeType: 'curio';
  category: Category;
  difficulty: Difficulty;
  timeLimit: number;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
  funFact: string;
  xp: number;
  iqSkill: string;
  feedback: string;
  xpBonus: number;
  kingdom: KingdomBuilding;
}

export interface ChainResponse {
  modeType: 'chain';
  title: string;
  type: ChainType;
  difficulty: Difficulty;
  timeLimit: number;
  sequence: (string | number)[] | null;
  question: string;
  options: string[];
  correctAnswer: string;
  correctIndex: number;
  hint: string;
  rule: string;
  explanation: string;
  xp: number;
  iqSkill: string;
  feedback: string;
  xpBonus: number;
}

export type AIResponse = QuestionResponse | ChainResponse;

export interface PlayerState {
  age: number;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  questionNumber: number;
  kingdom: KingdomBuilding[];
  accuracyRate: number;
  totalQuestions: number;
  correctQuestions: number;
  weakCategories: Category[];
  lastCategory?: Category;
  theme: KingdomTheme;
  dailyQuests: DailyQuest[];
  lastPlayDate: string;
}

export interface AIRequest {
  requestType: 'question' | 'chain';
  playerAge: number;
  playerLevel: number;
  currentStreak: number;
  totalXP: number;
  lastResult: 'correct' | 'wrong' | 'timeout';
  lastCategory: Category | string;
  weakCategories: Category[];
  questionNumber: number;
  accuracyRate: number;
  practiceMode?: boolean;
  forceCategory?: Category;
}
