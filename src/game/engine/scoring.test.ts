import {describe, expect, test} from "vitest";
import {penaltyForCount, roundPenalties} from "./scoring.ts";

describe("scoring", () => {
    test("penalty bands", () => {
        expect(penaltyForCount(0)).toBe(0);
        expect(penaltyForCount(1)).toBe(1);
        expect(penaltyForCount(9)).toBe(9);
        expect(penaltyForCount(10)).toBe(20);
        expect(penaltyForCount(12)).toBe(24);
        expect(penaltyForCount(13)).toBe(39);
    });

    test("winner always scores 0", () => {
        expect(roundPenalties([0, 5, 10, 13], 0)).toEqual([0, 5, 20, 39]);
    });
});
