# Squeak Launch

A grid-based puzzle game where you place directional arrows to guide mice into rockets while keeping cats away.
It's inspired by the classic "mice, cats and rockets" arcade puzzlers. All names, visuals and levels are original, and every graphic is drawn at runtime with Phaser Graphics, so there are no external assets or services.

Built with **Phaser 4.2.1**, plain JavaScript ES modules and **Vite 8**, on **Node.js 26**.

## Setup

```bash
nvm install      # installs the Node version from .nvmrc (26)
nvm use
npm install
npm run dev      # start the dev server, then open the printed URL
```

Other scripts:

| Command           | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run build`   | Production build into `dist/`                   |
| `npm run preview` | Serve the production build locally              |
| `npm test`        | Run the simulation/validation tests (`node --test`, no Phaser needed) |

## How to play

Every level is a 12 × 9 grid. Mice and cats walk on their own, and you can't control them directly. Before pressing **Start**, place arrows from your limited inventory so that every mouse reaches a rocket.

### Rules

- Mice move one tile every tick (a tick is 250 ms). Cats move one tile every second tick, starting on tick 2.
- On each move, a creature first takes the direction of any arrow on its tile. If the next tile is blocked, it turns **clockwise** until it finds an open tile. If all four sides are blocked, it stays where it is.
- Walls and the grid edge block movement. Rockets, arrows and other creatures don't. Arrows are permanent and affect both mice and cats.
- A cat eats any mouse on the same tile. This includes a cat and a mouse swapping tiles in the same tick, and a mouse walking into a cat that is standing still.
- A mouse that reaches a rocket is saved, and rockets hold any number of mice. You lose immediately if a cat reaches a rocket or if any mouse is eaten.
- You win when every mouse is saved. Failures are checked first, so a cat incident in the same tick beats a win.
- There's no time limit.

### Controls

| Input                          | Action                                         |
| ------------------------------ | ---------------------------------------------- |
| Click / tap a tile             | Place the selected arrow (or replace one)      |
| Right-click an arrow           | Remove it and get it back in your inventory    |
| Eraser tool (`E`)              | Remove arrows without right-clicking (touch-friendly) |
| `1` `2` `3` `4`                | Select up, right, down or left arrows          |
| `Space`                        | Start / Pause / Resume                         |
| `R`                            | Reset (keeps your arrows)                      |
| `Esc`                          | Close dialogs                                  |

Shortcuts are turned off while you're typing in a text field or a dialog is open.

Play states are **Placement → Running ⇄ Paused → Won / Lost**. You can only edit arrows during Placement.

- **Reset** puts the creatures back where they started and keeps your arrows.
- **Clear Arrows** removes all of your arrows and refills your inventory.
- Picking a different level starts it with no arrows placed.

### Built-in levels

1. **First Launch**: tutorial. One mouse, one arrow.
2. **The Long Way In**: two mice and a walled maze. Both mice share the same arrows.
3. **Whisker Watch**: a patrolling cat blocks the obvious shortcut, so you need a safer route.

## Level editor

Click **Switch to Editor**. The editor uses the same board and art as Play Mode.

- **Palette:** Floor/Eraser, Wall, Rocket, Mouse and Cat. Mouse and Cat each have their own starting-direction picker.
- Click to stamp the selected item. Click and drag to paint walls or floor, and right-click to erase. Stamping replaces whatever is in the cell, and a cell holds at most one object.
- **Level name** and the four **starting arrow** counts are level settings, not tiles you paint.
- **New Level**, **Import Level**: both ask before throwing away unsaved changes.
- **Test Level** opens Play Mode with a *copy* of your draft. **Back to Editor** brings you back to the draft exactly as you left it, without any test arrows.
- **Export Level** opens the formatted JSON with **Copy** and **Download JSON** buttons. If the clipboard is blocked, the text is selected so you can copy it yourself.
- Drafts can be incomplete while you edit, and problems are listed live in the sidebar. Testing and exporting need a valid level.

## Level JSON format (version 1)

```json
{
  "version": 1,
  "name": "My Level",
  "width": 12,
  "height": 9,
  "walls":   [{ "x": 3, "y": 2 }],
  "rockets": [{ "x": 10, "y": 1 }],
  "mice":    [{ "x": 1, "y": 4, "direction": "right" }],
  "cats":    [{ "x": 8, "y": 7, "direction": "up" }],
  "arrowInventory": { "up": 1, "right": 0, "down": 2, "left": 1 }
}
```

- Coordinates are integers, with `(0, 0)` at the top-left. `x` runs from 0 to 11 and `y` from 0 to 8.
- `direction` is one of `"up"`, `"right"`, `"down"` or `"left"`.
- `arrowInventory` holds whole-number counts from 0 to 99 for each of the four directions.
- Each cell can hold only one wall, rocket, mouse spawn or cat spawn.
- A level needs at least one mouse and at least one rocket.
- Exported files contain only these fields. Runtime state, saved counts and placed arrows are never exported.
- Import rejects files that:
  - aren't valid JSON
  - use a version other than 1
  - aren't 12 × 9
  - have coordinates outside the grid or objects that overlap
  - use an invalid direction or arrow count
  - are missing a mouse or a rocket

  Each problem gets its own error message, and your current draft stays unchanged.
- Import doesn't check whether a level can be solved.

## Project structure

```
src/
  core/            pure JS, no Phaser — fully unit-testable
    constants.js   grid size, timing, direction helpers
    simulation.js  deterministic tick rules (movement, collisions, outcomes)
    arrows.js      arrow placement and inventory rules
    session.js     Play state machine and fixed-step clock
    level.js       level format: validation, normalization, serialization
    editor.js      editor draft state (stamping, dirty tracking)
  render/          Phaser 4 rendering (decorative only)
    BoardScene.js  draws the board for both modes, forwards pointer input, effects
    draw.js        shape-drawing helpers; theme.js holds colors
  ui/              DOM sidebar, dialogs, overlay, keyboard
  levels/          built-in level JSON files
  app.js           controller connecting modes, session, editor and UI
test/              node:test suites
scripts/           dev tools: solve-level.js (brute-force solver), ascii.js (ASCII sketch → JSON)
```

## Implementation notes and decisions

- **Fixed-step simulation.** The game clock adds up real frame time and runs one 250 ms tick at a time, so frame rate never changes the result. Large frame gaps (such as a backgrounded tab) are capped at 4 ticks. Pausing simply stops the clock, so resuming continues exactly where it left off.
- **Smooth, accurate movement.** Each creature's next move depends only on walls and arrows, which can't change while the game is running. The renderer looks ahead to the next move and slides creatures so they land on a tile exactly when the logical tick happens. Cats spread each move across two ticks. Collisions always use logical grid positions.
- **Arrow placement.** Arrows can't go on walls, rockets or the tiles where creatures start. Clicking an arrow with the same direction selected does nothing. If you replace an arrow but have none of the new direction left, the original arrow stays and you see a message.
- **Facing markers.** During Placement, small triangles show which way each creature is facing. The editor shows a spawn ring and a direction marker for each creature.
- **Saved draft.** A draft counts as saved after you export it (Copy or Download). Leaving the page with unsaved changes shows the browser's warning.
- **UI split.** The sidebar and dialogs are plain HTML, which keeps them accessible and makes text input easy. Phaser renders only the board. The board scales to fit (`Phaser.Scale.FIT`) and keeps its 4:3 shape, and Phaser translates pointer positions so clicks land on the right cell on any screen size.
- **Solver.** `node scripts/solve-level.js src/levels/level2.json` searches for arrow layouts that solve a level. It was used to check that every built-in level can be solved and needs real thought.
