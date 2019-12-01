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
            this.scene.start(CONSTANTS.SCENES.SCRABBLE);
        })

        document.getElementById("checkpoints").textContent = "it works"

        // var element = this.add.dom(-20, -20).createFromCache('inputform');
        // console.log('Dom Element:', element);
        // element.addListener('click');
        // element.on('click', function (event) {
        //     if (event.target.name === 'playButton')
        //     {
        //         var receiveText = this.getChildByName('receiveField');
        //         var sendText = this.getChildByName('sendField');
        //         //  Have they entered anything?
        //         if (receiveText.value !== '')
        //             console.log('Number of Receives Before Checkpoint:', receiveText.value);
        //         if(sendText.value != '')
        //             console.log('Number of Sends Before Checkpoint:', sendText.value);
        //     }
        // });
    }
}