import { Menu } from "./scenes/menu.js"
import { Scrabble } from "./scenes/scrabble.js"

let game = new Phaser.Game({
    width: 700,
    height: 750,
    //scale: { autoCenter: Phaser.Scale.CENTER_BOTH },
    // canvas: "myCanvas",
    parent:"game-area",
    scene:[
        Menu, Scrabble
    ]
});