// ── MANIM ANIMATED VIDEO PLAYER ENGINE ──
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
    this.elapsed = 0;        // ms elapsed in current scene
    this.totalElapsed = 0;   // ms elapsed total
    this.lastFrame = 0;
    this.animId = null;
    this.ttsSupported = 'speechSynthesis' in window;
    this.currentUtterance = null;
    this.transitioning = false;
    this.transitionProgress = 0;
    this.sceneStartTime = 0;

    // Color themes
    const themes = {
      blue:   { bg1: '#0f172a', bg2: '#1e3a8a', primary: '#3b82f6', secondary: '#60a5fa', accent: '#93c5fd', text: '#e2e8f0', dim: '#475569' },
      green:  { bg1: '#0f172a', bg2: '#064e3b', primary: '#10b981', secondary: '#34d399', accent: '#6ee7b7', text: '#e2e8f0', dim: '#475569' },
      purple: { bg1: '#0f172a', bg2: '#4c1d95', primary: '#8b5cf6', secondary: '#a78bfa', accent: '#c4b5fd', text: '#e2e8f0', dim: '#475569' },
      amber:  { bg1: '#0f172a', bg2: '#78350f', primary: '#f59e0b', secondary: '#fbbf24', accent: '#fde68a', text: '#e2e8f0', dim: '#475569' },
      red:    { bg1: '#0f172a', bg2: '#7f1d1d', primary: '#ef4444', secondary: '#f87171', accent: '#fca5a5', text: '#e2e8f0', dim: '#475569' }
    };
    this.theme = themes[blueprint.colorTheme] || themes.blue;

    // Calculate total duration
    this.totalDuration = this.scenes.reduce((sum, s) => sum + (s.durationSec || 7) * 1000, 0);

    // Set canvas size
    this.canvas.width = 800;
    this.canvas.height = 450;
    this.W = 800;
    this.H = 450;

    this.drawScene(0, 0);
  }

  // ── TOTAL PROGRESS ──
  get progress() {
    let elapsed = 0;
    for (let i = 0; i < this.currentScene; i++) {
      elapsed += (this.scenes[i]?.durationSec || 7) * 1000;
    }
    elapsed += this.elapsed;
    return Math.min(1, elapsed / this.totalDuration);
  }

  get currentTimeStr() {
    let ms = 0;
    for (let i = 0; i < this.currentScene; i++) ms += (this.scenes[i]?.durationSec || 7) * 1000;
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

  togglePlay() {
    this.playing ? this.pause() : this.play();
  }

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
      const dur = (this.scenes[i]?.durationSec || 7) * 1000;
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

  loop() {
    try {
      if (!this.playing) return;
      const now = performance.now();
      const dt = (now - this.lastFrame) * this.speed;
      this.lastFrame = now;

      const scene = this.scenes[this.currentScene];
      if (!scene) { this.pause(); return; }

      const sceneDur = (scene.durationSec || 7) * 1000;
      this.elapsed += dt;

      // TTS Sync: Wait until both the visual duration is met AND the speech has been finished for 0.5 seconds
      const isVisualDone = this.elapsed >= sceneDur;
      const isSpeechDone = this.speechFinished && (performance.now() - this.speechEndTime >= 500);
      
      // Fallback: forcefully move if we are 10 seconds past the visual duration but speech event was dropped by browser
      const isSpeechHanging = this.elapsed >= sceneDur + 10000;

      if ((isVisualDone && isSpeechDone) || isSpeechHanging) {
        // Move to next scene
        this.elapsed = 0;
        this.currentScene++;
        if (this.currentScene >= this.scenes.length) {
          this.playing = false;
          this.currentScene = this.scenes.length - 1;
          this.elapsed = (this.scenes[this.currentScene]?.durationSec || 7) * 1000;
          this.drawScene(this.currentScene, 1);
          this.updateControls();
          return;
        }
        this.speakScene(this.currentScene);
      }

      const t = Math.min(1, this.elapsed / sceneDur);
      this.drawScene(this.currentScene, t);
      this.updateControls();
      this.animId = requestAnimationFrame(() => this.loop());
    } catch (err) {
      console.error('ManimPlayer loop error:', err);
      this.playing = false;
    }
  }

  // ── RENDER A SCENE ──
  drawScene(idx, t) {
    const ctx = this.ctx;
    const W = this.W, H = this.H;
    const scene = this.scenes[idx];
    if (!scene) return;
    const th = this.theme;

    // Background gradient
    const grad = ctx.createRadialGradient(W/2, H/2, 50, W/2, H/2, W * 0.7);
    grad.addColorStop(0, th.bg2);
    grad.addColorStop(1, th.bg1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid lines (subtle)
    ctx.strokeStyle = th.primary;
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // Floating particles
    for (let i = 0; i < 8; i++) {
      const px = (60 + i * 100 + Math.sin(Date.now() / 1000 + i) * 20) % W;
      const py = (50 + Math.sin(Date.now() / 1500 + i * 2) * 30);
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = th.secondary;
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 800 + i);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Scene counter badge
    ctx.fillStyle = th.primary;
    ctx.globalAlpha = 0.3;
    this.roundRect(ctx, 15, 15, 110, 28, 14);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = th.accent;
    ctx.font = '600 12px "Inter", sans-serif';
    ctx.fillText(`Scene ${idx + 1} / ${this.scenes.length}`, 28, 34);

    // Scene Title (top center, fade in)
    const titleAlpha = Math.min(1, t * 5);
    ctx.globalAlpha = titleAlpha;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(scene.title || `Scene ${idx + 1}`, W / 2, 35);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;

    // Visual content area (center)
    this.drawVisualContent(ctx, scene, t, W, H, th);

    // Formula (if present)
    if (scene.formula) {
      const formulaAlpha = Math.min(1, Math.max(0, (t - 0.3) * 3));
      ctx.globalAlpha = formulaAlpha;
      ctx.fillStyle = th.bg1;
      ctx.globalAlpha = formulaAlpha * 0.7;
      this.roundRect(ctx, W/2 - 180, H - 120, 360, 36, 8);
      ctx.fill();
      ctx.globalAlpha = formulaAlpha;
      ctx.fillStyle = th.accent;
      ctx.font = 'bold 16px "Fira Code", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(scene.formula, W / 2, H - 97);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // Narration subtitle (bottom)
    if (scene.narration) {
      const narAlpha = Math.min(1, Math.max(0, (t - 0.1) * 4));
      ctx.globalAlpha = narAlpha * 0.85;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      this.roundRect(ctx, 30, H - 70, W - 60, 55, 10);
      ctx.fill();
      ctx.globalAlpha = narAlpha;
      ctx.fillStyle = '#fff';
      ctx.font = '14px "Inter", sans-serif';
      ctx.textAlign = 'center';
      this.wrapText(ctx, scene.narration, W / 2, H - 47, W - 80, 18);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  // ── DRAW VISUAL CONTENT based on scene visualType ──
  drawVisualContent(ctx, scene, t, W, H, th) {
    const elements = scene.elements || [];
    const vType = scene.visualType || 'diagram';
    const cx = W / 2, cy = H / 2 - 10;
    const animT = Math.min(1, t * 2.5); // element animation progress, faster build

    switch (vType) {
      case 'graph': this.drawGraph(ctx, scene, animT, W, H, th); break;
      case 'equation': this.drawEquation(ctx, scene, animT, W, H, th); break;
      case 'process': this.drawProcess(ctx, scene, animT, W, H, th, elements); break;
      case 'structure': this.drawStructure(ctx, scene, animT, W, H, th, elements); break;
      case 'comparison': this.drawComparison(ctx, scene, animT, W, H, th, elements); break;
      case 'wave': this.drawWave(ctx, scene, animT, W, H, th); break;
      case 'circuit': this.drawCircuit(ctx, scene, animT, W, H, th); break;
      case 'orbit': this.drawOrbit(ctx, scene, animT, W, H, th, elements); break;
      case 'timeline': this.drawTimeline(ctx, scene, animT, W, H, th, elements); break;
      default: this.drawDiagram(ctx, scene, animT, W, H, th, elements); break;
    }
  }

  drawGraph(ctx, scene, t, W, H, th) {
    const ox = 100, oy = H - 130, gw = W - 200, gh = 220;
    // Axes
    ctx.strokeStyle = th.primary; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + gw, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - gh); ctx.stroke();
    // Curve (animated draw)
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 3;
    ctx.beginPath();
    const pts = 50;
    for (let i = 0; i <= pts * t; i++) {
      const x = ox + (i / pts) * gw;
      const y = oy - (Math.sin(i / pts * Math.PI * 2) * 0.5 + 0.5) * gh * 0.8;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Dot at tip
    if (t > 0.1) {
      const dotX = ox + t * gw;
      const dotY = oy - (Math.sin(t * Math.PI * 2) * 0.5 + 0.5) * gh * 0.8;
      ctx.beginPath(); ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.fillStyle = th.accent; ctx.fill();
      ctx.shadowBlur = 15; ctx.shadowColor = th.accent; ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  drawEquation(ctx, scene, t, W, H, th) {
    // Parabola with animated vertex highlight
    const cx = W / 2, baseY = H - 140;
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = -1; i <= t * 2 - 1; i += 0.02) {
      const x = cx + i * 200;
      const y = baseY - (1 - i * i) * 160;
      i === -1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Vertex glow
    ctx.beginPath(); ctx.arc(cx, baseY - 160, 8 + Math.sin(Date.now()/300)*3, 0, Math.PI*2);
    ctx.fillStyle = th.accent; ctx.globalAlpha = 0.7 + Math.sin(Date.now()/300)*0.3;
    ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillText('vertex', cx, baseY - 175); ctx.textAlign = 'left';
  }

  drawProcess(ctx, scene, t, W, H, th, elements) {
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

      // Box
      ctx.globalAlpha = alpha;
      ctx.fillStyle = th.primary;
      this.roundRect(ctx, x, y, boxW, boxH, 10);
      ctx.fill();
      // Border glow
      ctx.strokeStyle = th.secondary; ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, boxW, boxH, 10);
      ctx.stroke();
      // Text
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Inter", sans-serif'; ctx.textAlign = 'center';
      const label = step.length > 14 ? step.slice(0, 14) + '..' : step;
      ctx.fillText(label, x + boxW / 2, y + boxH / 2 + 5);
      ctx.textAlign = 'left';

      // Arrow
      if (i < n - 1 && alpha > 0.5) {
        const arrowAlpha = Math.min(1, (alpha - 0.5) * 4);
        ctx.globalAlpha = arrowAlpha;
        ctx.fillStyle = th.accent;
        const ax = x + boxW + 5, ay = y + boxH / 2;
        ctx.beginPath(); ctx.moveTo(ax, ay - 6); ctx.lineTo(ax + 20, ay); ctx.lineTo(ax, ay + 6); ctx.closePath(); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  drawStructure(ctx, scene, t, W, H, th, elements) {
    const cx = W / 2, cy = H / 2 - 15;
    const core = elements[0] || 'Core';
    const nodes = elements.slice(1, 6);
    // Central node
    const coreAlpha = Math.min(1, t * 4);
    ctx.globalAlpha = coreAlpha;
    ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fillStyle = th.primary; ctx.fill();
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(core.length > 10 ? core.slice(0, 10) : core, cx, cy + 5); ctx.textAlign = 'left';
    // Satellite nodes
    nodes.forEach((n, i) => {
      const delay = 0.2 + i * 0.12;
      const alpha = Math.min(1, Math.max(0, (t - delay) * 3));
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      const dist = 130 * alpha;
      const nx = cx + Math.cos(angle) * dist, ny = cy + Math.sin(angle) * dist * 0.65;
      ctx.globalAlpha = alpha;
      // Connecting line
      ctx.strokeStyle = th.primary; ctx.lineWidth = 1.5; ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();
      // Node circle
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(nx, ny, 28, 0, Math.PI * 2);
      ctx.fillStyle = th.bg2; ctx.fill();
      ctx.strokeStyle = th.secondary; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = th.accent; ctx.font = '11px "Inter", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(n.length > 10 ? n.slice(0, 10) : n, nx, ny + 4); ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;
  }

  drawComparison(ctx, scene, t, W, H, th, elements) {
    const lx = 60, rx = W / 2 + 20, bw = W / 2 - 80, bh = 200, by = 70;
    const labels = elements.length >= 2 ? elements : ['Type A', 'Type B'];
    // Left box
    ctx.globalAlpha = Math.min(1, t * 3);
    ctx.fillStyle = th.primary; ctx.globalAlpha *= 0.15;
    this.roundRect(ctx, lx, by, bw, bh, 12); ctx.fill();
    ctx.globalAlpha = Math.min(1, t * 3);
    ctx.strokeStyle = th.primary; ctx.lineWidth = 2; this.roundRect(ctx, lx, by, bw, bh, 12); ctx.stroke();
    ctx.fillStyle = th.accent; ctx.font = 'bold 15px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[0], lx + bw / 2, by + 30); ctx.textAlign = 'left';
    // Right box
    ctx.fillStyle = '#10b981'; ctx.globalAlpha = Math.min(1, t * 3) * 0.15;
    this.roundRect(ctx, rx, by, bw, bh, 12); ctx.fill();
    ctx.globalAlpha = Math.min(1, t * 3);
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2; this.roundRect(ctx, rx, by, bw, bh, 12); ctx.stroke();
    ctx.fillStyle = '#6ee7b7'; ctx.font = 'bold 15px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labels[1], rx + bw / 2, by + 30); ctx.textAlign = 'left';
    // VS badge
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 16px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VS', W / 2, by - 5); ctx.textAlign = 'left';
    // Detail items
    labels.slice(2).forEach((l, i) => {
      const delay = 0.3 + i * 0.1;
      ctx.globalAlpha = Math.min(1, Math.max(0, (t - delay) * 3));
      const col = i % 2 === 0 ? lx + bw / 2 : rx + bw / 2;
      const row = by + 60 + Math.floor(i / 2) * 25;
      ctx.fillStyle = th.text; ctx.font = '12px "Inter", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(l, col, row); ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;
  }

  drawWave(ctx, scene, t, W, H, th) {
    const ox = 60, oy = H / 2 - 10, amp = 80, wl = 200;
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x < (W - 120) * t; x += 2) {
      const y = oy + Math.sin((x / wl) * Math.PI * 4 + Date.now() / 500) * amp;
      x === 0 ? ctx.moveTo(ox + x, y) : ctx.lineTo(ox + x, y);
    }
    ctx.stroke();
    // Amplitude marker
    if (t > 0.2) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(ox + 50, oy - amp); ctx.lineTo(ox + 50, oy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px monospace';
      ctx.fillText('Amplitude', ox + 60, oy - amp + 10);
    }
    // Wavelength marker
    if (t > 0.5) {
      ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox + 100, oy + amp + 30); ctx.lineTo(ox + 100 + wl, oy + amp + 30); ctx.stroke();
      ctx.fillStyle = '#34d399'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText('λ (wavelength)', ox + 100 + wl / 2, oy + amp + 50); ctx.textAlign = 'left';
    }
  }

  drawCircuit(ctx, scene, t, W, H, th) {
    const cx = W / 2, cy = H / 2 - 10;
    // Main circuit loop
    ctx.strokeStyle = th.primary; ctx.lineWidth = 3;
    this.roundRect(ctx, cx - 200, cy - 70, 400, 140, 15);
    ctx.stroke();
    // Battery
    ctx.fillStyle = th.secondary;
    ctx.fillRect(cx - 210, cy - 25, 20, 50);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace';
    ctx.fillText('+', cx - 215, cy - 30); ctx.fillText('−', cx - 215, cy + 40);
    // Resistor
    ctx.fillStyle = th.primary; this.roundRect(ctx, cx - 30, cy - 80, 60, 20, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('R', cx, cy - 66); ctx.textAlign = 'left';
    // Bulb (pulsing)
    const bulbGlow = 0.4 + Math.sin(Date.now() / 300) * 0.3;
    ctx.beginPath(); ctx.arc(cx + 150, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(251,191,36,${bulbGlow})`; ctx.fill();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('💡', cx + 150, cy + 6); ctx.textAlign = 'left';
    // Electron (animated)
    const electronAngle = (Date.now() / 1000) * Math.PI;
    const ex = cx + Math.cos(electronAngle) * 180;
    const ey = cy + Math.sin(electronAngle) * 60;
    ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fillStyle = th.accent; ctx.fill();
    ctx.shadowBlur = 10; ctx.shadowColor = th.accent; ctx.fill(); ctx.shadowBlur = 0;
  }

  drawOrbit(ctx, scene, t, W, H, th, elements) {
    const cx = W / 2, cy = H / 2 - 10;
    // Central body
    ctx.beginPath(); ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fillStyle = th.secondary; ctx.fill();
    ctx.shadowBlur = 20; ctx.shadowColor = th.secondary; ctx.fill(); ctx.shadowBlur = 0;
    // Orbits
    [80, 130, 180].forEach((r, i) => {
      ctx.strokeStyle = th.primary; ctx.lineWidth = 1; ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.5, 0.2 * i, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      const angle = Date.now() / (800 + i * 200) + i * 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r * 0.5;
      ctx.beginPath(); ctx.arc(px, py, 8 - i, 0, Math.PI * 2);
      ctx.fillStyle = [th.accent, '#fbbf24', '#34d399'][i]; ctx.fill();
    });
  }

  drawTimeline(ctx, scene, t, W, H, th, elements) {
    const steps = elements.length > 0 ? elements : ['Event 1', 'Event 2', 'Event 3'];
    const n = Math.min(steps.length, 6);
    const startX = 80, endX = W - 80, y = H / 2;
    // Line
    ctx.strokeStyle = th.primary; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(startX + (endX - startX) * t, y); ctx.stroke();
    // Points
    steps.slice(0, n).forEach((s, i) => {
      const px = startX + (i / (n - 1)) * (endX - startX);
      const delay = i / n;
      const alpha = Math.min(1, Math.max(0, (t - delay) * 3));
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(px, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = th.secondary; ctx.fill();
      ctx.fillStyle = th.accent; ctx.font = '11px "Inter", sans-serif'; ctx.textAlign = 'center';
      const label = s.length > 12 ? s.slice(0, 12) + '..' : s;
      ctx.fillText(label, px, y + (i % 2 === 0 ? -20 : 25));
      ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;
  }

  drawDiagram(ctx, scene, t, W, H, th, elements) {
    const cx = W / 2, cy = H / 2 - 15;
    const core = elements[0] || 'Concept';
    const nodes = elements.slice(1, 7);
    // Core circle
    const cAlpha = Math.min(1, t * 3);
    ctx.globalAlpha = cAlpha;
    ctx.beginPath(); ctx.arc(cx, cy, 45, 0, Math.PI * 2);
    ctx.fillStyle = th.primary; ctx.globalAlpha = cAlpha * 0.3; ctx.fill();
    ctx.globalAlpha = cAlpha;
    ctx.strokeStyle = th.secondary; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px "Inter", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(core.length > 12 ? core.slice(0, 12) : core, cx, cy + 5); ctx.textAlign = 'left';
    // Surrounding nodes
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
    
    // Prevent garbage collection bugs wiping TTS halfway
    this.currentUtterance = utter;
    
    utter.onend = () => {
      this.speechFinished = true;
      this.speechEndTime = performance.now();
    };
    utter.onerror = () => {
      this.speechFinished = true;
    };
    
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
    // Center vertically for 2 lines max
    const totalH = Math.min(lines.length, 2) * lineH;
    lines.slice(0, 2).forEach((l, i) => {
      ctx.fillText(l, x, y - totalH / 2 + i * lineH + lineH / 2);
    });
  }

  destroy() {
    this.pause();
    this.stopSpeech();
  }
}

// Global reference
let activePlayer = null;

function initManimPlayer(canvasId, blueprint) {
  if (activePlayer) activePlayer.destroy();
  activePlayer = new ManimPlayer(canvasId, blueprint);
}
