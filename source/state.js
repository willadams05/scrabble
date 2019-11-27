export class State {
    constructor(vertical, horizontal, direction, num_clickable, selected_tile, 
                current_tiles, submitted_tiles, opponent_tiles, turn) {
        // Create deep copy of the vertical word array
        this.current_vertical = JSON.parse(JSON.stringify(vertical));
        // Create deep copy of the horizontal word array
        this.current_horizontal = JSON.parse(JSON.stringify(horizontal));
        this.direction = direction;
        this.num_clickable = num_clickable;
        this.selected_tile = selected_tile;
        // Create deep copy of the current tiles array
        this.current_tiles = JSON.parse(JSON.stringify(current_tiles));
        // Create deep copy of the submitted tiles dictionary
        this.submitted_tiles = JSON.parse(JSON.stringify(submitted_tiles))
        // Create deep copy of the opponent tiles array
        this.opponent_tiles = JSON.parse(JSON.stringify(opponent_tiles));
        this.my_turn = turn;
        this.timestamp = Date.now();
    }
}