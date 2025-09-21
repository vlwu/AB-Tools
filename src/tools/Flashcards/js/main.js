import { state, saveState, loadState, getDeck, getCard } from './state.js';
import * as ui from './ui.js';
import { initializeCardSrs, updateCardSrs } from './srs.js';
import { parseImportFile, exportDeck } from './import-export.js';

document.addEventListener("DOMContentLoaded", () => {
  // --- INITIALIZATION ---
  loadState();
  ui.initUI();
  ui.renderDeckList(state.decks);
  attachEventListeners();
});

// --- EVENT HANDLING ---
function attachEventListeners() {
    // Deck List View
    document.getElementById('create-deck-btn').addEventListener('click', () => ui.showDeckModal());
    document.getElementById('import-deck-btn').addEventListener('click', ui.showImportModal);
    document.getElementById('deck-list-container').addEventListener('click', handleDeckListClick);

    // Deck Detail View
    document.getElementById('back-to-decks-btn').addEventListener('click', handleBackToDecks);
    document.getElementById('add-card-btn').addEventListener('click', () => ui.showCardModal());
    document.getElementById('export-deck-btn').addEventListener('click', handleShowExportModal);
    document.getElementById('study-deck-btn').addEventListener('click', () => startStudySession(state.currentDeckId));
    document.getElementById('quick-study-btn').addEventListener('click', () => startStudySession(state.currentDeckId, true));
    document.getElementById('card-list-container').addEventListener('click', handleCardListClick);

    // Modals
    document.querySelectorAll('.modal-cancel-btn, .modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-cancel-btn') || e.target.classList.contains('modal-overlay')) {
                ui.hideModals();
            }
        });
    });
    document.getElementById('deck-form').addEventListener('submit', handleDeckForm);
    document.getElementById('card-form').addEventListener('submit', handleCardForm);
    document.getElementById('start-import-btn').addEventListener('click', handleImport);

    // Study View
    document.getElementById('exit-study-btn').addEventListener('click', handleExitStudy);
    document.getElementById('show-answer-btn').addEventListener('click', ui.showAnswer);
    document.querySelector('.study-answer-controls').addEventListener('click', handleSrsRatingClick);
    document.getElementById('shuffle-deck-btn').addEventListener('click', shuffleStudyDeck);
}

// --- EVENT HANDLER LOGIC ---

function handleDeckListClick(e) {
    const deckCard = e.target.closest('.deck-card');
    if (!deckCard) return;
    const deckId = deckCard.dataset.deckId;
    const deck = getDeck(deckId);

    if (e.target.matches('.edit-deck-btn')) {
        ui.showDeckModal(deck);
    } else if (e.target.matches('.delete-deck-btn')) {
        ui.showConfirmDeleteModal(deck, () => {
            state.decks = state.decks.filter(d => d.id !== deckId);
            saveState();
            ui.renderDeckList(state.decks);
        });
    } else {
        state.currentDeckId = deckId;
        ui.navigate('deck');
        ui.renderDeckView(deck);
    }
}

function handleBackToDecks() {
    ui.navigate('deckList');
    ui.renderDeckList(state.decks); // Refresh due counts
}

function handleCardListClick(e) {
    if (e.target.matches('.edit-card-btn')) {
        const card = getCard(state.currentDeckId, e.target.dataset.cardId);
        ui.showCardModal(card);
    }
    if (e.target.matches('.delete-card-btn')) {
        const deck = getDeck(state.currentDeckId);
        deck.cards = deck.cards.filter(c => c.id !== e.target.dataset.cardId);
        saveState();
        ui.renderDeckView(deck);
    }
}

function handleDeckForm(e) {
    e.preventDefault();
    const id = document.getElementById('deck-id').value;
    const name = document.getElementById('deck-name').value.trim();
    const description = document.getElementById('deck-description').value.trim();
    if (!name) return;

    if (id) { // Editing existing deck
        const deck = getDeck(id);
        deck.name = name;
        deck.description = description;
    } else { // Creating new deck
        state.decks.push({ id: `deck-${Date.now()}`, name, description, cards: [] });
    }
    saveState();
    ui.renderDeckList(state.decks);
    ui.hideModals();
}

function handleCardForm(e) {
    e.preventDefault();
    const id = document.getElementById('card-id').value;
    
    // Get content from TinyMCE editors
    const frontHTML = tinymce.get('card-front-input').getContent();
    const backHTML = tinymce.get('card-back-input').getContent();
    
    // Sanitize HTML content before saving
    const front = DOMPurify.sanitize(frontHTML);
    const back = DOMPurify.sanitize(backHTML);

    if (!front || !back) {
        alert("Both front and back of the card must have content.");
        return;
    }

    const deck = getDeck(state.currentDeckId);
    if (id) { // Editing existing card
        const card = getCard(state.currentDeckId, id);
        card.front = front;
        card.back = back;
    } else { // Creating new card
        const newCard = { id: `card-${Date.now()}`, front, back };
        initializeCardSrs(newCard);
        deck.cards.push(newCard);
    }
    saveState();
    ui.renderDeckView(deck);
    ui.hideModals();
}

async function handleImport() {
    const fileInput = document.getElementById('import-file-input');
    const importBtn = document.getElementById('start-import-btn');
    const statusEl = document.getElementById('import-status');
    const file = fileInput.files[0];
    if (!file) return;

    importBtn.disabled = true;
    importBtn.textContent = 'Processing...';
    statusEl.textContent = 'Parsing file, please wait...';

    try {
        const newDeck = await parseImportFile(file);
        state.decks.push(newDeck);
        saveState();
        ui.renderDeckList(state.decks);
        statusEl.style.color = '#5cb85c';
        statusEl.textContent = `Success! Imported ${newDeck.cards.length} cards.`;
        setTimeout(ui.hideModals, 1500);
    } catch (error) {
        console.error('Import failed:', error);
        statusEl.style.color = '#dc3545';
        statusEl.textContent = `Error: ${error.message}`;
        importBtn.disabled = false;
        importBtn.textContent = 'Import File';
    }
}

function handleShowExportModal() {
    const deck = getDeck(state.currentDeckId);
    if (!deck) return;

    // Clone and replace buttons to ensure listeners are fresh
    const pdfBtn = document.getElementById('export-pdf-btn');
    const newPdfBtn = pdfBtn.cloneNode(true);
    pdfBtn.parentNode.replaceChild(newPdfBtn, pdfBtn);
    newPdfBtn.addEventListener('click', () => {
        exportDeck('pdf', deck);
        ui.hideModals();
    });

    const txtBtn = document.getElementById('export-txt-btn');
    const newTxtBtn = txtBtn.cloneNode(true);
    txtBtn.parentNode.replaceChild(newTxtBtn, txtBtn);
    newTxtBtn.addEventListener('click', () => {
        exportDeck('txt', deck);
        ui.hideModals();
    });

    ui.showExportModal();
}

// --- STUDY SESSION LOGIC ---

function startStudySession(deckId, studyAllCards = false) {
    const deck = getDeck(deckId);
    if (!deck) return;

    let cardsToStudy;
    if (studyAllCards) {
        cardsToStudy = [...deck.cards]; // Create a copy to shuffle
    } else {
        const now = new Date();
        cardsToStudy = deck.cards.filter(c => new Date(c.dueDate) <= now);
    }

    state.studySession = { isActive: true, deck: cardsToStudy, currentIndex: 0 };
    ui.navigate('study');

    if (cardsToStudy.length === 0) {
        ui.showStudyComplete();
    } else {
        ui.setupStudyView(deck.name);
        ui.displayStudyCard(cardsToStudy[0], 0, cardsToStudy.length);
    }
}

function handleExitStudy() {
    const deck = getDeck(state.currentDeckId);
    state.studySession.isActive = false;
    ui.navigate('deck');
    ui.renderDeckView(deck); // Re-render deck view
    ui.renderDeckList(state.decks); // Refresh due counts
}

function handleSrsRatingClick(e) {
    const button = e.target.closest('.srs-btn');
    if (button) {
        const rating = parseInt(button.dataset.rating, 10);
        const card = state.studySession.deck[state.studySession.currentIndex];
        
        // Update the original card in the main state
        const originalCard = getCard(state.currentDeckId, card.id);
        if (originalCard) {
            updateCardSrs(originalCard, rating);
            saveState();
        }

        showNextStudyCard();
    }
}

function showNextStudyCard() {
    state.studySession.currentIndex++;
    const { deck, currentIndex } = state.studySession;
    if (currentIndex >= deck.length) {
        // Re-run the session logic to see if any cards are due for re-learning immediately
        startStudySession(state.currentDeckId);
    } else {
        ui.displayStudyCard(deck[currentIndex], currentIndex, deck.length);
    }
}

function shuffleStudyDeck() {
    let deck = state.studySession.deck;
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    state.studySession.currentIndex = 0;
    if (deck.length > 0) {
        ui.displayStudyCard(deck[0], 0, deck.length);
    } else {
        ui.showStudyComplete();
    }
}