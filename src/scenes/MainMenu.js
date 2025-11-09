// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

     preload() {
        this.load.image('background', 'assets/images/background.png');
    }

    create() {

        this.add.image(0, 0, 'background').setOrigin(0,0);
        this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY -100,
            'Pipe Mania',
            { font: '48px Arial', fill: '#ffffff' }
        ).setOrigin(0.5)

        const startBtn = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'Start Game', 
            { font: '32px Arial',
            fill: '#ffffff',
            backgroundColor: '#444',
            padding: { x: 20, y: 10 }
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => startBtn.setStyle({ backgroundColor: '#666' }))
            .on('pointerout', () => startBtn.setStyle({ backgroundColor: '#444' }))
            .on('pointerdown', () => {
                this.scene.start('GameScene');
            });
    }

}
