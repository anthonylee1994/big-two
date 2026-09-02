import {describe, expect, test} from "vitest";
import {c, combo} from "../test-helpers.ts";
import {beats, identifyCombination, straightRankIndex} from "./combination.ts";

describe("identifyCombination", () => {
    test("single, pair, triple", () => {
        expect(identifyCombination(c("S7"))?.kind).toBe("single");
        expect(identifyCombination(c("S9", "D9"))?.kind).toBe("pair");
        expect(identifyCombination(c("S8", "H8", "C8"))?.kind).toBe("triple");
    });

    test("rejects mismatched pairs and triples", () => {
        expect(identifyCombination(c("S9", "D8"))).toBeNull();
        expect(identifyCombination(c("S8", "H8", "C7"))).toBeNull();
        expect(identifyCombination(c("S8", "H8", "C8", "D8"))).toBeNull();
    });

    test("identifies five-card kinds", () => {
        expect(identifyCombination(c("D3", "C4", "H5", "S6", "D7"))?.kind).toBe("straight");
        expect(identifyCombination(c("H3", "H8", "H9", "HJ", "HK"))?.kind).toBe("flush");
        expect(identifyCombination(c("S9", "H9", "C9", "D3", "S3"))?.kind).toBe("fullHouse");
        expect(identifyCombination(c("S8", "H8", "C8", "D8", "S3"))?.kind).toBe("fourOfAKind");
        expect(identifyCombination(c("H3", "H4", "H5", "H6", "H7"))?.kind).toBe("straightFlush");
    });

    test("flush that is also a straight is a straight flush", () => {
        expect(identifyCombination(c("S10", "SJ", "SQ", "SK", "SA"))?.kind).toBe("straightFlush");
    });

    test("illegal wrap-around straights", () => {
        expect(identifyCombination(c("DJ", "HQ", "CK", "SA", "D2"))).toBeNull();
        expect(identifyCombination(c("DQ", "HK", "CA", "S2", "D3"))).toBeNull();
        expect(identifyCombination(c("DK", "HA", "C2", "S3", "D4"))).toBeNull();
        expect(straightRankIndex(c("DJ", "HQ", "CK", "SA", "D2"))).toBe(-1);
    });

    test("legal special straights", () => {
        expect(identifyCombination(c("DA", "D2", "C3", "H4", "S5"))?.kind).toBe("straight");
        expect(identifyCombination(c("D2", "C3", "H4", "S5", "D6"))?.kind).toBe("straight");
        expect(identifyCombination(c("D10", "HJ", "CQ", "SK", "DA"))?.kind).toBe("straight");
    });
});

describe("beats", () => {
    test("singles compare rank then suit", () => {
        expect(beats(combo("single", "S7"), combo("single", "H7"))).toBe(true);
        expect(beats(combo("single", "D8"), combo("single", "S7"))).toBe(true);
        expect(beats(combo("single", "H7"), combo("single", "S7"))).toBe(false);
    });

    test("pairs compare rank then highest suit", () => {
        expect(beats(combo("pair", "S9", "D9"), combo("pair", "H9", "C9"))).toBe(true);
        expect(beats(combo("pair", "S8", "D8"), combo("pair", "S9", "D9"))).toBe(false);
    });

    test("triples compare rank only", () => {
        expect(beats(combo("triple", "D9", "C9", "H9"), combo("triple", "D8", "C8", "S8"))).toBe(true);
    });

    test("straight order A2345 > 23456 > TJQKA", () => {
        const a2345 = combo("straight", "DA", "D2", "C3", "H4", "S5");
        const s23456 = combo("straight", "D2", "C3", "H4", "S5", "D6");
        const tjqka = combo("straight", "D10", "HJ", "CQ", "SK", "DA");
        const low = combo("straight", "D3", "C4", "H5", "S6", "D7");
        expect(beats(a2345, s23456)).toBe(true);
        expect(beats(s23456, tjqka)).toBe(true);
        expect(beats(tjqka, low)).toBe(true);
        expect(beats(low, a2345)).toBe(false);
    });

    test("same straight ranks compare by the comparison card suit", () => {
        const withSpade5 = combo("straight", "DA", "D2", "C3", "H4", "S5");
        const withHeart5 = combo("straight", "CA", "C2", "D3", "D4", "H5");
        expect(beats(withSpade5, withHeart5)).toBe(true);
        const withSpade6 = combo("straight", "S2", "C3", "H4", "D5", "S6");
        const withClub6 = combo("straight", "D2", "D3", "C4", "H5", "C6");
        expect(beats(withSpade6, withClub6)).toBe(true);
    });

    test("flush beats straight; full house beats flush; four of a kind beats full house; straight flush beats four of a kind", () => {
        const straight = combo("straight", "D3", "C4", "H5", "S6", "D7");
        const flush = combo("flush", "H3", "H8", "H9", "HJ", "HK");
        const fullHouse = combo("fullHouse", "S4", "H4", "C4", "D3", "S3");
        const four = combo("fourOfAKind", "S5", "H5", "C5", "D5", "S3");
        const sf = combo("straightFlush", "S3", "S4", "S5", "S6", "S7");
        expect(beats(flush, straight)).toBe(true);
        expect(beats(fullHouse, flush)).toBe(true);
        expect(beats(four, fullHouse)).toBe(true);
        expect(beats(sf, four)).toBe(true);
        expect(beats(straight, flush)).toBe(false);
    });

    test("full house compares triple rank only", () => {
        const nines = combo("fullHouse", "S9", "H9", "C9", "D3", "S3");
        const eights = combo("fullHouse", "S8", "H8", "C8", "DA", "SA");
        expect(beats(nines, eights)).toBe(true);
    });

    test("four of a kind ignores kicker", () => {
        const nines = combo("fourOfAKind", "S9", "H9", "C9", "D9", "D3");
        const eights = combo("fourOfAKind", "S8", "H8", "C8", "D8", "SA");
        expect(beats(nines, eights)).toBe(true);
    });

    test("same length is required", () => {
        expect(beats(combo("pair", "S9", "D9"), combo("single", "S7"))).toBe(false);
        expect(beats(combo("triple", "S9", "H9", "C9"), combo("pair", "S8", "D8"))).toBe(false);
    });
});
