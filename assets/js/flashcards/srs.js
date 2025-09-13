export const SRS_DEFAULTS = {
  EASE_FACTOR: 2.5,
  INTERVAL_MODIFIERS: {
    AGAIN: 0, HARD: 0.8, GOOD: 1.0, EASY: 1.3
  },
  LEARNING_STEPS: {
    AGAIN: 1, GOOD: 10, EASY: 4 * 24 * 60
  }
};

export function initializeCardSrs(card) {
  card.dueDate = new Date().toISOString();
  card.interval = 0; // in days
  card.easeFactor = SRS_DEFAULTS.EASE_FACTOR;
  card.isLearning = true;
}

export function formatInterval(minutes) {
    if (minutes < 60) return `<${Math.ceil(minutes)}m`;
    if (minutes < 24 * 60) return `~${Math.round(minutes / 60)}h`;
    const days = minutes / (24 * 60);
    if (days < 30) return `~${Math.round(days)}d`;
    if (days < 365) return `~${Math.round(days / 30)}mo`;
    return `~${Math.round(days / 365)}y`;
}

export function calculateSrsIntervals(card) {
    if (card.isLearning) {
        return {
            1: SRS_DEFAULTS.LEARNING_STEPS.AGAIN,
            2: Math.round(SRS_DEFAULTS.LEARNING_STEPS.GOOD / 2),
            3: SRS_DEFAULTS.LEARNING_STEPS.GOOD,
            4: SRS_DEFAULTS.LEARNING_STEPS.EASY,
        };
    }
    const lastInterval = card.interval * 24 * 60;
    return {
        1: SRS_DEFAULTS.LEARNING_STEPS.AGAIN,
        2: lastInterval * SRS_DEFAULTS.INTERVAL_MODIFIERS.HARD,
        3: lastInterval * card.easeFactor,
        4: lastInterval * card.easeFactor * SRS_DEFAULTS.INTERVAL_MODIFIERS.EASY,
    };
}

export function updateCardSrs(card, rating) {
    let newInterval;

    if (card.isLearning) {
        if (rating === 1) { // Again
            newInterval = SRS_DEFAULTS.LEARNING_STEPS.AGAIN / (24 * 60);
        } else if (rating === 3) { // Good
            card.isLearning = false;
            newInterval = 1;
        } else { // Hard or Easy
            card.isLearning = false;
            newInterval = (rating === 4 ? SRS_DEFAULTS.LEARNING_STEPS.EASY : SRS_DEFAULTS.LEARNING_STEPS.GOOD) / (24 * 60);
        }
    } else { // Card is graduating or being reviewed
        if (rating === 1) { // Again
            card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
            card.isLearning = true; // Re-learning
            newInterval = SRS_DEFAULTS.LEARNING_STEPS.AGAIN / (24 * 60);
        } else {
            if (rating === 2) card.easeFactor = Math.max(1.3, card.easeFactor - 0.15); // Hard
            if (rating === 4) card.easeFactor += 0.15; // Easy

            newInterval = card.interval === 0 ? 1 : card.interval * card.easeFactor * (rating === 2 ? 0.8 : 1);
        }
    }

    const now = new Date();
    const newDueDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    // Update the card object directly
    card.interval = newInterval;
    card.dueDate = newDueDate.toISOString();
    card.easeFactor = card.easeFactor;
    card.isLearning = card.isLearning;
}