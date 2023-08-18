

export interface Consumer<T> {
    consume(): Promise<T | undefined>;
}

export interface Producer<T> {
    produce(v: T): void;
}


export default class StdAsyncBuffer<T> implements Consumer<T>, Producer<T> {

    private queue: T[];
    private resolveCallback: ((value: T) => void) | undefined;

    constructor() {
        this.queue = [];
    }

    async consume(): Promise<T | undefined> {
        if (this.queue.length === 0) {
            await new Promise(resolve => {
                this.resolveCallback = resolve;
            });
        }
        return this.queue.shift();
    }

    produce(v: T) {
        this.queue.push(v);
        if (this.resolveCallback) {
            this.resolveCallback(v);
            this.resolveCallback = undefined;
        }
    }
};