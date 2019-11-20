export class Tile {
    constructor(letter, points) {
        this.letter = letter;
        this.points = points;
        this.image = null;
        this.x = 0, this.y = 0;
        this.placed = false;
    }
}