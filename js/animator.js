// ── INSTRUCTION-DRIVEN MANIM ANIMATION ENGINE v2 ──
// Universal compositor: the LLM controls WHAT is drawn, the engine controls HOW.

class ManimPlayer {
  constructor(canvasId, blueprint) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.blueprint = blueprint;
    this.scenes = blueprint.scenes || [];
    this.currentScene = 0;
    this.playing = false;
    this.speed = 1;
    this.elapsed = 0;
    this.totalElapsed = 0;
    this.lastFrame = 0;
    this.animId = null;
    this.ttsSupported = 'speechSynthesis' in window;
    this.currentUtterance = null;
    this.transitioning = false;
    this.transitionProgress = 0;
    this.transitionType = 0; // cycles 0,1,2
    this.transitionDuration = 400; // ms
    this.transitionStartTime = 0;
    this.prevSceneSnapshot = null;
    this.speechFinished = false;
    this.speechEndTime = 0;

    // Hit regions for interactive click
    this.hitRegions = [];
    this.hoveredRegion = null;
    this.showDefinition = null; // {x, y, label, text}
    this.definitionAlpha = 0;

    // Did-you-get-it overlay
    this.showDYGI = false;
    this.dygiStartTime = 0;
    this.dygiAlpha = 0;
    this.dygiAutoTimer = null;

    // Camera
    this.cameraScale = 0.85;
    this.cameraX = 0;
    this.cameraY = 0;
    this.sceneStartTime = 0;

    // Starfield for space background
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random(), y: Math.random(),
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.5 + 0.2,
        brightness: Math.random()
      });
    }
    // Bubbles for lab background
    this.bubbles = [];
    for (let i = 0; i < 25; i++) {
      this.bubbles.push({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 6 + 2,
        speed: Math.random() * 0.3 + 0.1,
        wobble: Math.random() * Math.PI * 2
      });
    }
    // Blobs for organic background
    this.blobs = [];
    for (let i = 0; i < 12; i++) {
      this.blobs.push({
        x: Math.random(), y: Math.random(),
        rx: Math.random() * 30 + 15, ry: Math.random() * 20 + 10,
        speed: Math.random() * 0.4 + 0.1,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Color themes
    const themes = {
      blue:   { bg1: '#0f172a', bg2: '#1e3a8a', primary: '#3b82f6', secondary: '#60a5fa', accent: '#93c5fd', text: '#e2e8f0', dim: '#475569' },
      green:  { bg1: '#0f172a', bg2: '#064e3b', primary: '#10b981', secondary: '#34d399', accent: '#6ee7b7', text: '#e2e8f0', dim: '#475569' },
      purple: { bg1: '#0f172a', bg2: '#4c1d95', primary: '#8b5cf6', secondary: '#a78bfa', accent: '#c4b5fd', text: '#e2e8f0', dim: '#475569' },
      amber:  { bg1: '#0f172a', bg2: '#78350f', primary: '#f59e0b', secondary: '#fbbf24', accent: '#fde68a', text: '#e2e8f0', dim: '#475569' },
      red:    { bg1: '#0f172a', bg2: '#7f1d1d', primary: '#ef4444', secondary: '#f87171', accent: '#fca5a5', text: '#e2e8f0', dim: '#475569' }
    };
    this.theme = themes[blueprint.colorTheme] || themes.blue;

    this.totalDuration = this.scenes.reduce((sum, s) => sum + (s.durationSec || 8) * 1000, 0);

    this.canvas.width = 800;
    this.canvas.height = 450;
    this.W = 800;
    this.H = 450;

    // Bind interactive events
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onClick = this._handleClick.bind(this);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('click', this._onClick);

    this.drawScene(0, 0);
  }

  // ── PROGRESS ──
  get progress() {
    let elapsed = 0;
    for (let i = 0; i < this.currentScene; i++) {
      elapsed += (this.scenes[i]?.durationSec || 8) * 1000;
    }
    elapsed += this.elapsed;
    return Math.min(1, elapsed / this.totalDuration);
  }

  get currentTimeStr() {
    let ms = 0;
    for (let i = 0; i < this.currentScene; i++) ms += (this.scenes[i]?.durationSec || 8) * 1000;
    ms += this.elapsed;
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  get totalTimeStr() {
    const s = Math.floor(this.totalDuration / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // ── CONTROLS ──
  play() {
    if (this.playing) return;
    if (this.currentScene >= this.scenes.length) { this.currentScene = 0; this.elapsed = 0; }
    this.playing = true;
    this.lastFrame = performance.now();
    this.sceneStartTime = performance.now();
    this.speakScene(this.currentScene);
    this.loop();
    this.updateControls();
  }

  pause() {
    this.playing = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.stopSpeech();
    this.updateControls();
  }

  togglePlay() { this.playing ? this.pause() : this.play(); }

  setSpeed(spd) {
    this.speed = spd;
    if (!this.canvas) return;
    const wrap = this.canvas.closest('.anim-player-wrap');
    if (wrap) {
      wrap.querySelectorAll('.spd-btn').forEach(b => {
        b.classList.toggle('active-spd', b.textContent.trim() === spd + 'x');
      });
    }
  }

  seek(pct) {
    let target = pct * this.totalDuration;
    let accumulated = 0;
    for (let i = 0; i < this.scenes.length; i++) {
      const dur = (this.scenes[i]?.durationSec || 8) * 1000;
      if (accumulated + dur > target) {
        this.currentScene = i;
        this.elapsed = target - accumulated;
        this.drawScene(i, this.elapsed / dur);
        this.updateControls();
        if (this.playing) { this.stopSpeech(); this.speakScene(i); }
        return;
      }
      accumulated += dur;
    }
  }

  // ── MAIN LOOP ──
  loop() {
    try {
      if (!this.playing) return;
      const now = performance.now();
      const dt = (now - this.lastFrame) * this.speed;
      this.lastFrame = now;

      // Handle transition
      if (this.transitioning) {
        this.transitionProgress = Math.min(1, (now - this.transitionStartTime) / this.transitionDuration);
        if (this.transitionProgress >= 1) {
          this.transitioning = false;
          this.transitionProgress = 0;
        }
      }

      const scene = this.scenes[this.currentScene];
      if (!scene) { this.pause(); return; }

      const sceneDur = (scene.durationSec || 8) * 1000;
      this.elapsed += dt;

      const isVisualDone = this.elapsed >= sceneDur;
      const isSpeechDone = this.speechFinished && (performance.now() - this.speechEndTime >= 500);
      const isSpeechHanging = this.elapsed >= sceneDur + 10000;

      if ((isVisualDone && isSpeechDone) || isSpeechHanging) {
        // Show DYGI overlay
        if (!this.showDYGI && this.currentScene < this.scenes.length - 1) {
          this.showDYGI = true;
          this.dygiStartTime = performance.now();
          this.dygiAlpha = 0;
          // Auto-advance after 2s
          this.dygiAutoTimer = setTimeout(() => {
            this._advanceScene();
          }, 2000);
        }
        if (!this.showDYGI) {
          this._advanceScene();
        }
      }

      // Camera animation
      const sceneAge = now - this.sceneStartTime;
      const introZoom = Math.min(1, sceneAge / 2000);
      this.cameraScale = 0.85 + 0.15 * this._easeOutCubic(introZoom);
      // Subtle drift
      const driftPhase = sceneAge / 3000;
      this.cameraX = Math.sin(driftPhase) * 3;
      this.cameraY = Math.cos(driftPhase * 0.7) * 2;

      const t = Math.min(1, this.elapsed / sceneDur);
      this.drawScene(this.currentScene, t);
      this.updateControls();
      this.animId = requestAnimationFrame(() => this.loop());
    } catch (err) {
      console.error('ManimPlayer loop error:', err);
      this.playing = false;
    }
  }

  _advanceScene() {
    this.showDYGI = false;
    if (this.dygiAutoTimer) { clearTimeout(this.dygiAutoTimer); this.dygiAutoTimer = null; }
    // Snapshot current frame for transition
    this.prevSceneSnapshot = this.ctx.getImageData(0, 0, this.W, this.H);
    this.transitioning = true;
    this.transitionStartTime = performance.now();
    this.transitionType = (this.transitionType + 1) % 3;

    this.elapsed = 0;
    this.currentScene++;
    this.sceneStartTime = performance.now();
    if (this.currentScene >= this.scenes.length) {
      this.playing = false;
      this.currentScene = this.scenes.length - 1;
      this.elapsed = (this.scenes[this.currentScene]?.durationSec || 8) * 1000;
      this.drawScene(this.currentScene, 1);
      this.updateControls();
      return;
    }
    this.speakScene(this.currentScene);
  }

  dygiThumbsUp() {
    if (this.dygiAutoTimer) { clearTimeout(this.dygiAutoTimer); this.dygiAutoTimer = null; }
    // Confidence boost
    if (window.DATA && window.DATA.user) {
      window.DATA.user.lessonsCompleted = (parseInt(window.DATA.user.lessonsCompleted) || 0) + 1;
    }
    this._advanceScene();
  }

  dygiThumbsDown() {
    if (this.dygiAutoTimer) { clearTimeout(this.dygiAutoTimer); this.dygiAutoTimer = null; }
    this.showDYGI = false;
    // Replay current scene at 0.75x
    this.elapsed = 0;
    this.setSpeed(0.75);
    this.speakScene(this.currentScene);
  }

  _easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  _easeInOutQuad(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  // ── RENDER A SCENE ──
  drawScene(idx, t) {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const scene = this.scenes[idx];
    if (!scene) return;
    const th = this.theme;
    this.hitRegions = [];

    ctx.save();

    // Camera transform
    if (this.playing) {
      const cx = W / 2, cy = H / 2;
      ctx.translate(cx, cy);
      ctx.scale(this.cameraScale, this.cameraScale);
      ctx.translate(-cx + this.cameraX, -cy + this.cameraY);
    }

    // Transition effect
    if (this.transitioning && this.prevSceneSnapshot) {
      const tp = this._easeInOutQuad(this.transitionProgress);
      switch (this.transitionType) {
        case 0: // Slide wipe
          ctx.putImageData(this.prevSceneSnapshot, -W * tp, 0);
          ctx.save();
          ctx.translate(W * (1 - tp), 0);
          this._drawSceneContent(ctx, scene, t, W, H, th, idx);
          ctx.restore();
          ctx.restore();
          return;
        case 1: // Zoom burst
          ctx.save();
          const zs = 1 - tp * 0.3;
          ctx.translate(W / 2, H / 2);
          ctx.scale(zs, zs);
          ctx.globalAlpha = 1 - tp;
          ctx.translate(-W / 2, -H / 2);
          ctx.putImageData(this.prevSceneSnapshot, 0, 0);
          ctx.restore();
          // Particle burst
          ctx.globalAlpha = Math.max(0, 1 - tp * 2);
          for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const dist = tp * 200;
            const px = W / 2 + Math.cos(angle) * dist;
            const py = H / 2 + Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(px, py, 3 * (1 - tp), 0, Math.PI * 2);
            ctx.fillStyle = th.accent;
            ctx.fill();
          }
          ctx.globalAlpha = tp;
          this._drawSceneContent(ctx, scene, Math.min(t, tp), W, H, th, idx);
          ctx.globalAlpha = 1;
          ctx.restore();
          return;
        case 2: // Fade flash
          if (tp < 0.4) {
            ctx.putImageData(this.prevSceneSnapshot, 0, 0);
            ctx.fillStyle = `rgba(255,255,255,${tp / 0.4 * 0.8})`;
            ctx.fillRect(0, 0, W, H);
          } else {
            this._drawSceneContent(ctx, scene, Math.min(t, (tp - 0.4) / 0.6), W, H, th, idx);
            ctx.fillStyle = `rgba(255,255,255,${(1 - tp) / 0.6 * 0.6})`;
            ctx.fillRect(0, 0, W, H);
          }
          ctx.restore();
          return;
      }
    }

    this._drawSceneContent(ctx, scene, t, W, H, th, idx);
    ctx.restore();

    // DYGI overlay (drawn outside camera transform)
    if (this.showDYGI) {
      const age = performance.now() - this.dygiStartTime;
      this.dygiAlpha = Math.min(1, age / 300);
      this._drawDYGIOverlay(ctx, W, H, this.dygiAlpha);
    }

    // Definition popup (drawn outside camera transform)
    if (this.showDefinition) {
      this._drawDefinitionPopup(ctx, this.showDefinition, W, H, th);
    }
  }

  _drawSceneContent(ctx, scene, t, W, H, th, idx) {
    const visual = scene.visual || {};
    const bg = visual.background || this._guessBackground(scene);

    // Draw background
    this._drawBackground(ctx, bg, W, H, th, t);

    // Scene counter badge
    ctx.fillStyle = th.primary;
    ctx.globalAlpha = 0.4;
    this.roundRect(ctx, 15, 15, 120, 28, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = th.accent;
    ctx.font = '600 12px "Inter", sans-serif';
    ctx.fillText(`Scene ${idx + 1} / ${this.scenes.length}`, 28, 34);

    // Scene Title
    const titleAlpha = Math.min(1, t * 5);
    ctx.globalAlpha = titleAlpha;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.textAlign = 'center';
    const title = scene.title || `Scene ${idx + 1}`;
    ctx.fillText(title, W / 2, 35);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;

    // Draw visual content
    this.drawVisualContent(ctx, scene, t, W, H, th);

    // Formula
    if (scene.formula) {
      const formulaAlpha = Math.min(1, Math.max(0, (t - 0.3) * 3));
      ctx.globalAlpha = formulaAlpha;
      ctx.fillStyle = th.bg1;
      ctx.globalAlpha = formulaAlpha * 0.75;
      const fW = Math.min(400, ctx.measureText(scene.formula).width + 40);
      this.roundRect(ctx, W / 2 - fW / 2, H - 125, fW, 36, 8);
      ctx.fill();
      ctx.globalAlpha = formulaAlpha;
      ctx.fillStyle = th.accent;
      ctx.font = 'bold 16px "Fira Code", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(scene.formula, W / 2, H - 102);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // Narration bar with keyword highlights
    if (scene.narration) {
      const narAlpha = Math.min(1, Math.max(0, (t - 0.1) * 4));
      ctx.globalAlpha = narAlpha * 0.88;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.roundRect(ctx, 25, H - 75, W - 50, 60, 12);
      ctx.fill();
      ctx.globalAlpha = narAlpha;

      // Get keywords from objects for highlighting
      const keywords = this._getKeywords(scene);
      this._drawHighlightedNarration(ctx, scene.narration, keywords, W / 2, H - 45, W - 80, 17, th);
      ctx.globalAlpha = 1;
    }
  }

  // ── BACKGROUNDS ──
  _guessBackground(scene) {
    // Infer from visualType for backwards-compat old blueprints
    const vt = scene.visualType || '';
    if (['wave', 'circuit', 'orbit', 'projectile', 'pendulum', 'spring', 'lens'].includes(vt)) return 'space';
    if (['atom', 'molecule', 'reaction-arrow', 'energy-diagram', 'state-change'].includes(vt)) return 'lab';
    if (['graph', 'equation', 'graph-curve', 'number-line', 'geometric-shape', 'matrix', 'proof-step'].includes(vt)) return 'grid';
    if (['cell', 'dna-helix', 'food-chain'].includes(vt)) return 'organic';
    return 'dark';
  }

  _drawBackground(ctx, bg, W, H, th, t) {
    const now = Date.now();
    switch (bg) {
      case 'space':
        // Deep space gradient
        const spGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.8);
        spGrad.addColorStop(0, '#0c0e2b');
        spGrad.addColorStop(0.5, '#0a0f2e');
        spGrad.addColorStop(1, '#050816');
        ctx.fillStyle = spGrad;
        ctx.fillRect(0, 0, W, H);
        // Nebula glow
        ctx.globalAlpha = 0.08 + Math.sin(now / 3000) * 0.03;
        const nebGrad = ctx.createRadialGradient(W * 0.3, H * 0.4, 30, W * 0.3, H * 0.4, 250);
        nebGrad.addColorStop(0, '#4338ca');
        nebGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        // Parallax starfield
        this.stars.forEach(s => {
          const px = ((s.x * W + now * s.speed * 0.01) % W + W) % W;
          const py = ((s.y * H + now * s.speed * 0.005) % H + H) % H;
          const br = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(now / 500 + s.brightness * 10));
          ctx.beginPath();
          ctx.arc(px, py, s.size * br, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,210,255,${br * 0.7})`;
          ctx.fill();
        });
        // Coordinate grid (subtle)
        ctx.strokeStyle = th.primary;
        ctx.globalAlpha = 0.04;
        ctx.lineWidth = 0.5;
        for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.globalAlpha = 1;
        break;

      case 'lab':
        // Dark lab floor gradient
        const labGrad = ctx.createLinearGradient(0, 0, 0, H);
        labGrad.addColorStop(0, '#0a1628');
        labGrad.addColorStop(1, '#0d1f1a');
        ctx.fillStyle = labGrad;
        ctx.fillRect(0, 0, W, H);
        // Hexagonal tile pattern
        ctx.strokeStyle = '#10b981';
        ctx.globalAlpha = 0.06;
        ctx.lineWidth = 1;
        const hexSize = 35;
        for (let row = -1; row < H / (hexSize * 1.5) + 1; row++) {
          for (let col = -1; col < W / (hexSize * 1.73) + 1; col++) {
            const cx = col * hexSize * 1.73 + (row % 2 ? hexSize * 0.866 : 0);
            const cy = row * hexSize * 1.5;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = Math.PI / 3 * i - Math.PI / 6;
              const hx = cx + hexSize * Math.cos(angle);
              const hy = cy + hexSize * Math.sin(angle);
              i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
        // Green edge glow
        ctx.globalAlpha = 0.06;
        const edgeGrad = ctx.createRadialGradient(0, H, 10, 0, H, 300);
        edgeGrad.addColorStop(0, '#10b981');
        edgeGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = edgeGrad;
        ctx.fillRect(0, 0, W, H);
        const edgeGrad2 = ctx.createRadialGradient(W, 0, 10, W, 0, 300);
        edgeGrad2.addColorStop(0, '#10b981');
        edgeGrad2.addColorStop(1, 'transparent');
        ctx.fillStyle = edgeGrad2;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        // Rising bubbles
        this.bubbles.forEach(b => {
          const bx = b.x * W + Math.sin(now / 1000 + b.wobble) * 15;
          const by = ((b.y * H - now * b.speed * 0.02) % H + H) % H;
          ctx.beginPath();
          ctx.arc(bx, by, b.r, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(16,185,129,0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(bx - b.r * 0.3, by - b.r * 0.3, b.r * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16,185,129,0.1)';
          ctx.fill();
        });
        break;

      case 'grid':
        // Math grid background
        ctx.fillStyle = '#0c0f1d';
        ctx.fillRect(0, 0, W, H);
        // Graph paper grid
        const gridAlpha = 0.07 + Math.sin(now / 5000) * 0.02;
        ctx.strokeStyle = '#3b82f6';
        ctx.globalAlpha = gridAlpha;
        ctx.lineWidth = 0.5;
        const gridSize = 30;
        for (let x = 0; x < W; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        // Major axes
        ctx.globalAlpha = gridAlpha * 3;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
        ctx.globalAlpha = 1;
        // Faint geometric shapes rotating in corners
        ctx.strokeStyle = '#8b5cf6';
        ctx.globalAlpha = 0.04;
        ctx.lineWidth = 1;
        const rot = now / 8000;
        ctx.save();
        ctx.translate(80, 80);
        ctx.rotate(rot);
        ctx.strokeRect(-25, -25, 50, 50);
        ctx.restore();
        ctx.save();
        ctx.translate(W - 80, H - 80);
        ctx.rotate(-rot * 0.7);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
          i === 0 ? ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30) : ctx.lineTo(Math.cos(a) * 30, Math.sin(a) * 30);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
        break;

      case 'organic':
        // Warm organic gradient
        const bioGrad = ctx.createRadialGradient(W * 0.4, H * 0.5, 50, W * 0.4, H * 0.5, W * 0.8);
        bioGrad.addColorStop(0, '#1a2e1a');
        bioGrad.addColorStop(0.5, '#0f1f12');
        bioGrad.addColorStop(1, '#0a1208');
        ctx.fillStyle = bioGrad;
        ctx.fillRect(0, 0, W, H);
        // Flowing amber/green gradient overlay
        ctx.globalAlpha = 0.05 + Math.sin(now / 4000) * 0.02;
        const warmGrad = ctx.createLinearGradient(0, 0, W, H);
        warmGrad.addColorStop(0, '#f59e0b');
        warmGrad.addColorStop(0.5, '#10b981');
        warmGrad.addColorStop(1, '#065f46');
        ctx.fillStyle = warmGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
        // Floating cell-membrane blobs
        this.blobs.forEach(b => {
          const bx = b.x * W + Math.sin(now / 2000 + b.phase) * 20;
          const by = b.y * H + Math.cos(now / 2500 + b.phase) * 15;
          ctx.beginPath();
          ctx.ellipse(bx, by, b.rx, b.ry, now / 5000 + b.phase, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(16,185,129,0.04)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(52,211,153,0.08)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        break;

      default: // 'dark'
        const dkGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
        dkGrad.addColorStop(0, th.bg2);
        dkGrad.addColorStop(1, th.bg1);
        ctx.fillStyle = dkGrad;
        ctx.fillRect(0, 0, W, H);
        // Subtle grid
        ctx.strokeStyle = th.primary;
        ctx.globalAlpha = 0.05;
        ctx.lineWidth = 0.5;
        for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.globalAlpha = 1;
        // Floating particles
        for (let i = 0; i < 10; i++) {
          const px = (60 + i * 80 + Math.sin(now / 1000 + i) * 20) % W;
          const py = (50 + Math.sin(now / 1500 + i * 2) * 30);
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fillStyle = th.secondary;
          ctx.globalAlpha = 0.2 + 0.15 * Math.sin(now / 800 + i);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
    }
  }

  // ── UNIVERSAL COMPOSITOR ──
  drawVisualContent(ctx, scene, t, W, H, th) {
    const visual = scene.visual;

    // New instruction-driven path
    if (visual && visual.objects && visual.objects.length > 0) {
      const objects = visual.objects;
      const animMode = visual.animation || 'sequential';

      objects.forEach((obj, i) => {
        let objT;
        if (animMode === 'simultaneous') {
          objT = Math.min(1, t * 2.5);
        } else if (animMode === 'staggered') {
          const delay = i * 0.08;
          objT = Math.min(1, Math.max(0, (t - delay) * 2.5));
        } else { // sequential
          const delay = i / objects.length * 0.5;
          objT = Math.min(1, Math.max(0, (t - delay) * 2.5));
        }
        this.drawObject(ctx, obj, objT, W, H, th, scene);
      });

      // Annotations
      (visual.annotations || []).forEach((ann, i) => {
        const annT = Math.min(1, Math.max(0, (t - 0.5) * 3));
        this.drawAnnotation(ctx, ann, annT, W, H, th);
      });
      return;
    }

    // Legacy path — old visualType-based rendering
    const elements = scene.elements || [];
    const vType = scene.visualType || 'diagram';
    const animT = Math.min(1, t * 2.5);

    switch (vType) {
      case 'graph': this._legacyGraph(ctx, scene, animT, W, H, th); break;
      case 'equation': this._legacyEquation(ctx, scene, animT, W, H, th); break;
      case 'process': this._legacyProcess(ctx, scene, animT, W, H, th, elements); break;
      case 'structure': this._legacyStructure(ctx, scene, animT, W, H, th, elements); break;
      case 'comparison': this._legacyComparison(ctx, scene, animT, W, H, th, elements); break;
      case 'wave': this._legacyWave(ctx, scene, animT, W, H, th); break;
      case 'circuit': this._legacyCircuit(ctx, scene, animT, W, H, th); break;
      case 'orbit': this._legacyOrbit(ctx, scene, animT, W, H, th, elements); break;
      case 'timeline': this._legacyTimeline(ctx, scene, animT, W, H, th, elements); break;
      default: this._legacyDiagram(ctx, scene, animT, W, H, th, elements); break;
    }
  }

  // ── DRAW OBJECT (25 kinds) ──
  drawObject(ctx, obj, t, W, H, th, scene) {
    if (t <= 0) return;
    ctx.globalAlpha = Math.min(1, t * 2);

    switch (obj.kind) {
      case 'force-arrow':     this.drawForceArrow(ctx, obj, t, W, H, th); break;
      case 'projectile':      this.drawProjectile(ctx, obj, t, W, H, th); break;
      case 'wave':            this.drawWaveObj(ctx, obj, t, W, H, th); break;
      case 'circuit':         this.drawCircuitObj(ctx, obj, t, W, H, th); break;
      case 'orbit-system':    this.drawOrbitSystem(ctx, obj, t, W, H, th); break;
      case 'pendulum':        this.drawPendulum(ctx, obj, t, W, H, th); break;
      case 'spring':          this.drawSpring(ctx, obj, t, W, H, th); break;
      case 'lens':            this.drawLens(ctx, obj, t, W, H, th); break;
      case 'atom':            this.drawAtom(ctx, obj, t, W, H, th); break;
      case 'molecule':        this.drawMolecule(ctx, obj, t, W, H, th); break;
      case 'reaction-arrow':  this.drawReactionArrow(ctx, obj, t, W, H, th); break;
      case 'periodic-element':this.drawPeriodicElement(ctx, obj, t, W, H, th); break;
      case 'energy-diagram':  this.drawEnergyDiagram(ctx, obj, t, W, H, th); break;
      case 'state-change':    this.drawStateChange(ctx, obj, t, W, H, th); break;
      case 'graph-curve':     this.drawGraphCurve(ctx, obj, t, W, H, th); break;
      case 'number-line':     this.drawNumberLine(ctx, obj, t, W, H, th); break;
      case 'geometric-shape': this.drawGeometricShape(ctx, obj, t, W, H, th); break;
      case 'matrix':          this.drawMatrix(ctx, obj, t, W, H, th); break;
      case 'venn-diagram':    this.drawVennDiagram(ctx, obj, t, W, H, th); break;
      case 'bar-chart':       this.drawBarChart(ctx, obj, t, W, H, th); break;
      case 'proof-step':      this.drawProofStep(ctx, obj, t, W, H, th); break;
      case 'cell':            this.drawCell(ctx, obj, t, W, H, th); break;
      case 'dna-helix':       this.drawDNAHelix(ctx, obj, t, W, H, th); break;
      case 'food-chain':      this.drawFoodChain(ctx, obj, t, W, H, th); break;
      case 'rectangle':       this.drawRectangleObj(ctx, obj, t, W, H, th); break;
      case 'arrow':           this.drawArrowObj(ctx, obj, t, W, H, th); break;
      case 'callout':         this.drawCallout(ctx, obj, t, W, H, th); break;
      case 'icon-label':      this.drawIconLabel(ctx, obj, t, W, H, th); break;
      case 'text-block':      this.drawTextBlock(ctx, obj, t, W, H, th); break;
      case 'image-placeholder':this.drawImagePlaceholder(ctx, obj, t, W, H, th); break;
      default:                this.drawFallbackObj(ctx, obj, t, W, H, th); break;
    }
    ctx.globalAlpha = 1;
  }

  // Coordinate helper: percent to pixel
  _px(pct, dim) { return (pct / 100) * dim; }
  _x(pct) { return this._px(pct, this.W); }
  _y(pct) { return this._px(pct, this.H); }

  // ════════════════════════════════════════════════════════
  // ── PHYSICS PRIMITIVES ──
  // ════════════════════════════════════════════════════════

  drawForceArrow(ctx, obj, t, W, H, th) {
    const x = this._x(obj.x || 50);
    const y = this._y(obj.y || 50);
    const len = (obj.magnitude || 60) * t * 1.5;
    const color = obj.color || th.secondary;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', purple: '#8b5cf6', white: '#ffffff' };
    const c = colorMap[color] || color;

    let ex = x, ey = y;
    const dir = obj.direction || 'right';
    switch (dir) {
      case 'right': ex = x + len; break;
      case 'left': ex = x - len; break;
      case 'up': ey = y - len; break;
      case 'down': ey = y + len; break;
    }

    ctx.save();
    ctx.strokeStyle = c;
    ctx.lineWidth = 3;
    ctx.shadowColor = c;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arrowhead
    const angle = Math.atan2(ey - y, ex - x);
    const headLen = 12;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4));
    ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();

    // Label
    if (obj.label) {
      ctx.fillStyle = c;
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      const lx = (x + ex) / 2 + (dir === 'up' || dir === 'down' ? 50 : 0);
      const ly = (y + ey) / 2 + (dir === 'left' || dir === 'right' ? -12 : 0);
      ctx.fillText(obj.label, lx, ly);
      this._registerHit(lx - 30, ly - 10, 60, 20, obj.label, obj.label);
    }
    ctx.restore();
  }

  drawProjectile(ctx, obj, t, W, H, th) {
    const sx = this._x(obj.startX || 10);
    const sy = this._y(obj.startY || 80);
    const angle = (obj.angle || 45) * Math.PI / 180;
    const v = obj.velocity || 100;
    const c = obj.color || th.secondary;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b' };
    const col = colorMap[c] || c;

    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const steps = Math.floor(50 * t);
    for (let i = 0; i <= steps; i++) {
      const tt = i / 50 * 2;
      const px = sx + v * Math.cos(angle) * tt * 2;
      const py = sy - (v * Math.sin(angle) * tt - 0.5 * 50 * tt * tt) * 1.5;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Ball at current position
    const ct = t * 2;
    const bx = sx + v * Math.cos(angle) * ct * 2;
    const by = sy - (v * Math.sin(angle) * ct - 0.5 * 50 * ct * ct) * 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.shadowBlur = 10;
    ctx.shadowColor = col;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (obj.label) {
      ctx.fillStyle = '#fff';
      ctx.font = '11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, bx, by - 14);
    }
    ctx.restore();
  }

  drawWaveObj(ctx, obj, t, W, H, th) {
    const amp = (obj.amplitude || 50) * 0.8;
    const freq = obj.frequency || 2;
    const baseY = this._y(obj.y || 50);
    const phase = obj.phase || 0;
    const c = obj.color || th.secondary;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', purple: '#8b5cf6' };
    const col = colorMap[c] || c;

    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 6;
    ctx.shadowColor = col;
    ctx.beginPath();
    const drawWidth = (W - 100) * t;
    for (let x = 0; x <= drawWidth; x += 2) {
      const wx = 50 + x;
      const wy = baseY + Math.sin((x / (W - 100)) * Math.PI * 2 * freq + phase + Date.now() / 500) * amp;
      x === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Amplitude marker
    if (t > 0.3) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(80, baseY - amp);
      ctx.lineTo(80, baseY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('Amplitude', 90, baseY - amp + 12);
    }

    if (obj.label) {
      ctx.fillStyle = col;
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, W / 2, baseY + amp + 30);
      this._registerHit(W / 2 - 40, baseY + amp + 18, 80, 16, obj.label, obj.label);
    }
    ctx.restore();
  }

  drawCircuitObj(ctx, obj, t, W, H, th) {
    const cx = W / 2, cy = H / 2 - 10;
    const components = obj.components || ['battery', 'resistor', 'bulb'];
    const labels = obj.labels || [];

    ctx.save();
    // Main loop
    ctx.strokeStyle = th.primary;
    ctx.lineWidth = 3;
    this.roundRect(ctx, cx - 200, cy - 70, 400, 140, 15);
    ctx.stroke();

    // Battery
    if (components.includes('battery')) {
      ctx.fillStyle = th.secondary;
      ctx.fillRect(cx - 210, cy - 20, 20, 40);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('+', cx - 216, cy - 25);
      ctx.fillText('−', cx - 216, cy + 35);
      this._registerHit(cx - 215, cy - 25, 30, 50, 'Battery', 'Source of electrical energy');
    }

    // Resistor
    if (components.includes('resistor')) {
      ctx.fillStyle = th.primary;
      this.roundRect(ctx, cx - 30, cy - 80, 60, 20, 5);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(labels[0] || 'R', cx, cy - 66);
      ctx.textAlign = 'left';
      this._registerHit(cx - 30, cy - 80, 60, 20, 'Resistor', 'Opposes current flow');
    }

    // Bulb
    if (components.includes('bulb')) {
      const bulbGlow = 0.4 + Math.sin(Date.now() / 300) * 0.3;
      ctx.beginPath();
      ctx.arc(cx + 150, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251,191,36,${bulbGlow})`;
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💡', cx + 150, cy + 6);
      ctx.textAlign = 'left';
      this._registerHit(cx + 128, cy - 22, 44, 44, 'Bulb', 'Converts electrical energy to light');
    }

    // Electron animation
    const angle = (Date.now() / 1000) * Math.PI * t;
    const ex = cx + Math.cos(angle) * 180;
    const ey = cy + Math.sin(angle) * 60;
    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fillStyle = th.accent;
    ctx.shadowBlur = 12;
    ctx.shadowColor = th.accent;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawOrbitSystem(ctx, obj, t, W, H, th) {
    const cx = this._x(obj.x || 50);
    const cy = this._y(obj.y || 50);
    const central = obj.centralBody || 'Sun';
    const orbitals = obj.orbitals || [{ label: 'Planet', radius: 30, color: th.accent, speed: 1 }];

    ctx.save();
    // Central body
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = th.secondary;
    ctx.shadowBlur = 25;
    ctx.shadowColor = th.secondary;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(central.length > 8 ? central.slice(0, 8) : central, cx, cy + 4);
    this._registerHit(cx - 22, cy - 22, 44, 44, central, central);

    orbitals.forEach((orb, i) => {
      const r = (orb.radius || 30 + i * 25) * 2;
      const speed = orb.speed || 1;
      const c = orb.color || [th.accent, '#fbbf24', '#34d399', '#f87171'][i % 4];

      // Orbit ring
      ctx.strokeStyle = th.primary;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3 * t;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = t;

      // Orbiting body
      const angle = Date.now() / (800 + i * 300) * speed;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();

      if (orb.label) {
        ctx.fillStyle = c;
        ctx.font = '10px "Inter", sans-serif';
        ctx.fillText(orb.label.length > 10 ? orb.label.slice(0, 10) : orb.label, px, py - 14);
      }
    });
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawPendulum(ctx, obj, t, W, H, th) {
    const pivotX = this._x(obj.x || 50);
    const pivotY = this._y(obj.y || 20);
    const length = (obj.length || 60) * 2.5;
    const maxAngle = (obj.angle || 30) * Math.PI / 180;
    const c = obj.color || th.secondary;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b' };
    const col = colorMap[c] || c;

    const swingAngle = maxAngle * Math.sin(Date.now() / 600) * t;
    const bobX = pivotX + Math.sin(swingAngle) * length;
    const bobY = pivotY + Math.cos(swingAngle) * length;

    ctx.save();
    // Pivot
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = th.dim;
    ctx.fill();
    // String
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();
    // Bob
    ctx.beginPath();
    ctx.arc(bobX, bobY, 14, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.shadowBlur = 10;
    ctx.shadowColor = col;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Angle arc
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 30, Math.PI / 2 - maxAngle, Math.PI / 2 + maxAngle);
    ctx.stroke();

    if (obj.label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, pivotX, pivotY - 15);
    }
    ctx.restore();
  }

  drawSpring(ctx, obj, t, W, H, th) {
    const x = this._x(obj.x || 20);
    const y = this._y(obj.y || 50);
    const compression = obj.compression || 'natural';
    const c = obj.color || th.secondary;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981' };
    const col = colorMap[c] || c;

    const baseLen = 150;
    let len = baseLen;
    if (compression === 'compressed') len = baseLen * 0.5;
    else if (compression === 'extended') len = baseLen * 1.5;

    // Animated spring compression/extension
    const animLen = baseLen + (len - baseLen) * t;

    ctx.save();
    // Walls
    ctx.fillStyle = th.dim;
    ctx.fillRect(x - 5, y - 20, 5, 40);
    ctx.fillRect(x + animLen, y - 20, 5, 40);

    // Spring coils
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const coils = 8;
    for (let i = 0; i <= coils * 4; i++) {
      const px = x + (i / (coils * 4)) * animLen;
      const py = y + Math.sin(i * Math.PI / 2) * 12;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    if (obj.label) {
      ctx.fillStyle = '#fff';
      ctx.font = '11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, x + animLen / 2, y + 35);
    }
    ctx.restore();
  }

  drawLens(ctx, obj, t, W, H, th) {
    const cx = this._x(obj.x || 50);
    const cy = this._y(obj.y || 50);
    const lensType = obj.lensType || 'convex';
    const showRays = obj.showRays !== false;

    ctx.save();
    // Lens
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    if (lensType === 'convex') {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 12, 80, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 80);
      ctx.quadraticCurveTo(cx + 5, cy, cx - 8, cy + 80);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 8, cy - 80);
      ctx.quadraticCurveTo(cx - 5, cy, cx + 8, cy + 80);
      ctx.stroke();
    }

    // Principal axis
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx - 250, cy);
    ctx.lineTo(cx + 250, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Light rays
    if (showRays && t > 0.2) {
      const rayT = Math.min(1, (t - 0.2) * 2);
      const rays = [
        { sy: cy - 40, color: '#ef4444' },
        { sy: cy, color: '#10b981' },
        { sy: cy + 40, color: '#3b82f6' }
      ];
      rays.forEach(ray => {
        ctx.strokeStyle = ray.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = rayT;
        // Incoming ray
        ctx.beginPath();
        ctx.moveTo(cx - 200 * rayT, ray.sy);
        ctx.lineTo(cx, ray.sy);
        ctx.stroke();
        // Refracted ray
        if (lensType === 'convex') {
          ctx.beginPath();
          ctx.moveTo(cx, ray.sy);
          ctx.lineTo(cx + 150 * rayT, cy);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(cx, ray.sy);
          ctx.lineTo(cx + 150 * rayT, ray.sy + (ray.sy - cy) * 0.5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
    }

    if (obj.label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, cx, cy + 100);
    }
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════
  // ── CHEMISTRY PRIMITIVES ──
  // ════════════════════════════════════════════════════════

  drawAtom(ctx, obj, t, W, H, th) {
    const cx = this._x(obj.x || 50);
    const cy = this._y(obj.y || 50);
    const symbol = obj.symbol || 'X';
    const atomicNum = obj.atomicNumber || '';

    ctx.save();
    // Nucleus
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    const nucGrad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 20);
    nucGrad.addColorStop(0, '#fbbf24');
    nucGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = nucGrad;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fbbf24';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Symbol
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(symbol, cx, cy + 6);

    // Electron orbitals
    if (obj.showOrbitals !== false) {
      const orbits = [40, 65, 90];
      orbits.forEach((r, i) => {
        if (i >= 3) return;
        ctx.strokeStyle = th.secondary;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3 * t;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r * t, r * 0.4 * t, i * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = t;
        // Electrons
        const electrons = [2, Math.min(8, parseInt(atomicNum) || 2), 1][i] || 1;
        for (let e = 0; e < Math.min(electrons, 4); e++) {
          const ea = Date.now() / (400 + i * 200) + e * (Math.PI * 2 / electrons);
          const ex = cx + Math.cos(ea) * r;
          const ey = cy + Math.sin(ea) * r * 0.4;
          ctx.beginPath();
          ctx.arc(ex, ey, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#60a5fa';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#60a5fa';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }
    this._registerHit(cx - 25, cy - 25, 50, 50, symbol, `Element: ${obj.element || symbol}`);
    ctx.restore();
  }

  drawMolecule(ctx, obj, t, W, H, th) {
    const atoms = obj.atoms || [{ symbol: 'O', x: 50, y: 50 }, { symbol: 'H', x: 35, y: 60 }, { symbol: 'H', x: 65, y: 60 }];
    const bonds = obj.bonds || [];
    const atomColors = { H: '#e2e8f0', O: '#ef4444', N: '#3b82f6', C: '#475569', S: '#fbbf24', Cl: '#10b981', Na: '#a78bfa', Fe: '#f97316' };

    ctx.save();
    // Draw bonds first
    bonds.forEach(b => {
      const from = atoms[b.from] || atoms[0];
      const to = atoms[b.to] || atoms[1];
      const fx = this._x(from.x), fy = this._y(from.y);
      const tx = this._x(to.x), ty = this._y(to.y);
      const bondType = b.type || 'single';
      const offset = bondType === 'double' ? 3 : bondType === 'triple' ? 5 : 0;

      ctx.strokeStyle = th.dim;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = t;

      if (bondType === 'single' || bondType === 'double' || bondType === 'triple') {
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
      }
      if (bondType === 'double' || bondType === 'triple') {
        const angle = Math.atan2(ty - fy, tx - fx) + Math.PI / 2;
        const dx = Math.cos(angle) * offset, dy = Math.sin(angle) * offset;
        ctx.beginPath(); ctx.moveTo(fx + dx, fy + dy); ctx.lineTo(tx + dx, ty + dy); ctx.stroke();
      }
      if (bondType === 'triple') {
        const angle = Math.atan2(ty - fy, tx - fx) + Math.PI / 2;
        const dx = Math.cos(angle) * -offset, dy = Math.sin(angle) * -offset;
        ctx.beginPath(); ctx.moveTo(fx + dx, fy + dy); ctx.lineTo(tx + dx, ty + dy); ctx.stroke();
      }
    });

    // Draw atoms
    atoms.forEach(a => {
      const ax = this._x(a.x), ay = this._y(a.y);
      const color = atomColors[a.symbol] || th.secondary;
      ctx.beginPath();
      ctx.arc(ax, ay, 18, 0, Math.PI * 2);
      const aGrad = ctx.createRadialGradient(ax - 4, ay - 4, 2, ax, ay, 18);
      aGrad.addColorStop(0, color);
      aGrad.addColorStop(1, this._darkenColor(color, 0.4));
      ctx.fillStyle = aGrad;
      ctx.globalAlpha = t;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(a.symbol, ax, ay + 5);
      this._registerHit(ax - 18, ay - 18, 36, 36, a.symbol, `Atom: ${a.symbol}`);
    });

    if (obj.name) {
      ctx.globalAlpha = t;
      ctx.fillStyle = th.accent;
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.name, this.W / 2, this._y(85));
    }
    ctx.restore();
  }

  drawReactionArrow(ctx, obj, t, W, H, th) {
    const reactants = obj.reactants || ['A', 'B'];
    const products = obj.products || ['C'];
    const cy = this._y(obj.y || 50);

    ctx.save();
    // Reactants
    const rWidth = reactants.length * 60;
    const rStart = W / 2 - rWidth - 40;
    reactants.forEach((r, i) => {
      const rx = rStart + i * 60;
      ctx.globalAlpha = Math.min(1, t * 3);
      ctx.fillStyle = th.primary;
      this.roundRect(ctx, rx, cy - 20, 50, 40, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(r, rx + 25, cy + 5);
      if (i < reactants.length - 1) {
        ctx.fillStyle = th.text;
        ctx.fillText('+', rx + 55, cy + 5);
      }
    });

    // Arrow
    ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.3) * 3));
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 3;
    const arrowStart = W / 2 - 30;
    const arrowEnd = W / 2 + 30;
    ctx.beginPath();
    ctx.moveTo(arrowStart, cy);
    ctx.lineTo(arrowEnd, cy);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle = th.accent;
    ctx.beginPath();
    ctx.moveTo(arrowEnd, cy);
    ctx.lineTo(arrowEnd - 10, cy - 6);
    ctx.lineTo(arrowEnd - 10, cy + 6);
    ctx.closePath();
    ctx.fill();
    if (obj.label) {
      ctx.fillStyle = th.text;
      ctx.font = '10px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, W / 2, cy - 18);
    }

    // Products
    const pStart = W / 2 + 50;
    products.forEach((p, i) => {
      const px = pStart + i * 60;
      ctx.globalAlpha = Math.min(1, Math.max(0, (t - 0.5) * 3));
      ctx.fillStyle = '#10b981';
      this.roundRect(ctx, px, cy - 20, 50, 40, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p, px + 25, cy + 5);
      if (i < products.length - 1) {
        ctx.fillStyle = th.text;
        ctx.fillText('+', px + 55, cy + 5);
      }
    });
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawPeriodicElement(ctx, obj, t, W, H, th) {
    const cx = this._x(obj.x || 50);
    const cy = this._y(obj.y || 50);
    const w = 100, h = 120;

    ctx.save();
    ctx.globalAlpha = t;
    // Card
    const catColors = { metal: '#3b82f6', nonmetal: '#10b981', metalloid: '#8b5cf6', noble: '#f59e0b' };
    const bgColor = catColors[obj.category] || th.primary;
    ctx.fillStyle = bgColor;
    ctx.globalAlpha = t * 0.2;
    this.roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10);
    ctx.fill();
    ctx.globalAlpha = t;
    ctx.strokeStyle = bgColor;
    ctx.lineWidth = 2;
    this.roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10);
    ctx.stroke();

    // Atomic number
    ctx.fillStyle = th.dim;
    ctx.font = '12px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(obj.atomicNumber || '', cx - w / 2 + 10, cy - h / 2 + 20);

    // Symbol
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj.symbol || '?', cx, cy + 5);

    // Name
    ctx.fillStyle = th.text;
    ctx.font = '11px "Inter", sans-serif';
    ctx.fillText(obj.name || '', cx, cy + 30);

    // Atomic mass
    ctx.fillStyle = th.dim;
    ctx.font = '10px "Inter", sans-serif';
    ctx.fillText(obj.atomicMass || '', cx, cy + h / 2 - 10);
    ctx.textAlign = 'left';

    this._registerHit(cx - w / 2, cy - h / 2, w, h, obj.symbol || '?', `${obj.name || ''} (${obj.atomicNumber || ''})`);
    ctx.restore();
  }

  drawEnergyDiagram(ctx, obj, t, W, H, th) {
    const ox = 100, oy = H - 120;
    const gw = W - 200, gh = 200;
    const reactLevel = (obj.reactantLevel || 60) / 100;
    const prodLevel = (obj.productLevel || 40) / 100;
    const actEnergy = (obj.activationEnergy || 80) / 100;

    ctx.save();
    // Axes
    ctx.strokeStyle = th.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + gw, oy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy - gh);
    ctx.stroke();

    // Labels
    ctx.fillStyle = th.dim;
    ctx.font = '11px "Inter", sans-serif';
    ctx.save();
    ctx.translate(ox - 25, oy - gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Energy', 0, 0);
    ctx.restore();
    ctx.fillText('Reaction Progress', ox + gw / 2 - 50, oy + 20);

    // Curve
    ctx.strokeStyle = th.secondary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const drawT = Math.min(1, t * 1.5);
    for (let i = 0; i <= 100 * drawT; i++) {
      const x = ox + (i / 100) * gw;
      const norm = i / 100;
      let y;
      if (norm < 0.2) y = oy - reactLevel * gh;
      else if (norm < 0.5) {
        const peak = Math.sin((norm - 0.2) / 0.3 * Math.PI);
        y = oy - (reactLevel + (actEnergy - reactLevel) * peak) * gh;
      } else if (norm < 0.8) y = oy - (actEnergy * (1 - (norm - 0.5) / 0.3) + prodLevel * ((norm - 0.5) / 0.3)) * gh;
      else y = oy - prodLevel * gh;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Level labels
    if (t > 0.5) {
      ctx.fillStyle = th.accent;
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.fillText('Reactants', ox + 10, oy - reactLevel * gh - 8);
      ctx.fillText('Products', ox + gw - 70, oy - prodLevel * gh - 8);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('Ea', ox + gw * 0.35, oy - actEnergy * gh - 8);
    }

    if (obj.label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, W / 2, 55);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  drawStateChange(ctx, obj, t, W, H, th) {
    const states = obj.states || ['solid', 'liquid', 'gas'];
    const activeState = obj.activeState || states[Math.min(Math.floor(t * states.length), states.length - 1)];
    const cx = W / 2, cy = H / 2;

    ctx.save();
    states.forEach((state, i) => {
      const sx = 100 + i * (W - 200) / (states.length - 1 || 1);
      const isActive = state === activeState;
      const stateT = Math.min(1, Math.max(0, (t - i * 0.2) * 2.5));

      ctx.globalAlpha = stateT;
      // Container
      ctx.strokeStyle = isActive ? th.accent : th.dim;
      ctx.lineWidth = isActive ? 2.5 : 1.5;
      this.roundRect(ctx, sx - 50, cy - 50, 100, 100, 10);
      ctx.stroke();

      // Particles
      const numParticles = 12;
      for (let p = 0; p < numParticles; p++) {
        let px, py;
        if (state === 'solid') {
          px = sx - 30 + (p % 4) * 20;
          py = cy - 25 + Math.floor(p / 4) * 18;
        } else if (state === 'liquid') {
          px = sx - 25 + (p % 4) * 17 + Math.sin(Date.now() / 500 + p) * 5;
          py = cy - 5 + Math.floor(p / 4) * 16 + Math.cos(Date.now() / 700 + p) * 3;
        } else {
          px = sx - 35 + Math.sin(Date.now() / 300 + p * 2) * 30 + (p % 4) * 18;
          py = cy - 35 + Math.cos(Date.now() / 400 + p * 1.5) * 30 + Math.floor(p / 4) * 20;
        }
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? th.accent : th.secondary;
        ctx.fill();
      }

      // Label
      ctx.fillStyle = isActive ? th.accent : th.text;
      ctx.font = `${isActive ? 'bold' : ''} 12px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(state.charAt(0).toUpperCase() + state.slice(1), sx, cy + 70);

      // Arrow to next
      if (i < states.length - 1) {
        const arrowX = sx + 55;
        ctx.fillStyle = th.dim;
        ctx.beginPath();
        ctx.moveTo(arrowX, cy);
        ctx.lineTo(arrowX + 15, cy - 6);
        ctx.lineTo(arrowX + 15, cy + 6);
        ctx.closePath();
        ctx.fill();
      }
    });
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════
  // ── MATHS PRIMITIVES ──
  // ════════════════════════════════════════════════════════

  drawGraphCurve(ctx, obj, t, W, H, th) {
    const ox = 80, oy = H / 2 + 60;
    const gw = W - 160, gh = 220;
    const curveType = obj.curveType || 'parabola';
    const c = obj.color || th.secondary;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', purple: '#8b5cf6' };
    const col = colorMap[c] || c;

    ctx.save();
    // Axes
    ctx.strokeStyle = th.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + gw, oy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox + gw / 2, oy + 20);
    ctx.lineTo(ox + gw / 2, oy - gh);
    ctx.stroke();

    // Curve
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 6;
    ctx.shadowColor = col;
    ctx.beginPath();
    const pts = 100;
    const drawPts = Math.floor(pts * t);
    for (let i = 0; i <= drawPts; i++) {
      const norm = (i / pts) * 2 - 1; // -1 to 1
      const x = ox + gw / 2 + norm * (gw / 2);
      let y;
      switch (curveType) {
        case 'parabola': y = oy - (1 - norm * norm) * gh * 0.7; break;
        case 'sine': y = oy - Math.sin(norm * Math.PI * 2) * gh * 0.3; break;
        case 'cosine': y = oy - Math.cos(norm * Math.PI * 2) * gh * 0.3; break;
        case 'exponential': y = oy - Math.exp(norm * 1.5) * gh * 0.1; break;
        case 'logarithm': y = norm > -0.9 ? oy - Math.log(norm + 1.1) * gh * 0.5 : oy; break;
        case 'linear': y = oy - norm * gh * 0.3; break;
        case 'cubic': y = oy - norm * norm * norm * gh * 0.5; break;
        default: y = oy - (1 - norm * norm) * gh * 0.7;
      }
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Highlights
    (obj.highlights || []).forEach(h => {
      const hx = ox + gw / 2 + (h.x / 100 * 2 - 1) * (gw / 2);
      const norm = h.x / 100 * 2 - 1;
      let hy;
      switch (curveType) {
        case 'parabola': hy = oy - (1 - norm * norm) * gh * 0.7; break;
        default: hy = oy - norm * gh * 0.3;
      }
      ctx.beginPath();
      ctx.arc(hx, hy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fbbf24';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#fbbf24';
      ctx.fill();
      ctx.shadowBlur = 0;
      if (h.label) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(h.label, hx, hy - 12);
      }
    });

    if (obj.label) {
      ctx.fillStyle = col;
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, W / 2, 55);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawNumberLine(ctx, obj, t, W, H, th) {
    const cy = this._y(obj.y || 55);
    const min = obj.min || 0;
    const max = obj.max || 10;
    const points = obj.points || [];
    const sx = 60, ex = W - 60;

    ctx.save();
    // Line
    ctx.strokeStyle = th.primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, cy);
    ctx.lineTo(sx + (ex - sx) * t, cy);
    ctx.stroke();

    // Ticks
    const range = max - min;
    const numTicks = Math.min(20, range + 1);
    for (let i = 0; i <= numTicks; i++) {
      const val = min + (i / numTicks) * range;
      const px = sx + (i / numTicks) * (ex - sx);
      if (px > sx + (ex - sx) * t) continue;
      ctx.strokeStyle = th.dim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, cy - 6);
      ctx.lineTo(px, cy + 6);
      ctx.stroke();
      ctx.fillStyle = th.dim;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(val * 10) / 10, px, cy + 20);
    }

    // Highlighted points
    points.forEach(p => {
      const pNorm = (p.value - min) / range;
      const px = sx + pNorm * (ex - sx);
      const pT = Math.min(1, Math.max(0, (t - 0.3) * 3));
      ctx.globalAlpha = pT;
      const pc = p.color || th.accent;
      const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b' };
      const col = colorMap[pc] || pc;
      ctx.beginPath();
      ctx.arc(px, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.shadowBlur = 10;
      ctx.shadowColor = col;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (p.label) {
        ctx.fillStyle = col;
        ctx.font = 'bold 11px "Inter", sans-serif';
        ctx.fillText(p.label, px, cy - 18);
      }
      ctx.globalAlpha = 1;
    });
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawGeometricShape(ctx, obj, t, W, H, th) {
    const cx = this._x(obj.x || 50);
    const cy = this._y(obj.y || 50);
    const shape = obj.shape || 'triangle';
    const c = obj.color || th.secondary;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', purple: '#8b5cf6' };
    const col = colorMap[c] || c;
    const sideLabels = obj.labels?.sides || [];
    const angleLabels = obj.labels?.angles || [];

    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = t;

    const size = 70;
    let points = [];

    switch (shape) {
      case 'triangle':
        points = [
          { x: cx, y: cy - size },
          { x: cx - size * 0.866, y: cy + size * 0.5 },
          { x: cx + size * 0.866, y: cy + size * 0.5 }
        ];
        break;
      case 'square':
        points = [
          { x: cx - size, y: cy - size },
          { x: cx + size, y: cy - size },
          { x: cx + size, y: cy + size },
          { x: cx - size, y: cy + size }
        ];
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2 * t);
        ctx.stroke();
        if (obj.label) {
          ctx.fillStyle = col;
          ctx.font = 'bold 12px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(obj.label, cx, cy + size + 25);
        }
        ctx.restore();
        return;
      default: // polygon
        const sides = parseInt(shape) || 5;
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
          points.push({ x: cx + Math.cos(a) * size, y: cy + Math.sin(a) * size });
        }
    }

    // Draw shape
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.globalAlpha = t * 0.1;
    ctx.fill();
    ctx.globalAlpha = t;
    ctx.stroke();

    // Side labels
    sideLabels.forEach((label, i) => {
      if (i >= points.length) return;
      const p1 = points[i], p2 = points[(i + 1) % points.length];
      ctx.fillStyle = '#fbbf24';
      ctx.font = '11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, (p1.x + p2.x) / 2 + 10, (p1.y + p2.y) / 2);
    });

    // Angle labels
    angleLabels.forEach((label, i) => {
      if (i >= points.length) return;
      const p = points[i];
      const offset = p.y < cy ? -15 : 15;
      ctx.fillStyle = '#60a5fa';
      ctx.font = '10px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, p.x, p.y + offset);
    });
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawMatrix(ctx, obj, t, W, H, th) {
    const cx = this._x(obj.x || 50);
    const cy = this._y(obj.y || 50);
    const rows = obj.rows || [[1, 0], [0, 1]];
    const cellW = 45, cellH = 30;
    const numCols = rows[0]?.length || 2;
    const numRows = rows.length;
    const totalW = numCols * cellW;
    const totalH = numRows * cellH;
    const startX = cx - totalW / 2;
    const startY = cy - totalH / 2;

    ctx.save();
    ctx.globalAlpha = t;
    // Brackets
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startX - 8, startY - 5);
    ctx.lineTo(startX - 15, startY - 5);
    ctx.lineTo(startX - 15, startY + totalH + 5);
    ctx.lineTo(startX - 8, startY + totalH + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(startX + totalW + 8, startY - 5);
    ctx.lineTo(startX + totalW + 15, startY - 5);
    ctx.lineTo(startX + totalW + 15, startY + totalH + 5);
    ctx.lineTo(startX + totalW + 8, startY + totalH + 5);
    ctx.stroke();

    // Cells
    rows.forEach((row, r) => {
      row.forEach((val, c) => {
        const delay = (r * numCols + c) * 0.05;
        const cellT = Math.min(1, Math.max(0, (t - delay) * 3));
        ctx.globalAlpha = cellT;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(val), startX + c * cellW + cellW / 2, startY + r * cellH + cellH / 2 + 6);
      });
    });

    if (obj.label) {
      ctx.globalAlpha = t;
      ctx.fillStyle = th.accent;
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, cx, startY - 20);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawVennDiagram(ctx, obj, t, W, H, th) {
    const cx = this._x(obj.x || 50);
    const cy = this._y(obj.y || 50);
    const r = 70;
    const overlap = 30;
    const c = obj.color || th.primary;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', purple: '#8b5cf6' };
    const col = colorMap[c] || c;

    ctx.save();
    ctx.globalAlpha = t * 0.15;
    // Circle A
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx - overlap, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Circle B
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cx + overlap, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = t;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - overlap, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(cx + overlap, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj.setA || 'A', cx - overlap - r / 2, cy + 5);
    ctx.fillText(obj.setB || 'B', cx + overlap + r / 2, cy + 5);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText(obj.intersection || 'A∩B', cx, cy + 5);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawBarChart(ctx, obj, t, W, H, th) {
    const bars = obj.bars || [{ label: 'A', value: 50 }, { label: 'B', value: 80 }, { label: 'C', value: 30 }];
    const maxVal = Math.max(...bars.map(b => b.value), 1);
    const ox = 80, oy = H - 100;
    const gw = W - 160, gh = 200;
    const barW = Math.min(50, (gw - bars.length * 10) / bars.length);

    ctx.save();
    // Axis
    ctx.strokeStyle = th.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + gw, oy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy - gh);
    ctx.stroke();

    bars.forEach((bar, i) => {
      const bx = ox + 20 + i * (barW + 15);
      const barH = (bar.value / maxVal) * gh * Math.min(1, t * 2);
      const delay = i * 0.1;
      const barT = Math.min(1, Math.max(0, (t - delay) * 2.5));
      const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', purple: '#8b5cf6' };
      const col = colorMap[bar.color] || bar.color || th.secondary;

      ctx.globalAlpha = barT;
      const bGrad = ctx.createLinearGradient(bx, oy, bx, oy - barH);
      bGrad.addColorStop(0, this._darkenColor(col, 0.3));
      bGrad.addColorStop(1, col);
      ctx.fillStyle = bGrad;
      this.roundRect(ctx, bx, oy - barH, barW, barH, 4);
      ctx.fill();

      // Value on top
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bar.value, bx + barW / 2, oy - barH - 8);

      // Label below
      ctx.fillStyle = th.dim;
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillText(bar.label || '', bx + barW / 2, oy + 16);
    });

    if (obj.axisLabel) {
      ctx.fillStyle = th.text;
      ctx.font = '11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.axisLabel, ox + gw / 2, oy + 35);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawProofStep(ctx, obj, t, W, H, th) {
    const steps = obj.steps || ['Step 1', 'Step 2', 'Step 3'];
    const highlightIdx = obj.highlight || 0;
    const startY = 70;
    const lineH = 32;

    ctx.save();
    steps.forEach((step, i) => {
      const delay = i * 0.12;
      const stepT = Math.min(1, Math.max(0, (t - delay) * 3));
      const y = startY + i * lineH;
      const isHighlighted = i === highlightIdx;

      ctx.globalAlpha = stepT;

      // Line number
      ctx.fillStyle = th.dim;
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`(${i + 1})`, 70, y);

      // Step text
      if (isHighlighted) {
        ctx.fillStyle = th.bg2;
        ctx.globalAlpha = stepT * 0.3;
        this.roundRect(ctx, 80, y - 14, W - 160, lineH - 4, 4);
        ctx.fill();
        ctx.globalAlpha = stepT;
      }
      ctx.fillStyle = isHighlighted ? th.accent : th.text;
      ctx.font = `${isHighlighted ? 'bold' : ''} 14px "Fira Code", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(step, 85, y);
    });
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════
  // ── BIOLOGY PRIMITIVES ──
  // ════════════════════════════════════════════════════════

  drawCell(ctx, obj, t, W, H, th) {
    const cx = this._x(obj.x || 50);
    const cy = this._y(obj.y || 50);
    const cellType = obj.cellType || 'eukaryotic';
    const organelles = obj.organelles || ['nucleus', 'mitochondria', 'ribosome'];

    ctx.save();
    // Cell membrane
    ctx.globalAlpha = t;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    if (cellType === 'prokaryotic') {
      // Rod shape
      this.roundRect(ctx, cx - 120, cy - 60, 240, 120, 60);
      ctx.stroke();
      ctx.fillStyle = 'rgba(16,185,129,0.05)';
      this.roundRect(ctx, cx - 120, cy - 60, 240, 120, 60);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 140, 90, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(16,185,129,0.05)';
      ctx.fill();
    }

    // Organelles
    const organellePositions = {
      nucleus: { x: cx, y: cy, r: 35, color: '#8b5cf6', icon: '🟣' },
      mitochondria: { x: cx + 70, y: cy - 20, r: 20, color: '#ef4444', icon: '🔴' },
      ribosome: { x: cx - 60, y: cy + 25, r: 8, color: '#fbbf24', icon: '🟡' },
      'endoplasmic reticulum': { x: cx - 40, y: cy - 30, r: 25, color: '#60a5fa', icon: '🔵' },
      'golgi apparatus': { x: cx + 50, y: cy + 30, r: 20, color: '#f97316', icon: '🟠' },
      chloroplast: { x: cx - 80, y: cy - 10, r: 22, color: '#10b981', icon: '🟢' },
      vacuole: { x: cx + 20, y: cy + 40, r: 30, color: '#a78bfa', icon: '🟣' }
    };

    organelles.forEach((org, i) => {
      const delay = 0.2 + i * 0.1;
      const orgT = Math.min(1, Math.max(0, (t - delay) * 3));
      const pos = organellePositions[org.toLowerCase()] || { x: cx + (i - 1) * 50, y: cy, r: 15, color: th.secondary };

      ctx.globalAlpha = orgT;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
      ctx.fillStyle = pos.color;
      ctx.globalAlpha = orgT * 0.3;
      ctx.fill();
      ctx.globalAlpha = orgT;
      ctx.strokeStyle = pos.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = pos.color;
      ctx.font = '9px "Inter", sans-serif';
      ctx.textAlign = 'center';
      const label = org.length > 12 ? org.slice(0, 12) + '..' : org;
      ctx.fillText(label, pos.x, pos.y + pos.r + 14);

      this._registerHit(pos.x - pos.r, pos.y - pos.r, pos.r * 2, pos.r * 2, org, `Organelle: ${org}`);
    });

    if (obj.label) {
      ctx.globalAlpha = t;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, cx, cy + 115);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawDNAHelix(ctx, obj, t, W, H, th) {
    const cx = this._x(obj.x || 50);
    const cy = this._y(obj.y || 50);
    const basePairs = obj.basePairs || ['A-T', 'G-C', 'T-A', 'C-G', 'A-T'];
    const anim = obj.animation || 'rotate';

    ctx.save();
    ctx.globalAlpha = t;

    const helixH = 250;
    const helixW = 60;
    const rotation = anim === 'rotate' ? Date.now() / 1000 : (anim === 'unwind' ? t * 3 : 0);
    const numRungs = basePairs.length * 2;
    const baseColors = { A: '#ef4444', T: '#3b82f6', G: '#10b981', C: '#fbbf24' };

    // Draw double helix strands
    const strandPoints1 = [], strandPoints2 = [];
    for (let i = 0; i <= 60; i++) {
      const py = cy - helixH / 2 + (i / 60) * helixH;
      const phase = (i / 60) * Math.PI * 4 + rotation;
      const x1 = cx + Math.cos(phase) * helixW;
      const x2 = cx + Math.cos(phase + Math.PI) * helixW;
      const z1 = Math.sin(phase);
      const z2 = Math.sin(phase + Math.PI);
      strandPoints1.push({ x: x1, y: py, z: z1 });
      strandPoints2.push({ x: x2, y: py, z: z2 });
    }

    // Draw rungs (base pairs)
    for (let i = 0; i < numRungs; i++) {
      const idx = Math.floor((i / numRungs) * 60);
      const p1 = strandPoints1[idx], p2 = strandPoints2[idx];
      if (!p1 || !p2) continue;
      const avgZ = (p1.z + p2.z) / 2;
      if (avgZ < 0) continue; // Behind

      const bp = basePairs[i % basePairs.length] || 'A-T';
      const [b1, b2] = bp.split('-');

      ctx.globalAlpha = t * (0.3 + avgZ * 0.7);
      ctx.strokeStyle = baseColors[b1] || th.secondary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      ctx.stroke();
      ctx.strokeStyle = baseColors[b2] || th.accent;
      ctx.beginPath();
      ctx.moveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw backbone strands
    [strandPoints1, strandPoints2].forEach((strand, si) => {
      ctx.strokeStyle = si === 0 ? '#60a5fa' : '#f87171';
      ctx.lineWidth = 3;
      ctx.beginPath();
      strand.forEach((p, i) => {
        ctx.globalAlpha = t * (0.3 + Math.max(0, p.z) * 0.7);
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });

    if (obj.label) {
      ctx.globalAlpha = t;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, cx, cy + helixH / 2 + 25);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawFoodChain(ctx, obj, t, W, H, th) {
    const organisms = obj.organisms || ['Grass', 'Rabbit', 'Fox', 'Eagle'];
    const n = organisms.length;
    const cy = this._y(obj.y || 50);
    const startX = 60, endX = W - 60;

    ctx.save();
    organisms.forEach((org, i) => {
      const delay = i * 0.15;
      const orgT = Math.min(1, Math.max(0, (t - delay) * 3));
      const x = startX + (i / (n - 1)) * (endX - startX);

      ctx.globalAlpha = orgT;
      // Circle
      const colors = ['#10b981', '#fbbf24', '#f97316', '#ef4444', '#8b5cf6'];
      const col = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(x, cy, 30, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.globalAlpha = orgT * 0.2;
      ctx.fill();
      ctx.globalAlpha = orgT;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      const label = org.length > 10 ? org.slice(0, 10) : org;
      ctx.fillText(label, x, cy + 5);

      // Arrow
      if (i < n - 1) {
        const nextX = startX + ((i + 1) / (n - 1)) * (endX - startX);
        const arrowAlpha = Math.min(1, Math.max(0, (orgT - 0.5) * 3));
        ctx.globalAlpha = arrowAlpha;
        ctx.strokeStyle = th.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 35, cy);
        ctx.lineTo(nextX - 35, cy);
        ctx.stroke();
        // Arrowhead
        ctx.fillStyle = th.accent;
        ctx.beginPath();
        ctx.moveTo(nextX - 35, cy);
        ctx.lineTo(nextX - 45, cy - 6);
        ctx.lineTo(nextX - 45, cy + 6);
        ctx.closePath();
        ctx.fill();
      }

      this._registerHit(x - 30, cy - 30, 60, 60, org, org);
    });

    if (obj.label) {
      ctx.globalAlpha = t;
      ctx.fillStyle = th.accent;
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, W / 2, cy - 55);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ════════════════════════════════════════════════════════
  // ── UNIVERSAL PRIMITIVES ──
  // ════════════════════════════════════════════════════════

  drawRectangleObj(ctx, obj, t, W, H, th) {
    const x = this._x(obj.x || 40);
    const y = this._y(obj.y || 40);
    const w = this._x(obj.w || 20);
    const h = this._y(obj.h || 15);
    const c = obj.color || th.primary;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', purple: '#8b5cf6', gray: '#475569' };
    const col = colorMap[c] || c;

    ctx.save();
    ctx.globalAlpha = t;

    if (obj.glow) {
      ctx.shadowBlur = 15 + Math.sin(Date.now() / 400) * 5;
      ctx.shadowColor = col;
    }

    ctx.fillStyle = col;
    ctx.globalAlpha = t * 0.2;
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.globalAlpha = t;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (obj.label) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, x + w / 2, y + h / 2 + 5);
      this._registerHit(x, y, w, h, obj.label, obj.label);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawArrowObj(ctx, obj, t, W, H, th) {
    const fx = this._x(obj.fromX || 20);
    const fy = this._y(obj.fromY || 50);
    const tx = this._x(obj.toX || 80);
    const ty = this._y(obj.toY || 50);
    const c = obj.color || th.accent;
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', white: '#ffffff' };
    const col = colorMap[c] || c;

    const drawX = fx + (tx - fx) * t;
    const drawY = fy + (ty - fy) * t;

    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    if (obj.dashed) ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(drawX, drawY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead
    if (t > 0.8) {
      const angle = Math.atan2(ty - fy, tx - fx);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(drawX, drawY);
      ctx.lineTo(drawX - 10 * Math.cos(angle - 0.4), drawY - 10 * Math.sin(angle - 0.4));
      ctx.lineTo(drawX - 10 * Math.cos(angle + 0.4), drawY - 10 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
    }

    if (obj.label) {
      ctx.fillStyle = col;
      ctx.font = '11px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(obj.label, (fx + tx) / 2, (fy + ty) / 2 - 10);
    }
    ctx.restore();
  }

  drawCallout(ctx, obj, t, W, H, th) {
    const x = this._x(obj.x || 70);
    const y = this._y(obj.y || 30);
    const text = obj.text || '';
    const ptx = obj.pointsToX ? this._x(obj.pointsToX) : x - 50;
    const pty = obj.pointsToY ? this._y(obj.pointsToY) : y + 50;

    ctx.save();
    ctx.globalAlpha = t;
    // Bezier arrow
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    const cp1x = x, cp1y = (y + pty) / 2;
    const dashOffset = (1 - t) * 200;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.quadraticCurveTo(cp1x, cp1y, ptx, pty);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead at target
    ctx.fillStyle = th.accent;
    ctx.beginPath();
    ctx.arc(ptx, pty, 4, 0, Math.PI * 2);
    ctx.fill();

    // Callout bubble
    const tw = ctx.measureText(text).width + 24;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    this.roundRect(ctx, x - tw / 2, y - 12, tw, 24, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '11px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y + 4);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawIconLabel(ctx, obj, t, W, H, th) {
    const x = this._x(obj.x || 50);
    const y = this._y(obj.y || 50);

    ctx.save();
    ctx.globalAlpha = t;
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj.icon || '📌', x, y);
    ctx.fillStyle = '#fff';
    ctx.font = '11px "Inter", sans-serif';
    ctx.fillText(obj.label || '', x, y + 22);
    this._registerHit(x - 20, y - 20, 40, 40, obj.label || '', obj.label || '');
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawTextBlock(ctx, obj, t, W, H, th) {
    const x = this._x(obj.x || 10);
    const y = this._y(obj.y || 50);
    const text = obj.text || '';
    const fontSize = obj.fontSize || 14;
    const c = obj.color || '#ffffff';
    const colorMap = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', amber: '#f59e0b', white: '#ffffff', accent: th.accent };
    const col = colorMap[c] || c;

    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = col;
    ctx.font = `${fontSize}px "Inter", sans-serif`;
    ctx.textAlign = 'left';
    // Wrap text
    this.wrapText(ctx, text, x, y, W - x - 40, fontSize + 4);
    ctx.restore();
  }

  drawImagePlaceholder(ctx, obj, t, W, H, th) {
    const x = this._x(obj.x || 30);
    const y = this._y(obj.y || 30);
    const w = this._x(obj.w || 40);
    const h = this._y(obj.h || 40);
    const c = obj.color || th.bg2;

    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = c;
    this.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = th.dim;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();

    // Icon
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🖼️', x + w / 2, y + h / 2 + 5);
    if (obj.label) {
      ctx.fillStyle = th.dim;
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillText(obj.label, x + w / 2, y + h / 2 + 28);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }

  drawFallbackObj(ctx, obj, t, W, H, th) {
    // Generic fallback: labeled circle
    const x = this._x(obj.x || 50);
    const y = this._y(obj.y || 50);

    ctx.save();
    ctx.globalAlpha = t;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fillStyle = th.primary;
    ctx.globalAlpha = t * 0.2;
    ctx.fill();
    ctx.globalAlpha = t;
    ctx.strokeStyle = th.secondary;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '11px "Inter", sans-serif';
    ctx.textAlign = 'center';
    const label = (obj.label || obj.kind || '?').slice(0, 12);
    ctx.fillText(label, x, y + 4);
    ctx.textAlign = 'left';
    this._registerHit(x - 25, y - 25, 50, 50, label, label);
    ctx.restore();
  }

  // ── ANNOTATIONS ──
  drawAnnotation(ctx, ann, t, W, H, th) {
    if (t <= 0) return;
    const x = this._x(ann.x || 50);
    const y = this._y(ann.y || 85);
    const text = ann.text || '';

    ctx.save();
    ctx.globalAlpha = t;

    if (ann.highlight) {
      // Highlighted annotation with glow
      const tw = ctx.measureText(text).width + 24;
      ctx.fillStyle = 'rgba(251,191,36,0.15)';
      this.roundRect(ctx, x - tw / 2, y - 12, tw, 24, 6);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, x - tw / 2, y - 12, tw, 24, 6);
      ctx.stroke();
      ctx.fillStyle = '#fbbf24';
    } else {
      ctx.fillStyle = th.text;
    }

    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y + 4);

    // Animated bezier callout arrow
    if (ann.pointsTo) {
      const ptx = this._x(ann.pointsToX || 50);
      const pty = this._y(ann.pointsToY || 50);
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, y + 12);
      ctx.quadraticCurveTo(x, (y + pty) / 2, ptx, pty);
      ctx.stroke();
      ctx.setLineDash([]);
      // Dot at target
      ctx.beginPath();
      ctx.arc(ptx, pty, 3 + Math.sin(Date.now() / 300) * 1, 0, Math.PI * 2);
      ctx.fillStyle = th.accent;
      ctx.fill();
    }

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ── INTERACTIVE HIT REGIONS ──
  _registerHit(x, y, w, h, label, text) {
    this.hitRegions.push({ x, y, w, h, label, text });
  }

  _handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (this.W / rect.width);
    const my = (e.clientY - rect.top) * (this.H / rect.height);

    let found = null;
    for (const r of this.hitRegions) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        found = r;
        break;
      }
    }
    this.hoveredRegion = found;
    this.canvas.style.cursor = found ? 'pointer' : 'default';
  }

  _handleClick(e) {
    if (this.showDYGI) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.W / rect.width);
      const my = (e.clientY - rect.top) * (this.H / rect.height);
      // Check DYGI buttons
      const btnY = this.H / 2 + 20;
      if (my >= btnY - 20 && my <= btnY + 20) {
        if (mx >= this.W / 2 - 80 && mx <= this.W / 2 - 20) {
          this.dygiThumbsUp();
          return;
        }
        if (mx >= this.W / 2 + 20 && mx <= this.W / 2 + 80) {
          this.dygiThumbsDown();
          return;
        }
      }
    }

    if (this.hoveredRegion) {
      const r = this.hoveredRegion;
      this.showDefinition = { x: r.x + r.w / 2, y: r.y, label: r.label, text: r.text };
      this.definitionAlpha = 0;
      // Auto-hide after 3s
      setTimeout(() => { this.showDefinition = null; }, 3000);
    } else {
      this.showDefinition = null;
    }
  }

  _drawDefinitionPopup(ctx, def, W, H, th) {
    this.definitionAlpha = Math.min(1, this.definitionAlpha + 0.1);
    const x = Math.max(80, Math.min(W - 80, def.x));
    const y = Math.max(40, def.y - 35);

    ctx.save();
    ctx.globalAlpha = this.definitionAlpha;

    const text = def.text || def.label;
    ctx.font = '12px "Inter", sans-serif';
    const tw = Math.max(100, ctx.measureText(text).width + 30);
    const th2 = 32;

    // Card background
    ctx.fillStyle = 'rgba(30,41,59,0.95)';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    this.roundRect(ctx, x - tw / 2, y - th2, tw, th2, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x - tw / 2, y - th2, tw, th2, 8);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y - th2 / 2 + 4);

    // Pointer triangle
    ctx.fillStyle = 'rgba(30,41,59,0.95)';
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x, y + 8);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ── DID-YOU-GET-IT OVERLAY ──
  _drawDYGIOverlay(ctx, W, H, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Did you get it?', W / 2, H / 2 - 15);

    // Thumbs up
    ctx.font = '32px sans-serif';
    ctx.fillText('👍', W / 2 - 50, H / 2 + 28);
    ctx.fillText('👎', W / 2 + 50, H / 2 + 28);

    ctx.font = '11px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Auto-advancing in 2s...', W / 2, H / 2 + 60);

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ── KEYWORD HIGHLIGHTING IN NARRATION ──
  _getKeywords(scene) {
    const keywords = new Set();
    const visual = scene.visual || {};
    (visual.objects || []).forEach(obj => {
      if (obj.label) keywords.add(obj.label.toLowerCase());
      if (obj.symbol) keywords.add(obj.symbol.toLowerCase());
      if (obj.name) keywords.add(obj.name.toLowerCase());
    });
    (scene.elements || []).forEach(e => keywords.add(e.toLowerCase()));
    return keywords;
  }

  _drawHighlightedNarration(ctx, text, keywords, x, y, maxW, lineH, th) {
    ctx.font = '13px "Inter", sans-serif';
    ctx.textAlign = 'center';

    const words = text.split(' ');
    let lines = [];
    let line = '';
    words.forEach(w => {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line.trim());
        line = w + ' ';
      } else {
        line = test;
      }
    });
    lines.push(line.trim());

    const totalH = Math.min(lines.length, 2) * lineH;
    lines.slice(0, 2).forEach((line, li) => {
      const lineY = y - totalH / 2 + li * lineH + lineH / 2;
      const lineWords = line.split(' ');
      // Measure full line first to center it
      const fullW = ctx.measureText(line).width;
      let startX = x - fullW / 2;

      lineWords.forEach(word => {
        const isKeyword = keywords.has(word.toLowerCase().replace(/[.,!?;:]/g, ''));
        if (isKeyword) {
          ctx.fillStyle = th.accent;
          ctx.font = 'bold 13px "Inter", sans-serif';
        } else {
          ctx.fillStyle = '#fff';
          ctx.font = '13px "Inter", sans-serif';
        }
        ctx.textAlign = 'left';
        ctx.fillText(word, startX, lineY);
        startX += ctx.measureText(word + ' ').width;
      });
    });
    ctx.textAlign = 'left';
  }

  // ══════════════════════════════════════════════════════
  // ── LEGACY VISUAL TYPE HANDLERS (backwards compat) ──
  // ══════════════════════════════════════════════════════

  _legacyGraph(ctx, scene, t, W, H, th) {
    const ox = 100, oy = H - 130, gw = W - 200, gh = 220;
    ctx.strokeStyle = th.primary; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + gw, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - gh); ctx.stroke();
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 3;
    ctx.beginPath();
    const pts = 50;
    for (let i = 0; i <= pts * t; i++) {
      const x = ox + (i / pts) * gw;
      const y = oy - (Math.sin(i / pts * Math.PI * 2) * 0.5 + 0.5) * gh * 0.8;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (t > 0.1) {
      const dotX = ox + t * gw;
      const dotY = oy - (Math.sin(t * Math.PI * 2) * 0.5 + 0.5) * gh * 0.8;
      ctx.beginPath(); ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.fillStyle = th.accent; ctx.fill();
    }
  }

  _legacyEquation(ctx, scene, t, W, H, th) {
    const cx = W / 2, baseY = H - 140;
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = -1; i <= t * 2 - 1; i += 0.02) {
      const x = cx + i * 200;
      const y = baseY - (1 - i * i) * 160;
      i === -1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, baseY - 160, 8, 0, Math.PI * 2);
    ctx.fillStyle = th.accent; ctx.fill();
  }

  _legacyProcess(ctx, scene, t, W, H, th, elements) {
    const steps = elements.length > 0 ? elements : ['Step 1', 'Step 2', 'Step 3', 'Step 4'];
    const n = Math.min(steps.length, 5);
    const boxW = 120, boxH = 55, gap = 30;
    const totalW = n * boxW + (n - 1) * gap;
    const startX = (W - totalW) / 2;
    const y = H / 2 - 40;
    steps.slice(0, n).forEach((step, i) => {
      const delay = i / n;
      const alpha = Math.min(1, Math.max(0, (t - delay) * 3));
      const x = startX + i * (boxW + gap);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = th.primary;
      this.roundRect(ctx, x, y, boxW, boxH, 10);
      ctx.fill();
      ctx.strokeStyle = th.secondary; ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, boxW, boxH, 10);
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Inter", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(step.length > 14 ? step.slice(0, 14) + '..' : step, x + boxW / 2, y + boxH / 2 + 5);
      ctx.textAlign = 'left';
      if (i < n - 1 && alpha > 0.5) {
        ctx.globalAlpha = Math.min(1, (alpha - 0.5) * 4);
        ctx.fillStyle = th.accent;
        const ax = x + boxW + 5, ay = y + boxH / 2;
        ctx.beginPath(); ctx.moveTo(ax, ay - 6); ctx.lineTo(ax + 20, ay); ctx.lineTo(ax, ay + 6); ctx.closePath(); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  _legacyStructure(ctx, scene, t, W, H, th, elements) {
    const cx = W / 2, cy = H / 2 - 15;
    const core = elements[0] || 'Core';
    const nodes = elements.slice(1, 6);
    ctx.globalAlpha = Math.min(1, t * 4);
    ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fillStyle = th.primary; ctx.fill();
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(core.length > 10 ? core.slice(0, 10) : core, cx, cy + 5); ctx.textAlign = 'left';
    nodes.forEach((n, i) => {
      const delay = 0.2 + i * 0.12;
      const alpha = Math.min(1, Math.max(0, (t - delay) * 3));
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      const dist = 130 * alpha;
      const nx = cx + Math.cos(angle) * dist, ny = cy + Math.sin(angle) * dist * 0.65;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = th.primary; ctx.lineWidth = 1.5; ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(nx, ny, 28, 0, Math.PI * 2);
      ctx.fillStyle = th.bg2; ctx.fill();
      ctx.strokeStyle = th.secondary; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = th.accent; ctx.font = '11px "Inter", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n.length > 10 ? n.slice(0, 10) : n, nx, ny + 4); ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;
  }

  _legacyComparison(ctx, scene, t, W, H, th, elements) {
    const lx = 60, rx = W / 2 + 20, bw = W / 2 - 80, bh = 200, by = 70;
    const labels = elements.length >= 2 ? elements : ['Type A', 'Type B'];
    ctx.globalAlpha = Math.min(1, t * 3);
    ctx.fillStyle = th.primary; ctx.globalAlpha *= 0.15;
    this.roundRect(ctx, lx, by, bw, bh, 12); ctx.fill();
    ctx.globalAlpha = Math.min(1, t * 3);
    ctx.strokeStyle = th.primary; ctx.lineWidth = 2; this.roundRect(ctx, lx, by, bw, bh, 12); ctx.stroke();
    ctx.fillStyle = th.accent; ctx.font = 'bold 15px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[0], lx + bw / 2, by + 30); ctx.textAlign = 'left';
    ctx.fillStyle = '#10b981'; ctx.globalAlpha = Math.min(1, t * 3) * 0.15;
    this.roundRect(ctx, rx, by, bw, bh, 12); ctx.fill();
    ctx.globalAlpha = Math.min(1, t * 3);
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2; this.roundRect(ctx, rx, by, bw, bh, 12); ctx.stroke();
    ctx.fillStyle = '#6ee7b7'; ctx.font = 'bold 15px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[1], rx + bw / 2, by + 30); ctx.textAlign = 'left';
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 16px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VS', W / 2, by - 5); ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  _legacyWave(ctx, scene, t, W, H, th) {
    const ox = 60, oy = H / 2 - 10, amp = 80, wl = 200;
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < (W - 120) * t; x += 2) {
      const y = oy + Math.sin((x / wl) * Math.PI * 4 + Date.now() / 500) * amp;
      x === 0 ? ctx.moveTo(ox + x, y) : ctx.lineTo(ox + x, y);
    }
    ctx.stroke();
  }

  _legacyCircuit(ctx, scene, t, W, H, th) {
    const cx = W / 2, cy = H / 2 - 10;
    ctx.strokeStyle = th.primary; ctx.lineWidth = 3;
    this.roundRect(ctx, cx - 200, cy - 70, 400, 140, 15);
    ctx.stroke();
    ctx.fillStyle = th.secondary; ctx.fillRect(cx - 210, cy - 25, 20, 50);
    const bulbGlow = 0.4 + Math.sin(Date.now() / 300) * 0.3;
    ctx.beginPath(); ctx.arc(cx + 150, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251,191,36,${bulbGlow})`; ctx.fill();
  }

  _legacyOrbit(ctx, scene, t, W, H, th, elements) {
    const cx = W / 2, cy = H / 2 - 10;
    ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fillStyle = th.secondary; ctx.fill();
    [80, 130, 180].forEach((r, i) => {
      ctx.strokeStyle = th.primary; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.5, 0.2 * i, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      const angle = Date.now() / (800 + i * 200) + i * 2;
      const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r * 0.5;
      ctx.beginPath(); ctx.arc(px, py, 8 - i, 0, Math.PI * 2);
      ctx.fillStyle = [th.accent, '#fbbf24', '#34d399'][i]; ctx.fill();
    });
  }

  _legacyTimeline(ctx, scene, t, W, H, th, elements) {
    const steps = elements.length > 0 ? elements : ['Event 1', 'Event 2', 'Event 3'];
    const n = Math.min(steps.length, 6);
    const startX = 80, endX = W - 80, y = H / 2;
    ctx.strokeStyle = th.primary; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + (endX - startX) * t, y); ctx.stroke();
    steps.slice(0, n).forEach((s, i) => {
      const px = startX + (i / (n - 1)) * (endX - startX);
      const delay = i / n;
      const alpha = Math.min(1, Math.max(0, (t - delay) * 3));
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(px, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = th.secondary; ctx.fill();
      ctx.fillStyle = th.accent; ctx.font = '11px "Inter", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(s.length > 12 ? s.slice(0, 12) + '..' : s, px, y + (i % 2 === 0 ? -20 : 25));
      ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;
  }

  _legacyDiagram(ctx, scene, t, W, H, th, elements) {
    const cx = W / 2, cy = H / 2 - 15;
    const core = elements[0] || 'Concept';
    const nodes = elements.slice(1, 7);
    ctx.globalAlpha = Math.min(1, t * 3);
    ctx.beginPath(); ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fillStyle = th.primary; ctx.globalAlpha *= 0.3; ctx.fill();
    ctx.globalAlpha = Math.min(1, t * 3);
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(core.length > 12 ? core.slice(0, 12) : core, cx, cy + 5); ctx.textAlign = 'left';
    nodes.forEach((n, i) => {
      const delay = 0.15 + i * 0.1;
      const alpha = Math.min(1, Math.max(0, (t - delay) * 3));
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      const dist = 140;
      const nx = cx + Math.cos(angle) * dist, ny = cy + Math.sin(angle) * dist * 0.6;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = th.primary; ctx.lineWidth = 1; ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(nx, ny, 30, 0, Math.PI * 2);
      ctx.fillStyle = th.bg2; ctx.fill();
      ctx.strokeStyle = th.secondary; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = th.accent; ctx.font = '10px "Inter", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n.length > 12 ? n.slice(0, 12) : n, nx, ny + 4); ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;
  }

  // ── TTS ──
  speakScene(idx) {
    this.stopSpeech();
    this.speechFinished = false;
    this.speechEndTime = 0;
    if (!this.ttsSupported || !this.scenes[idx]?.narration) {
      this.speechFinished = true;
      return;
    }
    const utter = new SpeechSynthesisUtterance(this.scenes[idx].narration);
    utter.rate = this.speed * 0.9;
    utter.pitch = 1;
    utter.volume = 0.8;
    const voices = speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
    if (enVoice) utter.voice = enVoice;
    this.currentUtterance = utter;
    utter.onend = () => { this.speechFinished = true; this.speechEndTime = performance.now(); };
    utter.onerror = () => { this.speechFinished = true; };
    speechSynthesis.speak(utter);
  }

  stopSpeech() {
    if (this.ttsSupported) speechSynthesis.cancel();
    this.speechFinished = true;
    this.speechEndTime = performance.now();
  }

  updateControls() {
    if (!this.canvas) return;
    const parent = this.canvas.closest('.vplayer');
    if (!parent) return;
    const fill = parent.querySelector('.anim-progress-fill');
    if (fill) fill.style.width = `${this.progress * 100}%`;
    const time = parent.querySelector('.anim-time');
    if (time) time.textContent = `${this.currentTimeStr} / ${this.totalTimeStr}`;
    const btn = parent.querySelector('.anim-play-btn');
    if (btn) btn.textContent = this.playing ? '⏸' : '▶';
    const sceneLabel = parent.querySelector('.anim-scene-label');
    if (sceneLabel) sceneLabel.textContent = `Scene ${this.currentScene + 1}/${this.scenes.length}`;
  }

  // ── HELPERS ──
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let lines = [];
    words.forEach(w => {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = w + ' '; }
      else { line = test; }
    });
    lines.push(line.trim());
    const totalH = Math.min(lines.length, 3) * lineH;
    lines.slice(0, 3).forEach((l, i) => {
      ctx.fillText(l, x, y + i * lineH);
    });
  }

  _darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) * (1 - amount));
    const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (num & 0xff) * (1 - amount));
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }

  destroy() {
    this.pause();
    this.stopSpeech();
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this._onMouseMove);
      this.canvas.removeEventListener('click', this._onClick);
    }
    if (this.dygiAutoTimer) clearTimeout(this.dygiAutoTimer);
  }
}

// Global reference
let activePlayer = null;

function initManimPlayer(canvasId, blueprint) {
  if (activePlayer) activePlayer.destroy();
  activePlayer = new ManimPlayer(canvasId, blueprint);
}

// Thumbnail renderer — draws first frame of a scene onto a small canvas
function renderSceneThumbnail(canvas, blueprint, sceneIdx) {
  if (!canvas) return;
  const tmpPlayer = new ManimPlayer.__proto__.constructor.length ? null : null; // skip
  const ctx = canvas.getContext('2d');
  canvas.width = 160;
  canvas.height = 90;
  const W = 160, H = 90;
  const th = {
    bg1: '#0f172a', bg2: '#1e3a8a', primary: '#3b82f6',
    secondary: '#60a5fa', accent: '#93c5fd', text: '#e2e8f0', dim: '#475569'
  };
  const scene = blueprint.scenes[sceneIdx];
  if (!scene) return;

  // Simple thumbnail: background + title
  const grad = ctx.createRadialGradient(W/2, H/2, 10, W/2, H/2, W*0.7);
  grad.addColorStop(0, th.bg2);
  grad.addColorStop(1, th.bg1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  const title = (scene.title || `Scene ${sceneIdx + 1}`).slice(0, 25);
  ctx.fillText(title, W/2, H/2 + 4);

  ctx.fillStyle = th.accent;
  ctx.font = '8px "Inter", sans-serif';
  ctx.fillText(`${sceneIdx + 1}/${blueprint.scenes.length}`, W/2, H - 8);
  ctx.textAlign = 'left';
}
