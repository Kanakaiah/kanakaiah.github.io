import type { Verse } from '../types/models';

export const SEED_VERSES: Verse[] = [
    {
        id: "seed-1",
        ref: "Psalm 23:1",
        text: "Yahweh is my shepherd, I shall not want.",
        translation: "LSB",
        addedDate: new Date().toISOString(),
        status: "learning",
        sm2: {
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextDueDate: new Date().toISOString()
        },
        streak: 0,
        attempts: 0
    },
    {
        id: "seed-2",
        ref: "John 3:16",
        text: "For God so loved the world, that He gave His only begotten Son, that whoever believes in Him shall not perish, but have eternal life.",
        translation: "LSB",
        addedDate: new Date().toISOString(),
        status: "review",
        sm2: {
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextDueDate: new Date().toISOString()
        },
        streak: 0,
        attempts: 0
    }
];
