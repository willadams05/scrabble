export class State {
    constructor(vertical, horizontal, direction, num_clickable, selected_tile, 
                current_tiles, submitted_tiles, opponent_tiles, turn) {
        this.current_vertical = vertical;
        this.current_horizontal = horizontal;
        this.direction = direction;
        this.num_clickable = num_clickable;
        this.selected_tile = selected_tile;
        this.current_tiles = current_tiles;
        this.submitted_tiles = submitted_tiles;
        this.opponent_tiles = opponent_tiles;
        this.my_turn = turn;
        this.timestamp = Date.now();
    }
}