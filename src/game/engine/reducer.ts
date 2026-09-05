import {createDeck, DIAMOND_3_ID, nextSeat, sortCards} from "../domain/cards.ts";
import type {ApplyResult, Card, DomainEvent, EngineErrorCode, GameAction, GameState, PlayerInit, Seat} from "../domain/types.ts";
import {cardsFromIds, isLegalPlay, listLegalPlays, playContextFor, selectedPlay} from "./legal.ts";
import {roundPenalties} from "./scoring.ts";
import {shuffle} from "./shuffle.ts";

const MAX_COMMAND_IDS = 200;

function fail(code: EngineErrorCode, message: string): ApplyResult {
    return {ok: false, error: {code, message}};
}

function cloneState(state: GameState): GameState {
    return {
        ...state,
        hands: state.hands.map(hand => [...hand]),
        players: state.players.map(player => ({...player})),
        lastPlay: state.lastPlay ? {kind: state.lastPlay.kind, cards: [...state.lastPlay.cards]} : null,
        playLog: state.playLog.map(entry => (entry.play === "pass" ? {seat: entry.seat, play: "pass" as const} : {seat: entry.seat, play: {kind: entry.play.kind, cards: [...entry.play.cards]}})),
        penalties: [...state.penalties],
        processedCommandIds: [...state.processedCommandIds],
    };
}

function rememberCommand(state: GameState, commandId: string): void {
    state.processedCommandIds.push(commandId);
    if (state.processedCommandIds.length > MAX_COMMAND_IDS) {
        state.processedCommandIds = state.processedCommandIds.slice(-MAX_COMMAND_IDS);
    }
}

function findDiamond3Seat(hands: Card[][]): Seat {
    for (let seat = 0; seat < 4; seat += 1) {
        if (hands[seat].some(card => card.id === DIAMOND_3_ID)) {
            return seat as Seat;
        }
    }
    throw new Error("Deck is missing ♦3");
}

function dealHands(deck: Card[]): Card[][] {
    if (deck.length !== 52) {
        throw new Error("Deck must contain 52 cards");
    }
    const ids = new Set(deck.map(card => card.id));
    if (ids.size !== 52) {
        throw new Error("Deck cards must be unique");
    }
    return [sortCards(deck.slice(0, 13)), sortCards(deck.slice(13, 26)), sortCards(deck.slice(26, 39)), sortCards(deck.slice(39, 52))];
}

function finishRound(state: GameState, winnerSeat: Seat, events: DomainEvent[]): void {
    const penalties = roundPenalties(
        state.hands.map(hand => hand.length),
        winnerSeat
    );
    state.phase = "roundEnded";
    state.winnerSeat = winnerSeat;
    state.penalties = penalties;
    state.currentPlayerSeat = winnerSeat;
    for (let seat = 0; seat < 4; seat += 1) {
        state.players[seat].score += penalties[seat];
    }
    events.push({type: "roundEnded", winnerSeat, penalties});
}

function beginRound(state: GameState, seed: string, events: DomainEvent[]): void {
    const deck = shuffle(createDeck(), seed);
    state.seed = seed;
    state.round += 1;
    state.hands = dealHands(deck);
    state.playLog = [];
    state.lastPlay = null;
    state.consecutivePasses = 0;
    state.winnerSeat = null;
    state.penalties = [0, 0, 0, 0];
    const startSeat = findDiamond3Seat(state.hands);
    state.leadSeat = startSeat;
    state.currentPlayerSeat = startSeat;
    state.mustIncludeDiamond3 = true;
    state.phase = "playing";
    events.push({type: "roundStarted", round: state.round, currentPlayerSeat: startSeat});
}

export function createGame(params: {players: PlayerInit[]; seed: string; deck?: Card[]}): GameState {
    if (params.players.length !== 4) {
        throw new Error("Big Two requires 4 players");
    }
    const players = params.players.map((player, seat) => ({
        id: player.id,
        name: player.name,
        seat: seat as Seat,
        type: player.type,
        connectionStatus: player.type === "bot" ? ("bot" as const) : ("connected" as const),
        score: 0,
    }));
    const state: GameState = {
        round: 0,
        phase: "playing",
        currentPlayerSeat: 0,
        leadSeat: 0,
        lastPlay: null,
        consecutivePasses: 0,
        mustIncludeDiamond3: true,
        hands: [[], [], [], []],
        players,
        playLog: [],
        winnerSeat: null,
        penalties: [0, 0, 0, 0],
        revision: 1,
        seed: params.seed,
        processedCommandIds: [],
    };
    if (params.deck) {
        state.round = 1;
        state.hands = dealHands(params.deck);
        const startSeat = findDiamond3Seat(state.hands);
        state.leadSeat = startSeat;
        state.currentPlayerSeat = startSeat;
        return state;
    }
    const events: DomainEvent[] = [];
    beginRound(state, params.seed, events);
    return state;
}

export function createGameFromHands(params: {players: PlayerInit[]; hands: Card[][]}): GameState {
    const deck = params.hands.flat();
    return createGame({players: params.players, seed: "hands", deck});
}

function playerSeat(state: GameState, playerId: string): Seat | null {
    const player = state.players.find(item => item.id === playerId);
    return player ? player.seat : null;
}

function endTrickIfNeeded(state: GameState, events: DomainEvent[]): void {
    if (state.consecutivePasses < 3 || state.lastPlay === null) {
        return;
    }
    state.lastPlay = null;
    state.consecutivePasses = 0;
    state.currentPlayerSeat = state.leadSeat;
    events.push({type: "trickEnded", leadSeat: state.leadSeat});
}

export function applyAction(state: GameState, action: GameAction): ApplyResult {
    if (state.processedCommandIds.includes(action.commandId)) {
        return fail("duplicateCommand", "Command already processed");
    }
    if (action.revision !== state.revision) {
        return fail("staleRevision", "Stale revision");
    }
    const seat = playerSeat(state, action.playerId);
    if (seat === null) {
        return fail("unknownPlayer", "Unknown player");
    }

    const next = cloneState(state);
    const events: DomainEvent[] = [];

    if (action.type === "startRound") {
        if (next.phase !== "roundEnded") {
            return fail("invalidPhase", "Round is still in progress");
        }
        beginRound(next, action.seed, events);
        rememberCommand(next, action.commandId);
        next.revision += 1;
        return {ok: true, state: next, events};
    }

    if (next.phase !== "playing") {
        return fail("invalidPhase", "Round is not in progress");
    }
    if (seat !== next.currentPlayerSeat) {
        return fail("notYourTurn", "Not your turn");
    }

    if (action.type === "pass") {
        const legal = listLegalPlays(next.hands[seat], playContextFor(next, seat));
        if (next.lastPlay === null && legal.length > 0) {
            return fail("mustPlay", "Leader must play a combination");
        }
        next.playLog.push({seat, play: "pass"});
        events.push({type: "passed", seat});
        if (next.lastPlay === null) {
            next.currentPlayerSeat = nextSeat(seat);
            next.leadSeat = next.currentPlayerSeat;
        } else {
            next.consecutivePasses += 1;
            next.currentPlayerSeat = nextSeat(seat);
            endTrickIfNeeded(next, events);
        }
        rememberCommand(next, action.commandId);
        next.revision += 1;
        return {ok: true, state: next, events};
    }

    const combination = selectedPlay(next.hands[seat], action.cardIds);
    if (!combination) {
        return fail("invalidCards", "Cards do not form a legal combination");
    }
    const ctx = playContextFor(next, seat);
    if (ctx.mustIncludeDiamond3 && !combination.cards.some(card => card.id === DIAMOND_3_ID)) {
        return fail("mustIncludeDiamond3", "First play must include ♦3");
    }
    if (!isLegalPlay(combination, ctx)) {
        return fail("illegalPlay", "Play does not beat the last combination");
    }

    const playedIds = new Set(combination.cards.map(card => card.id));
    next.hands[seat] = next.hands[seat].filter(card => !playedIds.has(card.id));
    next.lastPlay = combination;
    next.consecutivePasses = 0;
    next.leadSeat = seat;
    next.mustIncludeDiamond3 = false;
    next.playLog.push({seat, play: combination});
    events.push({type: "played", seat, combination});

    if (next.hands[seat].length === 0) {
        finishRound(next, seat, events);
    } else {
        next.currentPlayerSeat = nextSeat(seat);
    }

    rememberCommand(next, action.commandId);
    next.revision += 1;
    return {ok: true, state: next, events};
}

export function removeCards(hand: Card[], cardIds: string[]): Card[] | null {
    return cardsFromIds(hand, cardIds);
}
