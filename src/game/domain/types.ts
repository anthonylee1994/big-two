export type Suit = "diamond" | "club" | "heart" | "spade";
export type Rank = "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A" | "2";
export type Seat = 0 | 1 | 2 | 3;
export type PlayerType = "human" | "bot";
export type ConnectionStatus = "connected" | "disconnected" | "bot";
export type GamePhase = "playing" | "roundEnded";

export type CombinationKind = "single" | "pair" | "triple" | "straight" | "flush" | "fullHouse" | "fourOfAKind" | "straightFlush";

export interface Card {
    id: string;
    suit: Suit;
    rank: Rank;
}

export interface Combination {
    kind: CombinationKind;
    cards: Card[];
}

export interface Player {
    id: string;
    name: string;
    seat: Seat;
    type: PlayerType;
    connectionStatus: ConnectionStatus;
    score: number;
}

export interface PlayLogEntry {
    seat: Seat;
    play: Combination | "pass";
}

export interface PlayerInit {
    id: string;
    name: string;
    type: PlayerType;
}

export interface GameState {
    round: number;
    phase: GamePhase;
    currentPlayerSeat: Seat;
    leadSeat: Seat;
    lastPlay: Combination | null;
    consecutivePasses: number;
    mustIncludeDiamond3: boolean;
    hands: Card[][];
    players: Player[];
    playLog: PlayLogEntry[];
    winnerSeat: Seat | null;
    penalties: number[];
    revision: number;
    seed: string;
    processedCommandIds: string[];
}

export interface PublicPlayer {
    id: string;
    name: string;
    seat: Seat;
    type: PlayerType;
    connectionStatus: ConnectionStatus;
    remainingCount: number;
    score: number;
}

export interface PublicGameState {
    round: number;
    phase: GamePhase;
    currentPlayerSeat: Seat;
    leadSeat: Seat;
    lastPlay: Combination | null;
    consecutivePasses: number;
    mustIncludeDiamond3: boolean;
    ownHand: Card[];
    ownSeat: Seat;
    players: PublicPlayer[];
    playLog: PlayLogEntry[];
    winnerSeat: Seat | null;
    penalties: number[];
    revision: number;
    remainingHands: Card[][] | null;
}

export type GameAction =
    | {type: "playCards"; playerId: string; commandId: string; revision: number; cardIds: string[]}
    | {type: "pass"; playerId: string; commandId: string; revision: number}
    | {type: "startRound"; playerId: string; commandId: string; revision: number; seed: string};

export type EngineErrorCode = "notYourTurn" | "staleRevision" | "illegalPlay" | "duplicateCommand" | "invalidPhase" | "mustIncludeDiamond3" | "mustPlay" | "unknownPlayer" | "invalidCards";

export interface EngineError {
    code: EngineErrorCode;
    message: string;
}

export type DomainEvent =
    | {type: "played"; seat: Seat; combination: Combination}
    | {type: "passed"; seat: Seat}
    | {type: "trickEnded"; leadSeat: Seat}
    | {type: "roundEnded"; winnerSeat: Seat; penalties: number[]}
    | {type: "roundStarted"; round: number; currentPlayerSeat: Seat};

export type ApplyResult = {ok: true; state: GameState; events: DomainEvent[]} | {ok: false; error: EngineError};
