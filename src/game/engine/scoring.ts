export function penaltyForCount(remaining: number): number {
    if (remaining <= 0) {
        return 0;
    }
    if (remaining <= 9) {
        return remaining;
    }
    if (remaining <= 12) {
        return remaining * 2;
    }
    return remaining * 3;
}

export function roundPenalties(handCounts: number[], winnerSeat: number): number[] {
    return handCounts.map((count, seat) => (seat === winnerSeat ? 0 : penaltyForCount(count)));
}
