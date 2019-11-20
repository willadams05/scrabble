import { CONSTANTS } from "../constants.js";
import { Tile } from "../tile.js";

export class Game extends Phaser.Scene{
    constructor() {
        super({
            key: CONSTANTS.SCENES.GAME
        })
    }

    init() {
        // The word currently being spelled on the board.
        this.current_word = '';
        // The alphabet tile selected from the available pieces
        this.selected_tile = null;
        // An array of all tiles remaining in the game (not in-hand or played)
        this.remaining_tiles = [
            ['A', 9], ['B', 2], ['C', 2], ['D', 4], ['E', 12], ['F', 2], ['G', 3], 
            ['H', 2], ['I', 9], ['J', 1], ['K', 1], ['L', 4], ['M', 2], ['N', 6], 
            ['O', 8], ['P', 2], ['Q', 1], ['R', 6], ['S', 4], ['T', 6], ['U', 4], 
            ['V', 2], ['W', 2], ['X', 1], ['Y', 2], ['Z', 1], ['Blank', 2]
        ];
        // A dict of all tiles and their corresponding point values
        this.tile_scores = {
            'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
            'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
            'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
            'Y': 4, 'Z': 10, 'Blank': 0
        };
        // A list of the tiles currently available to the player
        this.current_tiles = [];
        // A list of the tiles currently being used to spell a new word
        this.placed_tiles = [];
        // A list of the positions on the deck where a new tile needs to be loaded
        this.new_positions = [0, 1, 2, 3, 4, 5, 6];
        // A list of board squares where a tile can be placed
        this.board = [];
    }

    preload() {
        this.load.image('board', 'source/assets/board.png');
        this.load.image('empty-square', 'source/assets/empty_square.png');
        for(let i = 0; i < 27; i++) {
            let letter = this.remaining_tiles[i][0];
            this.load.image(letter, 'source/assets/tiles/tile_' + letter + '.png');
        }
    }

    create() {
        // Set socket events
        var socket = io.connect('http://localhost:3000');
        this.setSocketEvents(socket);

        // Display game board and load buttons for the board squares 
        this.add.image(350, 350, 'board');
        this.loadSquares();

        // Load 7 random initial tiles from the list of remaining tiles
        this.loadTiles();
    }

    // @TODO: Fill in events with proper functionality
    setSocketEvents(socket) {
        socket.on('init', function (data) {
            console.log(data);
            socket.emit('success', 'Connection Successful');
        });

        // Load the tiles picked by the server
        socket.on('load_tiles', function(data) {
            this.loadTiles(data);
        });

        // Called when another player places a tile
        socket.on('tile_placed', function(data) {
            console.log('Tile Placed: ', data);
        });
        
        // Called when another player removes a tile
        socket.on('tile_removed', function(data) {
            console.log('Tile Removed: ', data);
        });
        
        // Called when another player submits a correct word
        socket.on('word_added', function(data) {
            console.log('Word Added: ', data);
        });
        
        // Called when another player submits an incorrect word (rollback is initiated)
        socket.on('rollback', function(data) {
            console.log('Rollback: ', data);
        });
    }
    
    // Create array of buttons for each square in the board (15x15 tiles)
    loadSquares() {
        let x_pos = 0, y_pos = 0, count = 0;
        // The board is 15x15 tiles
        for(let i = 0; i < 15; i++) {
            for(let j = 0; j < 15; j++) {
                let square = this.add.image(x_pos, y_pos, 'empty-square').setInteractive();
                // Add listener for selecting a square on the board
                square.on('pointerup', ()=>{
                    this.placeTile(square);
                })
                this.board.push(square);
                // Each tile is 43x43 px with a 3px white border separating them
                x_pos += 46;
                count++;
            }
            // Move to the next row of the board
            y_pos += 46;
            x_pos = 0;
        }
    }

    // @TODO: Fill up the array of current tiles from the remaining un-used tiles
    loadTiles() {
        // @TODO: Have the server select tiles for each player and send back the corresponding indices
        // socket.emit('load_tiles', this.remaining_tiles);

        // @TODO: Move this to the server socket listener for load_tiles
        for(let idx in this.new_positions) {
            let letter = null;
            // Try to select a random tile until one that has remaining tiles is chosen.
            while(letter == null) {
                let rand = Math.floor(Math.random() * 27);
                if(this.remaining_tiles[rand][1] > 0) {
                    letter = this.remaining_tiles[rand][0];
                    console.log('Selected random tile: ', letter);
                    // Subtract one from the remaining number of this tile
                    this.remaining_tiles[rand][1]--;
                }
            }

            // @TODO: Move this to the socket listener for load_tiles
            // Create new Tile(letter, points)
            let tile = new Tile(letter, this.tile_scores[letter]);
            tile.image = this.add.image(170 + (idx * 60), 720, tile.letter).setInteractive();
            tile.image.on('pointerup', ()=>{
                // @TODO: Check if it was a left or right click
                this.selectTile(tile);
            })
            this.current_tiles[idx] = tile;
        }
    }

    // @TODO: Highlight the currently selected tile from the deck
    selectTile(tile) {
        if(this.selected_tile != null) {
            console.log("De-selecting tile: ", this.selected_tile);
        }
        console.log('Selecting tile: ', tile);
        this.selected_tile = tile;
    }

    // @TODO: Places the currently selected tile in the correct square on the board.
    placeTile(square) {
        // Only place tile if one is currently selected
        if(this.selected_tile != null) {
            console.log('Placing tile: ', this.selected_tile)

            // @TODO: Ensure that the tile is being placed in a valid position.

            // @TODO: Set the x/y value of the placed tile, so it can be removed later if need be.

            // @TODO: Add the tile to the current word being formed.
        }
        else {
            console.log('No Tile Selected')
        }
    }

    // @TODO: Submit a word using the currently placed tiles
    submitWord() {
        // @TODO: Verify that the word is a correct word

        /* If this.current_word is correct:
                clear placed_tiles
                load new tiles into player deck
                socket.emit(word_added, data) */

        /* If this.current_word is not correct:
                socket.emit(rollback) */
    }
}