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
        // Disable the send/receive limit input if MRS is checked
        document.getElementById('mrs').onclick = ()=>{
            if(document.getElementById('mrs').checked) {
                document.getElementById("numreceives").disabled = true;
                document.getElementById("numsends").disabled = true;
            }
            else {
                document.getElementById("numreceives").disabled = false;
                document.getElementById("numsends").disabled = false;
            }
        };
        
        let playButton = this.add.image(350, 350, 'play-button').setInteractive();
        playButton.on("pointerup", ()=>{
            console.log("Starting Scrabble");
            let receive_limit = document.getElementById("numreceives").value;
            let send_limit = document.getElementById("numsends").value;
            let mrs = document.getElementById("mrs").checked;
            this.scene.start(CONSTANTS.SCENES.SCRABBLE, {receive_limit: receive_limit, send_limit: send_limit, mrs: mrs});
        })
    }
}