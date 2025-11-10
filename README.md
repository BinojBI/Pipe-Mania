# Pipe Mania

Pipe mania is browser-based puzzle game made with phaser, tech stack based on JavaScript/TypeScript/HTML5. The game is played using any modern browser through this link.
https://binojbi.github.io/Pipe-Mania/

## How game works

The player must connect a series of random pipe pieces from a starting point by ensuring more than minimum distance to flow water. Water flowing started from some delay which showed on the left top corner of the window. The minimum distance is shown on the right top of the screen.
Pipe Queue available next to the grid and it shows the next pipe pieces available for placement.

## Interactions

- Placing a new pipe - Click or tap on an empty grid cell to place the pipe currently at the front of the queue. The Player can't place pipes on block cells.
- Replace a pipe - The player can replace a pipe if the pipe is not already filled, by Click or tap on pipe that needs to be replaced.

## Win/Lose Condition

- Win condition - The player wins if successfully creates a continuous path of pipes that meets the minimum required length (randomly set) before the water reaches the end of the path.
- Lose condition - The player loses if the water reaches a dead-end without completing the minimum required path length.

## Screenshots

![StartScreen](/screenshots/screenshot1.png?raw=true "Start Screen")
![GameScreen](/screenshots/screenshot2.png?raw=true "Game Screen")
![WinScreen](/screenshots/screenshot3.png?raw=true "Win Screen")
![LoseScreen](/screenshots/screenshot4.png?raw=true "Lose Screen")

## Developer and Configuration Guide

#### Project Setup

1. Clone the repository or download the zip file to your local machine.

```
git clone https://github.com/BinojBI/Pipe-Mania.git
```

2. If you download the zip, unzip and go inside the Pipe-Mania-master folder.
3. Open Pipe-Mania-master folder using Visual Studio Code or any support IDE.
4. Running Locally: Run the game using a local web server to properly load assets.

- Install http-server via npm (`npm install -g http-server`) and run `http-server` from the project's root folder.
- Or use the Live Server extension in Visual Studio Code or your IDE.

(If you already installed phaser launcher or phaser editor open the project and play)

#### Game Configuration

All major gameplay settings can be adjusted in the external JSON file.

- File Path: assets/config/game_config.json

| Setting       |       JSON Identification       | Description                                                                       | Default Value |
| ------------- | :-----------------------------: | --------------------------------------------------------------------------------- | :-----------: |
| Grid Columns  |            GRID.COLS            | Number of columns in the grid.                                                    |       9       |
| Grid Rows     |            GRID.ROWS            | Number of rows in the grid.                                                       |       7       |
| Cell Size     |         GRID.CELL_SIZE          | Pixel size of each grid tile (determines scale).                                  |      90       |
| Blocked Cells |      GRID.BLOCK_CELL_COUNT      | The number of random cells that start blocked/unusable.                           |       5       |
| Flow Speed    |           FLOW.SPEED            | Delay (in milliseconds) between water filling each pipe segment. Lower is faster. |      50       |
| Flow Color    |           FLOW.COLOR            | The hex color of the flowing water (must be a string).                            |  “0x1BB7E6”   |
| Minimum Pipes | GAMEPLAY.MINIMUM_DISTANCE_PIPES | The number of connected pipes required to reach a win condition.                  |      10       |

Asset Management

- Texture Atlas: All main pipe and grid assets are packed into a single texture atlas named pipesAtlas.
  - Image: assets/images/pipes_and_cell_atlas.png
  - Data: assets/images/pipes_and_cell_atlas.json

### Credits (Audio)

- Background Sound :
  https://opengameart.org/content/4-chiptunes-adventure
- Click & Place sounds :
  https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks
- Flow sound :
  https://opengameart.org/content/beep-tone-sound-sfx
- Explosion sound :
  https://opengameart.org/content/bombexplosion8bit
