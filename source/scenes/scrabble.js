import { CONSTANTS } from "../constants.js";
import { Tile } from "../tile.js";

// Each tile is 43x43 px with a 3px border surrounding it, so offset is 46 pixels.
var OFFSET = 46;
var socket;

export class Scrabble extends Phaser.Scene{
    constructor() {
        super({
            key: CONSTANTS.SCENES.SCRABBLE
        })
    }

    init() {
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
        for(let i = 65; i < 91; i++) {
            let letter = String.fromCharCode(i);
            this.load.image(letter, 'source/assets/tiles/tile_' + letter + '.png');
        }
    }

    create() {
        document.addEventListener('contextmenu', function(event){
            event.preventDefault();
        });

        // Set socket events
        socket = io.connect('http://localhost:3000');
        this.setSocketEvents();

        // Display game board and load buttons for the board squares 
        this.add.image(350, 350, 'board');
        this.loadSquares();

        // Load 7 random initial tiles from the list of remaining tiles
        // this.getNewTiles();

        // Add button to allow word submission
        let submit = this.add.image(600, 720, 'submit').setInteractive();
        submit.on('pointerup', ()=>{
            this.submitWord();
        })
    }

    setSocketEvents() {
        socket.on('init', function(data) {
            console.log(data);
            socket.emit('success', 'Connection Successful');
        });

        socket.on('opponent_connected', function(data) {
            console.log('Requesting Tiles From Server');
            socket.emit('load_tiles', 7);
        });

        // Load the tiles picked by the server
        socket.on('receive_tiles', (data)=> {
            console.log('Received Tiles From Server:', data);
            this.getNewTiles(data);
        });

        // @TODO: Called when another player places a tile
        socket.on('tile_placed', function (data) {
            console.log('Tile Placed: ', data);
        });
        
        // @TODO: Called when another player removes a tile
        socket.on('tile_removed', function (data) {
            console.log('Tile Removed: ', data);
        });
        
        // Called when another player submits a correct word
        socket.on('words_added', (data)=> {
            console.log('Words Added: ', data);

            // Load as many new tiles as were used on the last successful word
            socket.emit('load_tiles', this.clickable_tiles);

            // Set all of the tiles used for the last word to unclickable
            this.makePermanent(this.current_horizontal);
            this.makePermanent(this.current_vertical);

            // Reset the current words, direction, and # of used tiles
            this.current_horizontal = [];
            this.current_vertical = [];
            this.direction = '';
            this.clickable_tiles = 0;
        });

        // @TODO: Called when another player has added a correct word
        socket.on('opponent_word_added', function (data) {
            console.log('Opponent Added Words:', data);
        });
        
        // @TODO: Called when another player submits an incorrect word (rollback is initiated)
        socket.on('rollback', function (data) {
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
    getNewTiles(letters) {
        let count = 0;
        for(let i = 0; i < this.current_tiles.length; i++) {
            // Only load the tile if there is an empty spot in the deck. 
            if(this.current_tiles[i] != null)
                continue;

            let letter = letters[count++];
            let tile = new Tile(letter, this.tile_scores[letter]);  // Tile(letter, points)
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
        // @TODO: Let other players know that a tile was removed
        // socket.emit('tile_removed', tile);

        // Remove the tile from the currently stored word (replace with null)
        if(this.current_horizontal.length != 0)
            this.removeFromWord(tile, this.current_horizontal, 'horizontal');
        if(this.current_vertical.length != 0)
            this.removeFromWord(tile, this.current_vertical, 'vertical');

        // If a tile was removed from one of the words, decrease the # of clickable tiles
        if(this.clickable_tiles > 0)
            this.clickable_tiles--;

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
        if(this.current_horizontal.length < 2 && this.current_vertical.length < 2)
            this.direction = '';
        // Both horizontal/vertical contain 1 char
        if(this.current_horizontal.length == 1 && this.current_vertical.length == 0)
            this.current_vertical.push(this.current_horizontal[0]);
        else if(this.current_vertical.length == 1 && this.current_horizontal.length == 0)
            this.current_horizontal.push(this.current_vertical[0]);

        console.log('Number Clickable Tiles:', this.clickable_tiles);
        console.log('Tile Removed - New Horizontal Word: ', getWord(this.current_horizontal));
        console.log('Tile Removed - New Vertical Word: ', getWord(this.current_vertical));
    }

    // Replace a specific tile in a word with null
    removeFromWord(tile, word, dir) {
        let null_count = 0;
        let temp_word = word.slice();
        for(let i = 0; i < word.length; i++) {
            if(word[i] == null) {
                null_count++;
                continue;
            }
            // If the tile is the first tile of the word, remove first element of word array
            if(i == 0 && tile.image.x == word[i].image.x && tile.image.y == word[i].image.y)
                temp_word.shift();
            // If the tile is the last tile of the word, pop last element of word array
            else if(i == word.length-1 && tile.image.x == word[i].image.x && tile.image.y == word[i].image.y)
                temp_word.pop();
            // If the tile is in the middle of the word, replace with null
            else if(tile.image.x == word[i].image.x && tile.image.y == word[i].image.y) {
                temp_word.splice(i, 1, null);
                null_count++;
            }
            // console.log('word: ', word, 'temp_word: ', temp_word);
        }
        if(dir == 'horizontal')
            this.current_horizontal = temp_word;
        else
            this.current_vertical = temp_word;
    }

    // Places the currently selected tile in the correct square on the board.
    placeTile(square) {
        // Only place tile if one is currently selected
        if(this.selected_tile != null) {
            let word_index = isValidPosition(square, this.current_horizontal, this.current_vertical, this.direction);
            // Ensure that the tile is being placed in a valid position.
            if(word_index[0] != -1 || word_index[1] != -1) {
                // @TODO: Let other players know that a tile was placed
                // socket.emit('tile_placed', this.selected_tile);

                // console.log('Placing tile at: ', square.x, square.y);
                this.selected_tile.image.x = square.x;
                this.selected_tile.image.y = square.y;

                // Remove highlight around placed tile
                this.selected_tile.border.destroy();

                // Determine the new current word(s) according to where the tile was placed
                // @TODO: Currently only 1 vertical / 1 horizontal word is possible, need to extend to more
                this.addToWord(this.selected_tile, word_index);

                // Increase the number of clickable tiles on the screen (must do addToWord)
                this.clickable_tiles++;

                // If two tiles are going in a certain direction, set this as the current word direction.
                // if(this.current_horizontal.length == 2 || this.current_vertical.length == 2)
                this.setDirection();
                console.log('Current Direction: ', this.direction);

                // Remove the placed tile from the deck
                this.current_tiles[this.deck_index] = null;

                this.selected_tile = null;

                console.log('Tile Added - New Horizontal Word: ', getWord(this.current_horizontal));
                console.log('Tile Added - New Vertical Word: ', getWord(this.current_vertical));
            }
            else 
                console.log('Invalid tile position');
        }
        else
            console.log('No Tile Selected')
    }

    // Sets the word(s) being currently spelled according to the placement of the most recent tile.
    addToWord(tile, word_index) {
        console.log('Word Indices: ', word_index);
        // If this is the first tile being submitted, determine if this tile is adjacent to any previously submitted tiles
        if(this.clickable_tiles == 0 && Object.keys(this.submitted_tiles).length != 0) {
            this.addSurroundingTiles(tile);
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
            // @TODO: Determine if the most recently placed tile came into contact with an already-submitted tile.
        }
    }

    // Find the surrounding submitted tiles that are included in the current word.
    addSurroundingTiles(tile) {
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
        let h_word = getWord(this.current_horizontal), v_word = getWord(this.current_vertical);
        // If either of the words has a null character in it, it is not valid to submit.
        // @TODO: Display error message to the player.
        if(h_word.includes('*') || v_word.includes('*')) {
            console.log('Cannot Submit Invalid Word');
            return;
        }
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
/* @TODO: Fix for the following case:    
         U
        AN
        PI
        P
        L
        E
    horizontal words: AN, PI 
    vertical word: UNI              */
function isValidPosition(square, h_word, v_word, direction) {
    // If the word is 0 characters, add it at the beginning of both words 
    if(h_word.length == 0 && v_word.length == 0) {
        return [0,0];
    }

    // If the word is going equally in both directions, add characters to end of each string
    // if(direction == 'both')
    //    return [h_word.length, v_word.length];

    let h_index = -1, v_index = -1;
    if(direction == 'horizontal' || direction == '' || direction == 'both')
        h_index = getWordIndex(square, h_word, 'horizontal');

    if(direction == 'vertical' || direction == '' || direction == 'both')
        v_index = getWordIndex(square, v_word, 'vertical');

    return [h_index, v_index];
}

// Given a square on the board, find the position in the current word that it represents. 
function getWordIndex(square, word, dir) {
    let index = -1;
    let first_tile = word[0], last_tile = word[word.length-1];
    // For vertical words, x pos should == square's x pos, y pos should == square's pos +- OFFSET
    let first_x = (dir == 'vertical') ? first_tile.image.x : first_tile.image.x - OFFSET;
    let first_y = (dir == 'vertical') ? first_tile.image.y - OFFSET : first_tile.image.y;
    let last_x = (dir == 'vertical') ? last_tile.image.x : last_tile.image.x + OFFSET;
    let last_y = (dir == 'vertical') ? last_tile.image.y + OFFSET : last_tile.image.y;
    // Correct if current tile is placed at the beginning of the word
    if(first_x == square.x && first_y == square.y)
        index = 0;
    // Correct if current tile is placed at the end of the word
    else if(last_x == square.x && last_y == square.y)
        index = word.length;
    // Correct if current tile is placed in the blank space in the middle of a word
    else {
        for(let i = 0; i < word.length; i++) {
            if(word[i] != null)
                continue;
            console.log('Previous Letter Position:', word[i-1].image.x, word[i-1].image.y);
            if(dir == 'horizontal' && square.x == word[i-1].image.x + OFFSET) {
                index = i; break;
            }
            if(dir == 'vertical' && square.y == word[i-1].image.y + OFFSET) {
                index = i; break;
            }
        }
        // Remove the null from the word so it is replaced by the correct tile
        if(index != -1)
            word.splice(index, 1);
    }
    return index;
}

// Helper function return the string formed by an array of tile objects.
function getWord(tile) {
    let word = '';
    for(let i = 0; i < tile.length; i++) {
        if(tile[i] == null)
            word += '*';
        else
            word += tile[i].letter;
    }
    return word.toLowerCase();
}