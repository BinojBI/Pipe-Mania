
export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    static PIPE_CONNECTIONS = {
        straight_pipe: { 0: ['bottom', 'top'], 90: ['left', 'right'] },
        bend_pipe: { 0: ['top', 'right'], 90: ['right', 'bottom'], 180: ['bottom', 'left'], 270: ['left', 'top'] },
        cross_pipe: { 0: ['top', 'right', 'bottom', 'left'] },
        start_pipe: { 0: ['right'], 90: ['bottom'], 180: ['left'], 270: ['top'] }
    };

    static DIRS = {
            right: { dx: 1, dy: 0, opposite: 'left' },
            left: { dx: -1, dy: 0, opposite: 'right' },
            top: { dx: 0, dy: -1, opposite: 'bottom' },
            bottom: { dx: 0, dy: 1, opposite: 'top' }
    };  

    preload() {
        this.load.json('gameConfigData', 'assets/config/game_config.json');

        this.load.image('background', 'assets/images/background.png');
        this.load.atlas('pipesAtlas', 'assets/images/pipes_and_cell_atlas.png', 'assets/images/pipes_and_cell_atlas.json');
        this.load.atlas('uiElementAtlas', 'assets/images/ui_element_atlas.png', 'assets/images/ui_element_atlas.json');

        this.load.audio('explosionSound', 'assets/audio/explosion.wav');
        this.load.audio('placeSound', 'assets/audio/place_pipe.wav');
        this.load.audio('flowSound', 'assets/audio/flow.wav');
        this.load.audio('clickSound', 'assets/audio/click.wav');    

        this.load.spritesheet('explosion', 'assets/spritesheets/explosion.png', {
            frameWidth: 90,
            frameHeight: 90
        });
    }

    create() {
        
        this.configData = this.cache.json.get('gameConfigData');

        const bg = this.add.image(0, 0, 'background').setOrigin(0,0);
        const sceneWidth = bg.width;   
        const sceneHeight = bg.height; 

        this.cols = this.configData.GRID.COLS;
        this.rows = this.configData.GRID.ROWS;
        this.cellSize = this.configData.GRID.CELL_SIZE;
        this.blockedCellCount = this.configData.GRID.BLOCK_CELL_COUNT;
        this.cellActualSize = 90;

        this.gridWidth = this.cols * this.cellSize;
        this.gridHeight = this.rows * this.cellSize;

        this.gridStartX = (sceneWidth - this.gridWidth) / 2;
        this.gridStartY = (sceneHeight - this.gridHeight) / 2;

        this.fillColor = this.configData.FLOW.COLOR;
        this.fillThickness = 0.2;
        this.fillDelay = this.configData.FLOW.DELAY;       
        this.flowSpeed = this.configData.FLOW.SPEED;

        this.minimumPipes = this.configData.GAMEPLAY.MINIMUM_DISTANCE_PIPES;    
        this.connectedPipesCount = 0;  
        this.minimumRequiredLength = this.minimumPipes;
        this.gameOver = false;
        this.flowStarted = false;
        this.isReplacingPipe = false;
        this.pipeQueue = [];

        this.pipeTypes = ['straight_pipe', 'cross_pipe', 'bend_pipe'];
        this.queueCount = 4;
        this.pipeSpacing = this.cellSize + 10;
        this.queueStartX = this.gridStartX - this.cellSize;
        this.queueStartY = this.gridStartY + (  this.cellSize/2);

        this.anims.create({
            key: 'pipe_explosion',
            frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 10 }),
            frameRate: 15,
            repeat: 0
        });

        this.sfx = {
            explosion: this.sound.add('explosionSound'),
            place: this.sound.add('placeSound'),
            click: this.sound.add('clickSound'),
            flow: this.sound.add('flowSound', { loop: true, volume: 0.6 }) // loop water sound
        };

        this.createGrid();
        this.createUI();
        this.createPipeQueue();
        this.placeStartPipe();
    }


    createGrid() {
        this.gridCells = [];

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.add.image(this.gridStartX + x * this.cellSize, this.gridStartY + y * this.cellSize, 'pipesAtlas', 'grid_cell')
                    .setOrigin(0)
                    .setScale(this.cellSize/this.cellActualSize)
                    .setInteractive();
                cell.gridX = x;
                cell.gridY = y;

                cell.on('pointerover', () => { if (!this.gameOver) cell.setTint(0xffff00); });
                cell.on('pointerout', () => { cell.clearTint(); });
                cell.on('pointerdown', () => this.handleCellClick(cell));

                this.gridCells.push(cell);
            }
        }

        // grid data model
        this.gridData = Array.from({ length: this.rows }, (_, y) => (
            Array.from({ length: this.cols }, (_, x) => ({
                cellRef: this.gridCells.find(c => c.gridX === x && c.gridY === y),
                cellImage: null,   // placed pipe sprite, if any
                type: null,
                angle: 0,
                isFilled: false,
                isBlocked: false,
                isStart: false
            }))
        ));

        // place random blocked cells
        const availableCells = [...this.gridCells];
        Phaser.Utils.Array.Shuffle(availableCells);
        const blockedCells = availableCells.slice(0, this.blockedCellCount);
        blockedCells.forEach(c => {
            const block = this.add.image(c.x + this.cellSize / 2, c.y + this.cellSize / 2, 'pipesAtlas', 'block_cell')
            .setScale(this.cellSize/this.cellActualSize)
            .setOrigin(0.5);
            c.disableInteractive();
            const data = this.gridData[c.gridY][c.gridX];
            data.isBlocked = true;
        });
    }

    
    getNeighbors(cell) {
        const neighbors = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                const nx = cell.gridX + dx;
                const ny = cell.gridY + dy;
                if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                    neighbors.push(this.gridCells.find(c => c.gridX === nx && c.gridY === ny));
                }
            }
        }
        return neighbors;
    }


    createUI() {
        // Minimum distance text 
        this.statusText = this.add.text(
            this.gridStartX + this.gridWidth - 10,
            this.gridStartY - 30,
            `Minimum Distance: ${this.minimumPipes}`,
            { font: '24px Arial', fill: '#ffffff', align: 'right' }
        ).setOrigin(1, 0);

        // delay timer
        this.delayText = this.add.text(
            this.gridStartX,
            this.gridStartY - 30,
            'Fill Start In: 0s',
            { font: '22px Arial', fill: '#ffffff' }
        ).setOrigin(0, 0);
    }

    createPipeQueue() {
        this.pipeQueue = [];
        for (let i = 0; i < this.queueCount; i++) {
            const randomPipe = Phaser.Utils.Array.GetRandom(this.pipeTypes);
            const validAngles = this.validAnglesForType(randomPipe);
            const randomAngle = Phaser.Utils.Array.GetRandom(validAngles);

            const yPos = this.queueStartY + (this.queueCount - 1 - i) * this.pipeSpacing;

            const pipe = this.add.image(this.queueStartX, yPos, 'pipesAtlas', randomPipe)
                .setOrigin(0.5)
                .setScale(this.cellSize/this.cellActualSize)
                .setAngle(randomAngle);

            pipe.pipeType = randomPipe;
            pipe.pipeAngle = randomAngle;

            this.pipeQueue.push(pipe);
        }

        this.currentPipeIndex = 0;
    }

    validAnglesForType(pipeType) {
        if (pipeType === 'straight_pipe') return [0, 90];
        if (pipeType === 'bend_pipe') return [0, 90, 180, 270];
        return [0]; 
    }

    placeStartPipe() {
        // find valid start cells (not blocked and not on border and neighbors not blocked)
        const validStartCells = this.gridCells.filter(cell => {
            const data = this.gridData[cell.gridY][cell.gridX];
            if (data.isBlocked) return false;
            if (cell.gridX === 0 || cell.gridX === this.cols - 1 || cell.gridY === 0 || cell.gridY === this.rows - 1) return false;
            const neighbors = this.getNeighbors(cell);
            if (neighbors.some(n => n && this.gridData[n.gridY][n.gridX].isBlocked)) return false;
            return true;
        });

        if (!validStartCells.length) {
            console.warn('No valid start cell found for start_pipe');
            return;
        }

        const startCell = Phaser.Utils.Array.GetRandom(validStartCells);
        const rotations = [0, 90, 180, 270];
        const randomAngle = Phaser.Utils.Array.GetRandom(rotations);

        const startSprite = this.add.image(startCell.x + this.cellSize / 2, startCell.y + this.cellSize / 2, 'pipesAtlas','start_pipe')
            .setOrigin(0.5)
            .setScale(this.cellSize/this.cellActualSize)
            .setAngle(randomAngle);

        startCell.isStart = true;
        startCell.disableInteractive();

        const data = this.gridData[startCell.gridY][startCell.gridX];
        data.cellImage = startSprite;
        data.type = 'start_pipe';
        data.angle = randomAngle;
        data.isStart = true;

        // start delayed flow
        this.startFillDelayTimer(this.fillDelay);
        this.time.delayedCall(this.fillDelay, () => {
            this.animateCellFill(data.cellRef, randomAngle, 'start_pipe', null, () => {
                this.handleNextPipe(startCell.gridX, startCell.gridY, randomAngle);
            });
            this.flowStarted = true;
            this.sfx.flow.play();
        });
    }

    handleCellClick(cell) {

        if (this.gameOver || this.isReplacingPipe) return;
        if (!this.pipeQueue || this.pipeQueue.length === 0) return;

        const nextPipe = this.pipeQueue[0];
        if (!nextPipe) return;

        const gridX = cell.gridX, gridY = cell.gridY;
        const data = this.gridData[gridY][gridX];

        if (data.isStart || data.isBlocked) return;
        if (data.isFilled) {

            cell.setTint(0xff4444);
            this.time.delayedCall(200, () => cell.clearTint());
            return;
        }

        if (data.type) {
            this.replacePipe(cell, nextPipe);
        } else {
            this.placePipeOnCell(cell, nextPipe);
        }
    }

    replacePipe(cell, nextPipe) {

        this.isReplacingPipe = true;

        const gridX = cell.gridX, gridY = cell.gridY;
        const existing = this.gridData[gridY][gridX];

        if (existing.cellImage) existing.cellImage.destroy();

        this.gridData[gridY][gridX] = {
            cellRef: existing.cellRef,
            cellImage: null,
            type: null,
            angle: 0,
            isFilled: false,
            isBlocked: existing.isBlocked || false,
            isStart: existing.isStart || false
        };

        const explosionX = cell.x + this.cellSize / 2;
        const explosionY = cell.y + this.cellSize / 2;

        this.playPipeExplosion(explosionX, explosionY, () => {
            this.isReplacingPipe = false;
            this.placePipeOnCell(cell, nextPipe);
        });
    }


    placePipeOnCell(cell, nextPipe) {

        if (!nextPipe) return;

        this.sfx.place.play();

        const gridX = cell.gridX, gridY = cell.gridY;

        const placed = this.add.image(cell.x + this.cellSize / 2, cell.y + this.cellSize / 2, 'pipesAtlas', nextPipe.pipeType)
            .setOrigin(0.5)
            .setScale(this.cellSize/this.cellActualSize)
            .setAngle(nextPipe.pipeAngle);

        this.gridData[gridY][gridX] = {
            cellRef: this.gridData[gridY][gridX].cellRef,
            cellImage: placed,
            type: nextPipe.pipeType,
            angle: nextPipe.pipeAngle,
            isFilled: false,
            isBlocked: false,
            isStart: false
        };

        nextPipe.destroy();

        for (let i = 1; i < this.pipeQueue.length; i++) {
            const pipe = this.pipeQueue[i];
            this.tweens.add({ targets: pipe, y: pipe.y + this.pipeSpacing, duration: 200, ease: 'Power2' });
        }

        this.pipeQueue.shift();

        const newRandom = Phaser.Utils.Array.GetRandom(this.pipeTypes);
        const newAngle = Phaser.Utils.Array.GetRandom(this.validAnglesForType(newRandom));
        const newPipe = this.add.image(this.queueStartX, this.queueStartY, 'pipesAtlas', newRandom)
            .setOrigin(0.5)
            .setScale(this.cellSize/this.cellActualSize)
            .setAngle(newAngle);
        newPipe.pipeType = newRandom;
        newPipe.pipeAngle = newAngle;
        this.pipeQueue.push(newPipe);
    }

    drawFill(x1, y1, x2, y2, callback) {
        const distance = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const duration = (distance / this.flowSpeed) * 1000; // ms

        const w = this.cellSize;
        const h = this.cellSize;

        const line = this.add.rectangle(x1, y1, this.fillThickness * w * 2.5, this.fillThickness * h, this.fillColor)
            .setOrigin(0, 0.5)
            .setRotation(Phaser.Math.Angle.Between(x1, y1, x2, y2))
            .setScale(0, 1);

        this.tweens.add({
            targets: line,
            scaleX: 1,
            duration,
            ease: 'Linear',
            onComplete: () => callback && callback()
        });
    }

    animateCellFill(cellRef, angle, pipeType, fromDir = null, onComplete = null) {
        if (!cellRef) { if (onComplete) onComplete(); return; }
        const gridX = cellRef.gridX, gridY = cellRef.gridY;
        const data = this.gridData[gridY][gridX];
        if (!data) { if (onComplete) onComplete(); return; }

        if (!data.isFilled && pipeType !== 'start_pipe') {
            data.isFilled = true;
            this.connectedPipesCount++;
            this.minimumRequiredLength = Math.max(this.minimumPipes - this.connectedPipesCount, 0);
            this.statusText.setText(`Pipes remaining: ${this.minimumRequiredLength}`);
        }

        const cellImage = data.cellRef;
        const cx = cellImage.x + cellImage.displayWidth / 2;
        const cy = cellImage.y + cellImage.displayHeight / 2;
        const dirPos = {
            top: { x: cx, y: cy - cellImage.displayHeight / 2 },
            bottom: { x: cx, y: cy + cellImage.displayHeight / 2 },
            left: { x: cx - cellImage.displayWidth / 2, y: cy },
            right: { x: cx + cellImage.displayWidth / 2, y: cy }
        };

        // helper to perform the two-phase fill for a normal pipe
        const twoPhase = (from, to, cb) => {
            // entry -> center
            this.drawFill(dirPos[from].x, dirPos[from].y, cx, cy, () => {
                // center -> exit
                this.drawFill(cx, cy, dirPos[to].x, dirPos[to].y, cb);
            });
        };

        const outDirs = GameScene.PIPE_CONNECTIONS[pipeType][angle] || [];
        if (!fromDir) {
            const out = outDirs[0];
            this.drawFill(cx, cy, dirPos[out].x, dirPos[out].y, onComplete);
            return;
        }

        if (pipeType === 'cross_pipe') {
            this.drawFill(dirPos[fromDir].x, dirPos[fromDir].y, cx, cy, onComplete);
            return;
        }

        const toDir = outDirs.find(d => d !== fromDir);
        if (!toDir) {
            this.drawFill(dirPos[fromDir].x, dirPos[fromDir].y, cx, cy, onComplete);
            return;
        }

        twoPhase(fromDir, toDir, onComplete);
    }


    handleNextPipe(gridX, gridY, angle, fromDir = null) {
        const current = this.gridData[gridY][gridX];
        if (!current || !current.type) return;

        const type = current.type;
        const outDirs = GameScene.PIPE_CONNECTIONS[type][angle];
        if (!outDirs) return;

        // helper to continue flow into neighbor if valid
        const tryContinue = (outDir) => {
            const nx = gridX + GameScene.DIRS[outDir].dx;
            const ny = gridY + GameScene.DIRS[outDir].dy;
            const next = this.gridData[ny]?.[nx];
            if (!next || !next.type) return false;
            const enter = GameScene.DIRS[outDir].opposite;
            if (!GameScene.PIPE_CONNECTIONS[next.type][next.angle]?.includes(enter)) return false;

            this.animateCellFill(next.cellRef, next.angle, next.type, enter, () => {
                this.handleNextPipe(nx, ny, next.angle, enter);
            });
            return true;
        };

        // CROSS - pick longest path among outgoing dirs (excluding fromDir)
        if (type === 'cross_pipe') {
            const candidates = outDirs.filter(d => d !== fromDir);
            const scored = [];

            for (const d of candidates) {
                const len = this.tracePathLength(gridX, gridY, d, fromDir);
                scored.push({ dir: d, len });
            }

            scored.sort((a, b) => b.len - a.len);
            const best = scored[0];
            if (!best || best.len === 0) {
                // no possible continuation -> immediate end check
                this.checkFlowEnd(gridX, gridY, fromDir, outDirs);
                return;
            }

            const chosen = best.dir;
            const nx = gridX + GameScene.DIRS[chosen].dx;
            const ny = gridY + GameScene.DIRS[chosen].dy;
            const next = this.gridData[ny]?.[nx];
            if (!next) return;

            const enterDir = GameScene.DIRS[chosen].opposite;

            const cellRef = current.cellRef;

            if (!cellRef.savedBestDir) {
                cellRef.savedBestDir = chosen;
            } else { 
                if (cellRef.savedBestDir === chosen) { // check cross pipe already visited and longest path already filled
                     if (this.connectedPipesCount >= this.minimumPipes) this.winGame();
                    else this.loseGame();
                    return;
                }
            }

            const cx = cellRef.x + cellRef.displayWidth / 2;
            const cy = cellRef.y + cellRef.displayHeight / 2;
            const dirPos = {
                top: { x: cx, y: cy - cellRef.displayHeight / 2 },  
                bottom: { x: cx, y: cy + cellRef.displayHeight / 2 },
                left: { x: cx - cellRef.displayWidth / 2, y: cy },
                right: { x: cx + cellRef.displayWidth / 2, y: cy }
            };

            this.drawFill(cx, cy, dirPos[chosen].x, dirPos[chosen].y, () => {
                // only after cross center->exit completes do we continue into next pipe
                this.animateCellFill(next.cellRef, next.angle, next.type, enterDir, () => {
                    this.handleNextPipe(nx, ny, next.angle, enterDir);
                });

                // also safe to check end condition for cross here
                this.checkFlowEnd(gridX, gridY, fromDir, outDirs);
            });

            return;
        }

        // Non-cross pipes - check all outgoing (excluding fromDir) and continue for each valid one
        const validOutDirs = fromDir ? outDirs.filter(d => d !== fromDir) : outDirs;
        let progressed = false;
        for (const outDir of validOutDirs) {
            const nx = gridX + GameScene.DIRS[outDir].dx;
            const ny = gridY + GameScene.DIRS[outDir].dy;
            const next = this.gridData[ny]?.[nx];
            if (!next || !next.type) continue;
            const enter = GameScene.DIRS[outDir].opposite;
            if (!GameScene.PIPE_CONNECTIONS[next.type][next.angle]?.includes(enter)) continue;

            progressed = true;

            this.animateCellFill(next.cellRef, next.angle, next.type, enter, () => {
                this.handleNextPipe(nx, ny, next.angle, enter);
            });
        }

        if (!progressed) {
            this.checkFlowEnd(gridX, gridY, fromDir, outDirs);
        }
    }

    tracePathLength(gridX, gridY, dir, fromDir = null, visited = new Set()) {
        const nx = gridX + GameScene.DIRS[dir].dx;
        const ny = gridY + GameScene.DIRS[dir].dy;
        const key = `${nx},${ny},${dir}`;

        // Stop if already visited (loop detected)
        if (visited.has(key)) return 0;
            visited.add(key);

        const next = this.gridData[ny]?.[nx];
        if (!next || !next.type) return 0;

        const enter = GameScene.DIRS[dir].opposite;
        if (!GameScene.PIPE_CONNECTIONS[next.type][next.angle]?.includes(enter)) return 0;

        const outDirs = GameScene.PIPE_CONNECTIONS[next.type][next.angle] || [];
        const nextOuts = outDirs.filter(d => d !== enter);
        if (nextOuts.length === 0) return 1;

        let maxLen = 0;
        for (const out of nextOuts) {
            const len = this.tracePathLength(nx, ny, out, enter, new Set(visited));
            maxLen = Math.max(maxLen, len);
        }
        return 1 + maxLen;

    }

    checkFlowEnd(gridX, gridY, fromDir, outDirs) {
        if (this.gameOver) return;
        const validOutDirs = outDirs.filter(d => d !== fromDir);
        const hasNext = validOutDirs.some(d => {
            const nx = gridX + GameScene.DIRS[d].dx;
            const ny = gridY + GameScene.DIRS[d].dy;
            const next = this.gridData[ny]?.[nx];
            if (!next || !next.type) return false;
            const enter = GameScene.DIRS[d].opposite;
            return GameScene.PIPE_CONNECTIONS[next.type][next.angle]?.includes(enter);
        });

        if (!hasNext) {
            if (this.connectedPipesCount >= this.minimumPipes) this.winGame();
            else this.loseGame();
        }
    }

    playPipeExplosion(x, y, onComplete) {
        this.sfx.explosion.play();

        const explosion = this.add.sprite(x, y, 'explosion').setScale(1);
        explosion.play('pipe_explosion');
        explosion.on('animationcomplete', () => {
            explosion.destroy();
            if (onComplete) onComplete();
        });
    }

    startFillDelayTimer(delayMs) {
        if (this.delayTimerEvent) this.delayTimerEvent.remove(false);
        let remaining = Math.ceil(delayMs / 1000);
        this.delayText.setText(`Fill Start In: ${remaining}s`);
        this.delayText.setVisible(true);

        this.delayTimerEvent = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                remaining -= 1;
                if (remaining <= 0) {
                    this.delayText.setText('Fill Start In: 0s');
                    this.delayTimerEvent.remove(false);
                } else {
                    this.delayText.setText(`Fill Start In: ${remaining}s`);
                }
            }
        });
    }

    winGame() {
    this.endGame(true);  // true = win
    }

    loseGame() {
        this.endGame(false); // false = lose
    }

    endGame(isWin) {
        this.gameOver = true;

        if (this.sfx.flow?.isPlaying) {
            this.sfx.flow.stop();
        }

        this.gridCells.forEach(c => c.disableInteractive());

        this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.6
        ).setDepth(10);

        const windowKey = isWin ? 'win_window' : 'lost_window';
        const windowSprite = this.add.image(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'uiElementAtlas',
            windowKey
        )
            .setOrigin(0.5)
            .setDepth(11)
            .setScale(0.8); 

        const restartBtn = this.add.image(
            this.cameras.main.centerX - 90,
            this.cameras.main.centerY + windowSprite.displayHeight / 3,
            'uiElementAtlas',
            'restart_button'
        )
            .setOrigin(0.5)
            .setDepth(12)
            .setScale(0.8)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => restartBtn.setScale(0.9))
            .on('pointerout', () => restartBtn.setScale(0.8))
            .on('pointerdown', () => {
                this.sfx.click.play();
                this.scene.restart();
            });

        const mainMenuBtn = this.add.image(
            this.cameras.main.centerX + 90,
            this.cameras.main.centerY + windowSprite.displayHeight / 3,
            'uiElementAtlas',
            'main_menu_button'
        )
            .setOrigin(0.5)
            .setDepth(12)
            .setScale(0.8)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => mainMenuBtn.setScale(0.9))
            .on('pointerout', () => mainMenuBtn.setScale(0.8))
            .on('pointerdown', () => {
                this.sfx.click.play();
                this.scene.start('MainMenu');
            });
    }


}
