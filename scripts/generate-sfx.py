"""Generate original, deterministic retro SFX. Run: python3 scripts/generate-sfx.py"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parents[1] / 'public' / 'sfx'
# Each note: start frequency, end frequency, duration, waveform.
SOUNDS = {
    'place': [(650, 1000, .075, 'square')],
    'remove': [(800, 250, .09, 'sine')],
    'error': [(150, 100, .16, 'square')],
    'start': [(440, 440, .07, 'square'), (660, 660, .07, 'square'), (880, 1100, .13, 'sine')],
    'pause': [(600, 350, .12, 'sine')],
    'resume': [(350, 600, .12, 'sine')],
    'reset': [(1000, 180, .22, 'triangle')],
    'clear': [(1100, 120, .18, 'noise')],
    'select': [(950, 750, .035, 'sine')],
    'level': [(523, 523, .07, 'sine'), (784, 784, .12, 'sine')],
    'save': [(1100, 1700, .08, 'sine'), (1400, 2100, .10, 'sine')],
    'chomp': [(220, 60, .18, 'noise')],
    'hijack': [(850, 450, .12, 'square'), (850, 450, .12, 'square')],
    'win': [(523, 523, .12, 'triangle'), (659, 659, .12, 'triangle'), (784, 784, .12, 'triangle'), (1047, 1047, .35, 'triangle')],
    'lose': [(330, 330, .14, 'triangle'), (247, 247, .14, 'triangle'), (165, 90, .3, 'triangle')],
    'stamp': [(400, 550, .045, 'triangle')],
    'confirm': [(660, 660, .07, 'sine'), (990, 990, .14, 'sine')],
}


def generate():
    OUT.mkdir(parents=True, exist_ok=True)
    rng = random.Random(42)
    for name, notes in SOUNDS.items():
        samples = []
        for f0, f1, duration, shape in notes:
            count = round(duration * RATE)
            phase = 0
            for i in range(count):
                t = i / count
                phase += (f0 + (f1 - f0) * t) / RATE
                if shape == 'square':
                    value = 1 if phase % 1 < .5 else -1
                elif shape == 'triangle':
                    value = 1 - 4 * abs(phase % 1 - .5)
                elif shape == 'noise':
                    value = .55 * rng.uniform(-1, 1) + .45 * math.sin(2 * math.pi * phase)
                else:
                    value = math.sin(2 * math.pi * phase)
                # Soft attack/release avoid clicks; all files have ample headroom.
                envelope = min(1, i / (RATE * .005), (count - 1 - i) / (RATE * .025))
                samples.append(round(12000 * value * envelope * (1 - .35 * t)))
            samples.extend([0] * round(RATE * .015))
        with wave.open(str(OUT / f'{name}.wav'), 'wb') as output:
            output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
            output.writeframes(struct.pack(f'<{len(samples)}h', *samples))
    print(f'Generated {len(SOUNDS)} sounds in {OUT}')


if __name__ == '__main__':
    generate()
