import {describe, expect, test} from "vitest";
import {GameRoom} from "./room.ts";

function hostRoom(): GameRoom {
    return new GameRoom({playerId: "host", name: "Host", reconnectToken: "token"}, {randomCode: () => "ABCD", randomSeed: () => "seed-room"});
}

describe("GameRoom", () => {
    test("host can fill bots, ready and start", () => {
        const room = hostRoom();
        expect(room.snapshot().seats[0]?.playerId).toBe("host");
        room.handle("host", {type: "room.addBot", commandId: "b1", revision: room.revision});
        room.handle("host", {type: "room.addBot", commandId: "b2", revision: room.revision});
        room.handle("host", {type: "room.addBot", commandId: "b3", revision: room.revision});
        room.handle("host", {type: "room.ready", commandId: "r1", revision: room.revision, ready: true});
        const started = room.handle("host", {type: "game.start", commandId: "s1", revision: room.revision, seed: "seed-room"});
        expect(room.game).not.toBeNull();
        expect(started.some(event => event.event.type === "game.snapshot")).toBe(true);
        expect(room.game?.phase).toBe("playing");
        const snapshot = started.find(event => event.event.type === "game.snapshot" && event.to === "host");
        expect(snapshot?.event.type).toBe("game.snapshot");
        if (snapshot?.event.type === "game.snapshot") {
            const foreign = room.game!.hands.flatMap((hand, seat) => (seat === 0 ? [] : hand.map(card => card.id)));
            const json = JSON.stringify(snapshot.event.game);
            for (const id of foreign) {
                expect(json).not.toContain(`"${id}"`);
            }
        }
    });

    test("rejects stale revision and duplicate commands", () => {
        const room = hostRoom();
        const first = room.handle("host", {type: "room.addBot", commandId: "dup", revision: 1});
        expect(first.some(event => event.event.type === "game.actionAccepted")).toBe(true);
        const dup = room.handle("host", {type: "room.addBot", commandId: "dup", revision: room.revision});
        expect(dup[0].event.type).toBe("game.actionRejected");
        if (dup[0].event.type === "game.actionRejected") {
            expect(dup[0].event.code).toBe("duplicateCommand");
        }
        const stale = room.handle("host", {type: "room.addBot", commandId: "stale", revision: 1});
        expect(stale[0].event.type).toBe("game.actionRejected");
        if (stale[0].event.type === "game.actionRejected") {
            expect(stale[0].event.code).toBe("staleRevision");
        }
    });

    test("join fills the next empty seat", () => {
        const room = hostRoom();
        const events = room.join({playerId: "p2", name: "P2", reconnectToken: "t2"}, "join-1");
        expect(room.seats[1]?.playerId).toBe("p2");
        expect(events.some(event => event.event.type === "room.snapshot")).toBe(true);
    });
});
