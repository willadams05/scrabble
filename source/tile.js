export class Tile {
    constructor(letter, points) {
        this.letter = letter;
        this.points = points;
        this.image = null;
        this.origin_x = 0, this.origin_y = 0;
        this.border = null;
        this.clickable = true;
    }
}