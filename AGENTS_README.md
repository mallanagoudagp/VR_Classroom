# VidScholar AI: Agents & Self-Guessing System

> [!NOTE]
> **How to Use This Context (GPT Instructions):**
> If you are a Custom GPT or LLM, use this document to understand the "Dual-Agent" and "Self-Guessing" logic of the VidScholar platform. When generating responses or lesson blueprints, adhere to the student's mastery level as determined by these agents. 

---

## 1. The Dual-Agent Understanding Engine
VidScholar uses a unique two-agent system to calculate a student's **Understanding Score** (0.0 to 1.0).

### **Agent 1: Subject Affinity (The Baseline)**
*   **Source**: Initialized from the student's "favourite subject" during onboarding.
*   **Range**: 0.0 to 0.5.
*   **Logic**: High affinity for a subject seeds a higher baseline confidence, assuming prior interest leads to foundational knowledge.

### **Agent 2: Vocabulary Mastery (The Evaluator)**
*   **Source**: Real-time analysis of the student's natural language prompts.
*   **Logic**: The `analyzePromptVocabulary` function scans for domain-specific terms (NCERT aligned).
*   **Scoring**: Terms are categorized into difficulty levels (Beginner, Intermediate, Advanced).
*   **Scaling**: The raw vocab score (0–1) is scaled by **0.5** to contribute to the final score.

### **The Formula**
```text
Confidence = Agent1(0.0-0.5) + (Agent2 * 0.5) + InteractivityDelta(±0.15)
```
*   **Interactivity Delta**: Real-time adjustments based on "Simplify" (-0.05) or "Go Deeper" (+0.05) button clicks.

---

## 2. Shadow Deployment & Self-Guessing Logic
The "Self-Guessing" system is a transition from **explicit** mathematical profiling to **implicit** AI intuition.

### **The Shadow Pipeline**
1.  **Implicit Prediction**: In every request, the LLM performs a background "guess" of the student's confidence (JSON key: `self_guessed_confidence`).
2.  **Calibration Streak**: The system compares the LLM's guess with the explicit Agent Score.
    *   If the difference is **≤ 5%**, the "Calibration Streak" increments.
    *   If there is a mismatch, the streak resets to zero.
3.  **Graduation**: Once a subject reaches a **3-streak**, it graduates to **"SelfGuessing" Mode**.

### **Self-Guessing Mode**
Once graduated:
*   The **explicit agents are bypassed**.
*   The system retrieves the score directly from the LLM's context.
*   The AI takes full control of the pedagogical depth, as it has proven it "knows" the student's level as well as the agents do.

---

## 3. Fraud Prevention: Suggested-Question Guard
To ensure the Vocabulary Agent stays accurate, VidScholar tracks AI-recommended follow-up questions.
*   If a student clicks a **suggested follow-up**, the vocabulary scoring is **skipped**.
*   This prevents students from "inflating" their mastery by simply repeating advanced terms suggested by the AI.

---

## 4. Implementation Details for GPT representation
When representing this system:
*   **Role**: You are the orchestrator of this dual-mode intelligence.
*   **Output**: Every lesson blueprint MUST include the `self_guessed_confidence` field.
*   **Persona**: Adjust explanations based on the `difficultyLevel` (Auto, Start from scratch, Just the details).
*   **Visuals**: Use the `visualType` (graph, diagram, process, etc.) to drive the Manim animation engine.

---

*Generated for VidScholar Project Context*
