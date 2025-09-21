// assets/js/flashcards/ui.js
import { formatInterval, calculateSrsIntervals } from './srs.js';

// --- DOM Element Cache ---
const elements = {
  views: {
    deckList: document.getElementById("deck-list-view"),
    deck: document.getElementById("deck-view"),
    study: document.getElementById("study-view"),
  },
  deckListContainer: document.getElementById("deck-list-container"),
  cardListContainer: document.getElementById("card-list-container"),
  modals: {
    deck: document.getElementById("deck-modal"),
    card: document.getElementById("card-modal"),
    import: document.getElementById("import-modal"),
    confirmDelete: document.getElementById("confirm-delete-modal"),
    export: document.getElementById("export-modal"),
  },
  studyControls: document.querySelector('.study-controls'),
  studyAnswerControls: document.querySelector('.study-answer-controls'),
  studyArea: document.querySelector('.study-area'),
  studyCompleteMessage: document.getElementById('study-complete-message'),
  flashcard: document.getElementById('flashcard'),
};

// --- View Navigation ---
export function navigate(viewName) {
  Object.values(elements.views).forEach(view => view.style.display = 'none');
  elements.views[viewName].style.display = 'block';
}

// --- Rendering Functions ---
export function renderDeckList(decks) {
  const container = elements.deckListContainer;
  container.innerHTML = decks.length ? decks.map(deck => {
    const now = new Date();
    const dueCount = deck.cards.filter(c => new Date(c.dueDate) <= now).length;
    return `
      <div class="deck-card" data-deck-id="${deck.id}">
        <h3>${deck.name}</h3>
        <p>${deck.cards.length} cards</p>
        <div class="deck-card-stats">
          ${dueCount > 0 ? `${dueCount} cards due` : 'All caught up!'}
        </div>
        <div class="deck-card-actions">
          <button class="edit-deck-btn">Edit</button>
          <button class="delete-deck-btn danger-btn">Delete</button>
        </div>
      </div>`;
  }).join('') : '<p class="empty-message">No decks yet. Create one to get started!</p>';
}

export function renderDeckView(deck) {
  document.getElementById('deck-view-title').textContent = deck.name;
  document.getElementById('deck-view-description').textContent = deck.description || '';

  const container = elements.cardListContainer;
  container.innerHTML = deck.cards.length ? deck.cards.map(card => `
    <div class="card-list-item">
      <div class="card-text">${DOMPurify.sanitize(card.front)}</div>
      <div class="card-text">${DOMPurify.sanitize(card.back)}</div>
      <div class="card-list-actions">
        <button class="edit-card-btn" data-card-id="${card.id}">Edit</button>
        <button class="delete-card-btn danger-btn" data-card-id="${card.id}">Delete</button>
      </div>
    </div>`).join('') : '<p class="empty-message">This deck has no cards. Add one to get started!</p>';
}

// --- Study View UI ---
export function displayStudyCard(card, currentIndex, totalCards) {
    elements.flashcard.classList.remove('is-flipped');
    setTimeout(() => {
        document.getElementById('card-front').innerHTML = DOMPurify.sanitize(card.front);
        document.getElementById('card-back').innerHTML = DOMPurify.sanitize(card.back);
        document.getElementById('card-counter').textContent = `${currentIndex + 1} / ${totalCards}`;
        updateSrsButtonLabels(card);
        elements.studyControls.style.display = 'flex';
        elements.studyAnswerControls.style.display = 'none';
    }, 150);
}

export function showStudyComplete() {
    elements.studyArea.style.display = 'none';
    elements.studyControls.style.display = 'none';
    elements.studyAnswerControls.style.display = 'none';
    elements.studyCompleteMessage.style.display = 'block';
    document.getElementById('study-deck-title').textContent = `Study Complete!`;
}

export function setupStudyView(deckName) {
    document.getElementById('study-deck-title').textContent = `Studying: ${deckName}`;
    elements.studyArea.style.display = 'block';
    elements.studyCompleteMessage.style.display = 'none';
}

export function showAnswer() {
    elements.flashcard.classList.add('is-flipped');
    elements.studyControls.style.display = 'none';
    elements.studyAnswerControls.style.display = 'flex';
}

function updateSrsButtonLabels(card) {
    const intervals = calculateSrsIntervals(card);
    document.querySelector('.srs-btn.again-btn .srs-interval').textContent = formatInterval(intervals[1]);
    document.querySelector('.srs-btn.hard-btn .srs-interval').textContent = formatInterval(intervals[2]);
    document.querySelector('.srs-btn.good-btn .srs-interval').textContent = formatInterval(intervals[3]);
    document.querySelector('.srs-btn.easy-btn .srs-interval').textContent = formatInterval(intervals[4]);
}

// --- Modal Management ---
export function showDeckModal(deck = null) {
  const form = document.getElementById('deck-form');
  form.reset();
  if (deck) {
    document.getElementById('deck-modal-title').textContent = "Edit Deck";
    document.getElementById('deck-id').value = deck.id;
    document.getElementById('deck-name').value = deck.name;
    document.getElementById('deck-description').value = deck.description;
  } else {
    document.getElementById('deck-modal-title').textContent = "Create New Deck";
  }
  elements.modals.deck.style.display = 'flex';
}

const tinyMceConfig = {
    height: 200,
    menubar: false,
    plugins: 'lists link image emoticons',
    toolbar: 'bold italic underline | bullist numlist | link | image | emoticons',
    skin: 'oxide-dark',
    content_css: 'dark',
    statusbar: false,
    entity_encoding: 'raw' // Keep HTML entities as they are
};

function initEditors(card = null) {
    tinymce.remove(); // Remove any existing instances
    tinymce.init({
        selector: '#card-front-input',
        ...tinyMceConfig,
        setup: (editor) => {
            editor.on('init', () => editor.setContent(card ? card.front : ''));
        }
    });
    tinymce.init({
        selector: '#card-back-input',
        ...tinyMceConfig,
        setup: (editor) => {
            editor.on('init', () => editor.setContent(card ? card.back : ''));
        }
    });
}

export function showCardModal(card = null) {
  const form = document.getElementById('card-form');
  form.reset();
  if (card) {
    document.getElementById('card-modal-title').textContent = "Edit Card";
    document.getElementById('card-id').value = card.id;
  } else {
    document.getElementById('card-modal-title').textContent = "Add New Card";
  }
  initEditors(card);
  elements.modals.card.style.display = 'flex';
}

export function showConfirmDeleteModal(deck, onConfirm) {
    const messageEl = document.getElementById('confirm-delete-message');
    messageEl.innerHTML = `Are you sure you want to permanently delete the "<strong>${deck.name}</strong>" deck? This cannot be undone.`;

    const confirmBtn = document.getElementById('confirm-delete-btn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        hideModals();
    });
    elements.modals.confirmDelete.style.display = 'flex';
}

export function showImportModal() {
    const modal = elements.modals.import;
    const fileInput = document.getElementById('import-file-input');
    const importBtn = document.getElementById('start-import-btn');
    const statusEl = document.getElementById('import-status');
    const descriptionEl = modal.querySelector('p');

    // Update the UI to only reflect TXT import
    descriptionEl.textContent = 'Import from a plain text file (.txt). Each line should be "Front [Tab] Back".';
    fileInput.accept = ".txt";

    fileInput.value = '';
    importBtn.disabled = true;
    importBtn.textContent = 'Import File';
    statusEl.textContent = '';
    statusEl.style.color = '';
    modal.style.display = 'flex';
}

export function showExportModal() {
    elements.modals.export.style.display = 'flex';
}

export function hideModals() {
  if (tinymce) tinymce.remove(); // Clean up editors when any modal is hidden
  Object.values(elements.modals).forEach(modal => modal.style.display = 'none');
}

// --- Initializer for UI related checks ---
export function initUI() {
    // The import button is always available, so we just ensure it's in the correct state.
    const importBtn = document.getElementById('import-deck-btn');
    importBtn.disabled = false;
    importBtn.style.cursor = 'pointer';
    importBtn.title = 'Import a deck from a file';
}