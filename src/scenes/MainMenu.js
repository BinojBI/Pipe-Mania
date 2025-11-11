// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

     preload() {
        this.load.image('background', 'assets/images/background.png');
        this.load.atlas('uiElementAtlas', 'assets/images/ui_element_atlas.png', 'assets/images/ui_element_atlas.json');

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
            'uiElementAtlas',
            'logo',
        ).setOrigin(0.5)

        const startBtn = this.add.image(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 200,
            'uiElementAtlas',
            'start_game_button'
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
