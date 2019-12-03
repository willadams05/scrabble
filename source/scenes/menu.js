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
        this.load.html('inputform', 'inputform.html');
        this.load.image('play-button', 'source/assets/play.png');
    }
    
    create(){
        let playButton = this.add.image(350, 350, 'play-button').setInteractive();
        playButton.on("pointerup", ()=>{
            console.log("Starting Scrabble")
            let receive_limit = document.getElementById("numreceives").value
            let send_limit = document.getElementById("numsends").value
            let mrs = document.getElementById("mrs").checked
            this.scene.start(CONSTANTS.SCENES.SCRABBLE, {receive_limit: receive_limit, send_limit: send_limit, mrs: mrs});
        })
    }
}