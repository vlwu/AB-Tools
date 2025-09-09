document.addEventListener("DOMContentLoaded", () => {

  // --- SCRIPT INITIALIZATION CHECK ---
  const mainView = document.getElementById("deck-list-view");
  if (!mainView) {
    return; // Abort if not on the flashcards page
  }
  
  // --- SRS CONSTANTS ---
  const SRS_DEFAULTS = {
    EASE_FACTOR: 2.5,
    INTERVAL_MODIFIERS: {
      AGAIN: 0,   // Resets interval
      HARD: 0.8,
      GOOD: 1.0,
      EASY: 1.3
    },
    LEARNING_STEPS: { // in minutes
      AGAIN: 1,
      GOOD: 10,
      EASY: 4 * 24 * 60 // 4 days
    }
  };

  // --- PRE-BUILT DECKS DATA ---
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
    {
      id: "starter-math30",
      name: "Starter: Math 30-1 Trig Identities",
      description: "Fundamental trigonometric identities for Math 30-1.",
      cards: [
        { front: "tan(θ)", back: "sin(θ) / cos(θ)" },
        { front: "sin²(θ) + cos²(θ)", back: "1" },
        { front: "1 + tan²(θ)", back: "sec²(θ)" },
        { front: "1 + cot²(θ)", back: "csc²(θ)" },
        { front: "sin(2θ)", back: "2sin(θ)cos(θ)" },
        { front: "cos(2θ)", back: "cos²(θ) - sin²(θ) \nOR 2cos²(θ) - 1 \nOR 1 - 2sin²(θ)" }
      ]
    }
  ];

  // --- DOM ELEMENTS ---
  const views = {
    deckList: mainView,
    deck: document.getElementById("deck-view"),
    study: document.getElementById("study-view"),
  };
  const deckListContainer = document.getElementById("deck-list-container");
  const cardListContainer = document.getElementById("card-list-container");
  const deckModal = document.getElementById("deck-modal");
  const cardModal = document.getElementById("card-modal");
  const importModal = document.getElementById("import-modal");
  const confirmDeleteModal = document.getElementById("confirm-delete-modal");
  const studyControls = document.querySelector('.study-controls');
  const studyAnswerControls = document.querySelector('.study-answer-controls');
  const studyArea = document.querySelector('.study-area');
  const studyCompleteMessage = document.getElementById('study-complete-message');


  // --- STATE ---
  let state = {
    decks: [],
    currentDeckId: null,
    studySession: {
      isActive: false,
      deck: [],
      currentIndex: 0
    }
  };

  // --- INITIALIZATION ---
  function init() {
    const importBtn = document.getElementById('import-deck-btn');
    const ankiScript = document.querySelector('script[src*="anki-apkg-parser"]');

    // Disable the import button by default. It will only be enabled if the script loads.
    importBtn.disabled = true;
    importBtn.style.cursor = 'not-allowed';
    importBtn.title = 'APKG import is unavailable. Please check your network or ad-blocker.';

    if (ankiScript) {
      // Success case: The external script has loaded.
      ankiScript.onload = () => {
        importBtn.disabled = false;
        importBtn.style.cursor = 'pointer';
        importBtn.title = 'Import a deck from a file';
        console.log("AnkiApkgParser library successfully loaded.");
      };
      
      // Failure case: The external script failed to load.
      ankiScript.onerror = () => {
        console.error("AnkiApkgParser library failed to load. The import button will remain disabled.");
      };
    } else {
        console.error("Could not find the Anki parser script tag. The import button will remain disabled.");
    }
    
    loadState();
    renderDeckList();
    attachEventListeners();
  }

  // --- STATE MANAGEMENT ---
  function saveState() {
    localStorage.setItem("flashcardDecks", JSON.stringify(state.decks));
  }

  function loadState() {
    const savedDecks = localStorage.getItem("flashcardDecks");
    if (savedDecks) {
      state.decks = JSON.parse(savedDecks);
    } else {
      state.decks = starterDecks.map(deck => ({...deck, cards: deck.cards.map((card, i) => ({...card, id: `starter-card-${i}`}))}));
    }
    // Backward compatibility: Add SRS properties to any cards that don't have them
    state.decks.forEach(deck => {
        deck.cards.forEach(card => {
            if (card.dueDate === undefined) {
                initializeCardSrs(card);
            }
        });
    });
    saveState();
  }
  
  // --- VIEW MANAGEMENT ---
  function navigate(viewName, deckId = null) {
      Object.values(views).forEach(view => view.style.display = 'none');
      views[viewName].style.display = 'block';

      if(viewName === 'deck' && deckId) {
          state.currentDeckId = deckId;
          renderDeckView();
      } else if (viewName === 'study' && deckId) {
          startStudySession(deckId);
      }
  }

  // --- RENDERING ---
  function renderDeckList() {
    deckListContainer.innerHTML = state.decks.length ? state.decks.map(deck => {
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
      </div>
    `}).join('') : '<p class="empty-message">No decks yet. Create one to get started!</p>';
  }
  
  function renderDeckView() {
      const deck = state.decks.find(d => d.id === state.currentDeckId);
      if (!deck) return navigate('deckList');
      
      document.getElementById('deck-view-title').textContent = deck.name;
      document.getElementById('deck-view-description').textContent = deck.description || '';
      
      cardListContainer.innerHTML = deck.cards.length ? deck.cards.map(card => `
        <div class="card-list-item">
          <div class="card-text">${card.front}</div>
          <div class="card-text">${card.back}</div>
          <div class="card-list-actions">
            <button class="edit-card-btn" data-card-id="${card.id}">Edit</button>
            <button class="delete-card-btn danger-btn" data-card-id="${card.id}">Delete</button>
          </div>
        </div>
      `).join('') : '<p class="empty-message">This deck has no cards. Add one to get started!</p>';
  }

  // --- EVENT HANDLERS & LOGIC ---
  function attachEventListeners() {
    document.getElementById('create-deck-btn').addEventListener('click', () => showDeckModal());
    document.getElementById('import-deck-btn').addEventListener('click', showImportModal);
    deckListContainer.addEventListener('click', e => {
      const deckCard = e.target.closest('.deck-card');
      if (!deckCard) return;
      const deckId = deckCard.dataset.deckId;
      if (e.target.matches('.edit-deck-btn')) showDeckModal(deckId);
      else if (e.target.matches('.delete-deck-btn')) showConfirmDeleteModal(deckId);
      else navigate('deck', deckId);
    });

    document.getElementById('back-to-decks-btn').addEventListener('click', () => {
        navigate('deckList');
        renderDeckList(); // Refresh due counts
    });
    document.getElementById('add-card-btn').addEventListener('click', () => showCardModal());
    document.getElementById('study-deck-btn').addEventListener('click', () => navigate('study', state.currentDeckId));
    cardListContainer.addEventListener('click', e => {
        if(e.target.matches('.edit-card-btn')) showCardModal(e.target.dataset.cardId);
        if(e.target.matches('.delete-card-btn')) deleteCard(e.target.dataset.cardId);
    });

    document.querySelectorAll('.modal-cancel-btn').forEach(btn => btn.addEventListener('click', hideModals));
    document.getElementById('cancel-delete-btn').addEventListener('click', hideModals);
    deckModal.addEventListener('click', e => { if (e.target === deckModal) hideModals(); });
    cardModal.addEventListener('click', e => { if (e.target === cardModal) hideModals(); });
    importModal.addEventListener('click', e => { if(e.target === importModal) hideModals(); });
    confirmDeleteModal.addEventListener('click', e => { if(e.target === confirmDeleteModal) hideModals(); });
    
    document.getElementById('deck-form').addEventListener('submit', handleDeckForm);
    document.getElementById('card-form').addEventListener('submit', handleCardForm);
    
    // --- Study View Listeners ---
    document.getElementById('exit-study-btn').addEventListener('click', () => {
        navigate('deck', state.currentDeckId)
        renderDeckList(); // Refresh due counts
    });
    document.getElementById('show-answer-btn').addEventListener('click', showAnswer);
    studyAnswerControls.addEventListener('click', (e) => {
        const button = e.target.closest('.srs-btn');
        if (button) {
            const rating = parseInt(button.dataset.rating, 10);
            updateCardSrs(rating);
            showNextCard();
        }
    });
    document.getElementById('shuffle-deck-btn').addEventListener('click', shuffleStudyDeck);

    document.getElementById('import-file-input').addEventListener('change', e => {
        document.getElementById('start-import-btn').disabled = !e.target.files.length;
    });
    document.getElementById('start-import-btn').addEventListener('click', handleImport);
  }

  // --- DECK & CARD CRUD ---
  function showDeckModal(deckId = null) {
    const form = document.getElementById('deck-form');
    form.reset();
    if(deckId) {
      const deck = state.decks.find(d => d.id === deckId);
      document.getElementById('deck-modal-title').textContent = "Edit Deck";
      document.getElementById('deck-id').value = deck.id;
      document.getElementById('deck-name').value = deck.name;
      document.getElementById('deck-description').value = deck.description;
    } else {
      document.getElementById('deck-modal-title').textContent = "Create New Deck";
    }
    deckModal.style.display = 'flex';
  }
  
  function handleDeckForm(e) {
    e.preventDefault();
    const id = document.getElementById('deck-id').value;
    const name = document.getElementById('deck-name').value.trim();
    const description = document.getElementById('deck-description').value.trim();
    if (!name) return;
    
    if (id) {
      const deck = state.decks.find(d => d.id === id);
      deck.name = name;
      deck.description = description;
    } else {
      state.decks.push({ id: `deck-${Date.now()}`, name, description, cards: [] });
    }
    saveState();
    renderDeckList();
    hideModals();
  }
  
  function showConfirmDeleteModal(deckId) {
    const deck = state.decks.find(d => d.id === deckId);
    if (!deck) return;

    const messageEl = document.getElementById('confirm-delete-message');
    messageEl.innerHTML = `Are you sure you want to permanently delete the "<strong>${deck.name}</strong>" deck? This cannot be undone.`;

    const confirmBtn = document.getElementById('confirm-delete-btn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', () => {
        deleteDeck(deckId);
        hideModals();
    });

    confirmDeleteModal.style.display = 'flex';
  }
  
  function deleteDeck(deckId) {
    state.decks = state.decks.filter(d => d.id !== deckId);
    saveState();
    renderDeckList();
  }

  function showCardModal(cardId = null) {
    const form = document.getElementById('card-form');
    form.reset();
    if(cardId) {
      const deck = state.decks.find(d => d.id === state.currentDeckId);
      const card = deck.cards.find(c => c.id === cardId);
      document.getElementById('card-modal-title').textContent = "Edit Card";
      document.getElementById('card-id').value = card.id;
      document.getElementById('card-front-input').value = card.front;
      document.getElementById('card-back-input').value = card.back;
    } else {
      document.getElementById('card-modal-title').textContent = "Add New Card";
    }
    cardModal.style.display = 'flex';
  }

  function handleCardForm(e) {
    e.preventDefault();
    const id = document.getElementById('card-id').value;
    const front = document.getElementById('card-front-input').value.trim();
    const back = document.getElementById('card-back-input').value.trim();
    if (!front || !back) return;
    
    const deck = state.decks.find(d => d.id === state.currentDeckId);
    if (id) {
        const card = deck.cards.find(c => c.id === id);
        card.front = front;
        card.back = back;
    } else {
        const newCard = { id: `card-${Date.now()}`, front, back };
        initializeCardSrs(newCard);
        deck.cards.push(newCard);
    }
    saveState();
    renderDeckView();
    hideModals();
  }
  
  function deleteCard(cardId) {
      const deck = state.decks.find(d => d.id === state.currentDeckId);
      deck.cards = deck.cards.filter(c => c.id !== cardId);
      saveState();
      renderDeckView();
  }

  // --- STUDY MODE & SRS LOGIC ---
  function initializeCardSrs(card) {
      card.dueDate = new Date().toISOString();
      card.interval = 0; // in days
      card.easeFactor = SRS_DEFAULTS.EASE_FACTOR;
      card.isLearning = true;
  }

  function startStudySession(deckId) {
      const deck = state.decks.find(d => d.id === deckId);
      if(!deck) return navigate('deck', deckId);

      const now = new Date();
      const dueCards = deck.cards.filter(c => new Date(c.dueDate) <= now);
      
      state.studySession = {
          isActive: true,
          deck: dueCards,
          currentIndex: 0
      };
      
      document.getElementById('study-deck-title').textContent = `Studying: ${deck.name}`;
      
      if (dueCards.length === 0) {
          studyArea.style.display = 'none';
          studyControls.style.display = 'none';
          studyAnswerControls.style.display = 'none';
          studyCompleteMessage.style.display = 'block';
      } else {
          studyArea.style.display = 'block';
          studyCompleteMessage.style.display = 'none';
          displayCurrentCard();
      }
  }
  
  function displayCurrentCard() {
      const { deck, currentIndex } = state.studySession;
      if (currentIndex >= deck.length) {
          // No more cards to study in this session
          startStudySession(state.currentDeckId); // Re-check for any final due cards or show complete
          return;
      }
      const card = deck[currentIndex];
      
      document.getElementById('flashcard').classList.remove('is-flipped');
      setTimeout(() => {
        document.getElementById('card-front').textContent = card.front;
        document.getElementById('card-back').textContent = card.back;
        document.getElementById('card-counter').textContent = `${currentIndex + 1} / ${deck.length}`;
        
        updateSrsButtonLabels(card);

        studyControls.style.display = 'flex';
        studyAnswerControls.style.display = 'none';
      }, 150);
  }
  
  function formatInterval(minutes) {
    if (minutes < 60) return `<${Math.ceil(minutes)}m`;
    if (minutes < 24 * 60) return `~${Math.round(minutes / 60)}h`;
    const days = minutes / (24 * 60);
    if (days < 30) return `~${Math.round(days)}d`;
    if (days < 365) return `~${Math.round(days / 30)}mo`;
    return `~${Math.round(days / 365)}y`;
  }

  function updateSrsButtonLabels(card) {
    let intervals;
    if (card.isLearning) {
        intervals = {
            1: SRS_DEFAULTS.LEARNING_STEPS.AGAIN,
            2: Math.round(SRS_DEFAULTS.LEARNING_STEPS.GOOD / 2),
            3: SRS_DEFAULTS.LEARNING_STEPS.GOOD,
            4: SRS_DEFAULTS.LEARNING_STEPS.EASY,
        };
    } else {
        const lastInterval = card.interval * 24 * 60; // convert days to minutes
        intervals = {
            1: SRS_DEFAULTS.LEARNING_STEPS.AGAIN, // 'Again' always resets
            2: lastInterval * SRS_DEFAULTS.INTERVAL_MODIFIERS.HARD,
            3: lastInterval * card.easeFactor,
            4: lastInterval * card.easeFactor * SRS_DEFAULTS.INTERVAL_MODIFIERS.EASY,
        };
    }

    document.querySelector('.srs-btn.again-btn .srs-interval').textContent = formatInterval(intervals[1]);
    document.querySelector('.srs-btn.hard-btn .srs-interval').textContent = formatInterval(intervals[2]);
    document.querySelector('.srs-btn.good-btn .srs-interval').textContent = formatInterval(intervals[3]);
    document.querySelector('.srs-btn.easy-btn .srs-interval').textContent = formatInterval(intervals[4]);
  }

  function updateCardSrs(rating) {
      const card = state.studySession.deck[state.studySession.currentIndex];
      let newInterval; // in days
      
      if (card.isLearning) {
          if (rating === 1) { // Again
              newInterval = SRS_DEFAULTS.LEARNING_STEPS.AGAIN / (24 * 60);
          } else if (rating === 3) { // Good
              card.isLearning = false;
              newInterval = 1; // Graduate to 1 day
          } else { // Hard or Easy in learning
              card.isLearning = false;
              newInterval = (rating === 4 ? SRS_DEFAULTS.LEARNING_STEPS.EASY : SRS_DEFAULTS.LEARNING_STEPS.GOOD) / (24 * 60);
          }
      } else { // Card is in review phase
          if (rating === 1) { // Again
              card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
              card.isLearning = true; // Lapse, return to learning
              newInterval = SRS_DEFAULTS.LEARNING_STEPS.AGAIN / (24 * 60);
          } else {
              if (rating === 2) card.easeFactor = Math.max(1.3, card.easeFactor - 0.15);
              if (rating === 4) card.easeFactor += 0.15;
              
              newInterval = card.interval === 0 ? 1 : card.interval * card.easeFactor * (rating === 2 ? 0.8 : 1);
          }
      }
      
      const now = new Date();
      const newDueDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);
      
      // Update the card in the main state.decks array
      const deck = state.decks.find(d => d.id === state.currentDeckId);
      const cardInDeck = deck.cards.find(c => c.id === card.id);
      cardInDeck.interval = newInterval;
      cardInDeck.dueDate = newDueDate.toISOString();
      cardInDeck.easeFactor = card.easeFactor;
      cardInDeck.isLearning = card.isLearning;
      
      saveState();
  }

  function showAnswer() {
    document.getElementById('flashcard').classList.add('is-flipped');
    studyControls.style.display = 'none';
    studyAnswerControls.style.display = 'flex';
  }

  function showNextCard() {
      state.studySession.currentIndex++;
      displayCurrentCard();
  }
  
  function shuffleStudyDeck() {
      let deck = state.studySession.deck;
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      state.studySession.currentIndex = 0;
      displayCurrentCard();
  }
  
  // --- ROBUST IMPORT LOGIC ---
  function showImportModal() {
      const fileInput = document.getElementById('import-file-input');
      const importBtn = document.getElementById('start-import-btn');
      const statusEl = document.getElementById('import-status');

      fileInput.value = '';
      importBtn.disabled = true;
      importBtn.textContent = 'Import File';
      statusEl.textContent = '';
      statusEl.style.color = '';

      importModal.style.display = 'flex';
  }

  async function handleImport() {
      const fileInput = document.getElementById('import-file-input');
      const importBtn = document.getElementById('start-import-btn');
      const statusEl = document.getElementById('import-status');
      const file = fileInput.files[0];
      if (!file) return;

      importBtn.disabled = true;
      importBtn.textContent = 'Processing...';
      statusEl.style.color = '#E1E1E1';
      statusEl.textContent = 'Parsing file, please wait...';

      try {
          const fileName = file.name || 'Unnamed File';
          let cards;

          if (fileName.toLowerCase().endsWith('.txt')) {
              cards = await parseTxtFile(file);
          } else if (fileName.toLowerCase().endsWith('.apkg')) {
              cards = await parseApkgFile(file);
          } else {
              throw new Error('Unsupported file type. Please select a .txt or .apkg file.');
          }

          if (!cards || cards.length === 0) {
              throw new Error('No valid cards were found in the file.');
          }

          createDeckFromImport(cards, fileName);
          statusEl.style.color = '#5cb85c';
          statusEl.textContent = `Success! Imported ${cards.length} cards.`;
          
          setTimeout(hideModals, 1500);

      } catch (error) {
          console.error('Import failed:', error);
          statusEl.style.color = '#dc3545';
          statusEl.textContent = `Error: ${error.message}`;
      } finally {
          if (statusEl.style.color === 'rgb(220, 53, 69)') { // #dc3545
             importBtn.disabled = false;
             importBtn.textContent = 'Import File';
          }
      }
  }

  function createDeckFromImport(cards, sourceFileName) {
    const deckName = sourceFileName.replace(/\.(apkg|txt)$/i, '');
    const newDeck = {
        id: `deck-${Date.now()}`,
        name: deckName,
        description: `Imported from ${sourceFileName}`,
        cards: cards
    };
    newDeck.cards.forEach(initializeCardSrs);
    state.decks.push(newDeck);
    saveState();
    renderDeckList();
  }

  function parseTxtFile(file) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = event => {
              try {
                const text = event.target.result;
                const cards = text.split('\n').map((line, i) => {
                    const parts = line.split('\t');
                    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
                        return { id: `import-txt-${Date.now()}-${i}`, front: parts[0].trim(), back: parts[1].trim() };
                    }
                    return null;
                }).filter(Boolean);
                resolve(cards);
              } catch (e) {
                reject(new Error("Could not read the text file."));
              }
          };
          reader.onerror = () => reject(new Error("File reading failed."));
          reader.readAsText(file);
      });
  }

  async function parseApkgFile(file) {
    if (typeof AnkiApkgParser === 'undefined') {
        throw new Error("Anki parser library not loaded. Check internet connection.");
    }
    
    const parser = new AnkiApkgParser();
    const deck = await parser.parse(file);

    return deck.notes
        .filter(note => note.fields && note.fields.length >= 2)
        .map((note, i) => ({
            id: `import-apkg-${Date.now()}-${i}`,
            front: note.fields[0],
            back: note.fields[1]
        }));
  }

  // --- UTILITY ---
  function hideModals() {
    deckModal.style.display = 'none';
    cardModal.style.display = 'none';
    importModal.style.display = 'none';
    confirmDeleteModal.style.display = 'none';
  }
  
  // --- START THE APP ---
  init();
});