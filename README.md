# VidScholar — AI-Powered Video Generation Learning Assistant

VidScholar is a highly personalized, AI-powered interactive educational web application that converts students' questions into 30–90 second animated micro-lectures. It leverages the Groq API (running the **LLaMA 3.3 70B Versatile** model) to generate pedagogical lesson blueprints, which are then rendered directly inside the browser using a custom-built HTML5 Canvas "Manim-style" animation engine.

This document serves as a comprehensive project overview detailing the core technical architecture, the intelligent scoring algorithms, and the dynamic LLM evaluation subsystems.

---

## 🎯 Architecture Overview

The application is built entirely as a client-side Single Page Application (SPA), emphasizing high performance, aesthetic polish, and seamless interactions without requiring a robust backend API for its core states beyond LLM inference.

- **Frontend Core**: Vanilla HTML5, CSS3, JavaScript (ES6+). Custom vanilla JS rendering loop defined in `app.js` replaces the need for heavy reactive frameworks.
- **UI & Aesthetics**: Rich aesthetic design featuring glassmorphism, dynamic animations, modern typography (Inter and Space Grotesk), and tailored color themes (blue, green, purple, amber, red).
- **Data Persistence**: `localStorage` JSON blobs with a versioned `PERSIST_KEY` to handle structure migrations and state hydration securely on physical reloads.
- **LLM Integration (`groq.js`)**: Direct communication mapping strongly-typed, curriculum-aligned pedagogical prompts to structured JSON lesson blueprints.
- **Animation Engine (`animator.js`)**: A custom vanilla `ManimPlayer` class that visually parses video blueprints into geometry, gradients, paths, SVGs, interpolations, and synchronized Text-To-Speech (TTS).

---

## 🧠 The Personalization & Scoring Architecture

A hallmark of VidScholar is the **Dual-Agent Understanding Engine**, which profiles a student’s cognitive readiness and dynamically tracks their interaction history to personalize the UI difficulty and learning paths.

### 1. Dual-Agent Understanding Engine

The system mathematically evaluates a student's mastery using two main agents that formulate a final Confidence Score (`calcUnderstandingScore`):

#### **Agent 1: Subject Affinity (The Baseline)**
*   Initialized during the Onboarding flow.
*   Assigns a static base score ranging from `0.1` to `0.5` depending on whether the subject is declared as the user's favourite (Highest affinity), a loosely related subject (Medium affinity), or a totally unrelated subject (Low affinity).

#### **Agent 2: The Linguistic & Vocabulary Agent**
*   Analyzes the user's typed questions dynamically. Contributes a scaled maximum of `0.5` bounds to the final score. 
*   Uses a **Rolling Average** algorithm (60% weight to current prompt, 40% weight to history) to prevent sudden, volatile jumps in the user's score based on a single question.
*   **Dimensional Scoring:**
    1.  **Domain Term Detection:** Checks against `DOMAIN_VOCAB` identifying beginner, intermediate, and advanced terminology.
    2.  **Spelling Accuracy:** Validates word correctness against a custom ~500-word Common Educational English subset + dynamic mapping of all domain terms. Unknown complex words with vowels receive partial credit (proper nouns/heuristics), whereas consonant-clusters (typos) fail.
    3.  **Sentence Clarity:** Checks structural formatting (capitalization, punctuation, intent words like "how/why", active verbs, and sensible word length).
    4.  **Linguistic Bonus:** A specific mechanism that maxes at `+0.20`. This ensures that a student asking a beautifully structured but incredibly simple question (e.g., *"What is physics?"*) gets rewarded for conceptual clarity even if they didn't use advanced keywords.

#### **Action Chip Delta & Dynamic Headroom Capping**
When a student interacts with helper buttons ("Simplify Explanation", "Go Deeper", "Add Example") or overrides the Explicit Difficulty via the UI, an `actionChipDelta` modifies their score. 
*   **Dynamic Headroom Capping:** The `safeDelta` clamps the modifications dynamically against the current base `(Agent1 + Agent2)`. This ensures that even if a user spans the "Go Deeper" button 50 times, the math mathematically prevents the score from clipping over 100% (1.0) or dropping below 0% (0.0).

---

## 🎭 Shadow Deployment & AI Auto-Guessing

VidScholar experiments with advanced MLops concepts by running a generative LLM evaluation pipeline parallel to the deterministic Dual-Agent system.

### **The LLM Guess Mechanism**
For every micro-lecture generated, the Groq LLaMA model receives a history parameter containing the last 5 interactions. The prompt directs the AI to evaluate the student's tone, context switching, syntax continuity, and specific requests to output a `self_guessed_confidence` integer between `0-100`.

### **Calibration Streaks (Agent vs. LLM)**
Since raw LLMs can hallucinate scoring metrics, VidScholar uses an Agentic Calibration protocol:
1.  **Validation**: The system privately compares the LLM's `self_guessed_confidence` to the mathematical Dual-Agent engine.
2.  **Streak Validation**: If the LLM successfully guesses within a strict `±5%` margin of the mathematical agent for **3 consecutive prompts**, the AI proves its contextual reliability.
3.  **Graduation (Self-Guessing Mode)**: The subject implicitly graduates. The hard mathematical formulas are shut down to save resources, and the platform transitions into `SelfGuessing` mode, fully entrusting the student's visual confidence indicators to the AI's contextual understanding.

---

## 📽️ Lesson Generation Pipeline

When a user submits a valid query in the Subject Chat, the orchestration pipeline activates:

1.  **Pre-processing**: The global history context is bundled. If the query strictly matches a previously suggested *"Follow up"* question, vocabulary tracking is skipped (to prevent AI-assisted score inflation).
2.  **LLM Inference**: Groq processes the parameters (Board, Grade, Targeted Persona) and outputs a structured multi-scene JSON blueprint limiting duration exactly to 35-55 seconds to preserve attention spans.
3.  **Manim Rendering**: Depending on the lesson concept, the animator selects a visual structure `(visualType)`:
    *   *Graph, Wave, Circuit, Process, Structure, Equation, Comparison, Orbit, Timeline, Diagram.*
4.  **Delivery**: The animated SVG, paired with procedural Text-to-Speech narration, is injected into the DOM as a clickable lesson node that can be rewatched dynamically.

---

## 🌐 The Omni-Model Dashboard Interactivity

Separating general platform questions from deep, conceptual micro-lectures guarantees optimized context window usage.

*   **Global Omni-Model Search**: A search bar on the Dashboard leverages a distinct asynchronous fetch channel (`callGroqGeneralText`). It provides real-time, inline textual explanations for broad questions natively on the dashboard, bypassing the complex and expensive video generation pipeline.

---

## 🚀 Key Files & Routing 

*   `index.html`: Entry point & DOM root.
*   `js/app.js`: Central SPA controller, routing, Dual-Agent logic, and `requestAnimationFrame` hooks.
*   `js/groq.js`: Core LLM integration, JSON parsing, prompt engineering, and the Omni-Model API hook.
*   `js/animator.js`: The custom Manim-style HTML5 Canvas simulation architecture and TTS wrapper.
*   `js/data.js`: Central state payload layout, persistence keys, and Subject vocab database.
*   `css/styles.css`: Component architecture relying entirely on cascading specific modular classes.
