export class Message {
    constructor(label, data) {
        this.label = label;
        this.data = data;
        this.timestamp = Date.now();
    }
}