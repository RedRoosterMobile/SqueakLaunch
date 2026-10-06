// Stateless drawing helpers for Phaser Graphics. All shapes are drawn around (0,0)
// facing right, then positioned/rotated with the Graphics transform stack.
import { TILE, COLORS, ARROW_COLORS, DIRECTION_ANGLE } from './theme.js';

const H = TILE / 2;

function withTransform(g, x, y, rotation, fn) {
  g.save();
  g.translateCanvas(x, y);
  if (rotation) g.rotateCanvas(rotation);
  fn();
  g.restore();
}

export function drawFloor(g, cols, rows) {
  g.fillStyle(COLORS.background, 1);
  g.fillRect(0, 0, cols * TILE, rows * TILE);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      g.fillStyle((x + y) % 2 ? COLORS.floorB : COLORS.floorA, 1);
      g.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  g.lineStyle(1, COLORS.gridLine, 1);
  for (let x = 0; x <= cols; x++) g.lineBetween(x * TILE + 0.5, 0, x * TILE + 0.5, rows * TILE);
  for (let y = 0; y <= rows; y++) g.lineBetween(0, y * TILE + 0.5, cols * TILE, y * TILE + 0.5);
  // dotted tile centres for a retro feel
  g.fillStyle(COLORS.gridLine, 1);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g.fillRect(x * TILE + H - 1, y * TILE + H - 1, 2, 2);
  g.lineStyle(3, COLORS.border, 0.9);
  g.strokeRect(1.5, 1.5, cols * TILE - 3, rows * TILE - 3);
}

export function drawWall(g, x, y) {
  const px = x * TILE;
  const py = y * TILE;
  g.fillStyle(COLORS.wallShadow, 1);
  g.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
  g.fillStyle(COLORS.wallFace, 1);
  g.fillRect(px + 4, py + 4, TILE - 8, TILE - 10);
  g.fillStyle(COLORS.wallTop, 1);
  g.fillRect(px + 4, py + 4, TILE - 8, 6);
  // brick pattern
  g.lineStyle(2, COLORS.wallShadow, 1);
  g.lineBetween(px + 4, py + 26, px + TILE - 4, py + 26);
  g.lineBetween(px + 4, py + 42, px + TILE - 4, py + 42);
  g.lineBetween(px + 32, py + 10, px + 32, py + 26);
  g.lineBetween(px + 20, py + 26, px + 20, py + 42);
  g.lineBetween(px + 44, py + 26, px + 44, py + 42);
  g.lineBetween(px + 32, py + 42, px + 32, py + TILE - 6);
}

/** Rocket pointing up. `pulse` 0..1 animates the flame; `boost` 0..1 flares it after a save. */
export function drawRocket(g, x, y, pulse = 0, boost = 0) {
  const cx = x * TILE + H;
  const cy = y * TILE + H;
  g.fillStyle(COLORS.rocketPad, 1);
  g.fillCircle(cx, cy, 27);
  g.lineStyle(2, COLORS.rocketAccent, 0.6 + 0.4 * boost);
  g.strokeCircle(cx, cy, 27);
  // flame
  const fl = 8 + pulse * 5 + boost * 10;
  g.fillStyle(COLORS.rocketFlame, 0.9);
  g.fillTriangle(cx - 7, cy + 14, cx + 7, cy + 14, cx, cy + 14 + fl);
  g.fillStyle(0xffffff, 0.8);
  g.fillTriangle(cx - 3, cy + 14, cx + 3, cy + 14, cx, cy + 14 + fl * 0.5);
  // fins
  g.fillStyle(COLORS.rocketAccent, 1);
  g.fillTriangle(cx - 9, cy + 2, cx - 17, cy + 16, cx - 9, cy + 14);
  g.fillTriangle(cx + 9, cy + 2, cx + 17, cy + 16, cx + 9, cy + 14);
  // body + nose
  g.fillStyle(COLORS.rocketBody, 1);
  g.fillRoundedRect(cx - 9, cy - 10, 18, 26, 4);
  g.fillStyle(COLORS.rocketAccent, 1);
  g.fillTriangle(cx - 9, cy - 9, cx + 9, cy - 9, cx, cy - 24);
  g.fillStyle(COLORS.rocketWindow, 1);
  g.fillCircle(cx, cy, 5);
  g.lineStyle(2, 0x1a1f45, 1);
  g.strokeCircle(cx, cy, 5);
}

/** Arrow tile. `alpha` < 1 for previews. */
export function drawArrow(g, x, y, direction, alpha = 1) {
  const color = ARROW_COLORS[direction];
  const cx = x * TILE + H;
  const cy = y * TILE + H;
  g.fillStyle(color, 0.18 * alpha);
  g.fillRoundedRect(x * TILE + 5, y * TILE + 5, TILE - 10, TILE - 10, 8);
  g.lineStyle(2, color, 0.85 * alpha);
  g.strokeRoundedRect(x * TILE + 5, y * TILE + 5, TILE - 10, TILE - 10, 8);
  withTransform(g, cx, cy, DIRECTION_ANGLE[direction], () => {
    g.fillStyle(color, alpha);
    // chevron arrow: shaft + head
    g.fillRect(-16, -5, 16, 10);
    g.fillTriangle(0, -15, 0, 15, 17, 0);
  });
}

/** Mouse facing right at (0,0). `step` 0..1 drives the walk wiggle. */
export function drawMouse(g, px, py, direction, step = 0, alpha = 1) {
  withTransform(g, px, py, DIRECTION_ANGLE[direction], () => {
    g.scaleCanvas(1.2, 1.2);
    const wig = Math.sin(step * Math.PI * 2) * 3;
    // tail
    g.lineStyle(3, COLORS.mouseEar, alpha);
    g.beginPath();
    g.moveTo(-12, 0);
    g.lineTo(-19, wig);
    g.lineTo(-25, -wig);
    g.strokePath();
    // body
    g.fillStyle(COLORS.mouseOutline, alpha);
    g.fillEllipse(0, 0, 30, 22);
    g.fillStyle(COLORS.mouseBody, alpha);
    g.fillEllipse(0, 0, 26, 18);
    // ears
    g.fillStyle(COLORS.mouseEar, alpha);
    g.fillCircle(4, -9, 5);
    g.fillCircle(4, 9, 5);
    // snout
    g.fillStyle(COLORS.mouseBody, alpha);
    g.fillTriangle(8, -7, 8, 7, 18, 0);
    g.fillStyle(COLORS.mouseEar, alpha);
    g.fillCircle(18, 0, 2.5);
    // eyes
    g.fillStyle(0x10132a, alpha);
    g.fillCircle(10, -3.5, 1.8);
    g.fillCircle(10, 3.5, 1.8);
  });
}

/** Cat facing right at (0,0). */
export function drawCat(g, px, py, direction, step = 0, alpha = 1) {
  withTransform(g, px, py, DIRECTION_ANGLE[direction], () => {
    const sway = Math.sin(step * Math.PI * 2) * 5;
    // tail
    g.lineStyle(5, COLORS.catBody, alpha);
    g.beginPath();
    g.moveTo(-16, 0);
    g.lineTo(-24, sway);
    g.lineTo(-28, sway * 1.6);
    g.strokePath();
    // body
    g.fillStyle(COLORS.catOutline, alpha);
    g.fillEllipse(-3, 0, 40, 32);
    g.fillStyle(COLORS.catBody, alpha);
    g.fillEllipse(-3, 0, 36, 28);
    // stripes
    g.fillStyle(COLORS.catStripe, alpha);
    g.fillRect(-14, -11, 4, 22);
    g.fillRect(-6, -13, 4, 26);
    // head
    g.fillStyle(COLORS.catOutline, alpha);
    g.fillCircle(13, 0, 13);
    g.fillStyle(COLORS.catBody, alpha);
    g.fillCircle(13, 0, 11);
    // ears (pointing sideways-forward)
    g.fillStyle(COLORS.catBody, alpha);
    g.fillTriangle(6, -9, 16, -10, 8, -20);
    g.fillTriangle(6, 9, 16, 10, 8, 20);
    g.fillStyle(COLORS.catStripe, alpha);
    g.fillTriangle(8, -11, 13, -11, 9, -17);
    g.fillTriangle(8, 11, 13, 11, 9, 17);
    // eyes
    g.fillStyle(COLORS.catEye, alpha);
    g.fillEllipse(17, -5, 6, 4);
    g.fillEllipse(17, 5, 6, 4);
    g.fillStyle(0x000000, alpha);
    g.fillRect(17, -6, 2, 2);
    g.fillRect(17, 4, 2, 2);
    // whiskers
    g.lineStyle(1, 0xffffff, 0.8 * alpha);
    g.lineBetween(22, -2, 30, -6);
    g.lineBetween(22, 2, 30, 6);
  });
}

/** Small direction marker in front of an entity (used to make facing obvious). */
export function drawFacingMarker(g, px, py, direction, color, alpha = 1) {
  withTransform(g, px, py, DIRECTION_ANGLE[direction], () => {
    g.fillStyle(color, alpha);
    g.fillTriangle(25, -5, 25, 5, 30, 0);
  });
}

export function drawCellOutline(g, x, y, color, alpha = 1, width = 3) {
  g.lineStyle(width, color, alpha);
  g.strokeRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
}

export function drawCross(g, x, y, color, alpha = 1) {
  const cx = x * TILE + H;
  const cy = y * TILE + H;
  g.lineStyle(4, color, alpha);
  g.lineBetween(cx - 10, cy - 10, cx + 10, cy + 10);
  g.lineBetween(cx + 10, cy - 10, cx - 10, cy + 10);
}
