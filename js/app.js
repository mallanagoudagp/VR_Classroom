// ── BOOT guard — prevents double render ──
let _bootDone = false;
function _boot() {
  if (_bootDone) return;
  _bootDone = true;
  const restored = loadScoresFromStorage();
  if (restored) console.log('✅ VidScholar: Scores restored from localStorage');
  
  // SPA Routing Fallback
  const path = window.location.pathname;
  if (path === '/dashboard') state.page = 'dashboard';
  else if (path === '/chat') state.page = 'chat';
  else if (path === '/lesson') state.page = 'lesson';
  else if (path === '/history') state.page = 'history';
  else if (path === '/settings') state.page = 'settings';
  else if (path === '/teacher') { state.page = 'teacher'; state.role = 'teacher'; }

  window.addEventListener('popstate', () => {
    const p = window.location.pathname.replace(/^\//, '') || 'onboarding';
    state.page = p;
    render(true);
  });

  render();
}
document.addEventListener('DOMContentLoaded', _boot);

const state = {
  page: 'onboarding', // onboarding | dashboard | chat | lesson | teacher | history | settings
  obStep: 1,
  obBoard: '', obGrade: '', obState: '', obSubject: '',
  activeSubject: 'Physics',
  chatSubject: 'General',
  isGenerating: false,
  genStage: 0,
  videoPlaying: false,
  videoProgress: 68,
  activeLesson: null,
  viewMode: 'Executive Summary',
  diffLevel: 'Auto',
  role: 'student',
  // Tracks AI-recommended follow-up questions to prevent vocab agent inflation
  lastFollowUps: [],
};

// ── ICONS ──
const icons = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  lessons: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  teacher: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  help: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  play: `▶`, pause: `⏸`, star: `★`,
};

// ── DUAL-AGENT UNDERSTANDING ENGINE ──
// Agent 1 (agentScores): Subject affinity — max 0.5, set at onboarding from favourite subject
// Agent 2 (vocabularyScores): Vocabulary mastery — 0–1, scaled ×0.5 = max 0.5
// actionChipDelta: accumulated delta from Go Deeper/Simplify/level buttons
// Combined confidence = clamp(Agent1 + Agent2 + clampedDelta, 0, 1)
function calcUnderstandingScore(subject) {
  // ── SHADOW DEPLOYMENT: Direct Bypass ──
  if (DATA.subjectModes && DATA.subjectModes[subject] === 'SelfGuessing') {
    return DATA.selfGuessedScores[subject] ?? 0.10;
  }

  const agent1   = DATA.agentScores[subject]      ?? 0.1;  // 0–0.5
  const vocabRaw = DATA.vocabularyScores[subject] ?? 0.5;  // 0–1
  const agent2   = vocabRaw * 0.5;                          // scale to 0–0.5
  const base     = agent1 + agent2;                         // 0–1 without chip

  const rawDelta = DATA.actionChipDelta[subject] ?? 0;
  // Re-clamp delta against CURRENT base every time we read it:
  //   floor: delta can't push score below 0  → delta >= -base
  //   ceil:  delta can't push score above 1  → delta <= (1 - base)
  //   design limit: ±0.15
  const safeDelta = Math.max(-base, Math.min(1 - base, rawDelta));
  safeDelta !== rawDelta && (DATA.actionChipDelta[subject] = Math.round(safeDelta * 100) / 100);

  return Math.max(0, Math.min(1, base + safeDelta));
}

// Initialise Agent 1 scores from favourite subject after onboarding
function initAgentScores(favoriteSubject) {
  const relations = DATA.subjectRelations[favoriteSubject];
  if (!relations) return;
  Object.keys(DATA.agentScores).forEach(subj => {
    DATA.agentScores[subj] = relations[subj] ?? 0.1;
    // Sync legacy subjectAffinity so sidebar % stays consistent
    DATA.subjectAffinity[subj] = relations[subj] ?? 0.1;
  });
  saveScoresToStorage();
  console.log('🤖 Agent 1 scores initialised for favourite:', favoriteSubject, DATA.agentScores);
}

function getConfidenceLabel(score) {
  if (score >= 0.75) return { label: 'Excellent', color: '#10b981', bg: '#d1fae5', emoji: '🟢' };
  if (score >= 0.55) return { label: 'Good', color: '#3b82f6', bg: '#dbeafe', emoji: '🔵' };
  if (score >= 0.40) return { label: 'Developing', color: '#f59e0b', bg: '#fef3c7', emoji: '🟡' };
  return { label: 'Needs Attention', color: '#ef4444', bg: '#fee2e2', emoji: '🔴' };
}

function getOverallUnderstanding() {
  const subjects = DATA.subjects.map(s => s.name);
  const scores = subjects.map(s => calcUnderstandingScore(s));
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function renderRadialGauge(score, size = 90, strokeWidth = 8) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score);
  const conf = getConfidenceLabel(score);
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="radial-gauge">
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="var(--gray-200)" stroke-width="${strokeWidth}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${conf.color}" stroke-width="${strokeWidth}"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
        transform="rotate(-90 ${size / 2} ${size / 2})" class="gauge-fill"/>
      <text x="${size / 2}" y="${size / 2 + 1}" text-anchor="middle" dominant-baseline="middle"
        font-family="var(--font-d)" font-size="${size > 70 ? 18 : 14}" font-weight="800" fill="${conf.color}">
        ${Math.round(score * 100)}%
      </text>
    </svg>`;
}

function renderUnderstandingPredictor() {
  const overall = getOverallUnderstanding();
  const overallConf = getConfidenceLabel(overall);

  const subjectRows = DATA.subjects.map(s => {
    const vocab = DATA.vocabularyScores[s.name] || 0;  // raw 0–1
    const affinity = DATA.agentScores[s.name] || 0;    // Agent 1, 0–0.5
    const score = calcUnderstandingScore(s.name);
    const conf = getConfidenceLabel(score);
    const trend = DATA.recentTrend[s.name] || 0;
    const trendIcon = trend > 0.05 ? '↗' : trend < -0.05 ? '↘' : '→';
    const trendColor = trend > 0.05 ? 'var(--success)' : trend < -0.05 ? 'var(--error)' : 'var(--gray-400)';
    const mode = DATA.subjectModes?.[s.name] || 'AgentModel';
    const streak = DATA.calibrationStreaks?.[s.name] || 0;
    const lastGuess = DATA.lastLlmGuesses?.[s.name] != null ? (DATA.lastLlmGuesses[s.name] + '%') : 'N/A';
    
    const modeBadge = mode === 'SelfGuessing' 
      ? `<span style="font-size:10px;background:#10b981;color:#fff;padding:2px 6px;border-radius:4px;margin-left:8px;font-weight:700">★ AUTO-GUESS</span>`
      : `<span style="font-size:10px;background:#64748b;color:#fff;padding:2px 6px;border-radius:4px;margin-left:8px;font-weight:700">AGENT (STREAK: ${streak}/3)</span>`;

    return `
      <div class="up-row">
        <div class="up-subj">
          <span class="up-icon" style="background:${s.bg}">${s.icon}</span>
          <div style="display:flex;flex-direction:column">
            <span class="up-name" style="font-weight:700;display:flex;align-items:center">${s.name} ${modeBadge}</span>
            <span style="font-size:11px;color:var(--gray-500);margin-top:2px">
              <b>Evaluation:</b> LLM Guess: <span style="color:var(--primary-600)">${lastGuess}</span> | Agent Calc: <span style="color:var(--secondary-600)">${Math.round(score * 100)}%</span>
            </span>
          </div>
        </div>
        <div class="up-cell">
          <div class="up-mini-bar"><div class="up-mini-fill" style="width:${Math.round(vocab * 50)}%;background:${s.color}"></div></div>
          <span class="up-val">${(vocab * 0.5).toFixed(2)}</span>
        </div>
        <div class="up-cell">
          <div class="up-mini-bar"><div class="up-mini-fill" style="width:${Math.round(affinity * 100)}%;background:${s.color}"></div></div>
          <span class="up-val">${(affinity).toFixed(2)}</span>
        </div>
        <div class="up-cell up-score">
          <span class="up-badge" style="background:${conf.bg};color:${conf.color}">${conf.emoji} ${(score).toFixed(2)}</span>
          <span class="up-trend" style="color:${trendColor}">${trendIcon}</span>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="understanding-card fade-in">
      <div class="up-header">
        <div class="up-header-left">
          <h3 class="up-title">🧠 Understanding Predictor</h3>
          <p class="up-subtitle">Confidence score combining vocabulary mastery & subject affinity</p>
        </div>
        <div class="up-overall">
          ${renderRadialGauge(overall, 96, 8)}
          <div class="up-overall-label">
            <span class="up-overall-tag" style="background:${overallConf.bg};color:${overallConf.color}">${overallConf.label}</span>
            <span class="up-overall-hint">Overall</span>
          </div>
        </div>
      </div>

      <div class="up-table">
        <div class="up-row up-header-row">
          <div class="up-subj">Subject</div>
          <div class="up-cell">Vocab Score <span class="up-weight">(Agent 2 ×0.5)</span></div>
          <div class="up-cell">Agent Score <span class="up-weight">(Agent 1, 0–0.5)</span></div>
          <div class="up-cell">Confidence</div>
        </div>
        ${subjectRows}
      </div>

      <div class="up-formula">
        <div class="up-formula-label">📐 Dual-Agent Formula</div>
        <code class="up-formula-code">confidence = Agent1(0–0.5) + Agent2(vocab×0.5) + chipDelta(±0.15)</code>
      </div>

      <div class="up-insight">
        <span class="up-insight-icon">💡</span>
        <p>${overall >= 0.7
      ? `Strong understanding predicted! ${DATA.user.name.split(' ')[0]} shows excellent vocabulary-concept alignment in their favorite subjects.`
      : overall >= 0.5
        ? `Moderate understanding — vocabulary gaps in some subjects. Consider targeted vocabulary-building exercises.`
        : `Understanding needs boosting. Focus on domain-specific vocabulary before introducing complex concepts.`
    }</p>
      </div>
    </div>`;
}

// ── RENDER ──
function render(skipHistory = false) {
  const app = document.getElementById('app');
  
  if (!skipHistory) {
      if (state.page === 'onboarding') window.history.pushState({}, '', '/');
      else window.history.pushState({}, '', '/' + state.page);
  }

  if (state.page === 'onboarding') { app.innerHTML = renderOnboarding(); bindOnboarding(); return; }
  app.innerHTML = renderShell(getPageContent());
  bindNav(); bindPage();
}

function renderShell(content) {
  const u = DATA.user;
  let navItems;
  if (state.role === 'student') {
    navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
      { id: 'chat', label: 'Ask AI', icon: icons.lessons },
      { id: 'lesson', label: 'My Lessons', icon: icons.lessons },
      { id: 'history', label: 'History', icon: icons.history },
      { id: 'settings', label: 'Settings', icon: icons.settings },
    ];
  } else {
    navItems = [
      { id: 'teacher', label: 'Class Overview', icon: icons.teacher },
    ];
  }
  const subjConf = DATA.user.confidence;
  return `
  <div class="shell">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <h1>VidScholar</h1>
        <p>AI Micro-Lecture Generator</p>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(n => `
          <div class="nav-item ${state.page === n.id ? 'active' : ''}" data-page="${n.id}">
            ${n.icon}<span>${n.label}</span>
          </div>`).join('')}
        ${state.role === 'student' ? `<div class="nav-lbl">Subjects</div>
        ${DATA.subjects.map(s => `
          <div class="subj-item ${state.chatSubject === s.name ? 'active' : ''}" data-subj="${s.name}">
            <span class="subj-dot" style="background:${s.dot}"></span>${s.icon} ${s.name}
            <span style="margin-left:auto;font-size:10px;color:var(--gray-500)">${Math.round(calcUnderstandingScore(s.name) * 100)}%</span>
          </div>`).join('')}` : ''}
      </nav>
      <div class="sidebar-user" style="flex-direction:column;align-items:flex-start;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div class="avatar" style="background:${state.role === 'teacher' ? 'var(--secondary)' : 'var(--primary-600)'}">${state.role === 'teacher' ? 'T' : u.short}</div>
          <div class="user-info">
            <h4>${state.role === 'teacher' ? 'Educator View' : u.name}</h4>
            <p>${state.role === 'teacher' ? 'Admin Access' : `Class ${u.grade} · ${u.board}`}</p>
          </div>
        </div>
        <button id="role-toggle-btn" style="width:100%;padding:6px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#94a3b8;border-radius:6px;cursor:pointer;font-size:11px">
          Switch to ${state.role === 'student' ? 'Teacher' : 'Student'} Role
        </button>
      </div>
    </aside>
    <div class="main">
      ${renderTopbar()}
      ${content}
    </div>
  </div>
  <div class="fab" id="fab-chat" title="Ask AI">🤖</div>`;
}

function renderTopbar() {
  const breadMap = { dashboard: 'Dashboard', chat: 'Ask AI', lesson: 'My Lessons', history: 'History', teacher: 'Teacher View', settings: 'Settings' };
  return `
  <div class="topbar">
    <div class="breadcrumb">
      <span>${DATA.user.board} Board</span><span class="sep">›</span>
      <span>Class ${DATA.user.grade}</span><span class="sep">›</span>
      <span class="cur">${breadMap[state.page] || state.page}</span>
    </div>
    <div class="topbar-right">
      <span class="topbar-greet">Welcome back, <b>${DATA.user.name.split(' ')[0]}</b>!</span>
      <div class="icon-btn notif-wrap">${icons.bell}</div>
      <div class="icon-btn">${icons.help}</div>
    </div>
  </div>`;
}

function getPageContent() {
  switch (state.page) {
    case 'dashboard': return `<div class="page fade-in">${renderDashboard()}</div>`;
    case 'chat': return renderChat();
    case 'lesson': return renderLesson();
    case 'teacher': return `<div class="page fade-in">${renderTeacher()}</div>`;
    case 'history': return `<div class="page fade-in">${renderHistory()}</div>`;
    case 'settings': return `<div class="page fade-in">${renderSettings()}</div>`;
    default: return `<div class="page fade-in">${renderDashboard()}</div>`;
  }
}

// ── ONBOARDING ──
function renderOnboarding() {
  const steps = [`
    <div class="ob-step fade-in">
      <h2>Welcome to VidScholar</h2>
      <p class="sub">Set up your learning profile in 30 seconds — no registration needed.</p>
      <div class="form-grp"><label class="form-lbl">State</label>
        <select class="form-sel" id="ob-state">
          <option value="">Select State</option>
          ${['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Telangana', 'Delhi', 'Rajasthan', 'Gujarat', 'West Bengal'].map(s => `<option>${s}</option>`).join('')}
        </select></div>
      <div class="form-grp"><label class="form-lbl">Board / Curriculum</label>
        <select class="form-sel" id="ob-board">
          <option value="">Select Board</option>
          ${['CBSE', 'KSEEB (Karnataka)', 'Maharashtra SSC', 'Tamil Nadu State Board', 'ICSE', 'IB'].map(b => `<option>${b}</option>`).join('')}
        </select></div>
      <div class="form-grp"><label class="form-lbl">Grade / Class</label>
        <select class="form-sel" id="ob-grade">
          <option value="">Select Grade</option>
          ${[4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => `<option>Class ${g}</option>`).join('')}
        </select></div>
    </div>`,
  `<div class="ob-step fade-in">
      <h2>Pick your favourite subject</h2>
      <p class="sub">This seeds your learning profile. We'll adapt explanations to your level automatically.</p>
      <div class="subj-grid">
        ${DATA.subjects.map(s => `
          <div class="subj-card ${state.obSubject === s.name ? 'sel' : ''}" data-subj="${s.name}" tabindex="0" role="button">
            <div class="icon">${s.icon}</div>
            <h3>${s.name}</h3>
            <p>Tap to select</p>
          </div>`).join('')}
      </div>
    </div>`,
  `<div class="ob-step fade-in">
      <div class="ob-success">
        <div class="success-ring">🎓</div>
        <h2 style="font-size:22px;font-weight:800;color:var(--gray-900);margin-bottom:8px">You're all set!</h2>
        <p style="font-size:14px;color:var(--gray-500);margin-bottom:24px">Your profile is ready. Ask any question and get a personalized animated video explanation.</p>
        <div style="background:var(--primary-50);border-radius:12px;padding:16px;text-align:left;margin-bottom:24px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--primary-600);margin-bottom:8px">Your Profile</div>
          <div style="font-size:13px;color:var(--gray-700);display:flex;flex-direction:column;gap:4px">
            <span>🎓 ${state.obBoard || 'CBSE'} · ${state.obGrade || 'Class 10'}</span>
            <span>📍 ${state.obState || 'Karnataka'}</span>
            <span>⭐ Favourite: ${state.obSubject || 'Physics'}</span>
            <span>🎯 Starting level: Intermediate</span>
          </div>
        </div>
      </div>
    </div>`
  ];
  return `
  <div class="ob-page">
    <div style="position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,0.12) 0%,transparent 70%);top:-150px;right:-100px;pointer-events:none"></div>
    <div style="position:absolute;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%);bottom:-80px;left:-50px;pointer-events:none"></div>
    <div class="ob-card">
      <div class="ob-brand">
        <h1>VidScholar</h1>
        <p>AI-Powered Animated Video Learning</p>
      </div>
      <div class="step-dots">
        ${[1, 2, 3].map(i => `<div class="step-dot ${i === state.obStep ? 'active' : ''}"></div>`).join('')}
      </div>
      ${steps[state.obStep - 1]}
      <button class="btn btn-primary btn-lg" id="ob-next" style="width:100%;margin-top:8px">
        ${state.obStep < 3 ? 'Continue →' : 'Start Learning 🚀'}
      </button>
      ${state.obStep > 1 ? `<button class="btn btn-ghost" id="ob-back" style="width:100%;margin-top:8px">← Back</button>` : ''}
    </div>
  </div>`;
}

function bindOnboarding() {
  document.getElementById('ob-next')?.addEventListener('click', () => {
    if (state.obStep === 1) {
      state.obState = document.getElementById('ob-state')?.value;
      state.obBoard = document.getElementById('ob-board')?.value;
      state.obGrade = document.getElementById('ob-grade')?.value;
      if (!state.obState || !state.obBoard || !state.obGrade) {
        alert("Please select your State, Board, and Grade to continue.");
        return;
      }
    }
    if (state.obStep < 3) {
      state.obStep++;
      render();
    } else {
      // User finishes onboarding
      DATA.user.state = state.obState || 'Karnataka';
      DATA.user.board = state.obBoard || 'CBSE';
      DATA.user.grade = state.obGrade || 'Class 10';
      if (state.obSubject) {
        DATA.user.subject = state.obSubject;
        // Initialise dual-agent scores based on favourite subject
        initAgentScores(state.obSubject);
      } else {
        // Default to Physics if user skipped subject pick
        initAgentScores('Physics');
      }
      state.page = 'dashboard';
      render();
    }
  });
  document.getElementById('ob-back')?.addEventListener('click', () => { state.obStep--; render(); });
  document.querySelectorAll('.ob-step .subj-card').forEach(el => {
    const handleSelect = () => {
      state.obSubject = el.dataset.subj;
      render();
      // Scroll to bottom so the Continue button is visible
      setTimeout(() => {
        const obPage = document.querySelector('.ob-page');
        if (obPage) obPage.scrollTop = obPage.scrollHeight;
      }, 50);
    };
    el.addEventListener('click', handleSelect);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(); }
    });
  });
}

// ── DASHBOARD ──
function renderDashboard() {
  const u = DATA.user;
  const days = DATA.weeklyActivity;
  const maxH = Math.max(...days.map(d => d.h));
  return `
  <div class="hero">
    <h2>What would you like to learn today?</h2>
    <div class="hero-bar">
      <span style="font-size:18px;color:var(--primary-500)">✨</span>
      <input class="hero-inp" id="hero-q" placeholder="Ask about your subject..." />
      <div class="hero-mid">
        <button class="hero-icon-btn" id="hero-mic" title="Use Voice Input">${icons.mic}</button>
        <button class="hero-icon-btn" id="hero-cam" title="Upload Image">${icons.camera}</button>
      </div>
      <button class="ask-btn" id="hero-ask">Ask AI</button>
    </div>
    <div class="hero-chips">
      ${['Why does gravity vary?', 'What is photosynthesis?', 'Quadratic formula?', 'Ohm\'s Law explained'].map(q => `<span class="chip" data-q="${q}">${q}</span>`).join('')}
    </div>
    ${state.heroAnswerLoading ? `
      <div class="hero-answer-card fade-in" style="margin-top:16px;background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);display:flex;align-items:center;gap:12px">
        <div class="spinner"></div><span style="color:#64748b;font-size:14px">Thinking...</span>
      </div>` : ''}
    ${state.heroAnswer ? `
      <div class="hero-answer-card fade-in" style="margin-top:16px;background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="font-size:20px">🤖</div><span style="font-weight:700;color:#0f172a;font-size:16px">VidScholar Omni-Model</span>
        </div>
        <div style="font-size:14.5px;color:#334155;line-height:1.6">
          ${state.heroAnswer.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}
        </div>
      </div>` : ''}
  </div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-lbl">Skill Level</div>
      <div class="score-big">${u.skillScore}<span>/100</span></div>
      <div class="score-sub">🏆 ${u.rank} of your class</div>
      <div class="prog-track"><div class="prog-fill" style="width:${u.skillScore}%"></div></div>
      <div class="bar-labels"><span>Beginner</span><span>Expert</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Recent Topics</div>
      ${DATA.recentTopics.map(t => `
        <div class="topic-row">
          <div class="topic-left">
            <div class="t-icon" style="background:${t.iconBg}">${t.icon}</div>
            <div><div class="t-name">${t.name}</div><div class="t-time">${t.time}</div></div>
          </div>
          <div style="text-align:right">
            <div class="t-pct">${t.pct === 100 ? '✓' : t.pct + '%'}</div>
            <div style="font-size:10px;color:${t.status === 'Mastered' ? 'var(--success)' : 'var(--warning)'}">${t.status}</div>
          </div>
        </div>`).join('')}
    </div>
    <div class="stat-card">
      <div class="stat-lbl">Weekly Activity</div>
      <div class="chart-bars">
        ${days.map((d, i) => `
          <div class="bar-col">
            <div class="b ${i === 4 ? 'on' : ''}" style="height:${Math.round((d.h / maxH) * 100)}%"></div>
            <span class="bar-day">${d.day}</span>
          </div>`).join('')}
      </div>
      <div class="learn-time">
        <span style="font-size:22px">⏱</span>
        <div><div class="learn-val">${u.learningHours}h</div><div class="learn-sub">Learning Time</div></div>
      </div>
    </div>
  </div>

  ${renderUnderstandingPredictor()}

  <div class="quiz-banner">
    <h3>🏆 Quiz Championship</h3>
    <p>Test your knowledge in Science and win achievement badges!</p>
    <button class="btn btn-primary btn-sm">Start Quiz</button>
  </div>

  <div class="sec-hd">
    <span class="sec-title">Continue Learning</span>
    <button class="btn btn-ghost btn-sm" data-page="lesson">View All →</button>
  </div>
  <div class="lessons-grid">
    ${DATA.lessons.map(l => `
      <div class="lcard" data-lesson="${l.id}">
        <div class="lcard-thumb">
          <img class="lcard-thumb-bg" src="${l.thumb}" alt="${l.title}" loading="lazy">
          <div class="lcard-overlay"></div>
          <span class="lcard-badge">AI Animated</span>
        </div>
        <div class="lcard-body">
          <div class="lcard-subj">${l.subject}</div>
          <div class="lcard-title">${l.title}</div>
          <div class="lcard-desc">${l.desc}</div>
          <div class="prog-track" style="margin-bottom:12px"><div class="prog-fill ${l.progress >= 80 ? 'green' : l.progress >= 50 ? '' : ''}" style="width:${l.progress}%"></div></div>
          <button class="btn btn-primary" style="width:100%">Resume Lesson</button>
        </div>
      </div>`).join('')}
  </div>`;
}

// ── CHAT ──
function renderChat() {
  const msgs = DATA.chatHistory[state.chatSubject] || [];
  const subj = DATA.subjects.find(s => s.name === state.chatSubject);
  return `
  <div class="chat-layout">
    <div class="chat-header">
      <div class="subj-tabs">
        ${DATA.subjects.map(s => `<div class="stab ${state.chatSubject === s.name ? 'active' : ''}" data-tab="${s.name}">${s.icon} ${s.name}</div>`).join('')}
      </div>
    </div>
    <div class="chat-msgs" id="chat-msgs">
      ${msgs.length === 0 ? `
        <div style="text-align:center;padding:40px 20px;color:var(--gray-400)">
          <div style="font-size:48px;margin-bottom:14px">${subj?.icon || '💬'}</div>
          <div style="font-size:16px;font-weight:700;color:var(--gray-700);margin-bottom:6px">Ask anything about ${state.chatSubject}</div>
          <div style="font-size:13px">Type your question and get a personalized animated video explanation</div>
        </div>`:
      msgs.map(m => m.type === 'user' ? renderUserMsg(m) : renderAIMsg(m)).join('')}
      ${state.isGenerating ? renderGenerating() : ''}
    </div>
    <div class="chat-input-wrap">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
        <span class="diff-lbl">Explanation Level:</span>
        <div class="diff-sel">
          ${['🤖 Auto', '🌱 Start from scratch', '📖 Give me the concept', '⚡ Just the details'].map(d => {
        const val = d.slice(3).trim();
        const isAuto = d.includes('Auto');
        const isActive = state.diffLevel === (isAuto ? 'Auto' : val);
        return `<button class="diff-btn ${isActive ? 'active' : ''}" data-diff="${isAuto ? 'Auto' : val}">${d}</button>`;
      }).join('')}
        </div>
      </div>
      <div class="input-bar">
        <button class="icon-btn" id="chat-mic" style="background:none;border:none;color:var(--gray-500);cursor:pointer;padding:8px" title="Use Voice Input">${icons.mic}</button>
        <button class="icon-btn" id="chat-cam" style="background:none;border:none;color:var(--gray-500);cursor:pointer;padding:8px" title="Upload Image">${icons.camera}</button>
        <textarea class="inp-txt" id="chat-inp" rows="1" placeholder="Ask about ${state.chatSubject}..."></textarea>
        <button class="btn btn-primary btn-sm" id="chat-send" style="border-radius:10px;padding:8px 16px">${icons.send} Send</button>
      </div>
    </div>
  </div>`;
}

function renderUserMsg(m) {
  let imgHtml = m.imageUrl ? `<img src="${m.imageUrl}" style="max-width:240px;max-height:160px;object-fit:contain;border-radius:10px;margin-bottom:8px;display:block">` : '';
  let txtHtml = m.text ? `<div>${m.text}</div>` : '';
  const bubbleStyle = (!m.text && m.imageUrl) ? 'background:transparent;padding:0;box-shadow:none' : '';
  return `<div class="msg-user fade-in"><div class="msg-bubble" style="${bubbleStyle}">${imgHtml}${txtHtml}</div></div>`;
}

let _canvasCounter = 0;
function renderAIMsg(m) {
  // Handle simple text-only conversational messages
  if (m.text && !m.blueprint && !m.topicId && !m.concept) {
    return `
    <div class="msg-ai fade-in">
      <div class="msg-ai-hd">
        <div class="ai-ava">🤖</div>
        <span class="ai-lbl">VidScholar AI</span>
      </div>
      <div style="padding:12px 16px; font-size:14px; color:var(--gray-800); background:#fff; border-radius:12px; border:1px solid var(--gray-200); display:inline-block; margin-top:8px; line-height: 1.5;">
        ${m.text}
      </div>
    </div>`;
  }

  const hasScenes = m.blueprint && m.blueprint.scenes && m.blueprint.scenes.length > 0;
  const vocabConf = m.vocabScore != null ? Math.round(m.vocabScore * 100) : 92;
  const playerId = m.canvasId || ('manim-video-canvas-' + (++_canvasCounter));

  return `
  <div class="msg-ai fade-in">
    <div class="msg-ai-hd">
      <div class="ai-ava">🤖</div>
      <span class="ai-lbl">VidScholar AI · ${m.level} Level</span>
      <span class="badge badge-live" style="margin-left:8px">● MANIM</span>
      ${hasScenes ? '<span class="badge" style="margin-left:6px;background:#10b981;color:#fff;font-size:10px;padding:2px 8px;border-radius:8px">🎬 ANIMATED</span>' : ''}
    </div>
    <div class="vcard">
      <div class="vplayer">
        <div class="manim-canvas anim-player-wrap" id="manim-canvas">
          ${hasScenes
      ? `<canvas id="${playerId}" class="manim-video-canvas"></canvas>`
      : (m.blueprint ? generateDynamicManimSVG(m.blueprint) : (m.topicId ? generateManimForTopic(m.topicId) : generateManimForTopic('gravity')))
    }
          <span class="manim-label">🎬 Groq LLM + Manim Engine</span>
          <span class="confidence-badge">✓ Vocab: ${vocabConf}%</span>
        </div>
        ${hasScenes ? `
        <div class="anim-controls">
          <button class="anim-play-btn" id="anim-play-btn" title="Play/Pause">▶</button>
          <div class="anim-progress" id="anim-progress">
            <div class="anim-progress-fill" id="anim-progress-fill"></div>
          </div>
          <span class="anim-time" id="anim-time">0:00 / ${m.duration || '0:45'}</span>
          <span class="anim-scene-label" id="anim-scene-label">Scene 1/${m.blueprint.scenes.length}</span>
          <div class="anim-speed-group">
            <button class="spd-btn" data-speed="0.75">0.75x</button>
            <button class="spd-btn active-spd" data-speed="1">1x</button>
            <button class="spd-btn" data-speed="1.5">1.5x</button>
          </div>
        </div>` : ''}
      </div>
      <div class="action-row">
        <button class="achip">🔁 Simplify Explanation</button>
        <button class="achip">📈 Go Deeper</button>
        <button class="achip">➕ Add Example</button>
        <button class="achip" id="replay-btn">🔄 Replay</button>
      </div>
      <div style="padding:12px 16px;background:var(--gray-50);border-bottom:1px solid var(--gray-100)">
        <div style="font-size:12px;font-weight:700;color:var(--gray-700);margin-bottom:8px">📌 Key Concepts</div>
        ${(m.keyPoints || []).map(k => `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;font-size:12.5px;color:var(--gray-600)"><span style="color:var(--primary-500);font-weight:700;flex-shrink:0">•</span>${k}</div>`).join('')}
      </div>
      <div style="padding:12px 16px;font-size:13px;color:var(--gray-600);line-height:1.6;border-bottom:1px solid var(--gray-100)">${m.concept || ''}</div>
      ${m.vocabAnalysis ? `<div style="padding:10px 16px;background:linear-gradient(135deg,rgba(59,130,246,0.05),rgba(139,92,246,0.05));border-bottom:1px solid var(--gray-100)">
        <div style="font-size:11px;font-weight:700;color:var(--primary-600);margin-bottom:4px">🧠 Vocabulary Analysis of Your Prompt
          ${m.vocabAnalysis.isSuggested ? `<span style="margin-left:8px;background:#f59e0b;color:#fff;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:700">⚡ SUGGESTED — Score Not Updated</span>` : ''}
        </div>
        <div style="font-size:12px;color:var(--gray-600)">
          ${m.vocabAnalysis.isSuggested
            ? `This was an AI-recommended question. Vocabulary scoring was <b>skipped</b> to keep your profile accurate.`
            : `Detected <b>${m.vocabAnalysis.totalHits || 0}</b> domain terms (${m.vocabAnalysis.level}) · Score: <b>${(m.vocabScore || 0).toFixed(2)}</b>`
          }
        </div>
      </div>` : ''}
      <div style="padding:10px 16px;background:var(--gray-50);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:12px;color:var(--gray-400);font-style:italic;flex-shrink:0">💡 Try next:</span>
        ${m.followUp && m.followUp !== 'Did this help? Ask a follow-up.' && m.followUp !== 'Ask a follow-up question!' ? `
          <button class="follow-up-chip" data-followup="${m.followUp.replace(/"/g, '&quot;')}" style="
            background: linear-gradient(135deg, var(--primary-50), rgba(139,92,246,0.08));
            border: 1px solid var(--primary-200);
            color: var(--primary-700);
            border-radius: 20px;
            padding: 5px 14px;
            font-size: 12.5px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            line-height: 1.4;
          "
          onmouseover="this.style.background='var(--primary-100)';this.style.borderColor='var(--primary-400)'"
          onmouseout="this.style.background='linear-gradient(135deg, var(--primary-50), rgba(139,92,246,0.08))';this.style.borderColor='var(--primary-200)'"
          title="Click to ask this question (tracked separately from your vocabulary)"
          >${m.followUp}</button>
        ` : `<span style="font-size:13px;color:var(--gray-400);font-style:italic">Did this help? Ask a follow-up.</span>`}
      </div>
    </div>
  </div>`;
}

function renderManimVisual() {
  return `
  <svg class="manim-svg" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#1e3a8a"/>
        <stop offset="100%" style="stop-color:#0f172a"/>
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="400" height="220" fill="url(#bg-grad)"/>
    <!-- Grid -->
    <line x1="0" y1="110" x2="400" y2="110" stroke="#1e40af" stroke-width="1" stroke-opacity="0.5"/>
    <line x1="200" y1="0" x2="200" y2="220" stroke="#1e40af" stroke-width="1" stroke-opacity="0.5"/>
    ${[-3, -2, -1, 1, 2, 3].map(i => `<line x1="${200 + i * 45}" y1="0" x2="${200 + i * 45}" y2="220" stroke="#1e3a8a" stroke-width="0.5"/>`).join('')}
    ${[-2, -1, 1, 2].map(i => `<line x1="0" y1="${110 + i * 40}" x2="400" y2="${110 + i * 40}" stroke="#1e3a8a" stroke-width="0.5"/>`).join('')}
    <!-- Axis arrows -->
    <line x1="20" y1="110" x2="380" y2="110" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr)"/>
    <line x1="200" y1="200" x2="200" y2="20" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr)"/>
    <!-- Parabola -->
    <path d="M 60,180 Q 200,30 340,180" stroke="#60a5fa" stroke-width="2.5" fill="none" filter="url(#glow)" stroke-dasharray="300" stroke-dashoffset="0">
      <animate attributeName="stroke-dashoffset" from="300" to="0" dur="2s" repeatCount="indefinite"/>
    </path>
    <!-- Ball / Object -->
    <circle cx="200" cy="110" r="8" fill="#3b82f6" filter="url(#glow)">
      <animateMotion dur="3s" repeatCount="indefinite">
        <mpath href="#path1"/>
      </animateMotion>
    </circle>
    <path id="path1" d="M 60,180 Q 200,30 340,180" fill="none"/>
    <!-- Labels -->
    <text x="340" y="130" fill="#93c5fd" font-size="12" font-family="monospace">g = 9.8</text>
    <text x="340" y="145" fill="#93c5fd" font-size="10" font-family="monospace">m/s²</text>
    <text x="60" y="100" fill="#fbbf24" font-size="11" font-family="monospace">F = ma</text>
    <text x="135" y="65" fill="#34d399" font-size="11" font-family="monospace">v² = u² + 2as</text>
    <!-- Floating particles -->
    ${[...Array(6)].map((_, i) => `
      <circle cx="${50 + i * 60}" cy="${60 + Math.sin(i) * 40}" r="2" fill="#60a5fa" opacity="0.6">
        <animate attributeName="cy" values="${60 + Math.sin(i) * 40};${40 + Math.sin(i) * 40};${60 + Math.sin(i) * 40}" dur="${1.5 + i * 0.3}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.6;1;0.6" dur="${1.5 + i * 0.3}s" repeatCount="indefinite"/>
      </circle>`).join('')}
  </svg>`;
}

function renderGenerating() {
  return `
  <div class="msg-ai fade-in">
    <div class="msg-ai-hd">
      <div class="ai-ava">🤖</div>
      <span class="ai-lbl">VidScholar AI · Generating...</span>
    </div>
    <div class="gen-loading">
      <div class="gen-title"><div class="spinner"></div>Generating your animated video...</div>
      <div class="gen-stages">
        ${DATA.generationStages.map((s, i) => {
    const cls = i < state.genStage ? 'done' : i === state.genStage ? 'act' : 'pend';
    return `<div class="gstage ${cls}">
            <div class="gstage-ic">${i < state.genStage ? '✓' : s.icon}</div>
            <span class="gstage-lbl">${s.label}</span>
          </div>`;
  }).join('')}
      </div>
      <div class="gen-eta">Estimated time: <b>${Math.max(5, (DATA.generationStages.length - state.genStage) * 14)} seconds</b> remaining</div>
    </div>
  </div>`;
}

// ── LESSON PAGE ──
function renderLesson() {
  state.activeLesson = state.activeLesson || 0;
  if (state.lessonPlaying === undefined) state.lessonPlaying = true;
  const lesson = DATA.lessons[state.activeLesson] || DATA.lessons[0];
  const isPlaying = state.lessonPlaying;

  return `
  <div class="lesson-layout">
    <div class="lesson-main">
      <div class="lesson-path-lbl">Active Learning Path</div>
      <div class="lesson-title">${lesson.title}</div>
      <div class="lesson-meta">
        <span>${lesson.module.split('·')[0].trim()}</span>
        <span style="background:var(--gray-200);width:1px;height:12px"></span>
        <span style="color:var(--primary-600);font-weight:600">${lesson.progress}% Complete</span>
      </div>
      <div class="lesson-prog">
        <div class="lesson-prog-hd"><span>Module Progress</span><span>${lesson.progress}%</span></div>
        <div class="prog-track"><div class="prog-fill" style="width:${lesson.progress}%"></div></div>
      </div>
      <div class="lesson-btns">
        <button class="btn btn-secondary" id="save-lesson-btn">💾 Save Progress</button>
        <button class="btn btn-primary" id="next-lesson-btn">Next Lesson →</button>
      </div>

      <div class="big-video">
        <div class="big-manim">
          ${lesson.id === 'l1' ? `
            <svg viewBox="0 0 640 360" style="width:100%;height:100%" xmlns="http://www.w3.org/2000/svg" class="${isPlaying ? '' : 'paused'}">
              <rect width="640" height="360" fill="#0f172a"/>
              <text x="320" y="80" fill="#3b82f6" font-size="32" font-family="monospace" font-weight="bold" text-anchor="middle">F = ma</text>
              <rect x="250" y="160" width="100" height="80" fill="#f59e0b" rx="10">
                <animate attributeName="x" values="100;450;100" dur="4s" repeatCount="indefinite"/>
              </rect>
              <line x1="50" y1="240" x2="590" y2="240" stroke="#60a5fa" stroke-width="4"/>
              <polygon points="360,200 420,200 420,195 440,205 420,215 420,210 360,210" fill="#ef4444">
                 <animate attributeName="points" values="210,200 270,200 270,195 290,205 270,215 270,210 210,210;560,200 620,200 620,195 640,205 620,215 620,210 560,210;210,200 270,200 270,195 290,205 270,215 270,210 210,210" dur="4s" repeatCount="indefinite"/>
              </polygon>
              <text x="50" y="320" fill="#94a3b8" font-size="14" font-family="monospace">Force vector applied to mass over time.</text>
            </svg>` : lesson.id === 'l2' ? `
            <svg viewBox="0 0 640 360" style="width:100%;height:100%" xmlns="http://www.w3.org/2000/svg" class="${isPlaying ? '' : 'paused'}">
              <rect width="640" height="360" fill="#0f172a"/>
              <text x="320" y="80" fill="#10b981" font-size="32" font-family="monospace" font-weight="bold" text-anchor="middle">CH4 + 2O2 → CO2 + 2H2O</text>
              <path d="M 320,160 L 360,185 L 360,235 L 320,260 L 280,235 L 280,185 Z" stroke="#34d399" stroke-width="4" fill="none">
                <animateTransform attributeName="transform" type="rotate" from="0 320 210" to="360 320 210" dur="10s" repeatCount="indefinite"/>
              </path>
              <circle cx="320" cy="160" r="16" fill="#ef4444"><animateTransform attributeName="transform" type="rotate" from="0 320 210" to="360 320 210" dur="10s" repeatCount="indefinite"/></circle>
              <circle cx="360" cy="185" r="16" fill="#3b82f6"><animateTransform attributeName="transform" type="rotate" from="0 320 210" to="360 320 210" dur="10s" repeatCount="indefinite"/></circle>
              <circle cx="280" cy="235" r="16" fill="#f59e0b"><animateTransform attributeName="transform" type="rotate" from="0 320 210" to="360 320 210" dur="10s" repeatCount="indefinite"/></circle>
              <text x="50" y="320" fill="#94a3b8" font-size="14" font-family="monospace">Molecular structure composition overview.</text>
            </svg>` : lesson.id === 'l3' ? `
            <svg viewBox="0 0 640 360" style="width:100%;height:100%" xmlns="http://www.w3.org/2000/svg" class="${isPlaying ? '' : 'paused'}">
              <rect width="640" height="360" fill="#0f172a"/>
              <text x="320" y="60" fill="#8b5cf6" font-size="32" font-family="monospace" font-weight="bold" text-anchor="middle">y = ax² + bx + c</text>
              <line x1="320" y1="80" x2="320" y2="340" stroke="#475569" stroke-width="2"/>
              <line x1="150" y1="280" x2="490" y2="280" stroke="#475569" stroke-width="2"/>
              <path d="M 220,120 Q 320,380 420,120" stroke="#a78bfa" stroke-width="4" fill="none">
                 <animate attributeName="d" values="M 220,120 Q 320,380 420,120; M 180,180 Q 320,440 460,180; M 220,120 Q 320,380 420,120" dur="3s" repeatCount="indefinite"/>
              </path>
              <circle cx="320" cy="245" r="8" fill="#fbbf24">
                 <animate attributeName="cy" values="245;275;245" dur="3s" repeatCount="indefinite"/>
              </circle>
              <text x="50" y="320" fill="#94a3b8" font-size="14" font-family="monospace">Evaluating roots of polynomials visually.</text>
            </svg>` : `
            <svg viewBox="0 0 640 360" style="width:100%;height:100%" xmlns="http://www.w3.org/2000/svg" class="${isPlaying ? '' : 'paused'}">
              <defs>
                <radialGradient id="bg2" cx="30%" cy="50%" r="60%">
                  <stop offset="0%" style="stop-color:#1e3a8a"/>
                  <stop offset="100%" style="stop-color:#0f172a"/>
                </radialGradient>
              </defs>
              <rect width="640" height="360" fill="url(#bg2)"/>
              <text x="50" y="60" fill="#60a5fa" font-size="28" font-family="monospace" font-weight="bold">Ψ(x,t) = Ae^(ikx-iωt)</text>
              <path d="M 40,200 Q 160,120 280,200 Q 400,280 520,200 Q 600,160 640,200" stroke="#3b82f6" stroke-width="3" fill="none">
                <animate attributeName="d" values="M 40,200 Q 160,120 280,200 Q 400,280 520,200 Q 600,160 640,200;M 40,200 Q 160,280 280,200 Q 400,120 520,200 Q 600,240 640,200;M 40,200 Q 160,120 280,200 Q 400,280 520,200 Q 600,160 640,200" dur="3s" repeatCount="indefinite"/>
              </path>
              <circle cx="320" cy="200" r="12" fill="#fbbf24">
                <animate attributeName="cx" values="40;640;40" dur="6s" repeatCount="indefinite"/>
              </circle>
              ${[...Array(8)].map((_, i) => `
                <circle cx="${80 + i * 70}" cy="${180 + Math.sin(i * 0.8) * 30}" r="3" fill="#8b5cf6" opacity="0.7">
                  <animate attributeName="r" values="3;6;3" dur="${1 + i * 0.2}s" repeatCount="indefinite"/>
                </circle>`).join('')}
              <text x="50" y="320" fill="#94a3b8" font-size="14" font-family="monospace">Wave function: probability amplitude in quantum mechanics</text>
            </svg>`}
        </div>
        <div class="bi-conf">🤖 AI 92% confident you're following</div>
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);padding:10px 16px;display:flex;align-items:center;gap:10px">
          <button class="play-btn" id="lesson-play-btn">${isPlaying ? '⏸' : '▶'}</button>
          <div class="vslider"><div class="vslider-fill" style="width:65%"></div></div>
          <span class="vtime">14:10 / 21:58</span>
          <button class="spd-btn">0.75x</button><button class="spd-btn">1x</button><button class="spd-btn">1.5x</button>
        </div>
      </div>

      <div class="concept-card">
        <div class="concept-hd">
          <span class="concept-title">Concept Exploration</span>
          <div class="diff-toggle">Adjust Difficulty <button class="toggle-switch" id="diff-toggle" aria-label="Adjust Difficulty"></button></div>
        </div>
        <div class="concept-txt">
          ${lesson.desc} This represents a fundamental concept that we are exploring in this active path. Follow along with the visuals to understand the deep connections in this domain.
          <br><br>
          <i>This module is dynamically adapted from your interactions. Notice how the difficulty shifts based on your prior quiz results?</i>
        </div>
      </div>
    </div>

    <div class="lesson-side">
      <div class="side-panel">
        <div class="sp-hd">💡 Personalized Suggestion</div>
        <div class="sp-body">
          <div class="pers-card">
            <p>I noticed you spent more time on the 'Interference' section. Would you like an easier explanation with a visual analogy?</p>
            <div class="pc-btns">
              <button class="pc-btn yes">Yes, Explain</button>
              <button class="pc-btn no">Dismiss</button>
            </div>
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="sp-hd">📊 Real-time Analytics</div>
        <div class="sp-body">
          <div class="attn-row" style="margin-bottom:14px">
            <span class="attn-lbl">Attention Score</span>
            <span class="attn-val">High (92%)</span>
          </div>
          <div class="analytics-row">
            <div class="analytic-box">
              <div class="analytic-val">88%</div>
              <div class="analytic-lbl">Retention</div>
            </div>
            <div class="analytic-box">
              <div class="analytic-val">1.2x</div>
              <div class="analytic-lbl">Velocity</div>
            </div>
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="sp-hd">👁 View Mode</div>
        <div class="sp-body">
          <div class="view-modes">
            ${['Executive Summary', 'Detailed View', 'Mathematical Deep Dive'].map(v => `
              <div class="vm-item ${state.viewMode === v ? 'active' : ''}" data-vm="${v}">
                ${v === 'Executive Summary' ? '📋' : v === 'Detailed View' ? '📖' : '🔢'} ${v}
                ${state.viewMode === v ? '<span style="color:var(--primary-500)">✓</span>' : ''}
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="sp-hd">📋 Blackboard Key Points</div>
        <div class="sp-body">
          ${['Young\'s Double Slit Experiment — Demonstrates that light and matter can display characteristics of both classically defined waves and particles.',
      'The Wave Function (Ψ) — A mathematical description of the quantum state of an isolated quantum system.',
      'Probability Density — The likelihood of finding a particle in a specific location upon measurement.',
      'Quantum Superposition — A fundamental principle where a quantum system exists in multiple states simultaneously.'
    ].map((k, i) => `
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--gray-100)">
              <div style="width:20px;height:20px;border-radius:50%;background:var(--primary-100);color:var(--primary-700);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px">${i + 1}</div>
              <p style="font-size:12.5px;color:var(--gray-700);line-height:1.55">${k}</p>
            </div>`).join('')}
          <div style="background:var(--primary-600);border-radius:var(--r-md);padding:12px;margin-top:4px">
            <div style="font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.7);margin-bottom:5px">🤖 AI CONTEXT NOTE</div>
            <p style="font-size:12.5px;color:#fff;line-height:1.5">The AI just simplified the concept of "Waves" using a water ripple analogy based on your previous struggle with fluid dynamics.</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── TEACHER DASHBOARD ──
function renderTeacher() {
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">
    <div>
      <h1 style="font-family:var(--font-d);font-size:22px;font-weight:800;color:var(--gray-900)">Class Performance Overview</h1>
      <p style="font-size:13px;color:var(--gray-500);margin-top:2px">Section 8-12 · Data Science &amp; AI Foundations</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:13px;color:var(--gray-600)">📅 Last 30 Days</span>
      <button class="btn btn-primary">Generate Report</button>
    </div>
  </div>

  <div class="teacher-grid">
    <div>
      <div class="card" style="margin-bottom:18px">
        <div class="card-hd"><span class="card-title">Topic Understanding Heat Map</span><span class="badge badge-blue">● Live Feedback</span></div>
        <div class="card-bd">
          <div class="heat-grid">
            ${DATA.heatMap.map(t => `
              <div class="heat-tile" style="background:${t.color}" title="${t.pct}%">${t.pct}%</div>`).join('')}
          </div>
          <div class="heat-legend">
            <span><span class="heat-dot" style="background:#ef4444"></span>Critical (&lt;40%)</span>
            <span><span class="heat-dot" style="background:#93c5fd"></span>Developing</span>
            <span><span class="heat-dot" style="background:#1e40af"></span>Proficient</span>
            <a href="#" style="margin-left:auto;font-size:12px;color:var(--primary-600);font-weight:600">View Detailed Breakdown →</a>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd">
          <span class="card-title">Student Progress &amp; Focus Areas</span>
          <div style="display:flex;gap:8px">
            <select class="form-sel" style="width:auto;padding:5px 28px 5px 10px;font-size:12px">
              <option>Filter: Needs Attention</option><option>All Students</option>
            </select>
            <select class="form-sel" style="width:auto;padding:5px 28px 5px 10px;font-size:12px">
              <option>Sort: Alphabetical</option><option>Sort: Grade</option>
            </select>
          </div>
        </div>
        <div class="card-bd" style="padding:0">
          <table class="student-table">
            <thead><tr>
              <th>Student</th><th>Overall Grade</th><th>Focus Areas</th><th>AI Interventions</th><th>Action</th>
            </tr></thead>
            <tbody>
              ${DATA.students.map(s => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="avatar" style="background:${s.color};width:32px;height:32px;font-size:12px">${s.initials}</div>
                      <div><div class="student-name">${s.name}</div><div class="student-meta">Last active ${s.active}</div></div>
                    </div>
                  </td>
                  <td>
                    <span style="font-size:15px;font-weight:800;color:${s.grade >= 80 ? 'var(--success)' : s.grade >= 60 ? 'var(--warning)' : 'var(--error)'}">${s.grade}%</span>
                    <span style="font-size:14px">${s.trend === 'up' ? '↗' : s.trend === 'down' ? '↘' : '→'}</span>
                  </td>
                  <td><div class="focus-tags">${s.focus.map(f => `<span class="focus-tag">${f}</span>`).join('')}</div></td>
                  <td style="font-size:12.5px;color:${s.critical ? 'var(--error)' : 'var(--gray-600)'}">${s.interventions}</td>
                  <td>${s.critical ? `<button class="btn btn-danger btn-sm">Contact</button>` : `<button class="btn btn-ghost btn-sm">⋯ View</button>`}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-hd"><span class="card-title">Difficulty Adaptation Stats</span></div>
        <div class="card-bd">
          <div class="adapt-stat">
            <span class="adapt-lbl">Content Simplified</span><span class="adapt-pct">64%</span>
          </div>
          <div class="prog-track" style="margin-bottom:14px"><div class="prog-fill amber" style="width:64%"></div></div>
          <div class="adapt-stat">
            <span class="adapt-lbl">Curriculum Deepened</span><span class="adapt-pct">22%</span>
          </div>
          <div class="prog-track" style="margin-bottom:14px"><div class="prog-fill green" style="width:22%"></div></div>
          <div class="ai-insight">
            🤖 AI Analysis: Students are struggling with <a href="#">Mathematical Foundations</a>. System has automatically shifted 14 learners to "Bridge Mode" modules.
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card-hd"><span class="card-title">Common Questions</span></div>
        <div class="card-bd">
          ${DATA.commonQuestions.map(q => `
            <div class="cq-item">
              <div class="cq-meta">${q.type} · ${q.students} Students</div>
              <div class="cq-text">${q.text}</div>
            </div>`).join('')}
          <button class="btn btn-secondary btn-sm" style="width:100%;margin-top:4px">Resolve in Class</button>
        </div>
      </div>

      <div class="card">
        <div class="card-hd"><span class="card-title" style="color:var(--error)">⚠️ Critical Alerts</span></div>
        <div class="card-bd">
          <div class="alert-item">
            <h4>Dropout Risk Detected</h4>
            <p>3 students haven't logged in for 5+ days.</p>
          </div>
          <div class="alert-item">
            <h4>Exam Threshold Alert</h4>
            <p>Quiz avg dropped by 15% in Module 4.</p>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ── HISTORY ──
function renderHistory() {
  return `
  <h2 style="font-family:var(--font-d);font-size:20px;font-weight:800;color:var(--gray-900);margin-bottom:20px">Query History</h2>
  ${DATA.historyItems.map(h => `
    <div class="hist-item fade-in" style="animation-delay:${DATA.historyItems.indexOf(h) * 0.05}s">
      <div class="hist-icon" style="background:${h.iconBg}">${h.subjectIcon}</div>
      <div class="hist-info">
        <div class="hist-title">${h.question}</div>
        <div class="hist-meta">
          <span>${h.subject}</span>
          <span>·</span>
          <span>⏱ ${h.duration}</span>
          <span>·</span>
          <span>${h.time}</span>
        </div>
      </div>
      <div class="hist-badge"><span class="badge ${h.badge}">${h.level}</span></div>
    </div>`).join('')}`;
}

// ── SETTINGS ──
function renderSettings() {
  return `
  <h2 style="font-family:var(--font-d);font-size:20px;font-weight:800;color:var(--gray-900);margin-bottom:20px">Settings</h2>
  <div class="settings-grid">
    <div class="card">
      <div class="card-hd"><span class="card-title">👤 Profile</span></div>
      <div class="card-bd">
        ${[{ l: 'Full Name', v: DATA.user.name }, { l: 'Board', v: DATA.user.board }, { l: 'Grade', v: 'Class ' + DATA.user.grade }, { l: 'State', v: DATA.user.state }].map(r => `
          <div class="setting-row">
            <div class="setting-info"><h4>${r.l}</h4></div>
            <span style="font-size:13px;font-weight:600;color:var(--gray-700)">${r.v}</span>
          </div>`).join('')}
        <button class="btn btn-secondary btn-sm" style="margin-top:12px;width:100%">Edit Profile</button>
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-title">🎛 Preferences</span></div>
      <div class="card-bd">
        ${[{ l: 'Default Difficulty', d: 'Auto-adaptive', v: 'Intermediate' }, { l: 'Video Quality', d: 'Manim render resolution', v: 'HD 1080p' }, { l: 'TTS Voice', d: 'Text-to-speech narration', v: 'Google Neural' }, { l: 'Language', d: 'Explanation language', v: 'English' }].map(r => `
          <div class="setting-row">
            <div class="setting-info"><h4>${r.l}</h4><p>${r.d}</p></div>
            <span style="font-size:12.5px;font-weight:600;color:var(--primary-600)">${r.v}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-title">📊 Subject Confidence Scores</span></div>
      <div class="card-bd">
        ${DATA.subjects.map(s => `
          <div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
              <span style="font-weight:600">${s.icon} ${s.name}</span>
              <span style="color:var(--primary-600);font-weight:700">${Math.round(DATA.user.confidence[s.name] * 100)}%</span>
            </div>
            <div class="prog-track"><div class="prog-fill" style="width:${Math.round(DATA.user.confidence[s.name] * 100)}%;background:${s.color}"></div></div>
          </div>`).join('')}
        <p style="font-size:12px;color:var(--gray-500);margin-top:4px">Scores update automatically as you learn. Manual override via the chat difficulty selector (3× weight).</p>
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-title">🔑 API Integrations</span></div>
      <div class="card-bd">
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--gray-600);margin-bottom:6px">Groq API Key</label>
          <div style="display:flex;gap:8px">
            <input type="password" id="groq-key-input" class="form-sel" style="flex:1;padding:8px 12px;border:1px solid var(--gray-200);border-radius:8px;font-size:13px" placeholder="gsk_..." value="${localStorage.getItem('GROQ_API_KEY') || ''}" />
            <button class="btn btn-primary" id="save-key-btn" style="padding:8px 16px;border-radius:8px;font-size:13px">Save</button>
          </div>
          <p style="font-size:11px;color:var(--gray-500);margin-top:6px;line-height:1.4">Get a free key from the <a href="https://console.groq.com/" target="_blank" style="color:var(--primary-600);text-decoration:underline">Groq Console</a>. Key is saved locally in your browser's localStorage.</p>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-hd"><span class="card-title">⚙️ System</span></div>
      <div class="card-bd">
        ${[{ l: 'Pipeline', v: 'Gemini 1.5 Pro + Manim' }, { l: 'RAG Store', v: 'ChromaDB (NCERT)' }, { l: 'TTS Engine', v: 'Google Cloud TTS' }, { l: 'Profile Storage', v: 'Firebase Firestore' }, { l: 'Session', v: 'Phase: warm_up (' + DATA.user.sessionCount + ' sessions)' }].map(r => `
          <div class="setting-row">
            <div class="setting-info"><h4>${r.l}</h4></div>
            <span style="font-size:12px;color:var(--gray-500)">${r.v}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

// ── BIND EVENTS ──
function bindNav() {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => { state.page = el.dataset.page; render(); });
  });
  document.querySelectorAll('.subj-item[data-subj]').forEach(el => {
    el.addEventListener('click', () => { state.chatSubject = el.dataset.subj; state.page = 'chat'; render(); });
  });
  document.getElementById('fab-chat')?.addEventListener('click', () => { state.page = 'chat'; render(); });
  document.querySelectorAll('[data-page]').forEach(el => {
    if (!el.classList.contains('nav-item')) el.addEventListener('click', () => { state.page = el.dataset.page; render(); });
  });
  document.getElementById('role-toggle-btn')?.addEventListener('click', () => {
    state.role = state.role === 'student' ? 'teacher' : 'student';
    state.page = state.role === 'student' ? 'dashboard' : 'teacher';
    render();
  });
}

function bindPage() {
  // Dashboard
  document.getElementById('hero-ask')?.addEventListener('click', submitHeroQ);
  document.getElementById('hero-mic')?.addEventListener('click', (e) => startVoiceRecognition('hero-q', e.currentTarget));
  document.getElementById('hero-cam')?.addEventListener('click', () => triggerImageUpload('hero-q'));
  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => { document.getElementById('hero-q').value = c.dataset.q; });
  });
  document.querySelectorAll('.lcard').forEach(c => {
    c.addEventListener('click', () => {
      const lId = c.dataset.lesson;
      state.activeLesson = DATA.lessons.findIndex(l => l.id === lId);
      if (state.activeLesson === -1) state.activeLesson = 0;
      state.page = 'lesson';
      state.lessonPlaying = true;
      render();
    });
  });

  // Chat tabs
  document.querySelectorAll('.stab').forEach(t => {
    t.addEventListener('click', () => { state.chatSubject = t.dataset.tab; render(); });
  });

  // Diff selector
  document.querySelectorAll('.diff-btn').forEach(b => {
    b.addEventListener('click', () => { state.diffLevel = b.dataset.diff; document.querySelectorAll('.diff-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); });
  });

  // Chat send
  document.getElementById('chat-send')?.addEventListener('click', sendChat);
  document.getElementById('chat-inp')?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });
  document.getElementById('chat-mic')?.addEventListener('click', (e) => startVoiceRecognition('chat-inp', e.currentTarget));
  document.getElementById('chat-cam')?.addEventListener('click', () => triggerImageUpload('chat-inp'));

  // Video play
  document.getElementById('play-btn')?.addEventListener('click', () => { state.videoPlaying = !state.videoPlaying; document.getElementById('play-btn').innerHTML = state.videoPlaying ? icons.pause : icons.play; });

  // Lesson view modes
  document.querySelectorAll('.vm-item').forEach(v => {
    v.addEventListener('click', () => { state.viewMode = v.dataset.vm; render(); });
  });

  // Interactivity for My Lessons
  document.getElementById('next-lesson-btn')?.addEventListener('click', () => {
    state.activeLesson = ((state.activeLesson || 0) + 1) % DATA.lessons.length;
    state.lessonPlaying = true;
    render();
  });

  document.getElementById('save-lesson-btn')?.addEventListener('click', (e) => {
    e.target.innerHTML = '✅ Saved!';
    setTimeout(() => { if (e.target) e.target.innerHTML = '💾 Save Progress'; }, 2000);
  });

  document.getElementById('lesson-play-btn')?.addEventListener('click', (e) => {
    state.lessonPlaying = !state.lessonPlaying;
    e.target.innerHTML = state.lessonPlaying ? '⏸' : '▶';
    const svg = document.querySelector('.big-manim svg');
    if (svg && svg.pauseAnimations) {
      if (state.lessonPlaying) svg.unpauseAnimations();
      else svg.pauseAnimations();
    }
  });

  document.getElementById('diff-toggle')?.addEventListener('click', (e) => {
    e.target.classList.toggle('active');
  });

  const yesBtn = document.querySelector('.pc-btn.yes');
  if (yesBtn) {
    yesBtn.addEventListener('click', (e) => {
      const card = e.target.closest('.pers-card');
      card.innerHTML = `<div style="font-size:13px;color:var(--gray-700)">
         <strong style="color:var(--primary-600)">Here is your visual analogy:</strong><br><br>
         Imagine skipping a stone across a pond. The stone itself is like a particle, but as it hits the water, it creates spreading ripples—just like a wave. Keep this in mind as you watch the animation on the left!
      </div>`;
    });
  }

  const noBtn = document.querySelector('.pc-btn.no');
  if (noBtn) {
    noBtn.addEventListener('click', (e) => {
      e.target.closest('.side-panel').style.display = 'none';
    });
  }

  // Settings API Key Save
  document.getElementById('save-key-btn')?.addEventListener('click', () => {
    const input = document.getElementById('groq-key-input');
    if (input) {
      const key = input.value.trim();
      localStorage.setItem('GROQ_API_KEY', key);
      alert('Groq API Key saved successfully! The page will now refresh.');
      window.location.reload();
    }
  });
}

function submitHeroQ() {
  const q = document.getElementById('hero-q')?.value?.trim() || '';
  const imgUrl = state.pendingImage;
  if (!q && !imgUrl) return;

  let combinedQuery = q;
  if (state.pendingImageText) {
    combinedQuery += `\n\n[OCR Extracted Text from Image attached by user]:\n${state.pendingImageText}`;
  }

  // Render loading state for the inline answer
  state.heroAnswerLoading = true;
  state.heroAnswer = null;
  state.pendingImage = null;
  state.pendingImageText = null;
  const previewDiv = document.querySelector('.img-upload-preview');
  if (previewDiv) previewDiv.remove();
  render();

  // Call the new General Omni-Model text fetcher
  callGroqGeneralText(combinedQuery).then(answer => {
    state.heroAnswerLoading = false;
    state.heroAnswer = answer;
    render();
  });
}

function sendChat() {
  const inp = document.getElementById('chat-inp');
  const q = inp?.value?.trim() || '';
  const imgUrl = state.pendingImage;
  if ((!q && !imgUrl) || state.isGenerating) return;

  let combinedQuery = q;
  if (state.pendingImageText) {
    combinedQuery += `\n\n[OCR Extracted Text from Image attached by user]:\n${state.pendingImageText}`;
  }

  state.lastUserQuery = combinedQuery || 'Image Query';
  DATA.chatHistory[state.chatSubject].push({ type: 'user', text: q || 'Uploaded Image', imageUrl: imgUrl });
  inp.value = '';
  state.pendingImage = null;
  state.pendingImageText = null;
  const previewDiv = document.querySelector('.img-upload-preview');
  if (previewDiv) previewDiv.remove();
  render();
  startGeneration();
}

// ── INPUT HANDLERS (Voice & Image) ──
function startVoiceRecognition(inputId, btn) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span style="color:var(--error);animation:pulse 1s infinite">🎙️...</span>`;

  recognition.start();

  recognition.onresult = (event) => {
    const speechResult = event.results[0][0].transcript;
    const inp = document.getElementById(inputId);
    if (inp) {
      inp.value = (inp.value + ' ' + speechResult).trim();
    }
    btn.innerHTML = originalHtml;
  };

  recognition.onspeechend = () => {
    recognition.stop();
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error detected: ' + event.error);
    btn.innerHTML = originalHtml;
  };
}

function triggerImageUpload(inputId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        state.pendingImage = dataUrl;
        state.pendingImageText = null;

        // Show image preview above the input string
        const inputEl = document.getElementById(inputId);
        if (inputEl) {
          const parent = inputEl.parentElement;
          parent.style.position = 'relative';

          let previewDiv = parent.querySelector('.img-upload-preview');
          if (!previewDiv) {
            previewDiv = document.createElement('div');
            previewDiv.className = 'img-upload-preview';
            previewDiv.innerHTML = `
              <div style="display:flex;align-items:center;gap:10px">
                <img class="img-upload-src" src="${dataUrl}" style="width:64px;height:64px;object-fit:cover;border-radius:6px">
                <div class="ocr-status" style="font-size:12px;color:var(--gray-500);font-weight:600">Extracting text...</div>
              </div>
              <button class="rm-img-btn" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:var(--gray-800);color:#fff;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center">×</button>
            `;
            parent.appendChild(previewDiv);

            previewDiv.style.position = 'absolute';
            previewDiv.style.bottom = 'calc(100% + 10px)';
            previewDiv.style.left = '20px';
            previewDiv.style.background = '#fff';
            previewDiv.style.padding = '6px';
            previewDiv.style.borderRadius = '8px';
            previewDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            previewDiv.style.border = '1px solid var(--gray-200)';
            previewDiv.style.zIndex = '100';

            previewDiv.querySelector('.rm-img-btn').addEventListener('click', (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              state.pendingImage = null;
              state.pendingImageText = null;
              previewDiv.remove();
            });
          } else {
            previewDiv.querySelector('.img-upload-src').src = dataUrl;
            previewDiv.querySelector('.ocr-status').innerText = 'Extracting text...';
          }
        }

        // Run OCR using Tesseract.js (imported in index.html)
        if (window.Tesseract) {
          try {
            const result = await window.Tesseract.recognize(dataUrl, 'eng');
            state.pendingImageText = result.data.text.trim();
            const statusEl = document.querySelector('.ocr-status');
            if (statusEl) statusEl.innerText = 'Text Extracted ✓';
            console.log('OCR Output:', state.pendingImageText);
          } catch (err) {
            console.error('OCR failed:', err);
            const statusEl = document.querySelector('.ocr-status');
            if (statusEl) statusEl.innerText = 'OCR Failed';
          }
        } else {
          console.warn('Tesseract.js not loaded!');
        }
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function startGeneration() {
  const query = state.lastUserQuery || '';
  const subject = state.chatSubject;

  // Intercept simple greetings
  const greetings = ['hi', 'hello', 'hey', 'hii', 'hiii', 'helo', 'how are you', 'how are you?'];
  if (greetings.includes(query.toLowerCase().trim())) {
    DATA.chatHistory[subject].push({
      type: 'ai',
      text: `Hello! I am VidScholar AI. How can I help you with ${subject} today? Please ask me a concept or problem to generate a visual lesson.`,
      level: 'General'
    });
    // Re-render chat directly
    const chatMsgs = document.getElementById('chat-msgs');
    if (chatMsgs) {
      setTimeout(() => chatMsgs.scrollTop = chatMsgs.scrollHeight + 1000, 50);
    }
    render();
    return;
  }

  state.isGenerating = true;
  state.genStage = 0;

  const ACTION_CHIPS = ['Simplify Explanation', 'Go Deeper', 'Add Example'];
  const isActionChip = ACTION_CHIPS.includes(query);

  // ── Agent 2: Vocabulary score update (only for real typed queries) ──
  let vocabResult = { score: DATA.vocabularyScores[subject] || 0.1, level: 'Action', totalHits: 0, isSuggested: false };

  // ── Suggested-Question Guard ──
  // If the user's query exactly matches a recent AI-recommended follow-up question,
  // skip vocabulary scoring to prevent artificial score inflation.
  const normalizeQ = s => s.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const isSuggestedQuery = !isActionChip && state.lastFollowUps.some(
    fu => normalizeQ(fu) === normalizeQ(query)
  );

  if (!isActionChip) {
    if (isSuggestedQuery) {
      // Query came from AI suggestion — skip vocab update, flag it
      vocabResult.isSuggested = true;
      vocabResult.level = 'AI Suggested';
      console.log('[VocabAgent] Suggested question detected — skipping score update for:', query);
    } else if (DATA.subjectModes && DATA.subjectModes[subject] === 'SelfGuessing') {
      // In SelfGuessing mode, we skip explicit vocabulary profiling to save resources
      vocabResult.level = 'Contextual Auto-Guess';
    } else {
      vocabResult = analyzePromptVocabulary(query, subject);
      const oldVocab = DATA.vocabularyScores[subject] || 0.1;
      // Rolling average: 60% new reading, 40% old score for stability
      DATA.vocabularyScores[subject] = Math.round((oldVocab * 0.4 + vocabResult.score * 0.6) * 100) / 100;
    }
  }

  // ── Determine LLM difficulty (AI still answers at the chosen level) ──
  let finalDiff = state.diffLevel;
  if (finalDiff === 'Auto') {
    const currentConf = calcUnderstandingScore(subject);
    if (currentConf < 0.45) finalDiff = 'Start from scratch';
    else if (currentConf > 0.75) finalDiff = 'Just the details';
    else finalDiff = 'Give me the concept';
  }

  // ── Action-chip delta: adjusts confidence SCORE only, NOT the AI output ──
  // The AI already answered at the requested level; this updates the student's mastery profile.
  let chipDelta = 0;
  // Action chips below AI responses
  if (query === 'Simplify Explanation') chipDelta = -0.05;
  else if (query === 'Go Deeper') chipDelta = 0.05;
  else if (query === 'Add Example') chipDelta = 0.02;
  // Explanation Level buttons (LLM uses the chosen level, score also shifts)
  if (state.diffLevel === 'Start from scratch') chipDelta += -0.04;
  else if (state.diffLevel === 'Just the details') chipDelta += 0.04;
  // (Auto and 'Give me the concept' are neutral — no delta)


  if (chipDelta !== 0) {
    const prev = DATA.actionChipDelta[subject] ?? 0;
    const desired = Math.round((prev + chipDelta) * 100) / 100;

    // ── Dynamic headroom capping ──
    // Compute the base score without chip influence (Agent1 + Agent2)
    const agent1Base = DATA.agentScores[subject] ?? 0.1;
    const agent2Base = (DATA.vocabularyScores[subject] ?? 0.5) * 0.5;
    const base = agent1Base + agent2Base;

    // Cap chipDelta so combined score stays strictly within [0, 1]
    const maxAllowedDelta = Math.min(0.15,  Math.round((1.0 - base) * 100) / 100);
    const minAllowedDelta = Math.max(-0.15, Math.round((0.0 - base) * 100) / 100);

    DATA.actionChipDelta[subject] = Math.max(minAllowedDelta, Math.min(maxAllowedDelta, desired));
  }

  // ── Legacy recentTrend: keep for backwards-compat references ──
  const oldTrend = DATA.recentTrend[subject] || 0;
  DATA.recentTrend[subject] = Math.max(-1, Math.min(1,
    Math.round((oldTrend * 0.5 + chipDelta) * 100) / 100
  ));

  // Persist all score mutations to localStorage
  saveScoresToStorage();

  render();

  // ── CALL GROQ LLM (async, runs in parallel with loading animation) ──
  const groqPromise = callGroqForLesson(
    query, subject, DATA.user.grade, DATA.user.board, finalDiff
  );

  // Loading animation runs while Gemini processes
  const interval = setInterval(() => {
    state.genStage++;
    if (state.genStage >= DATA.generationStages.length) {
      // Hold on last stage until Gemini responds
      state.genStage = DATA.generationStages.length - 1;
    }
    const loading = document.querySelector('.gen-loading');
    if (loading) {
      loading.innerHTML = `
        <div class="gen-title"><div class="spinner"></div>Generating your animated video...</div>
        <div class="gen-stages">
          ${DATA.generationStages.map((s, i) => {
        const cls = i < state.genStage ? 'done' : i === state.genStage ? 'act' : 'pend';
        return `<div class="gstage ${cls}"><div class="gstage-ic">${i < state.genStage ? '✓' : s.icon}</div><span class="gstage-lbl">${s.label}</span></div>`;
      }).join('')}
        </div>
        <div class="gen-eta">Estimated time: <b>${Math.max(3, (DATA.generationStages.length - state.genStage) * 8)} seconds</b> remaining</div>`;
    }
  }, 1800);

  // When Groq responds, deliver the lesson
  groqPromise.then(blueprint => {
    clearInterval(interval);
    state.isGenerating = false;

    if (blueprint) {
      // ── SHADOW DEPLOYMENT: Evaluator Pipeline ──
      const LLM_Guess = blueprint.self_guessed_confidence;
      if (LLM_Guess !== undefined) {
        DATA.lastLlmGuesses[state.chatSubject] = LLM_Guess;
        if (DATA.subjectModes && DATA.subjectModes[state.chatSubject] === 'AgentModel') {
          // Compare LLM's guess against explicit Dual-Agent score
          const currentAgentScore = Math.round(calcUnderstandingScore(state.chatSubject) * 100);
          if (Math.abs(LLM_Guess - currentAgentScore) <= 5) {
            DATA.calibrationStreaks[state.chatSubject] = (DATA.calibrationStreaks[state.chatSubject] || 0) + 1;
            console.log(`[Shadow Deployment] Match! ${state.chatSubject} streak: ${DATA.calibrationStreaks[state.chatSubject]}`);
            
            if (DATA.calibrationStreaks[state.chatSubject] >= 3) {
              console.log(`[Shadow Deployment] 🎓 ${state.chatSubject} has GRADUATED to SelfGuessing Mode!`);
              DATA.subjectModes[state.chatSubject] = 'SelfGuessing';
              DATA.selfGuessedScores[state.chatSubject] = LLM_Guess / 100.0;
            }
          } else {
            // Reset streak on mismatch
            DATA.calibrationStreaks[state.chatSubject] = 0;
            console.log(`[Shadow Deployment] Mismatch for ${state.chatSubject}. LLM guessed ${LLM_Guess}%, Agent is ${currentAgentScore}%`);
          }
        } else if (DATA.subjectModes && DATA.subjectModes[state.chatSubject] === 'SelfGuessing') {
          // Already graduated - trust LLM implicitly
          console.log(`[Shadow Deployment] Updating ${state.chatSubject} implicitly. LLM says ${LLM_Guess}%`);
          DATA.selfGuessedScores[state.chatSubject] = LLM_Guess / 100.0;
        }
      }

      // ✅ Gemini returned a real lesson blueprint
      const canvasId = 'manim-video-canvas-' + (++_canvasCounter);
      DATA.chatHistory[state.chatSubject].push({
        type: 'ai',
        videoTitle: blueprint.videoTitle || 'AI Generated Lesson',
        duration: blueprint.duration || '1:30',
        progress: LLM_Guess !== undefined ? LLM_Guess : Math.round(vocabResult.score * 100),
        level: blueprint.difficulty || state.diffLevel,
        keyPoints: blueprint.keyPoints || [],
        concept: blueprint.concept || '',
        blueprint: blueprint,
        canvasId: canvasId,
        vocabScore: vocabResult.score,
        vocabAnalysis: vocabResult,
        followUp: blueprint.followUp || 'Ask a follow-up question!',
      });

      // ── Store follow-up for suggestion tracking (cap at 10) ──
      if (blueprint.followUp) {
        state.lastFollowUps.unshift(blueprint.followUp);
        state.lastFollowUps = state.lastFollowUps.slice(0, 10);
      }

      // Update global real-time trackers
      const sData = DATA.subjects.find(s => s.name === state.chatSubject);

      DATA.historyItems.unshift({
        subject: state.chatSubject,
        subjectIcon: sData?.icon || '📚',
        iconBg: sData?.bg || '#eff6ff',
        question: state.lastUserQuery.split('\n')[0].substring(0, 100) || 'Image Query',
        time: 'Just now',
        duration: blueprint.duration || '1:30',
        level: blueprint.difficulty || state.diffLevel,
        badge: (blueprint.difficulty || state.diffLevel) === 'Beginner' ? 'badge-green' : 'badge-blue'
      });

      DATA.recentTopics.unshift({
        name: blueprint.videoTitle || 'AI Generated Lesson',
        status: 'In Progress',
        pct: Math.round(vocabResult.score * 100),
        time: 'Just now',
        icon: sData?.icon || '📚',
        iconBg: sData?.bg || '#eee'
      });
      DATA.recentTopics = DATA.recentTopics.slice(0, 4); // Keep limit

      DATA.user.learningHours = (parseFloat(DATA.user.learningHours) + 0.1).toFixed(1);
      // Bump the current day's graph activity
      const today = DATA.weeklyActivity[DATA.weeklyActivity.length - 1];
      today.h = Math.min(100, today.h + 10);
      saveScoresToStorage(); // Persist after successful lesson
    } else {
      // Fallback: use local topic matching if Gemini fails
      const topicMatch = matchTopic(query, subject);
      DATA.chatHistory[state.chatSubject].push({
        type: 'ai',
        videoTitle: topicMatch.videoTitle,
        duration: topicMatch.duration,
        progress: Math.round(vocabResult.score * 100),
        level: state.diffLevel,
        keyPoints: topicMatch.keyPoints,
        concept: topicMatch.concept,
        topicId: topicMatch.visual || topicMatch.topicId,
        vocabScore: vocabResult.score,
        vocabAnalysis: vocabResult,
        followUp: 'Gemini was unavailable. Using local knowledge base.',
      });

      // Update global real-time trackers identically for fallback
      const sData = DATA.subjects.find(s => s.name === state.chatSubject);

      DATA.historyItems.unshift({
        subject: state.chatSubject,
        subjectIcon: sData?.icon || '📚',
        iconBg: sData?.bg || '#eff6ff',
        question: state.lastUserQuery.split('\n')[0].substring(0, 100) || 'Image Query',
        time: 'Just now',
        duration: topicMatch.duration,
        level: state.diffLevel,
        badge: state.diffLevel === 'Start from scratch' ? 'badge-green' : 'badge-blue'
      });

      DATA.recentTopics.unshift({
        name: topicMatch.videoTitle,
        status: 'In Progress',
        pct: Math.round(vocabResult.score * 100),
        time: 'Just now',
        icon: sData?.icon || '📚',
        iconBg: sData?.bg || '#eee'
      });
      DATA.recentTopics = DATA.recentTopics.slice(0, 4);
      DATA.user.learningHours = (parseFloat(DATA.user.learningHours) + 0.1).toFixed(1);
      const today = DATA.weeklyActivity[DATA.weeklyActivity.length - 1];
      today.h = Math.min(100, today.h + 10);
      saveScoresToStorage(); // Persist after fallback lesson
    }
    render();
    const msgs = document.getElementById('chat-msgs');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;

    // Store the blueprint for re-initialization after DOM rebuilds
    if (blueprint && blueprint.scenes && blueprint.scenes.length > 0) {
      const latestMsg = DATA.chatHistory[state.chatSubject].slice(-1)[0];
      const cId = latestMsg?.canvasId;
      state.lastBlueprint = blueprint;
      state.lastCanvasId = cId;
      setTimeout(() => {
        if (activePlayer) activePlayer.destroy();
        console.log('🎬 Initializing player on canvas:', cId, document.getElementById(cId));
        activePlayer = new ManimPlayer(cId, blueprint);
        if (activePlayer && activePlayer.canvas) {
          console.log('✅ Player ready, auto-playing');
          activePlayer.play();
        } else {
          console.error('❌ Canvas not found:', cId);
        }
      }, 300);
    }
  });
}

// ── GLOBAL EVENT DELEGATION FOR PLAYER CONTROLS ──
document.addEventListener('click', (e) => {
  // Play/Pause button AND direct Canvas click
  const playBtn = e.target.closest('.anim-play-btn');
  const canvasTarget = e.target.closest('.manim-video-canvas');
  if (playBtn || canvasTarget) {
    console.log('▶ Play/Pause toggled. activePlayer:', !!activePlayer);

    // Determine the relevant canvas ID to act upon
    let targetCanvasId = null;
    if (canvasTarget) {
      targetCanvasId = canvasTarget.id;
    } else if (playBtn) {
      const wrapper = playBtn.closest('.vplayer');
      const cvs = wrapper?.querySelector('.manim-video-canvas');
      if (cvs) targetCanvasId = cvs.id;
    }

    if (activePlayer && activePlayer.canvas && activePlayer.canvas.id === targetCanvasId) {
      activePlayer.togglePlay();
    } else if (state.lastBlueprint && state.lastCanvasId === targetCanvasId) {
      // Re-init if player was lost due to DOM rebuild or click targeted a specific cached element
      activePlayer = new ManimPlayer(state.lastCanvasId, state.lastBlueprint);
      if (activePlayer && activePlayer.canvas) activePlayer.play();
    } else if (activePlayer && activePlayer.canvas) {
      // fallback if we clicked a global button but canvas ID matching failed for some reason
      activePlayer.togglePlay();
    }
  }
  // Speed buttons
  const spdBtn = e.target.closest('.spd-btn[data-speed]');
  if (spdBtn && activePlayer) {
    activePlayer.setSpeed(parseFloat(spdBtn.dataset.speed));
  }
  // Replay button
  if (e.target.id === 'replay-btn' || e.target.closest('#replay-btn')) {
    if (activePlayer) {
      activePlayer.currentScene = 0;
      activePlayer.elapsed = 0;
      activePlayer.play();
    } else if (state.lastBlueprint) {
      initManimPlayer(state.lastBlueprint);
      if (activePlayer) activePlayer.play();
    }
  }
  // Progress bar seek
  const progressBar = e.target.closest('#anim-progress');
  if (progressBar && activePlayer) {
    const rect = progressBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    activePlayer.seek(Math.max(0, Math.min(1, pct)));
  }

  // Action chips (Simplify, Go Deeper, Add Example)
  const achip = e.target.closest('.achip');
  if (achip && achip.id !== 'replay-btn') {
    // Strip the leading emoji if present and trigger a chat send
    const actionText = achip.textContent.replace(/^[\s\S]{0,2}/, '').trim();
    const inp = document.getElementById('chat-inp');
    if (inp && !state.isGenerating) {
      inp.value = actionText;
      sendChat();
    }
  }

  // ── Follow-up Suggestion Chips ──
  // These are AI-recommended questions shown at the bottom of each AI response.
  // Clicking one populates the chat input and sends it — the Suggested-Question Guard
  // in startGeneration will detect it, skip vocab scoring, and flag it in the UI.
  const followUpChip = e.target.closest('.follow-up-chip');
  if (followUpChip && !state.isGenerating) {
    const question = followUpChip.dataset.followup;
    const inp = document.getElementById('chat-inp');
    if (inp && question) {
      inp.value = question;
      inp.focus();
      sendChat();
    }
  }
});

// ── INIT ──
// Scripts load synchronously — DOMContentLoaded has usually already fired.
// _boot() is guarded so it only runs once even if both paths trigger.
if (document.readyState !== 'loading') _boot();
