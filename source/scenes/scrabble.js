import { CONSTANTS } from "../constants.js";
import { Tile } from "../tile.js";

// Each tile is 43x43 px with a 3px border surrounding it, so offset is 46 pixels.
var OFFSET = 46;

var socket = io.connect('http://localhost:3000');

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
        // The horizontal word currently being spelled on the board.
        this.current_horizontal = [];
        // The vertical word currently being spelled on the board.
        this.current_vertical = [];
        // The direction of the word currently being spelled
        this.direction = '';
        // The number of tiles currently on the board that have not been submitted
        this.clickable_tiles = 0;
        // Flag so that clickable_tiles can be decreased once (instead of twice if removing from both vertical/horizontal words)
        this.decrease_clickable = false;
        // The alphabet tile selected from the available pieces
        this.selected_tile = null;
        // A list of the tiles currently available to the player
        this.current_tiles = [null, null, null, null, null, null, null];
        // The deck index of the currently selected tile 
        this.deck_index = -1;
        // A dict of the tiles that have been submitted as words. (key: position tuple, value: tile object)
        this.submitted_tiles = {};
        // A list of board squares where a tile can be placed
        this.board = [];
    }

    preload() {
        this.load.image('board', 'source/assets/board.png');
        this.load.image('empty-square', 'source/assets/empty_square.png');
        this.load.image('border', 'source/assets/border.png');
        this.load.image('submit', 'source/assets/submit_button.png');
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
        this.setSocketEvents();

        // Display game board and load buttons for the board squares 
        this.add.image(350, 350, 'board');
        this.loadSquares();

        // Load 7 random initial tiles from the list of remaining tiles
        this.getNewTiles();

        // Add button to allow word submission
        let submit = this.add.image(600, 720, 'submit').setInteractive();
        submit.on('pointerup', ()=>{
            this.submitWord();
        })
    }

    // @TODO: Fill in events with proper functionality
    setSocketEvents() {
        socket.on('init', function (data) {
            console.log(data);
            socket.emit('success', 'Connection Successful');
        });

        // Load the tiles picked by the server
        socket.on('load_tiles', function(data) {
            this.getNewTiles(data);
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
            console.log('INVALID WORD -- ROLLING BACK');
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
                x_pos += OFFSET;
                count++;
            }
            // Move to the next row of the board
            y_pos += OFFSET;
            x_pos = 27;
        }
    }

    // Fill up the array of current tiles from the remaining un-used tiles
    getNewTiles() {
        // @TODO: Have the server select tiles for each player and send back the corresponding indices
        // socket.emit('load_tiles', this.remaining_tiles);

        // @TODO: Move this to the server socket listener for load_tiles
        for(let i = 0; i < this.current_tiles.length; i++) {
            // Only load the tile if there is an empty spot in the deck. 
            if(this.current_tiles[i] != null)
                continue;

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
            let x = 120 + (i * 55), y = 720; 
            tile.origin_x = x; tile.origin_y = y;
            tile.image = this.add.image(x, y, tile.letter).setInteractive();
            tile.image.on('pointerup', ()=>{
                if(tile.clickable) {
                    // On left-click, select the currently clicked tile
                    if(this.scene.systems.input.activePointer.leftButtonReleased()) {
                        this.deselectTile();
                        this.selectTile(tile, i);
                    }
                    // On right-click, de-select and remove tile from board
                    else {
                        this.deselectTile();
                        this.removeTile(tile, i);
                    }
                }
            })
            this.current_tiles[i] = tile;
        }
    }

    // Un-highlight the currently selected tile
    deselectTile() {
        if(this.selected_tile != null) {
            // Remove highlight around placed tile
            this.selected_tile.border.destroy();
            this.deck_index = -1;
        }
    }

    // Highlight the currently selected tile from the deck
    selectTile(tile, idx) {
        tile.border = this.add.image(tile.image.x, tile.image.y, 'border');
        this.selected_tile = tile;
        this.deck_index = idx;
    }

    // Remove a tile from the board (currently only last tile can be removed)
    removeTile(tile, deck_index) {
        this.removeFromWord(tile, this.current_horizontal);
        this.removeFromWord(tile, this.current_vertical);

        // If a tile was removed from one of the words, decrease the # of clickable tiles
        if(this.decrease_clickable) {
            this.clickable_tiles--;
            this.decrease_clickable = false;
        }

        // Place the tile back in the deck
        tile.image.x = tile.origin_x;
        tile.image.y = tile.origin_y;
        this.current_tiles[deck_index] = tile;

        // If no more clickable tiles are on the board, clear the current words.
        if(this.clickable_tiles == 0) {
            this.current_horizontal = [];
            this.current_vertical = [];
        }

        // If the word length is only 1 character, the direction is unknown.
        if(this.current_horizontal.length < 2 && this.current_vertical.length)
            this.direction = '';
    }

    // Replace a specific tile in a word with null
    removeFromWord(tile, word) {
        for(let i; i < word.length; i++) {
            if(tile.image.x == word[i].image.x && tile.image.y == word[i].image.y) {
                // @TODO: Fix bug with tile removal not removing tile from end of word (maybe only if direction = both)
                this.current_horizontal.splice(i, 1, null);
                this.decrease_clickable = true;
            }
        }
    }

    // Places the currently selected tile in the correct square on the board.
    placeTile(square) {
        // Only place tile if one is currently selected
        if(this.selected_tile != null) {
            let word_index = isValidPosition(square, this.current_horizontal, this.current_vertical, this.direction);
            // Ensure that the tile is being placed in a valid position.
            if(word_index != [-1, -1]) {
                console.log('Placing tile at: ', square.x, square.y);
                this.selected_tile.image.x = square.x;
                this.selected_tile.image.y = square.y;

                // Remove highlight around placed tile
                this.selected_tile.border.destroy();

                // Determine the new current word(s) according to where the tile was placed
                // @TODO: Currently only 1 vertical / 1 horizontal word is possible, need to extend to more
                this.setCurrentWord(this.selected_tile, word_index);

                // Increase the number of clickable tiles on the screen (must do after setCurrentWord)
                this.clickable_tiles++;

                // If two tiles are going in a certain direction, set this as the current word direction.
                // if(this.current_horizontal.length == 2 || this.current_vertical.length == 2)
                this.setDirection();
                console.log('Current Direction: ', this.direction);

                // Remove the placed tile from the deck
                this.current_tiles[this.deck_index] = null;

                this.selected_tile = null;
            }
            else 
                console.log('Invalid tile position');
        }
        else
            console.log('No Tile Selected')
    }

    // Sets the word(s) being currently spelled according to the placement of the most recent tile.
    setCurrentWord(tile, word_index) {
        console.log('Word Indices: ', word_index);
        console.log('Old Horizontal Word: ', getWord(this.current_horizontal));
        console.log('Old Vertical Word: ', getWord(this.current_vertical));
        // If this is the first tile being submitted, determine if this tile is adjacent to any previously submitted tiles
        if(this.clickable_tiles == 0 && Object.keys(this.submitted_tiles).length != 0) {
            this.initializeWords(tile);
        }
        else {
            console.log('Adding Onto Current Word');
            let h_index = word_index[0], v_index = word_index[1];
            // Add the tile to the current word(s) being formed.
            if(h_index != -1) {
                // console.log('Tile: ', this.selected_tile.letter, ' being added at horizontal index: ', h_index)
                this.current_horizontal.splice(h_index, 0, this.selected_tile);
            }
            if(v_index != -1) {
                // console.log('Tile: ', this.selected_tile.letter, ' being added at vertical index: ', v_index)
                this.current_vertical.splice(v_index, 0, this.selected_tile);
            }
        }
        console.log('New Horizontal Word: ', getWord(this.current_horizontal));
        console.log('New Vertical Word: ', getWord(this.current_vertical));
    }

    initializeWords(tile) {
        console.log('Determining Surrounding Words');
        let v_index = 0, h_index = 0;
        
        // Check for submitted tiles below the current tile
        let y = tile.image.y + OFFSET;
        while(true) {
            if(!([tile.image.x,y] in this.submitted_tiles))
                break;
            // Add the tile below the current one to the end of the vertical word.
            let temp_tile = this.submitted_tiles[[tile.image.x, y]];
            console.log('Tile: ', temp_tile.letter, ' being added at end of vertical word');
            this.current_vertical.push(temp_tile);
            y += OFFSET;
        }
        
        // Check for submitted tiles above the current tile
        y = tile.image.y - OFFSET;
        while(true) {
            if(!([tile.image.x,y] in this.submitted_tiles))
                break;
            // Add the tile above the current one to the beginning of the vertical word.
            let temp_tile = this.submitted_tiles[[tile.image.x, y]];
            console.log('Tile: ', temp_tile.letter, ' being added at beginning of vertical word');
            this.current_vertical.unshift(temp_tile);
            y -= OFFSET; v_index++;
        }

        // Check for submited tiles to the right of the current tile
        let x = tile.image.x + OFFSET;
        while(true) {
            if(!([x,tile.image.y] in this.submitted_tiles))
                break;
            // Add the tile to the right of the current one to the end of the horizontal word.
            let temp_tile = this.submitted_tiles[[x, tile.image.y]];
            console.log('Tile: ', temp_tile.letter, ' being added at end of horizontal word');
            this.current_horizontal.push(temp_tile);
            x += OFFSET;
        }

        // Check for submited tiles to the left of the current tile
        x = tile.image.x - OFFSET;
        while(true) {
            if(!([x,tile.image.y] in this.submitted_tiles))
                break;
            // Add the tile to the left of the current one to the beginning of the horizontal word.
            let temp_tile = this.submitted_tiles[[x, tile.image.y]];
            console.log('Tile: ', temp_tile.letter, ' being added at beginning of horizontal word');
            this.current_horizontal.unshift(temp_tile);
            x -= OFFSET; h_index++;
        }

        // Add the tile to the current word being formed.
        console.log('Tile: ', this.selected_tile.letter, ' being added at horizontal index: ', h_index)
        this.current_horizontal.splice(h_index, 0, this.selected_tile);
        console.log('Tile: ', this.selected_tile.letter, ' being added at vertical index: ', v_index)
        this.current_vertical.splice(v_index, 0, this.selected_tile);
    }

    // Set the direction that the tiles must be placed in for the current word.
    setDirection() {
        if(this.current_horizontal.length >= 2 && this.current_vertical.length < 2) {
            this.direction = 'horizontal';
            this.current_vertical = [];
        }
        else if(this.current_vertical.length >= 2 && this.current_horizontal.length < 2) {
            this.direction = 'vertical';
            this.current_horizontal = [];
        }
        else if(this.current_horizontal.length >= 2 && this.current_vertical.length >=2)
            this.direction = 'both';
        else
            this.direction == '';
    }

    // Submit a word using the currently placed tiles
    submitWord() {
        let words = [], word_count = 0;
        if(this.current_horizontal.length != 0) {
            words[word_count] = getWord(this.current_horizontal);
            console.log('Submitting Horizontal Word: ', words[word_count]);
            word_count++;
        }
        if(this.current_vertical.length != 0) {
            words[word_count] = getWord(this.current_vertical);
            console.log('Submiting Vertical Word: ', words[word_count]);
            word_count++;
        }
        
        // Verify that the word is a correct word
        socket.emit('word_submitted', words);

        // @TODO: If this.current_word is correct:
        this.getNewTiles();

        this.makePermanent(this.current_horizontal);
        this.makePermanent(this.current_vertical);

        this.current_horizontal = [];
        this.current_vertical = [];
        this.direction = '';
        this.clickable_tiles = 0;
    }

    // Set all of the tiles in current word to be unclickable and store them in submitted_tiles
    makePermanent(word) {
        for(let i = 0; i < word.length; i++) {
            let tile = word[i];
            tile.clickable = false;
            let x = tile.image.x, y = tile.image.y;
            // Store the submitted tile in the dict with its position as the key.
            this.submitted_tiles[[x,y]] = tile;
        }
    }
}

// @TODO: Use some API to determine whether the current word exists in the Scrabble dictionary
function isValidWord(word) {

}

// Determine whether the current square is a valid position to place a tile. If so, return positions of character in words.
function isValidPosition(square, h_word, v_word, direction) {     
    if(h_word.length == 0 && v_word.length == 0)
       return [0, 0];

    let h_index = -1, v_index = -1;

    /* @TODO: Fix for the following case:    
             U
            AN
            PI
            P
            L
            E
        horizontal words: AN, PI
        vertical word: UNI              */

    if(direction == 'horizontal' || direction == '' || direction == 'both') {
        let first_tile = h_word[0], last_tile = h_word[h_word.length-1];
        // Correct if current tile is placed at the beginning of the word
        if(first_tile.image.x - OFFSET == square.x && first_tile.image.y == square.y)
            h_index = 0;
        // Correct if current tile is placed at the end of the word
        else if(last_tile.image.x + OFFSET == square.x && last_tile.image.y == square.y)
            h_index = h_word.length;
        // Correct if current tile is placed in the blank space in the middle of a word
        else {
            for(let i = 0; i < h_word.length; i++) {
                if(h_word[i] == null && square.x == h_word[i-1].image.x + OFFSET)
                    h_index = i; break;
            }
        }
    }

    if(direction == 'vertical' || direction == '' || direction == 'both') {
        let first_tile = v_word[0], last_tile = v_word[v_word.length-1];
        // Correct if current tile is placed on the top of the word
        if(first_tile.image.x == square.x && first_tile.image.y - OFFSET == square.y)
            v_index = 0;
        // Correct if current tile is placed on the bottom of the word
        if(last_tile.image.x == square.x && last_tile.image.y + OFFSET == square.y)
            v_index = v_word.length;
        // Correct if current tile is placed in the blank space in the middle of a word
        for(let i = 0; i < h_word.length; i++) {
            if(v_word[i] == null && square.x == v_word[i-1].image.y + OFFSET)
                v_index = i; break;
        }
    }
    return [h_index, v_index];
}

function getWord(tile) {
    let word = '';
    for(let i = 0; i < tile.length; i++) {
        word += tile[i].letter;
    }
    return word.toLowerCase();
}