const DATA = {
  user: {
    name: 'Mallanagouda P P',
    short: 'MP',
    grade: 10,
    board: 'CBSE',
    state: 'Karnataka',
    subject: 'Physics',
    rank: 'Top 5%',
    skillScore: 0,
    learningHours: 0,
    sessionCount: 0,
    confidence: { Physics: 0.10, Maths: 0.10, Chemistry: 0.10, Biology: 0.10 },
  },
  subjects: [
    { name: 'Physics', icon: '⚛️', color: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6' },
    { name: 'Maths', icon: '📐', color: '#8b5cf6', bg: '#f5f3ff', dot: '#8b5cf6' },
    { name: 'Chemistry', icon: '🧪', color: '#10b981', bg: '#f0fdf4', dot: '#10b981' },
    { name: 'Biology', icon: '🧬', color: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b' },
  ],
  recentTopics: [],
  weeklyActivity: [
    { day: 'M', h: 40 }, { day: 'T', h: 65 }, { day: 'W', h: 85 }, { day: 'T', h: 50 },
    { day: 'F', h: 100 }, { day: 'S', h: 30 }, { day: 'S', h: 20 },
  ],
  lessons: [
    {
      id: 'l1', subject: 'PHYSICS · MODULE 4', title: 'Laws of Motion',
      desc: "Master Newton's three laws with interactive AI-animated simulations.",
      module: 'Module 4 of 6 · 60% Complete', progress: 60,
      thumb: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&q=80',
    },
    {
      id: 'l2', subject: 'CHEMISTRY · MODULE 2', title: 'Organic Compounds',
      desc: 'Explore the carbon cycle and basic molecular structures with visual AI.',
      module: 'Module 2 of 5 · 35% Complete', progress: 35,
      thumb: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&q=80',
    },
    {
      id: 'l3', subject: 'MATHS · MODULE 3', title: 'Quadratic Equations',
      desc: 'Understand roots, discriminants, and real-world applications visually.',
      module: 'Module 3 of 8 · 80% Complete', progress: 80,
      thumb: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&q=80',
    },
  ],
  chatHistory: {
    Physics: [], Maths: [], Chemistry: [], Biology: [],
  },
  generationStages: [
    { label: 'Understanding your question', icon: '🧠' },
    { label: 'Retrieving NCERT curriculum context', icon: '📚' },
    { label: 'Building lesson blueprint (5 scenes)', icon: '📝' },
    { label: 'Animating with Manim engine', icon: '🎬' },
    { label: 'Generating narration & merging audio', icon: '🔊' },
  ],

  // ── UNDERSTANDING PREDICTOR DATA ──
  // Agent 2 — Vocabulary scores per subject (0–1 scale, scaled ×0.5 in formula)
  // Starting at 0.5 → contributes 0.25 to confidence (0.5 × 0.5)
  vocabularyScores: {
    Physics: 0.50,
    Maths: 0.50,
    Chemistry: 0.50,
    Biology: 0.50,
  },

  // Agent 1 — Subject affinity agent scores (0–0.5 scale).
  // Initialised by initAgentScores() after onboarding based on favourite subject.
  agentScores: {
    Physics: 0.10,
    Maths: 0.10,
    Chemistry: 0.10,
    Biology: 0.10,
  },

  // Accumulated action-chip deltas per subject (capped ±0.15)
  // Adjusted by: Simplify=−0.05, Go Deeper=+0.05, Add Example=+0.02
  // Also adjusted by Explanation Level buttons: Start From Scratch=−0.04, Just The Details=+0.04
  actionChipDelta: {
    Physics: 0,
    Maths: 0,
    Chemistry: 0,
    Biology: 0,
  },

  // ── SHADOW DEPLOYMENT: Auto-Guessing Mode ──
  // Tracks if a subject is evaluated by the Dual-Agent ('AgentModel') or by the LLM natively ('SelfGuessing')
  subjectModes: {
    Physics: 'AgentModel',
    Maths: 'AgentModel',
    Chemistry: 'AgentModel',
    Biology: 'AgentModel',
  },
  
  // Consecutive times the LLM native guess matched the Agent model within +/- 5
  calibrationStreaks: {
    Physics: 0,
    Maths: 0,
    Chemistry: 0,
    Biology: 0,
  },

  // Once graduated to 'SelfGuessing', this holds the score provided directly by the AI
  selfGuessedScores: {
    Physics: 0.10,
    Maths: 0.10,
    Chemistry: 0.10,
    Biology: 0.10,
  },

  // For evaluation ONLY - stores the most recent guess from the LLM for comparison
  lastLlmGuesses: {
    Physics: null,
    Maths: null,
    Chemistry: null,
    Biology: null,
  },

  // Subject relationship map for initAgentScores()
  subjectRelations: {
    Physics:   { Physics: 0.5, Maths: 0.3, Chemistry: 0.2, Biology: 0.1 },
    Maths:     { Maths: 0.5, Physics: 0.3, Chemistry: 0.2, Biology: 0.1 },
    Chemistry: { Chemistry: 0.5, Biology: 0.3, Physics: 0.2, Maths: 0.2 },
    Biology:   { Biology: 0.5, Chemistry: 0.3, Physics: 0.1, Maths: 0.1 },
  },

  // Legacy — kept so existing formula references don't break; no longer used in score calc
  subjectAffinity: {
    Physics: 0.10,
    Maths: 0.10,
    Chemistry: 0.10,
    Biology: 0.10,
  },
  predictionWeights: {
    vocabulary: 0.55,
    affinity: 0.30,
    recentTrend: 0.15,
  },
  recentTrend: {
    Physics: 0.00,
    Maths: 0.00,
    Chemistry: 0.00,
    Biology: 0.00,
  },

  historyItems: [],
};

// ── LOCALSTORAGE PERSISTENCE (per-user) ──
// Key is dynamic — reads current logged-in user from AUTH_SESSION_KEY
function getPersistKey() {
  try {
    const session = localStorage.getItem('vidscholar_session_v1');
    if (session) return `vidscholar_scores_v3_${session}`;
  } catch {}
  return 'vidscholar_scores_v3_guest';
}

function saveScoresToStorage() {
  try {
    const payload = {
      agentScores: DATA.agentScores,
      vocabularyScores: DATA.vocabularyScores,
      actionChipDelta: DATA.actionChipDelta,
      subjectAffinity: DATA.subjectAffinity,
      recentTrend: DATA.recentTrend,
      favoriteSubject: DATA.user.subject,
      userName: DATA.user.name,
      userGrade: DATA.user.grade,
      userBoard: DATA.user.board,
      userState: DATA.user.state,
      learningHours: DATA.user.learningHours,
      sessionCount: DATA.user.sessionCount,
      historyItems: DATA.historyItems.slice(0, 50),
      recentTopics: DATA.recentTopics.slice(0, 8),
      weeklyActivity: DATA.weeklyActivity,
      subjectModes: DATA.subjectModes,
      calibrationStreaks: DATA.calibrationStreaks,
      selfGuessedScores: DATA.selfGuessedScores,
      lastLlmGuesses: DATA.lastLlmGuesses,
      chatHistory: DATA.chatHistory,
      onboardingDone: true,
    };
    localStorage.setItem(getPersistKey(), JSON.stringify(payload));
  } catch(e) {
    console.warn('VidScholar: Failed to save scores to localStorage', e);
  }
}

function loadScoresFromStorage() {
  try {
    const raw = localStorage.getItem(getPersistKey());
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (payload.agentScores) Object.assign(DATA.agentScores, payload.agentScores);
    if (payload.vocabularyScores) Object.assign(DATA.vocabularyScores, payload.vocabularyScores);
    if (payload.actionChipDelta) Object.assign(DATA.actionChipDelta, payload.actionChipDelta);
    if (payload.subjectAffinity) Object.assign(DATA.subjectAffinity, payload.subjectAffinity);
    if (payload.recentTrend) Object.assign(DATA.recentTrend, payload.recentTrend);
    if (payload.favoriteSubject) DATA.user.subject = payload.favoriteSubject;
    if (payload.userName) DATA.user.name = payload.userName;
    if (payload.userGrade) DATA.user.grade = payload.userGrade;
    if (payload.userBoard) DATA.user.board = payload.userBoard;
    if (payload.userState) DATA.user.state = payload.userState;
    if (payload.learningHours != null) DATA.user.learningHours = payload.learningHours;
    if (payload.sessionCount != null) DATA.user.sessionCount = payload.sessionCount;
    if (payload.historyItems) DATA.historyItems = payload.historyItems;
    if (payload.recentTopics) DATA.recentTopics = payload.recentTopics;
    if (payload.weeklyActivity && Array.isArray(payload.weeklyActivity)) DATA.weeklyActivity = payload.weeklyActivity;
    if (payload.subjectModes) Object.assign(DATA.subjectModes, payload.subjectModes);
    if (payload.calibrationStreaks) Object.assign(DATA.calibrationStreaks, payload.calibrationStreaks);
    if (payload.selfGuessedScores) Object.assign(DATA.selfGuessedScores, payload.selfGuessedScores);
    if (payload.lastLlmGuesses) Object.assign(DATA.lastLlmGuesses, payload.lastLlmGuesses);
    if (payload.chatHistory) {
      Object.assign(DATA.chatHistory, payload.chatHistory);
    }
    return payload.onboardingDone === true;
  } catch(e) {
    console.warn('VidScholar: Failed to load scores from localStorage', e);
    return false;
  }
}

/**
 * Resets all DATA fields to defaults (used on logout / new user)
 */
function resetDataToDefaults() {
  DATA.user.name = '';
  DATA.user.grade = 10;
  DATA.user.board = 'CBSE';
  DATA.user.state = 'Karnataka';
  DATA.user.subject = 'Physics';
  DATA.user.learningHours = 0;
  DATA.user.sessionCount = 0;
  DATA.historyItems = [];
  DATA.recentTopics = [];
  DATA.chatHistory = { Physics: [], Maths: [], Chemistry: [], Biology: [] };
  DATA.weeklyActivity = [
    { day: 'M', h: 0 }, { day: 'T', h: 0 }, { day: 'W', h: 0 }, { day: 'T', h: 0 },
    { day: 'F', h: 0 }, { day: 'S', h: 0 }, { day: 'S', h: 0 },
  ];
  ['Physics', 'Maths', 'Chemistry', 'Biology'].forEach(s => {
    DATA.agentScores[s] = 0.10;
    DATA.vocabularyScores[s] = 0.50;
    DATA.actionChipDelta[s] = 0;
    DATA.subjectAffinity[s] = 0.10;
    DATA.recentTrend[s] = 0.00;
    DATA.subjectModes[s] = 'AgentModel';
    DATA.calibrationStreaks[s] = 0;
    DATA.selfGuessedScores[s] = 0.10;
    DATA.lastLlmGuesses[s] = null;
  });
}
