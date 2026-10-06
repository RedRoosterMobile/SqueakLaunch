// Visual constants. Decorative only — nothing here affects gameplay.
export const TILE = 64;

export const COLORS = {
  background: 0x090b17,
  floorA: 0x12152b,
  floorB: 0x161a35,
  gridLine: 0x262d5c,
  border: 0x5df2ff,
  wallFace: 0x4b2fb0,
  wallTop: 0x8b6bff,
  wallShadow: 0x24155e,
  rocketBody: 0xf1f3ff,
  rocketAccent: 0xff3d6e,
  rocketWindow: 0x3ad6ff,
  rocketFlame: 0xffb703,
  rocketPad: 0x2b3470,
  mouseBody: 0xdfe6ff,
  mouseEar: 0xff9ecf,
  mouseOutline: 0x1c2147,
  catBody: 0xff7b22,
  catStripe: 0x8a3300,
  catEye: 0xa6ff4d,
  catOutline: 0x2a1000,
  hoverOk: 0x7dff6a,
  hoverBad: 0xff3355,
  hoverNeutral: 0xffffff,
};

/** Arrow colours double as direction identity (shape + colour). */
export const ARROW_COLORS = {
  up: 0x3ad6ff,
  right: 0x7dff6a,
  down: 0xffd23f,
  left: 0xff5fa2,
};

export const DIRECTION_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

export const toCss = (c) => `#${c.toString(16).padStart(6, '0')}`;
