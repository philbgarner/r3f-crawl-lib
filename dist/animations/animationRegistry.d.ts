import { AnimationQueueEntry, AnimationsHandle } from './types';
export type AnimationRegistry = AnimationsHandle & {
    _enqueue(entry: AnimationQueueEntry): void;
    _flush(): Promise<void>;
};
export declare function createAnimationRegistry(): AnimationRegistry;
//# sourceMappingURL=animationRegistry.d.ts.map