export class Tile {
    constructor(letter, score) {
        this.letter = letter;
        this.score = score;
        this.x = 0, this.y = 0;
        this.placed = false;
    }
}