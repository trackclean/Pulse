
type Task = () => Promise<void>;

interface QueueItem {
    task: Task;
    cancelled: boolean;
}

class WaveformQueue {
    private queue: QueueItem[] = [];
    private activeCount = 0;
    private maxConcurrent = 12; // Increased for better performance on view switches

    enqueue(task: Task, priority: boolean = false): () => void {
        const item: QueueItem = { task, cancelled: false };

        if (priority) {
            this.queue.unshift(item);
        } else {
            this.queue.push(item);
        }

        this.processNext();

        return () => {
            item.cancelled = true;
            const index = this.queue.indexOf(item);
            if (index > -1) {
                this.queue.splice(index, 1);
            }
        };
    }

    private async processNext() {
        if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }

        let item = this.queue.shift();
        while (item && item.cancelled) {
            item = this.queue.shift();
        }

        if (!item) return;

        this.activeCount++;

        try {
            if (!item.cancelled) {
                await item.task();
            }
        } catch (error) {
            console.error('Waveform queue task error:', error);
        } finally {
            this.activeCount--;
            this.processNext();
        }
    }
}

export const waveformQueue = new WaveformQueue();
