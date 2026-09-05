import type {GameState, PublicGameState, PublicPlayer, Seat} from "../domain/types.ts";

export function toPublicSnapshot(state: GameState, viewerId: string): PublicGameState {
    const viewer = state.players.find(player => player.id === viewerId);
    const ownSeat: Seat = viewer?.seat ?? 0;
    const revealHands = state.phase === "roundEnded";

    const players: PublicPlayer[] = state.players.map(player => ({
        id: player.id,
        name: player.name,
        seat: player.seat,
        type: player.type,
        connectionStatus: player.connectionStatus,
        remainingCount: state.hands[player.seat].length,
        score: player.score,
    }));

    return {
        round: state.round,
        phase: state.phase,
        currentPlayerSeat: state.currentPlayerSeat,
        leadSeat: state.leadSeat,
        lastPlay: state.lastPlay,
        consecutivePasses: state.consecutivePasses,
        mustIncludeDiamond3: state.mustIncludeDiamond3,
        ownHand: viewer ? [...state.hands[ownSeat]] : [],
        ownSeat,
        players,
        playLog: state.playLog.map(entry => ({
            seat: entry.seat,
            play: entry.play === "pass" ? "pass" : {kind: entry.play.kind, cards: [...entry.play.cards]},
        })),
        winnerSeat: state.winnerSeat,
        penalties: [...state.penalties],
        revision: state.revision,
        remainingHands: revealHands ? state.hands.map(hand => [...hand]) : null,
    };
}

export function assertNoForeignHands(snapshot: PublicGameState, fullState: GameState): void {
    if (snapshot.remainingHands) {
        return;
    }
    const foreignSeats = fullState.players.filter(player => player.seat !== snapshot.ownSeat).map(player => player.seat);
    const ownIds = new Set(snapshot.ownHand.map(card => card.id));
    for (const seat of foreignSeats) {
        for (const card of fullState.hands[seat]) {
            if (ownIds.has(card.id) && snapshot.ownSeat !== seat) {
                throw new Error("snapshot leaked a foreign card into ownHand");
            }
        }
    }
}
