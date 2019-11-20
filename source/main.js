import { Menu } from "./scenes/menu.js"
import { Game } from "./scenes/game.js"

let game = new Phaser.Game({
    width: 700,
    height: 750,
    scale: { autoCenter: Phaser.Scale.CENTER_BOTH },
    scene:[
        Menu, Game
    ]
});