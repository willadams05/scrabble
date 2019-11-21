export class Tile {
    constructor(letter, points, deck_index) {
        this.letter = letter;
        this.points = points;
        this.deck_index = deck_index;
        this.image = null;
        this.origin_x = 0, this.origin_y = 0;
        this.border = null;
        this.clickable = true;
    }
}