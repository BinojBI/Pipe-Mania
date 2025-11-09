// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

     preload() {
        this.load.image('background', 'assets/images/background.png');
        this.load.image('logo', 'assets/images/logo.png');
        this.load.image('start button', 'assets/images/start_game_button.png');

        this.load.audio('clickSound', 'assets/audio/click.wav');
        this.load.audio('music', 'assets/audio/music.wav');

    }

    create() {

        this.sfx = {
            click: this.sound.add('clickSound'),
            music: this.sound.add('music', { loop: true, volume: 1 })
        }

        this.sfx.music.play();
        
        this.add.image(0, 0, 'background').setOrigin(0,0);
        this.add.image(
            this.cameras.main.centerX,
            this.cameras.main.centerY -100,
            'logo',
        ).setOrigin(0.5)

        const startBtn = this.add.image(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 200,
            'start button'
        )
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => startBtn.setScale(1.05))
            .on('pointerout', () => startBtn.setScale(1))
            .on('pointerdown', () => {
                if (this.sfx.music?.isPlaying) {
                    this.sfx.music.stop();
                }
                this.sfx.click.play();

                this.scene.start('GameScene');
            });
    }

}
