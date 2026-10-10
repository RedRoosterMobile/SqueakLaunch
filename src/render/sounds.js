// Original generated assets; quieter UI cues and a small per-sound cooldown.
export const SFX_VOLUMES = Object.freeze({
  place: .35, remove: .3, error: .3, start: .45, pause: .3, resume: .3,
  reset: .35, clear: .3, select: .2, level: .4, save: .4, chomp: .55,
  hijack: .4, win: .5, lose: .45, stamp: .2, confirm: .35,
});

export function tickSound(events) {
  // One failure cue per tick, even if several cats/mice collide at once.
  if (events.outcome === 'lost') {
    if (events.eaten.length) return 'chomp';
    if (events.catsInRocket.length) return 'hijack';
    return 'lose';
  }
  if (events.outcome === 'won') return 'win';
  if (events.saved.length) return 'save';
  return null;
}
