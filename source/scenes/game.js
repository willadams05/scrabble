import { CONSTANTS } from "../constants.js";

export class Game extends Phaser.Scene{
    constructor() {
        super({
            key: CONSTANTS.SCENES.GAME
        })
    }
    init() {
        var remaining_tiles = [];
        var current_tiles = [];
        // @TODO: Create 2d array of buttons for each square in the board
        var board = [[]];
    }
    preload(){
        this.load.image('board', 'source/assets/board.png');
        // @TODO: Load images for each tile
        // @TODO: Load tile holder image at bottom of game board
    }
    create(){
        let background = this.add.image(350, 350, 'board').setInteractive();
        background.on("pointerup", ()=>{
            console.log("Clicking Board")
        })

        // @TODO: Randomly load 7 tiles from the remaining list of tiles
    }
}