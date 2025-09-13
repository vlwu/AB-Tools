import { initializeCardSrs } from './srs.js';

// Starter decks are part of the initial state
const starterDecks = [
  {
    id: "starter-chem30",
    name: "Starter: Chem 30 Organic Reactions",
    description: "Common organic chemistry reactions from the Alberta curriculum.",
    cards: [
      { front: "Alkane + Halogen (e.g., Cl₂)", back: "Halogenated Alkane (Substitution Reaction)" },
      { front: "Alkene + Water (H₂O)", back: "Alcohol (Addition/Hydration Reaction)" },
      { front: "Alkyne + Hydrogen (H₂) -> Alkene", back: "Catalytic Hydrogenation (1st step)" },
      { front: "Primary Alcohol Oxidation", back: "Aldehyde, then Carboxylic Acid" },
      { front: "Carboxylic Acid + Alcohol", back: "Ester + Water (Esterification/Condensation)" },
      { front: "Benzene + Halogen (e.g., Br₂)", back: "Halogenated Benzene (Substitution)" }
    ]
  },
  // ... (add other starter decks if you have them)
];

// The single source of truth for the application
export let state = {
  decks: [],
  currentDeckId: null,
  studySession: {
    isActive: false,
    deck: [],
    currentIndex: 0
  }
};

export function saveState() {
  localStorage.setItem("flashcardDecks", JSON.stringify(state.decks));
}

export function loadState() {
  const savedDecks = localStorage.getItem("flashcardDecks");
  if (savedDecks) {
    state.decks = JSON.parse(savedDecks);
  } else {
    // Initialize starter decks with unique IDs and SRS data
    state.decks = starterDecks.map(deck => ({
      ...deck,
      cards: deck.cards.map((card, i) => ({ ...card, id: `starter-${deck.id}-card-${i}` }))
    }));
  }

  // Ensure all cards have SRS data
  state.decks.forEach(deck => {
    deck.cards.forEach(card => {
      if (card.dueDate === undefined) {
        initializeCardSrs(card);
      }
    });
  });
  saveState();
}

export function getDeck(deckId) {
    return state.decks.find(d => d.id === deckId);
}

export function getCard(deckId, cardId) {
    const deck = getDeck(deckId);
    return deck ? deck.cards.find(c => c.id === cardId) : null;
}