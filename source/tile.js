export class Tile {
    constructor(letter, points, image) {
        this.letter = letter;
        this.points = points;
        this.image = image;
        this.x = 0, this.y = 0;
        this.placed = false;
    }
}