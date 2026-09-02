import {describe, expect, test, vi} from "vitest";
import {chooseAction} from "../game/ai/strategy.ts";
import {toPublicSnapshot} from "../game/engine/snapshot.ts";
import {LocalTransport} from "./local.ts";

describe("LocalTransport", () => {
    test("offline match can finish a round with bots", async () => {
        vi.useFakeTimers();
        const transport = new LocalTransport({playerId: "human", name: "我", reconnectToken: "tok", aiDelayMs: 0});
        transport.subscribe(() => undefined);
        transport.startOfflineMatch();
        expect(transport.room.game).not.toBeNull();

        let steps = 0;
        while (transport.room.game && transport.room.game.phase === "playing" && steps < 500) {
            steps += 1;
            const game = transport.room.game;
            const current = game.players[game.currentPlayerSeat];
            if (current.id === "human") {
                const decision = chooseAction({hand: game.hands[current.seat], snapshot: toPublicSnapshot(game, current.id)});
                transport.send(
                    decision.type === "play"
                        ? {type: "game.playCards", commandId: `h-${steps}`, revision: transport.room.revision, cardIds: decision.cardIds}
                        : {type: "game.pass", commandId: `h-${steps}`, revision: transport.room.revision}
                );
            } else {
                await vi.runOnlyPendingTimersAsync();
            }
        }

        expect(transport.room.game?.phase).toBe("roundEnded");
        expect(transport.room.game?.winnerSeat).not.toBeNull();
        vi.useRealTimers();
    });
});
