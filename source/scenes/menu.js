import { CONSTANTS } from "../constants.js";

export class Menu extends Phaser.Scene{
    constructor() {
        super({
            key: CONSTANTS.SCENES.MENU
        })
    }

    init() {
        
    }

    preload(){
        this.load.image('play-button', 'source/assets/play.png');
    }
    
    create(){
        let playButton = this.add.image(350, 350, 'play-button').setInteractive();
        playButton.on("pointerup", ()=>{
            console.log("Starting Game")
            this.scene.start(CONSTANTS.SCENES.SCRABBLE);
        })
    }
}