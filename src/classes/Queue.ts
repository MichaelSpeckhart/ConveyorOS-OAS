
export interface Queue<T> {
    enqueue(item: T): void;
    dequeue(): T | undefined;
    isEmpty(): boolean;
    size(): number;
}

export class ScanQueue<T> implements Queue<T> {

    private items: T[] = [];

    constructor(private capacity: number = Infinity) {}

    enqueue(item: T) : void {
        if (this.size() === this.capacity) {
            throw Error("Queue has reached max capacity, you cannot add more items");
        }
        this.items.push(item);
    }

    dequeue() : T | undefined {
        return this.items.shift();
    }

    isEmpty() : boolean {
        return this.items.length == 0;
    }

    size() : number {
        return this.items.length;
    }
}