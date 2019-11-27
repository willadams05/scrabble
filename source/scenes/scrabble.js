import { CONSTANTS } from "../constants.js";
import { Tile } from "../tile.js";
import { State } from "../state.js";

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
        // Dict of all tiles and their corresponding point values
        this.tile_scores = {
            'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4,
            'I': 1, 'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3,
            'Q': 10, 'R': 1, 'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8,
            'Y': 4, 'Z': 10
        };
        // Horizontal word currently being spelled on the board.
        this.current_horizontal = [];
        // Vertical word currently being spelled on the board.
        this.current_vertical = [];
        // Direction of the word currently being spelled
        this.direction = '';
        // Number of tiles currently on the board that have not been submitted
        this.num_clickable = 0;
        // Alphabet tile selected from the available pieces
        this.selected_tile = null;
        // List of the tiles currently available to the player
        this.current_tiles = [null, null, null, null, null, null, null];
        // Dict of the tiles that have been submitted as words. (key: position tuple, value: tile object)
        this.submitted_tiles = {};
        // List of board squares where a tile can be placed
        this.board = [];
        // List of the tiles currently placed on the board (but not submitted) by the opponent
        this.opponent_tiles = [];
        // Flag that determines who can currently make moves on the board.
        this.my_turn = false;
        // Message displaying that it is the opponent's turn
        this.opponent_image = null;
        // Message displaying that not all opponents have joined
        this.waiting_image = null;
        // An array that stores timestamps for all messages received from the server
        this.receive_times = [];
        // Number of receives from the mailbox since the last checkpoint.
        this.num_receives = 0;  // Messages received each time opponent places/removes tiles, turns change, and words are submitted
        // When this many receives have occurred, save a checkpoint
        this.receive_limit = 1;
        // An array that stores timestamps for all messages sent to the server
        this.send_times = [];
        // Number of sends to the mailbox since the last checkpoint.
        this.num_sends = 0;     // Messages sent each time a tile is placed or removed
        // When this many sends have occurred, save a checkpoint
        this.send_limit = 1;
        // The list of checkpoints stored on this client
        this.checkpoints = [];
    }

    preload() {
        this.load.image('board', 'source/assets/board.png');
        this.load.image('empty-square', 'source/assets/empty_square.png');
        this.load.image('border', 'source/assets/border.png');
        this.load.image('clear', 'source/assets/clear_button.png');
        this.load.image('submit', 'source/assets/submit_button.png');
        this.load.image('opponent-turn', 'source/assets/opponent_turn.png');
        this.load.image('waiting', 'source/assets/waiting.png');
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

        // Add button to allow clearing the current tiles off the board
        let clear = this.add.image(80, 720, 'clear').setInteractive();
        clear.scale = .8
        clear.on('pointerup', ()=>{
            if(this.my_turn)
                this.clearWord();
        });

        // Add button to allow word submission
        let submit = this.add.image(600, 720, 'submit').setInteractive();
        submit.on('pointerup', ()=>{
            if(this.my_turn)
                this.submitWord();
        })

        this.waiting_image = this.add.image(350, 50, 'waiting');
    }

    setSocketEvents() {
        socket.on('init', function(data) {
            console.log(data);
            socket.emit('success', 'Connection Successful');
        });

        // All opponents have connected, request tiles from server
        socket.on('opponent_connected', ()=> {
            console.log('Requesting Tiles From Server');
            socket.emit('load_tiles', 7);
            this.waiting_image.destroy();
        });

        // Load the tiles objects from the letters picked by the server
        socket.on('receive_tiles', (tiles)=> {
            console.log('Received Tiles From Server:', tiles);
            this.getNewTiles(tiles);
            // Save initial client state
            this.saveState();
        });

        // Begin turn (enable commands), remove "Opponent's Turn" message
        socket.on('start_turn', ()=> {
            this.receive_times.push(Date.now());
            this.num_receives++;
            console.log('Starting Turn');
            if(this.opponent_image != null)
                this.opponent_image.destroy();
            this.my_turn = true;
            if(this.num_receives >= this.receive_limit)
                this.saveState();
        });

        // End turn (disable commands), add "Opponents' Turn" message
        socket.on('end_turn', ()=> {
            this.receive_times.push(Date.now());
            this.num_receives++;
            console.log('Ending Turn');
            this.opponent_image = this.add.image(350, 50, 'opponent-turn');
            this.my_turn = false;
            if(this.num_receives >= this.receive_limit)
                this.saveState();
        });

        // When another player places a tile, place it on this player's board
        socket.on('tile_placed', (tile)=> {
            this.receive_times.push(Date.now());
            this.num_receives++;
            console.log('Opponent Placed Tile:', tile.letter);
            this.opponent_tiles.push(tile);
            // Add the tile's image to this scene
            tile.image = this.add.image(tile.image.x, tile.image.y, tile.letter);
            if(this.num_receives >= this.receive_limit)
                this.saveState();
        });
        
        // When another player removes a tile, remove it from this player's board
        socket.on('tile_removed', (tile)=> {
            this.receive_times.push(Date.now());
            this.num_receives++;
            console.log('Opponent Removed Tile:', tile.letter);
            // Remove the tile from the opponent's tile array and remove from the screen
            let removed_tile = null;
            for(let i = 0; i < this.opponent_tiles.length; i++) {
                let temp = this.opponent_tiles[i];
                if(temp.image.x == tile.image.x && temp.image.y == tile.image.y)
                    removed_tile = temp;
            }
            // Remove the tile from the list of opponent's tiles.
            this.opponent_tiles = this.opponent_tiles.filter(t => t.image.x != tile.image.x || t.image.y != tile.image.y);
            // Remove the tile image from the scene
            removed_tile.image.destroy();
            if(this.num_receives >= this.receive_limit)
                this.saveState();
        });
        
        // Called when current player has submitted a correct word
        socket.on('words_added', (data)=> {
            this.receive_times.push(Date.now());
            this.num_receives++;
            console.log('Correct Words Added: ', data);

            // Load as many new tiles as were used on the last successful word
            socket.emit('load_tiles', this.num_clickable);

            // Set all of the tiles used for the last word(s) to be unclickable
            for(let i = 0; i < this.current_horizontal.length; i++) {
                this.makePermanent(this.current_horizontal[i]);
            }
            for(let j = 0; j < this.current_vertical.length; j++) {
                this.makePermanent(this.current_vertical[j]);
            }

            // Reset the current words, direction, and # of used tiles
            this.current_horizontal = [];
            this.current_vertical = [];
            this.direction = '';
            this.num_clickable = 0;

            if(this.num_receives >= this.receive_limit)
                this.saveState();
        });

        // When another player has submitted a correct word, make the tiles permanent and clear the current opponent tiles.
        socket.on('opponent_words_added', (words)=> {
            this.receive_times.push(Date.now());
            this.num_receives++;
            console.log('Opponent Added Words:', words);
            for(let i = 0; i < this.opponent_tiles.length; i++)
                this.makePermanent(this.opponent_tiles[i]);
            this.opponent_tiles = [];
            if(this.num_receives >= this.receive_limit)
                this.saveState();
        });
        
        // @TODO: Called when another player submits an incorrect word (rollback is initiated)
        socket.on('rollback', (data)=> {
            console.log('Invalid Word -- Rolling Back');
            // Destroy all of the tile images on the board
            this.clearBoard();
            // Redraw the correct tiles from the most recent checkpoint
            let checkpoint = this.checkpoints[this.checkpoints.length-1];
            this.restoreState(checkpoint);
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
                    if(this.my_turn)
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
            let tile = new Tile(letter, this.tile_scores[letter], i);  // Tile(letter, points, deck_index)
            let x = 180 + (i * 50), y = 720; 
            tile.origin_x = x; tile.origin_y = y;
            tile.image = this.add.image(x, y, tile.letter).setInteractive();
            this.setTileEvents(tile);
            this.current_tiles[i] = tile;
        }
    }

    setTileEvents(tile) {
        tile.image.on('pointerup', ()=>{
            if(tile.clickable && this.my_turn) {
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
        });
    }

    // Un-highlight the currently selected tile
    deselectTile() {
        if(this.selected_tile != null) {
            // Remove highlight around placed tile
            this.selected_tile.border.destroy();
        }
    }

    // Highlight the currently selected tile from the deck
    selectTile(tile) {
        tile.border = this.add.image(tile.image.x, tile.image.y, 'border');
        this.selected_tile = tile;
    }

    // Remove a tile from the board and place it back in the deck
    removeTile(tile) {
        // Do nothing if the tile is already on the deck.
        if(tile.image.x == tile.origin_x && tile.image.y == tile.origin_y)
            return;

        // Let other players know that a tile was removed
        socket.emit('tile_removed', tile);
        this.send_times.push(Date.now());
        this.num_sends++;

        // Remove the tile from the currently stored word (replace with null)
        if(this.current_horizontal.length != 0)
            this.removeFromWord(tile, this.current_horizontal, 'horizontal');
        if(this.current_vertical.length != 0)
            this.removeFromWord(tile, this.current_vertical, 'vertical');

        // If a tile was removed from one of the words, decrease the # of clickable tiles
        if(this.num_clickable > 0)
            this.num_clickable--;

        // Place the tile back in the deck
        this.moveToDeck(tile);

        // If no more clickable tiles are on the board, clear the current words.
        if(this.num_clickable == 0) {
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

        if(this.num_sends >= this.send_limit)
            this.saveState();

        console.log('Tile Removed - New Horizontal Word:', getWord(this.current_horizontal));
        console.log('Tile Removed - New Vertical Word:', getWord(this.current_vertical));
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
            if(i == 0 && tilesAreEqual(tile, word[i]))
                temp_word.shift();
            // If the tile is the last tile of the word, pop last element of word array
            else if(i == word.length-1 && tilesAreEqual(tile, word[i]))
                temp_word.pop();
            // If the tile is in the middle of the word, replace with null
            else if(tilesAreEqual(tile, word[i])) {
                temp_word.splice(i, 1, null);
                null_count++;
            }
        }
        if(dir == 'horizontal')
            this.current_horizontal = temp_word;
        else
            this.current_vertical = temp_word;
    }

    // Places the current tile back in the deck
    moveToDeck(tile) {
        tile.image.x = tile.origin_x;
        tile.image.y = tile.origin_y;
        this.current_tiles[tile.deck_index] = tile;
    }

    // Places the currently selected tile in the correct square on the board.
    placeTile(square) {
        // Only place tile if one is currently selected
        if(this.selected_tile != null) {
            let word_index = isValidPosition(square, this.current_horizontal, this.current_vertical, 
                                             this.direction, this.submitted_tiles);
            // console.log('Word Index: ', word_index);
            // Ensure that the tile is being placed in a valid position.
            if(word_index[0] != -1 || word_index[1] != -1) {
                // Move tile from the deck to the correct square
                this.selected_tile.image.x = square.x;
                this.selected_tile.image.y = square.y;

                // Remove highlight around placed tile
                this.selected_tile.border.destroy();

                // Let other players know that a tile was placed
                socket.emit('tile_placed', this.selected_tile);
                this.send_times.push(Date.now());
                this.num_sends++;

                // Determine the new current word(s) according to where the tile was placed
                // @TODO: Currently only 1 vertical / 1 horizontal word is possible, need to extend to more
                this.addToWord(this.selected_tile, word_index);

                // Increase the number of clickable tiles on the screen (must do addToWord)
                this.num_clickable++;

                // If two tiles are going in a certain direction, set this as the current word direction.
                // if(this.current_horizontal.length == 2 || this.current_vertical.length == 2)
                this.setDirection();
                console.log('Current Direction: ', this.direction);

                // Remove the placed tile from the deck
                this.current_tiles[this.selected_tile.deck_index] = null;

                this.selected_tile = null;

                if(this.num_sends >= this.send_limit)
                    this.saveState();

                if(this.current_horizontal.length > 0)
                    console.log('Tile Added - New Horizontal Word: ', getWord(this.current_horizontal));
                if(this.current_vertical.length > 0)
                    console.log('Tile Added - New Vertical Word: ', getWord(this.current_vertical));
            }
            else 
                console.log('Invalid tile position');
        }
        else
            console.log('No Tile Selected')
    }

    // Adds the current tile to the words, while searching for previously submitted adjacent tiles
    addToWord(tile, word_index) {
        // Plan to add the tile at h_index for horizontal word, v_index for vertical word.
        let h_index = word_index[0], v_index = word_index[1];
        if(h_index != -1) {
            // Add previously submitted tiles that are to the left of the current position
            h_index = findSurrounding(tile.image.x - OFFSET, tile.image.y, OFFSET*-1, this.current_horizontal, 
                                    'horizontal', h_index, this.submitted_tiles, true);
            // Add the current tile to the end of the horizontal word
            console.log('New Tile: ', tile.letter, ' Added At Horizontal Index: ', h_index)
            this.current_horizontal.splice(h_index++, 0, tile);
            // Add previously submitted tiles that are to the right of the current position
            findSurrounding(tile.image.x + OFFSET, tile.image.y, OFFSET, this.current_horizontal, 
                            'horizontal', h_index, this.submitted_tiles, false);
        }
        if(v_index != -1) {
            // Add previously submitted tiles that are above the current position
            v_index = findSurrounding(tile.image.x, tile.image.y - OFFSET, OFFSET*-1, this.current_vertical, 
                                      'vertical', v_index, this.submitted_tiles, true);
            // Add the current tile to the word
            console.log('New Tile: ', tile.letter, ' Added At Vertical Index: ', v_index)
            this.current_vertical.splice(v_index++, 0, tile);
            // Add previously submitted tiles that are below the current position
            findSurrounding(tile.image.x, tile.image.y + OFFSET, OFFSET, this.current_vertical, 
                            'vertical', v_index, this.submitted_tiles, false);
        }
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
        if((h_word.length == 0 && v_word.length == 0) || h_word.includes('*') || v_word.includes('*')) {
            console.log('Cannot Submit -- Incomplete Word');
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
        
        // Verify that the word(s) is/are correct
        socket.emit('words_submitted', words);
    }

    // Set the currentt tile to be unclickable and store it in submitted_tiles
    makePermanent(tile) {
        tile.clickable = false;
        this.submitted_tiles[[tile.image.x, tile.image.y]] = tile;
    }

    clearWord() {
        this.deselectTile();
        for(let i = 0; i < this.current_horizontal.length; i++) {
            let tile = this.current_horizontal[i];
            // If the current tile is not a submitted tile (still clickable) then it should be moved 
            if(tile.clickable) {
                socket.emit('tile_removed', tile);
                this.send_times.push(Date.now());
                this.num_sends++;
                this.moveToDeck(tile);
            }
        }
        for(let j = 0; j < this.current_vertical.length; j++) {
            let tile = this.current_vertical[j];
            // Don't emit tile_removed message if the tile was already moved back from the horizontal word.
            if(tile.clickable && (tile.image.x != tile.origin_x || tile.image.y != tile.origin_y)) {
                socket.emit('tile_removed', tile);
                this.send_times.push(Date.now());
                this.num_sends++;
                this.moveToDeck(tile);
            }
        }
        this.num_clickable = 0;
        this.current_horizontal = [];
        this.current_vertical = [];
        this.direction = '';

        if(this.num_sends >= this.send_limit)
            this.saveState();

        console.log('Cleared Current Words');
    }

    // Remove all of the tile images off of the board and from the deck, and reset the game state
    clearBoard() {
        this.destroyTileArray(this.current_horizontal);
        this.destroyTileArray(this.current_vertical);
        this.destroyTileArray(this.current_tiles);
        this.destroyTileDict(this.submitted_tiles);        
    }

    // Destroys all time images in an array
    destroyTileArray(arr) {
        for(let i = 0; i < arr.length; i++) {
            let tile = arr[i];
            if(tile == null || tile.image == null)
                continue;
            tile.image.destroy();
        }
    }

    // Destroys all tile images in a dict
    destroyTileDict(dict) {
        for(var key in dict) {
            let tile = dict[key];
            if(tile == null || tile.image == null)
                continue;
            tile.image.destroy();
        }
    }

    // Creates a new checkpoint with the current system state 
    saveState() {
        // There have been no sends or receives since this checkpoint
        this.num_receives = 0, this.num_sends = 0;
        let checkpoint = new State(this.current_vertical, this.current_horizontal, this.direction, 
                                   this.num_clickable, this.selected_tile, this.current_tiles, 
                                   this.submitted_tiles, this.opponent_tiles, this.my_turn);
        this.checkpoints.push(checkpoint);
        console.log('Saving System State At:', checkpoint.timestamp);
    }

    // Restores the system state from a specific checkpoint  
    restoreState(checkpoint) {
        console.log('Rolling Back To Checkpoint At:', checkpoint.timestamp)
        // Set all of the necessary variables
        this.current_vertical = checkpoint.current_vertical;
        this.current_horizontal = checkpoint.current_horizontal;
        this.direction = checkpoint.direction;
        this.num_clickable = checkpoint.num_clickable;
        this.selected_tile = checkpoint.selected_tile;
        this.current_tiles = checkpoint.current_tiles;
        this.submitted_tiles = checkpoint.submitted_tiles;
        this.opponent_tiles = checkpoint.opponent_tiles;
        this.my_turn = checkpoint.my_turn;
        
        // Redraw all of the images
        this.redrawTileArray(this.current_horizontal);
        this.redrawTileArray(this.current_vertical);
        this.redrawTileArray(this.current_tiles);
        this.redrawTileDict(this.submitted_tiles);   

        // @TODO:
        // Load the system state from the most recent checkpoint
        // M-Propagation:
        //      a. Restore system state from checkpoint on current client
        //      b. Check if any messages need to be unsent by finding messages sent after the checkpoint in send_times array
        //          b1. If messages unsent, emit "unreceive" message to server
        //          b2. If client receives "unreceive" message, must roll back to checkpoint before timestamp in "unreceive"???
        // R-Propagation:
        //      a. Restore system state from checkpoint on current client
        //      b. Check if messages need to be unsent as before
        //          b1. If messages are unsent, emit "unreceive" message to server
        //          b2. If client receives "unreceive" message and it makes send list not a prefix of receive list, must rollback 
    }

    // Redraw the tile images from an array
    redrawTileArray(arr) {
        for(let i = 0; i < arr.length; i++) {
            let tile = arr[i];
            if(tile == null || tile.image == null)
                continue;
            tile.image = this.add.image(tile.image.x, tile.image.y, tile.letter).setInteractive();
            this.setTileEvents(tile);
        }
    }

    // Redraw the tile images from a dict
    redrawTileDict(dict) {
        for(var key in dict) {
            let tile = dict[key];
            if(tile == null || tile.image == null)
                continue;
            tile.image = this.add.image(tile.image.x, tile.image.y, tile.letter);
            this.setTileEvents(tile);
        }
    }
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
function isValidPosition(square, h_word, v_word, direction, submitted) {
    // If the tile is being placed on a non-empty square, do not place it
    if([square.x, square.y] in submitted) {
        return [-1, -1];
    }
    // If the word is 0 characters, add it at the beginning of both words 
    if(h_word.length == 0 && v_word.length == 0) {
        return [0,0];
    }

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

// Helper function that finds adjacent tiles in a specific direction from the current tile
function findSurrounding(x, y, off, word, dir, index, submitted, begin_flag) {
    while(true) {
        // If this is not a previously submitted tile, ignore it (it's already on the current word). 
        if(!([x,y] in submitted))
            break;
        let temp_tile = submitted[[x, y]];
        // If the submitted tile is already in the current word, ignore it and all adjacent tiles
        if(containsTile(word, temp_tile))
            break;
        // Add the submitted tile to the current word and increment index for next tile
        if(begin_flag) {
            console.log('Submitted Tile:', temp_tile.letter, 'Being Added To Beginning Of Word');
            word.unshift(temp_tile);
        }
        else {
            console.log('Submitted Tile:', temp_tile.letter, 'Being Added To Word At Index:', index);
            word.splice(index, 0, temp_tile);
        }
        x = (dir == 'horizontal') ? x + off : x;
        y = (dir == 'vertical') ? y + off : y;
        index++;
    }
    return index;
}

function containsTile(word, tile) {
    for(let i = 0; i < word.length; i++) {
        if(tilesAreEqual(word[i], tile))
            return true;
    }
    return false;
}

function tilesAreEqual(tile1, tile2) {
    return (tile1.image.x == tile2.image.x) && (tile1.image.y == tile2.image.y);
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