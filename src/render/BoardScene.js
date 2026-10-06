// Phaser scene that renders the board for both Play and Editor modes and forwards pointer input.
// It reads state from the app controller; it never changes gameplay rules itself.
import * as Phaser from 'phaser';
import { GRID_WIDTH, GRID_HEIGHT, cellKey, parseKey, DIRECTIONS } from '../core/constants.js';
import { planMove, catsMoveOnTick } from '../core/simulation.js';
import { PlayState } from '../core/session.js';
import { TILE, COLORS, ARROW_COLORS } from './theme.js';
import {
  drawFloor, drawWall, drawRocket, drawArrow, drawMouse, drawCat, drawFacingMarker, drawCellOutline, drawCross,
} from './draw.js';

const H = TILE / 2;
const center = (v) => v * TILE + H;
const lerp = (a, b, t) => a + (b - a) * t;

export class BoardScene extends Phaser.Scene {
  constructor(app) {
    super('board');
    this.app = app;
    this.hover = null; // {x, y} or null
    this.animTime = 0;
    this.rocketBoost = new Map(); // cellKey -> remaining ms
    this.lossMarkers = [];
  }

  create() {
    this.input.mouse?.disableContextMenu();
    this.floor = this.add.graphics();
    drawFloor(this.floor, GRID_WIDTH, GRID_HEIGHT);
    this.board = this.add.graphics();
    this.actors = this.add.graphics();
    this.overlay = this.add.graphics();
    this.fxLayer = this.add.container(0, 0);

    const toCell = (p) => {
      const x = Math.floor(p.worldX / TILE);
      const y = Math.floor(p.worldY / TILE);
      return x >= 0 && y >= 0 && x < GRID_WIDTH && y < GRID_HEIGHT ? { x, y } : null;
    };
    this.input.on('pointerdown', (p) => {
      const cell = toCell(p);
      this.hover = cell;
      if (cell) this.app.handleBoardPointer(cell, { type: 'down', right: p.rightButtonDown() });
    });
    this.input.on('pointermove', (p) => {
      const cell = toCell(p);
      const changed = cell?.x !== this.hover?.x || cell?.y !== this.hover?.y;
      this.hover = cell;
      if (cell && changed && p.isDown) this.app.handleBoardPointer(cell, { type: 'drag', right: p.rightButtonDown() });
    });
    this.input.on('pointerup', () => this.app.handleBoardPointerUp());
    this.input.on('gameout', () => {
      this.hover = null;
      this.app.handleBoardPointerUp();
    });
    this.app.onSceneReady(this);
  }

  /** Called by the app whenever a session is created or reset. */
  clearEffects() {
    this.tweens.killAll();
    this.fxLayer.removeAll(true);
    this.rocketBoost.clear();
    this.lossMarkers = [];
    this.cameras.main.resetFX();
  }

  setEffectsPaused(paused) {
    if (paused) this.tweens.pauseAll();
    else this.tweens.resumeAll();
  }

  update(_time, delta) {
    const { app } = this;
    const session = app.mode === 'play' ? app.session : null;
    if (session) {
      for (const events of session.update(delta)) this.playTickEffects(session, events);
    }
    if (!session || session.state !== PlayState.PAUSED) {
      this.animTime += delta;
      for (const [k, ms] of this.rocketBoost) {
        if (ms - delta <= 0) this.rocketBoost.delete(k);
        else this.rocketBoost.set(k, ms - delta);
      }
    }
    if (session) this.renderPlay(session);
    else this.renderEditor(app.editor);
  }

  // ---------------------------------------------------------------- play

  renderPlay(session) {
    const { sim, layout } = session;
    const b = this.board;
    const a = this.actors;
    const o = this.overlay;
    b.clear();
    a.clear();
    o.clear();
    const pulse = (Math.sin(this.animTime / 90) + 1) / 2;
    for (const k of sim.walls) {
      const { x, y } = parseKey(k);
      drawWall(b, x, y);
    }
    for (const [k, d] of layout.arrows) {
      const { x, y } = parseKey(k);
      drawArrow(b, x, y, d);
    }
    for (const k of sim.rockets) {
      const { x, y } = parseKey(k);
      drawRocket(b, x, y, pulse, (this.rocketBoost.get(k) ?? 0) / 400);
    }

    const animating = session.state === PlayState.RUNNING || session.state === PlayState.PAUSED;
    const p = session.tickProgress;
    const nextTick = sim.tick + 1;
    const showMarkers = session.state === PlayState.PLACEMENT;

    for (const m of sim.mice) {
      if (m.status !== 'active') continue;
      let px = center(m.x);
      let py = center(m.y);
      let dir = m.direction;
      if (animating) {
        const plan = planMove(sim, m);
        px = lerp(px, center(plan.x), p);
        py = lerp(py, center(plan.y), p);
        dir = plan.direction;
      }
      drawMouse(a, px, py, dir, animating ? p : 0);
      if (showMarkers) drawFacingMarker(a, px, py, dir, COLORS.mouseBody, 0.9);
    }
    for (const c of sim.cats) {
      let px = center(c.x);
      let py = center(c.y);
      let dir = c.direction;
      let step = 0;
      if (animating) {
        // Cats move every second tick; spread the slide over both ticks so it ends exactly on the logical move.
        const plan = planMove(sim, c);
        const phase = catsMoveOnTick(nextTick) ? 0.5 + p / 2 : p / 2;
        px = lerp(px, center(plan.x), phase);
        py = lerp(py, center(plan.y), phase);
        dir = plan.direction;
        step = phase;
      }
      drawCat(a, px, py, dir, step);
      if (showMarkers) drawFacingMarker(a, px, py, dir, COLORS.catBody, 1);
    }
    for (const mk of this.lossMarkers) {
      drawCellOutline(o, mk.x, mk.y, COLORS.hoverBad, 0.6 + 0.4 * pulse, 4);
      drawCross(o, mk.x, mk.y, COLORS.hoverBad, 1);
    }

    // Placement preview
    if (this.hover && session.canEditArrows) {
      const { x, y } = this.hover;
      const tool = this.app.playTool;
      const existing = layout.get(x, y);
      if (!layout.isEligible(x, y)) {
        drawCellOutline(o, x, y, COLORS.hoverBad, 0.9);
        drawCross(o, x, y, COLORS.hoverBad, 0.7);
      } else if (tool === 'eraser') {
        drawCellOutline(o, x, y, existing ? COLORS.hoverBad : COLORS.hoverNeutral, existing ? 1 : 0.35);
        if (existing) drawCross(o, x, y, COLORS.hoverBad, 0.9);
      } else {
        const available = layout.inventory[tool] > 0 || existing === tool;
        if (existing !== tool) drawArrow(o, x, y, tool, available ? 0.55 : 0.25);
        drawCellOutline(o, x, y, available ? COLORS.hoverOk : COLORS.hoverBad, 0.95);
        if (!available) drawCross(o, x, y, COLORS.hoverBad, 0.8);
      }
    } else if (this.hover) {
      drawCellOutline(o, this.hover.x, this.hover.y, COLORS.hoverNeutral, 0.2);
    }
  }

  playTickEffects(session, events) {
    const { sim } = session;
    for (const id of events.saved) {
      const m = sim.mice.find((mm) => mm.id === id);
      this.rocketBoost.set(cellKey(m.x, m.y), 400);
      this.burst(m.x, m.y, COLORS.rocketWindow, 10);
      this.ring(m.x, m.y, COLORS.rocketFlame);
      this.floatText(m.x, m.y, '+1', '#7dff6a');
    }
    for (const id of events.eaten) {
      const m = sim.mice.find((mm) => mm.id === id);
      this.lossMarkers.push({ x: m.x, y: m.y });
      this.burst(m.x, m.y, COLORS.hoverBad, 14);
      this.floatText(m.x, m.y, 'CHOMP!', '#ff3355');
    }
    for (const id of events.catsInRocket) {
      const c = sim.cats.find((cc) => cc.id === id);
      this.lossMarkers.push({ x: c.x, y: c.y });
      this.burst(c.x, c.y, COLORS.catBody, 14);
      this.floatText(c.x, c.y, 'HIJACKED!', '#ff7b22');
    }
    const cam = this.cameras.main;
    if (events.outcome === 'won') {
      cam.flash(350, 120, 255, 160);
      for (const k of sim.rockets) {
        const { x, y } = parseKey(k);
        this.burst(x, y, ARROW_COLORS[DIRECTIONS[(x + y) % 4]], 18, 70);
        this.ring(x, y, 0xffffff);
      }
    } else if (events.outcome === 'lost') {
      cam.shake(320, 0.012);
      cam.flash(250, 255, 40, 80);
    }
  }

  burst(x, y, color, count, dist = 42) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dot = this.add.circle(center(x), center(y), 3 + Math.random() * 2, color);
      this.fxLayer.add(dot);
      this.tweens.add({
        targets: dot,
        x: center(x) + Math.cos(angle) * dist * (0.6 + Math.random() * 0.4),
        y: center(y) + Math.sin(angle) * dist * (0.6 + Math.random() * 0.4),
        alpha: 0,
        scale: 0.3,
        duration: 450 + Math.random() * 200,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }
  }

  ring(x, y, color) {
    const r = this.add.circle(center(x), center(y), 12);
    r.setStrokeStyle(3, color, 1);
    this.fxLayer.add(r);
    this.tweens.add({ targets: r, scale: 3, alpha: 0, duration: 500, ease: 'Quad.easeOut', onComplete: () => r.destroy() });
  }

  floatText(x, y, text, color) {
    const t = this.add.text(center(x), center(y) - 10, text, {
      fontFamily: '"Courier New", ui-monospace, monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color,
      stroke: '#090b17',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.fxLayer.add(t);
    this.tweens.add({ targets: t, y: t.y - 34, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------- editor

  renderEditor(editor) {
    const b = this.board;
    const a = this.actors;
    const o = this.overlay;
    b.clear();
    a.clear();
    o.clear();
    const pulse = (Math.sin(this.animTime / 90) + 1) / 2;
    for (const [k, cell] of editor.cells) {
      const { x, y } = parseKey(k);
      if (cell.type === 'wall') drawWall(b, x, y);
      else if (cell.type === 'rocket') drawRocket(b, x, y, pulse);
      else if (cell.type === 'mouse') this.drawSpawn(a, x, y, cell.direction, 'mouse', 1);
      else if (cell.type === 'cat') this.drawSpawn(a, x, y, cell.direction, 'cat', 1);
    }
    if (!this.hover) return;
    const { x, y } = this.hover;
    const tool = this.app.editorTool;
    const toolColor = {
      floor: COLORS.hoverNeutral, wall: COLORS.wallTop, rocket: COLORS.rocketAccent, mouse: COLORS.mouseBody, cat: COLORS.catBody,
    }[tool];
    if (tool === 'floor') {
      if (editor.get(x, y)) drawCross(o, x, y, COLORS.hoverBad, 0.8);
    } else {
      o.fillStyle(COLORS.background, 0.55);
      o.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
      if (tool === 'wall') drawWall(o, x, y);
      else if (tool === 'rocket') drawRocket(o, x, y, pulse);
      else this.drawSpawn(o, x, y, this.app.editorDirection[tool], tool, 0.6);
    }
    drawCellOutline(o, x, y, toolColor, 0.95);
  }

  drawSpawn(g, x, y, direction, type, alpha) {
    const px = center(x);
    const py = center(y);
    const color = type === 'cat' ? COLORS.catBody : COLORS.mouseBody;
    // spawn pad + strong direction marker so initial direction is unmistakable
    g.lineStyle(2, color, 0.5 * alpha);
    g.strokeCircle(px, py, 28);
    if (type === 'cat') drawCat(g, px, py, direction, 0, alpha);
    else drawMouse(g, px, py, direction, 0, alpha);
    drawFacingMarker(g, px, py, direction, color, alpha);
  }
}
