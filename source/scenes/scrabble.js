import { CONSTANTS } from "../constants.js";
import { Tile } from "../tile.js";

export class Scrabble extends Phaser.Scene{
    constructor() {
        super({
            key: CONSTANTS.SCENES.SCRABBLE
        })
    }

    init() {
        // An array of all tiles remaining in the game (not in-hand or played)
        this.remaining_tiles = [
            ['A', 9], ['B', 2], ['C', 2], ['D', 4], ['E', 12], ['F', 2], ['G', 3], 
            ['H', 2], ['I', 9], ['J', 1], ['K', 1], ['L', 4], ['M', 2], ['N', 6], 
            ['O', 8], ['P', 2], ['Q', 1], ['R', 6], ['S', 4], ['T', 6], ['U', 4], 
            ['V', 2], ['W', 2], ['X', 1], ['Y', 2], ['Z', 1]
        ];
        // A dict of all tiles and their corresponding point values
        this.tile_scores = {
            'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
            'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
            'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
            'Y': 4, 'Z': 10
        };
        // The word currently being spelled on the board.
        this.current_word = [];
        // The direction of the word currently being spelled
        this.direction = '';
        // The alphabet tile selected from the available pieces
        this.selected_tile = null;
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
        this.load.image('border', 'source/assets/border.png')
        for(let i = 0; i < 26; i++) {
            let letter = this.remaining_tiles[i][0];
            this.load.image(letter, 'source/assets/tiles/tile_' + letter + '.png');
        }
    }

    create() {
        document.addEventListener('contextmenu', function(event){
            event.preventDefault();
        });

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
        // Offset makes (27,28) the TL corner of the game board 
        let x_pos = 27, y_pos = 28, count = 0;
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
            x_pos = 27;
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
                let rand = Math.floor(Math.random() * 26);
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
            let x = 170 + (idx * 60), y = 720; 
            tile.origin_x = x; tile.origin_y = y;
            tile.image = this.add.image(x, y, tile.letter).setInteractive();
            tile.image.on('pointerup', ()=>{
                if(tile.clickable) {
                    // On left-click, select the currently clicked tile
                    if(this.scene.systems.input.activePointer.leftButtonReleased()) {
                        this.deselectTile();
                        this.selectTile(tile);
                    }
                    // On right-click, de-select and remove tile from board
                    else {
                        this.deselectTile();
                        this.removeTile(tile);
                    }
                }
            })
            this.current_tiles[idx] = tile;
        }
    }

    // Un-highlight the currently selected tile
    deselectTile() {
        if(this.selected_tile != null) {
            console.log("De-selecting tile: ", this.selected_tile);
            // Remove highlight around placed tile
            this.selected_tile.border.destroy();
        }
    }

    // Highlight the currently selected tile from the deck
    selectTile(tile) {
        console.log('Selecting tile: ', tile);
        tile.border = this.add.image(tile.image.x, tile.image.y, 'border');
        this.selected_tile = tile;
    }

    // Remove a tile from the board (currently only last tile can be removed)
    removeTile(tile) {
        tile.image.x = tile.origin_x;
        tile.image.y = tile.origin_y;
        this.placed_tiles.pop();
        // Allow the new last tile to be removed
        if(this.placed_tiles.length != 0)
            this.placed_tiles[this.placed_tiles.length-1].clickable = true;
        
        if(this.placed_tiles.length < 2)
            this.direction = '';

        this.current_word.pop();
    }

    // @TODO: Places the currently selected tile in the correct square on the board.
    placeTile(square) {
        // Only place tile if one is currently selected
        if(this.selected_tile != null) {

            // Ensure that the tile is being placed in a valid position.
            if(isValidPosition(square, this.placed_tiles, this.direction)) {
                console.log('Placing tile at: ', square.x, square.y);
                this.selected_tile.image.x = square.x;
                this.selected_tile.image.y = square.y;

                // Remove highlight around placed tile
                this.selected_tile.border.destroy();

                // @TODO: Add the tile to the current word being formed.
                this.current_word.push(this.selected_tile.letter);
                console.log('Current Word', this.current_word);

                // Make the previously placed tile un-clickable 
                if(this.placed_tiles.length != 0)
                    this.placed_tiles[this.placed_tiles.length-1].clickable = false;

                // Add the tile to the currently placed tiles
                this.placed_tiles.push(this.selected_tile);

                if(this.placed_tiles.length == 2)
                    this.setDirection();

                console.log('Current Direction', this.direction);

                this.selected_tile = null;
            }
            else 
                console.log('Invalid tile position');
        }
        else
            console.log('No Tile Selected')
    }

    // Set the direction that the tiles must be placed in for the current word.
    setDirection() {
        let tile1 = this.placed_tiles[0]
        let tile2 = this.placed_tiles[1];
        if(tile1.image.x != tile2.image.x)
            this.direction = 'horizontal';
        else
            this.direction = 'vertical';
    }

    // @TODO: Submit a word using the currently placed tiles
    submitWord() {
        // @TODO: Verify that the word is a correct word

        /* If this.current_word is correct:
                clear placed_tiles
                load new tiles into player deck
                socket.emit(word_added, data) */

        this.placed_tiles = [];
        this.direction = '';

        /* If this.current_word is not correct:
                socket.emit(rollback) */
    }
}

function isValidWord(word) {

}

// Determine whether the current square is a valid position to place a tile
function isValidPosition(square, placed_tiles, direction) {
    console.log('Currently Placed Tiles: ', placed_tiles);
    if(placed_tiles.length == 0)
       return true;

    let last_tile = placed_tiles[placed_tiles.length-1];
    // Correct if word is spelled horizontally and tile is immediately to the right of the last tile placed
    if(direction == 'horizontal' || direction == '') {
        if(last_tile.image.x + 46 == square.x && last_tile.image.y == square.y)
            return true;
    }
    if(direction == 'vertical' || direction == '') {
        if(last_tile.image.y + 46 == square.y && last_tile.image.x == square.x)
            return true;
    }
    return false;
}