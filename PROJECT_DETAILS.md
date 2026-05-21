# VidScholar — AI Micro-Lecture Generator

VidScholar is a highly personalized, AI-powered interactive educational web application that converts students' questions into 30–90 second animated video explanations. It leverages the Groq LLM API (running a LLaMA 3.3 70B model) to generate pedagogical lesson blueprints, which are then rendered directly inside the browser using a custom-built HTML5 Canvas "Manim-style" animation engine.

## 🎯 Architecture Overview

The application is built entirely as a client-side Single Page Application (SPA), emphasizing high performance, aesthetic polish, and seamless interactions without requiring a robust backend API for its core states beyond LLM inference. All states, progress, and profiles are persistent via `localStorage`.

### Technology Stack
- **Frontend Core**: Vanilla HTML5, CSS3, JavaScript (ES6+). No heavy reactive framework (e.g., React or Vue) is used. Instead, UI updates rely on a custom vanilla JS rendering loop defined in `app.js`.
- **UI & Aesthetics**: Rich aesthetic design featuring glassmorphism, dynamic animations, modern typography (Inter and Space Grotesk Google Fonts), and tailored color themes (blue, green, purple, amber, red).
- **Data Persistence**: `localStorage` JSON blobs with fallback defaults in `data.js`.
- **Animation Engine**: An original vanilla `ManimPlayer` class in `animator.js` that maps LLM-generated JSON blueprints to HTML5 Canvas commands, interpolating keyframes, gradients, and shapes in real-time.
- **AI / LLM Integration**: The `groq.js` file handles communication with the Groq API, sending strongly-typed pedagogical prompts to output JSON-formatted structural lesson plans.

---

## 🏗️ Core Application Files

### 1. `index.html`
The main entry point holding the `<div id="app"></div>` container. It imports external dependencies (like Tesseract.js for potential OCR image data inputs) alongside the core application scripts.

### 2. `js/app.js`
The central nervous system of the SPA, controlling views, states, calculations, and UI event bindings.
- **State Management**: Controls routing (`onboarding`, `dashboard`, `chat`, `lesson`, `history`, `settings`) and global configuration (difficulty level, view modes, student persona role).
- **Dual-Agent Understanding Engine**:
  - Intelligently calculates an overall mastery/confidence score (0–100%) for a student using:
    - **Agent 1 (Subject Affinity)**: Initialized during onboarding based on a student's "favourite subject". (0 to 0.5 points).
    - **Agent 2 (Vocabulary Mastery)**: Based on the complexity of domain terms used by the user. (0 to 0.5 points).
    - **Action Chip Delta**: An accumulated modification clamped at ±0.15 derived from user actions like 'Simplify Explanation' (-0.05) or 'Go Deeper' (+0.05).
- **UI Rendering**: Emits template string HTML structures to render the dashboard layouts, chat bubbles, UI navigation, and user onboarding flow.

### 3. `js/groq.js`
Contains all the logic enabling AI interconnectivity.
- Generates JSON lesson blueprints via the `callGroqForLesson` asynchronous function.
- Implements prompt engineering focused on the NCERT curriculum and the cognitive readiness of an Indian student.
- Adjusts the prompt's `personaInstruction` directly based on the UI difficulty toggles ('Start from scratch', 'Just the details', etc).
- Triggers `callGroqGeneralText` for the global 'Omni-Model' text response bypassing the video generation pipeline.

### 4. `js/animator.js`
A very sophisticated file simulating a lightweight browser-based version of the open-source mathematics animation engine, Manim.
- Defines a `ManimPlayer` ES6 class operating over an HTML5 Canvas context (`requestAnimationFrame`).
- Translates specific visual components—such as `graph`, `equation`, `wave`, `circuit`, `orbit`, `structure`, `comparison`, and `timeline`—from the LLM into animated frame-by-frame primitives using trigonometry and interpolation logic.
- Implements synced Text-to-Speech (TTS) via `window.speechSynthesis` natively.

### 5. `js/data.js`
A centralized repository for state initialization, mock data, and local caching.
- Holds the global `DATA` object storing user credentials, subjects, lesson progress matrices, chat history, understanding scores, and vocabulary states.
- Exposes `saveScoresToStorage()` and `loadScoresFromStorage()` utilities to bind JSON snapshots into the browser's persistent `localStorage`.

### 6. `css/styles.css` (Imported in HTML)
Defines the visual baseline, employing responsive variables, CSS transitions (e.g. `fade-in`), tailored SVGs/gradients, and component specificity mimicking a polished framework structure (like Tailwind) but managed manually to guarantee peak customized visual excellence.

---

## 📈 Feature Highlights

### Student Onboarding
A fluid 3-step UX flow prompting students for their Curriculum Board (e.g. CBSE, ICSE), State (e.g., Karnataka, Maharashtra), Grade (e.g., Class 10), and their favourite foundational subject. Registration is bypassed for friction-free enrollment.

### Contextual Chat Environment
A rich conversational wrapper where users probe the VidScholar AI on different topics. Depending on the query:
1. Video Generator intercepts technical questions to formulate multi-scene lesson animations.
2. The UI allows tweaking "Explanation Levels", injecting context into the LLM logic on-the-fly.

### Real-Time Animation Player
The video player implements playback controls alongside speed multipliers (0.75x, 1x, 1.5x), an animated timescale progress bar synced sequentially from visual actions to Text-To-Speech queues.

---

## 🧪 Testing Environment
TestSprite is designated as the primary automated testing tool. A `code_summary.yaml` exists within the `/testsprite_tests/` directory outlining the specific `routes` and expected `user_interactions`. 
*(Note: Automated verification checks are dynamically gated behind API key verification for TestSprite initialization).*
