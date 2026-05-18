// ── LLM INTEGRATION (Groq API — LLaMA 3.3 70B) ──
const GROQ_API_KEY = localStorage.getItem('GROQ_API_KEY') || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Calls Groq LLM with the student's question and returns a structured lesson blueprint.
 * Pipeline: Student Question → Input Preprocessing → Pedagogical Prompt → LLM → Lesson Blueprint
 */
async function callGroqForLesson(question, subject, grade, board, difficultyLevel) {
  if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
    console.warn('Groq API Key is not set. Falling back to offline local blueprint generator.');
    return null;
  }
  let personaInstruction = "Target an intermediate student who has basic familiarity but needs core conceptual linking.";
  if (difficultyLevel === 'Start from scratch') {
    personaInstruction = "Assume the student is a total beginner with ZERO prior knowledge. Use extremely simple fundamental analogies, the simplest language possible, and focus entirely on foundational building blocks.";
  } else if (difficultyLevel === 'Just the details') {
    personaInstruction = "Assume the student is highly advanced. Skip basic introductions. Jump straight into granular details, specific interactions, advanced formulas, and nuanced applications.";
  }

  const systemPrompt = `You are VidScholar AI, a pedagogical lesson blueprint generator for Indian students.

CONTEXT:
- Student Board: ${board}
- Grade: Class ${grade}
- Subject: ${subject}
- Difficulty Level: ${difficultyLevel}
- Curriculum: NCERT aligned
- Persona Targeting: ${personaInstruction}

TASK: Given the student's question, generate a structured lesson blueprint with a SCENE-BY-SCENE breakdown for creating an animated educational video.

You MUST respond with ONLY valid JSON. Use this exact structure:
{
  "videoTitle": "Concise title (max 60 chars)",
  "duration": "total duration like 0:45",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4"],
  "concept": "Clear 2-3 sentence explanation of the core concept",
  "colorTheme": "one of: blue, green, purple, amber, red",
  "difficulty": "one of: beginner, intermediate, advanced",
  "self_guessed_confidence": "integer between 0-100 guessing the student's mastery of the subject based on their prompt/history",
  "followUp": "A suggested follow-up question",
  "scenes": [
    {
      "id": 1,
      "title": "Scene title (e.g. Introduction)",
      "narration": "What the narrator says during this scene (2-3 sentences, natural spoken style)",
      "visualType": "one of: graph, diagram, equation, process, structure, comparison, wave, circuit, orbit, timeline",
      "elements": ["element1", "element2", "element3", "element4"],
      "formula": "key formula shown in this scene (optional, can be empty string)",
      "durationSec": 8
    }
  ]
}

SCENE RULES:
- Generate exactly 5-7 scenes that build up the concept step by step
- Each scene should have 6-10 seconds duration (durationSec)
- Total video should be 35-55 seconds
- Scene narration should be conversational and easy to understand
- First scene: Introduction/hook to grab attention
- Middle scenes: Build up the concept with visuals
- Last scene: Summary/conclusion with key takeaway
- Each scene should use the most appropriate visualType for its content
- Elements array should contain 3-5 key labels/terms for that scene
- Formula can be empty string if no formula is relevant for that scene

RULES:
- Based solely on the chat history and the user's current query, automatically guess the student's confidence score (0-100). If they say 'I didn't understand' or switch topics abruptly, drastically lower it. Return this integer under the JSON key self_guessed_confidence.
- Tailor vocabulary and depth to Class ${grade} ${board} level
- Keep keyPoints concise (max 15 words each)
- Be pedagogically sound and curriculum-aligned
- Narration should sound like a friendly teacher explaining`;

  // Compile conversation history for context (up to last 2 AI/User interactions, skipping the current prompt just pushed)
  const historyLog = (DATA?.chatHistory?.[subject] || [])
    .slice(-5, -1) // Grab recent context
    .map(m => m.type === 'user' ? `Student: ${m.text}` : `AI Video Concept: ${m.concept || m.videoTitle}`)
    .join('\n');
    
  let userContent = `Student's question: "${question}"`;
  if (historyLog.trim().length > 0) {
    userContent = `PREVIOUS CONVERSATION CONTEXT:\n${historyLog}\n\n---\n\nStudent's current question/action: "${question}"\n\nIf the student is asking to "Go Deeper", "Simplify", or "Add Example", apply it to the MOST RECENT concept discussed in the context above.`;
  }

  const requestBody = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.7,
    max_tokens: 2048,
    response_format: { type: 'json_object' }
  };

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      console.error('No text in Groq response:', data);
      return null;
    }

    // Parse JSON from response
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    const blueprint = JSON.parse(cleaned);

    // Auto-generate scenes if LLM didn't provide them
    if (!blueprint.scenes || blueprint.scenes.length === 0) {
      blueprint.scenes = generateScenesFromBlueprint(blueprint);
    }

    console.log('✅ Groq Lesson Blueprint:', blueprint);
    return blueprint;

  } catch (err) {
    console.error('Groq call failed:', err);
    return null;
  }
}

/**
 * Fallback: auto-generates scenes from a flat blueprint that lacks a scenes array.
 * Creates a 6-scene animated lesson from keyPoints, concept, labels, etc.
 */
function generateScenesFromBlueprint(bp) {
  const title = bp.videoTitle || 'Lesson';
  const keyPoints = bp.keyPoints || [];
  const concept = bp.concept || '';
  const vType = bp.visualType || 'diagram';
  const labels = bp.labels || bp.elements || [];
  const formulas = bp.mathFormulas || [];

  const scenes = [];

  // Scene 1: Introduction
  scenes.push({
    id: 1,
    title: `What is ${title}?`,
    narration: `Let's explore ${title}. ${concept.split('.')[0]}.`,
    visualType: 'diagram',
    elements: labels.slice(0, 4).length > 0 ? [title, ...labels.slice(0, 3)] : [title, 'Concept', 'Theory', 'Application'],
    formula: '',
    durationSec: 8
  });

  // Scene 2-4: Key points (one per scene)
  keyPoints.slice(0, 3).forEach((kp, i) => {
    const visualTypes = ['process', 'structure', 'graph', 'wave', 'comparison', 'timeline'];
    scenes.push({
      id: scenes.length + 1,
      title: kp.length > 40 ? kp.slice(0, 40) + '...' : kp,
      narration: `${kp}. This is an important concept to understand.`,
      visualType: i === 0 ? vType : visualTypes[i % visualTypes.length],
      elements: labels.length > 0 ? labels : [kp.split(' ').slice(0, 2).join(' ')],
      formula: formulas[i] || '',
      durationSec: 8
    });
  });

  // Scene 5: Formulas/equations (if any)
  if (formulas.length > 0) {
    scenes.push({
      id: scenes.length + 1,
      title: 'Key Formulas',
      narration: `The key formula to remember is ${formulas[0]}. This equation connects all the concepts we discussed.`,
      visualType: 'equation',
      elements: labels.length > 0 ? labels : ['Formula', 'Equation'],
      formula: formulas[0],
      durationSec: 7
    });
  }

  // Scene 6: Summary
  scenes.push({
    id: scenes.length + 1,
    title: 'Summary',
    narration: concept || `To summarize, ${title} is a fundamental concept. Remember the key points we covered today.`,
    visualType: 'diagram',
    elements: keyPoints.slice(0, 4).map(k => k.split(' ').slice(0, 3).join(' ')),
    formula: formulas[0] || '',
    durationSec: 8
  });

  return scenes;
}

/**
 * Generates a dynamic Manim-style SVG based on the LLM's lesson blueprint.
 * Visual type, color theme, labels, and formulas all come from the AI response.
 */
function generateDynamicManimSVG(blueprint) {
  const uid = Math.random().toString(36).slice(2, 8);
  const themes = {
    blue:   { primary: '#3b82f6', secondary: '#60a5fa', accent: '#93c5fd', bg1: '#1e3a8a', bg2: '#0f172a' },
    green:  { primary: '#10b981', secondary: '#34d399', accent: '#6ee7b7', bg1: '#064e3b', bg2: '#0f172a' },
    purple: { primary: '#8b5cf6', secondary: '#a78bfa', accent: '#c4b5fd', bg1: '#4c1d95', bg2: '#0f172a' },
    amber:  { primary: '#f59e0b', secondary: '#fbbf24', accent: '#fde68a', bg1: '#78350f', bg2: '#0f172a' },
    red:    { primary: '#ef4444', secondary: '#f87171', accent: '#fca5a5', bg1: '#7f1d1d', bg2: '#0f172a' }
  };
  const t = themes[blueprint.colorTheme] || themes.blue;
  const labels = blueprint.labels || [];
  const formulas = blueprint.mathFormulas || [];
  const vType = blueprint.visualType || 'diagram';

  const header = `<defs>
    <radialGradient id="bg-${uid}" cx="50%" cy="50%" r="55%"><stop offset="0%" style="stop-color:${t.bg1}"/><stop offset="100%" style="stop-color:${t.bg2}"/></radialGradient>
    <filter id="gl-${uid}"><feGaussianBlur stdDeviation="3" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs><rect width="400" height="220" fill="url(#bg-${uid})"/>`;

  const particles = [...Array(5)].map((_, i) =>
    `<circle cx="${40+i*80}" cy="${45+Math.sin(i)*30}" r="2" fill="${t.secondary}" opacity="0.4">
      <animate attributeName="cy" values="${45+Math.sin(i)*30};${30+Math.sin(i)*30};${45+Math.sin(i)*30}" dur="${1.5+i*0.3}s" repeatCount="indefinite"/>
    </circle>`
  ).join('');

  const grid = `<line x1="0" y1="110" x2="400" y2="110" stroke="${t.bg1}" stroke-width="0.8" opacity="0.5"/>
    <line x1="200" y1="0" x2="200" y2="220" stroke="${t.bg1}" stroke-width="0.8" opacity="0.5"/>`;

  const labelsSvg = labels.slice(0, 4).map((l, i) => {
    const positions = [[30, 30], [280, 30], [30, 210], [280, 210]];
    const colors = [t.accent, t.secondary, '#fbbf24', '#34d399'];
    return `<text x="${positions[i][0]}" y="${positions[i][1]}" fill="${colors[i]}" font-size="11" font-family="monospace">${l}</text>`;
  }).join('');

  const formulaSvg = formulas.slice(0, 2).map((f, i) =>
    `<text x="${60 + i * 160}" y="${195 + i * 10}" fill="${i === 0 ? t.secondary : '#fbbf24'}" font-size="${13 - i}" font-family="monospace" font-weight="bold">${f}</text>`
  ).join('');

  let body = '';
  switch (vType) {
    case 'graph':
      body = `${grid}
        <line x1="40" y1="110" x2="360" y2="110" stroke="${t.primary}" stroke-width="2"/>
        <line x1="200" y1="190" x2="200" y2="30" stroke="${t.primary}" stroke-width="2"/>
        <path d="M 60,170 C 120,170 160,50 200,90 C 240,130 300,40 350,60" stroke="${t.secondary}" stroke-width="2.5" fill="none" filter="url(#gl-${uid})" stroke-dasharray="400" stroke-dashoffset="400">
          <animate attributeName="stroke-dashoffset" from="400" to="0" dur="2.5s" fill="freeze"/>
        </path>
        <path d="M 60,170 C 120,170 160,50 200,90 C 240,130 300,40 350,60 L 350,190 L 60,190 Z" fill="${t.primary}" opacity="0.1"/>
        <circle cx="200" cy="90" r="5" fill="${t.secondary}"><animate attributeName="r" values="5;8;5" dur="1.5s" repeatCount="indefinite"/></circle>`;
      break;
    case 'wave':
      body = `${grid}
        <path d="M 20,110 Q 60,50 100,110 Q 140,170 180,110 Q 220,50 260,110 Q 300,170 340,110 Q 360,80 380,110" stroke="${t.secondary}" stroke-width="2.5" fill="none" filter="url(#gl-${uid})">
          <animate attributeName="d" values="M 20,110 Q 60,50 100,110 Q 140,170 180,110 Q 220,50 260,110 Q 300,170 340,110 Q 360,80 380,110;M 20,110 Q 60,170 100,110 Q 140,50 180,110 Q 220,170 260,110 Q 300,50 340,110 Q 360,140 380,110;M 20,110 Q 60,50 100,110 Q 140,170 180,110 Q 220,50 260,110 Q 300,170 340,110 Q 360,80 380,110" dur="2s" repeatCount="indefinite"/>
        </path>
        <line x1="60" y1="55" x2="60" y2="110" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4"/>
        <text x="35" y="50" fill="#fbbf24" font-size="10" font-family="monospace">A</text>
        <line x1="100" y1="185" x2="260" y2="185" stroke="#34d399" stroke-width="1.5"/>
        <text x="165" y="200" fill="#34d399" font-size="10" font-family="monospace">λ</text>`;
      break;
    case 'circuit':
      body = `<rect x="60" y="55" width="280" height="110" rx="10" fill="none" stroke="${t.primary}" stroke-width="2.5"/>
        <rect x="48" y="85" width="24" height="40" rx="3" fill="${t.secondary}"/>
        <text x="50" y="80" fill="${t.secondary}" font-size="10">+</text><text x="50" y="138" fill="${t.secondary}" font-size="10">−</text>
        <rect x="175" y="47" width="50" height="16" rx="3" fill="${t.primary}" opacity="0.8"/>
        <text x="187" y="59" fill="#fff" font-size="10" font-family="monospace">R</text>
        <circle cx="300" cy="110" r="16" fill="none" stroke="#fbbf24" stroke-width="2"><animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/></circle>
        <circle cx="130" cy="55" r="4" fill="${t.accent}"><animate attributeName="cx" values="70;340;340;70;70" dur="3s" repeatCount="indefinite"/><animate attributeName="cy" values="110;110;55;55;110" dur="3s" repeatCount="indefinite"/></circle>`;
      break;
    case 'process':
      const steps = labels.length > 0 ? labels : ['Step 1', 'Step 2', 'Step 3'];
      body = steps.slice(0, 4).map((s, i) => {
        const x = 50 + i * 90;
        return `<rect x="${x}" y="70" width="75" height="50" rx="8" fill="${t.primary}" opacity="${0.6 + i * 0.12}">
          <animate attributeName="opacity" values="${0.4 + i * 0.1};${0.8 + i * 0.05};${0.4 + i * 0.1}" dur="${2 + i * 0.3}s" repeatCount="indefinite"/>
        </rect>
        <text x="${x + 37}" y="100" text-anchor="middle" fill="#fff" font-size="9" font-family="monospace">${s.length > 10 ? s.slice(0, 10) + '..' : s}</text>
        ${i < Math.min(steps.length, 4) - 1 ? `<line x1="${x + 78}" y1="95" x2="${x + 87}" y2="95" stroke="${t.accent}" stroke-width="2"/>` : ''}`;
      }).join('');
      body += `<text x="200" y="155" text-anchor="middle" fill="${t.accent}" font-size="10" font-family="monospace">${blueprint.animationHint ? blueprint.animationHint.slice(0, 50) : 'Process Flow'}</text>`;
      break;
    case 'structure':
      body = `<ellipse cx="200" cy="100" rx="140" ry="75" fill="${t.primary}" opacity="0.12" stroke="${t.primary}" stroke-width="2"/>
        <circle cx="200" cy="90" r="30" fill="${t.primary}" opacity="0.25" stroke="${t.secondary}" stroke-width="2"/>
        <text x="200" y="95" text-anchor="middle" fill="${t.accent}" font-size="11" font-family="monospace">${labels[0] || 'Core'}</text>
        ${(labels.slice(1, 5) || []).map((l, i) => {
          const angle = (i / Math.max(labels.length - 1, 3)) * Math.PI * 2 - Math.PI / 2;
          const rx = 110, ry = 55;
          const cx = 200 + Math.cos(angle) * rx, cy = 90 + Math.sin(angle) * ry;
          return `<circle cx="${cx}" cy="${cy}" r="18" fill="${t.bg1}" stroke="${t.secondary}" stroke-width="1.5"/>
            <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${t.accent}" font-size="8" font-family="monospace">${l.length > 8 ? l.slice(0, 8) : l}</text>
            <line x1="200" y1="90" x2="${cx}" y2="${cy}" stroke="${t.primary}" stroke-width="1" opacity="0.4"/>`;
        }).join('')}`;
      break;
    case 'equation':
      body = `${grid}
        <path d="M 50,180 Q 200,20 350,180" stroke="${t.secondary}" stroke-width="3" fill="none" filter="url(#gl-${uid})" stroke-dasharray="350" stroke-dashoffset="350">
          <animate attributeName="stroke-dashoffset" from="350" to="0" dur="2s" fill="freeze"/>
        </path>
        <circle cx="200" cy="40" r="6" fill="#fbbf24"><animate attributeName="r" values="6;9;6" dur="1.5s" repeatCount="indefinite"/></circle>
        <text x="210" y="50" fill="#fbbf24" font-size="10" font-family="monospace">vertex</text>`;
      break;
    case 'comparison':
      body = `<rect x="30" y="50" width="155" height="120" rx="10" fill="${t.primary}" opacity="0.15" stroke="${t.primary}" stroke-width="1.5"/>
        <rect x="215" y="50" width="155" height="120" rx="10" fill="#10b981" opacity="0.15" stroke="#10b981" stroke-width="1.5"/>
        <text x="107" y="75" text-anchor="middle" fill="${t.accent}" font-size="12" font-family="monospace">${labels[0] || 'Type A'}</text>
        <text x="292" y="75" text-anchor="middle" fill="#6ee7b7" font-size="12" font-family="monospace">${labels[1] || 'Type B'}</text>
        <text x="200" y="45" text-anchor="middle" fill="#fbbf24" font-size="11" font-family="monospace">vs</text>
        ${(labels.slice(2) || []).map((l, i) => `<text x="${i % 2 === 0 ? 107 : 292}" y="${100 + Math.floor(i / 2) * 20}" text-anchor="middle" fill="${t.accent}" font-size="9" font-family="monospace">${l}</text>`).join('')}`;
      break;
    case 'orbit':
      body = `<circle cx="200" cy="110" r="20" fill="${t.secondary}" opacity="0.8"/>
        <ellipse cx="200" cy="110" rx="80" ry="40" fill="none" stroke="${t.primary}" stroke-width="1.5" stroke-dasharray="4" transform="rotate(-15 200 110)"/>
        <ellipse cx="200" cy="110" rx="120" ry="55" fill="none" stroke="${t.accent}" stroke-width="1" stroke-dasharray="4" transform="rotate(10 200 110)"/>
        <circle cx="280" cy="95" r="8" fill="${t.accent}"><animateMotion dur="4s" repeatCount="indefinite"><mpath href="#orb-${uid}"/></animateMotion></circle>
        <ellipse id="orb-${uid}" cx="200" cy="110" rx="80" ry="40" fill="none" transform="rotate(-15 200 110)"/>
        <circle cx="320" cy="120" r="5" fill="#fbbf24"><animateMotion dur="6s" repeatCount="indefinite"><mpath href="#orb2-${uid}"/></animateMotion></circle>
        <ellipse id="orb2-${uid}" cx="200" cy="110" rx="120" ry="55" fill="none" transform="rotate(10 200 110)"/>`;
      break;
    default: // diagram
      body = `${grid}
        <circle cx="200" cy="100" r="50" fill="none" stroke="${t.primary}" stroke-width="2.5">
          <animate attributeName="r" values="50;55;50" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="200" cy="100" r="25" fill="${t.primary}" opacity="0.2"/>
        <text x="200" y="105" text-anchor="middle" fill="${t.accent}" font-size="12" font-family="monospace">${labels[0] || 'Core'}</text>
        ${labels.slice(1, 5).map((l, i) => {
          const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
          const x = 200 + Math.cos(a) * 80, y = 100 + Math.sin(a) * 60;
          return `<line x1="200" y1="100" x2="${x}" y2="${y}" stroke="${t.secondary}" stroke-width="1.5" opacity="0.6"/>
            <text x="${x}" y="${y + 4}" text-anchor="middle" fill="${t.accent}" font-size="9" font-family="monospace">${l}</text>`;
        }).join('')}`;
      break;
  }

  return `<svg class="manim-svg" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">${header}${body}${labelsSvg}${formulaSvg}${particles}</svg>`;
}

// ── OMNI-MODEL GENERAL TEXT FETCHER (Groq) ──
async function callGroqGeneralText(query) {
  if (!GROQ_API_KEY || GROQ_API_KEY.trim() === '') {
    return "To enable live Omni-Model chat answers on the dashboard, please enter your Groq API Key in the **Settings** tab. For now, you can ask subject-related questions in the **Ask AI** tab to use the built-in offline educational engine!";
  }
  const prompt = `You are VidScholar AI, a friendly, ultra-knowledgeable Omni-Model tutor.
The user has asked the following question from the global dashboard:
---
${query}
---
Provide a clear, accurate, and pedagogical textual explanation. 
Keep it structured, engaging, and directly helpful. Do not output JSON. Do not output video scripts. Just answer the question thoroughly in 2-3 short paragraphs formatting with markdown.`;

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    if (!res.ok) throw new Error("Groq API responded with " + res.status);
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (err) {
    console.error("Groq General Model Error:", err);
    return "I'm having trouble connecting to my knowledge base right now. Please try again in a moment!";
  }
}
