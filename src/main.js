import { GameScene } from './scenes/GameScene.js';
import { MainMenu } from './scenes/MainMenu.js';

const config = {
    type: Phaser.AUTO,
    title: 'Overlord Rising',
    description: '',
    parent: 'game-container',
    width: 1280,
    height: 720,
    backgroundColor: '#fff',
    pixelArt: false,
    scene: [
        MainMenu,
        GameScene 
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
     physics: {
    default: "arcade",
    arcade: {
        
    }
    }
}

new Phaser.Game(config);
            