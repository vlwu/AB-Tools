document.addEventListener("DOMContentLoaded", () => {
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
    deckList: document.getElementById("deck-list-view"),
    deck: document.getElementById("deck-view"),
    study: document.getElementById("study-view"),
  };
  const deckListContainer = document.getElementById("deck-list-container");
  const cardListContainer = document.getElementById("card-list-container");
  const deckModal = document.getElementById("deck-modal");
  const cardModal = document.getElementById("card-modal");
  const importModal = document.getElementById("import-modal");

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
      // First time user, load starter decks
      state.decks = starterDecks.map(deck => ({...deck, cards: deck.cards.map((card, i) => ({...card, id: `starter-card-${i}`}))}));
      saveState();
    }
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
    deckListContainer.innerHTML = state.decks.length ? state.decks.map(deck => `
      <div class="deck-card" data-deck-id="${deck.id}">
        <h3>${deck.name}</h3>
        <p>${deck.cards.length} cards</p>
        <div class="deck-card-actions">
          <button class="edit-deck-btn">Edit</button>
          <button class="delete-deck-btn danger-btn">Delete</button>
        </div>
      </div>
    `).join('') : '<p class="empty-message">No decks yet. Create one to get started!</p>';
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
    // Deck List View
    document.getElementById('create-deck-btn').addEventListener('click', () => showDeckModal());
    document.getElementById('import-deck-btn').addEventListener('click', showImportModal);
    deckListContainer.addEventListener('click', e => {
      const deckCard = e.target.closest('.deck-card');
      if (!deckCard) return;
      const deckId = deckCard.dataset.deckId;
      if (e.target.matches('.edit-deck-btn')) showDeckModal(deckId);
      else if (e.target.matches('.delete-deck-btn')) deleteDeck(deckId);
      else navigate('deck', deckId);
    });

    // Deck View
    document.getElementById('back-to-decks-btn').addEventListener('click', () => navigate('deckList'));
    document.getElementById('add-card-btn').addEventListener('click', () => showCardModal());
    document.getElementById('study-deck-btn').addEventListener('click', () => navigate('study', state.currentDeckId));
    cardListContainer.addEventListener('click', e => {
        if(e.target.matches('.edit-card-btn')) showCardModal(e.target.dataset.cardId);
        if(e.target.matches('.delete-card-btn')) deleteCard(e.target.dataset.cardId);
    });

    // Modals
    document.querySelectorAll('.modal-cancel-btn').forEach(btn => btn.addEventListener('click', hideModals));
    deckModal.addEventListener('click', e => { if (e.target === deckModal) hideModals(); });
    cardModal.addEventListener('click', e => { if (e.target === cardModal) hideModals(); });
    importModal.addEventListener('click', e => { if(e.target === importModal) hideModals(); });
    
    document.getElementById('deck-form').addEventListener('submit', handleDeckForm);
    document.getElementById('card-form').addEventListener('submit', handleCardForm);
    
    // Study View
    document.getElementById('exit-study-btn').addEventListener('click', () => navigate('deck', state.currentDeckId));
    document.getElementById('flip-card-btn').addEventListener('click', () => document.getElementById('flashcard').classList.toggle('is-flipped'));
    document.getElementById('next-card-btn').addEventListener('click', () => showNextCard(1));
    document.getElementById('prev-card-btn').addEventListener('click', () => showNextCard(-1));
    document.getElementById('shuffle-deck-btn').addEventListener('click', shuffleStudyDeck);

    // Import Modal
    document.getElementById('import-file-input').addEventListener('change', e => {
        document.getElementById('start-import-btn').disabled = !e.target.files.length;
    });
    document.getElementById('start-import-btn').addEventListener('click', handleImport);
  }

  // Deck CRUD
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
    
    if (id) { // Edit
      const deck = state.decks.find(d => d.id === id);
      deck.name = name;
      deck.description = description;
    } else { // Create
      state.decks.push({ id: `deck-${Date.now()}`, name, description, cards: [] });
    }
    saveState();
    renderDeckList();
    hideModals();
  }
  
  function deleteDeck(deckId) {
    if(confirm('Are you sure you want to delete this entire deck?')) {
        state.decks = state.decks.filter(d => d.id !== deckId);
        saveState();
        renderDeckList();
    }
  }

  // Card CRUD
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
    if (id) { // Edit
        const card = deck.cards.find(c => c.id === id);
        card.front = front;
        card.back = back;
    } else { // Create
        deck.cards.push({ id: `card-${Date.now()}`, front, back });
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

  // Study Mode Logic
  function startStudySession(deckId) {
      const deck = state.decks.find(d => d.id === deckId);
      if(!deck || !deck.cards.length) return navigate('deck', deckId);
      
      state.studySession = {
          isActive: true,
          deck: [...deck.cards], // Create a copy to shuffle
          currentIndex: 0
      };
      
      document.getElementById('study-deck-title').textContent = `Studying: ${deck.name}`;
      displayCurrentCard();
  }
  
  function displayCurrentCard() {
      const { deck, currentIndex } = state.studySession;
      const card = deck[currentIndex];
      
      document.getElementById('flashcard').classList.remove('is-flipped');
      document.getElementById('card-front').textContent = card.front;
      document.getElementById('card-back').textContent = card.back;
      document.getElementById('card-counter').textContent = `${currentIndex + 1} / ${deck.length}`;
  }

  function showNextCard(direction) {
      const { deck, currentIndex } = state.studySession;
      let newIndex = currentIndex + direction;
      
      if (newIndex >= deck.length) newIndex = 0;
      if (newIndex < 0) newIndex = deck.length - 1;
      
      state.studySession.currentIndex = newIndex;
      displayCurrentCard();
  }
  
  function shuffleStudyDeck() {
      let deck = state.studySession.deck;
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]]; // Swap
      }
      state.studySession.currentIndex = 0;
      displayCurrentCard();
  }
  
  // Import Logic
  function showImportModal() {
      document.getElementById('import-file-input').value = '';
      document.getElementById('start-import-btn').disabled = true;
      importModal.style.display = 'flex';
  }

  async function handleImport() {
      const fileInput = document.getElementById('import-file-input');
      const file = fileInput.files[0];
      if (!file) return;

      const deckName = file.name.replace(/\.(apkg|txt)$/i, '');
      
      try {
          let cards = [];
          if (file.name.endsWith('.txt')) {
              cards = await parseTxtFile(file);
          } else if (file.name.endsWith('.apkg')) {
              cards = await parseApkgFile(file);
          }
          
          if (cards.length > 0) {
              const newDeck = {
                  id: `deck-${Date.now()}`,
                  name: deckName,
                  description: `Imported from ${file.name}`,
                  cards: cards
              };
              state.decks.push(newDeck);
              saveState();
              renderDeckList();
              alert(`Successfully imported ${cards.length} cards into new deck "${deckName}"!`);
          } else {
              alert('Could not find any valid cards in the file.');
          }
      } catch (error) {
          console.error('Import failed:', error);
          alert('An error occurred during import. Check the console for details.');
      } finally {
          hideModals();
      }
  }

  function parseTxtFile(file) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = event => {
              const text = event.target.result;
              const cards = text.split('\n').map((line, i) => {
                  const parts = line.split('\t');
                  if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
                      return { id: `import-txt-${Date.now()}-${i}`, front: parts[0], back: parts[1] };
                  }
                  return null;
              }).filter(Boolean);
              resolve(cards);
          };
          reader.onerror = reject;
          reader.readAsText(file);
      });
  }

  async function parseApkgFile(file) {
      // 1. Initialize SQL.js
      const SQL = await initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}` });
      
      // 2. Unzip the .apkg file
      const zip = await JSZip.loadAsync(file);
      const dbFile = zip.file('collection.anki2') || zip.file('collection.anki21');
      if (!dbFile) throw new Error('Database file not found in .apkg');
      const dbData = await dbFile.async('uint8array');

      // 3. Load the database
      const db = new SQL.Database(dbData);
      
      // 4. Query the database for notes (card content)
      // The `flds` column contains front and back, separated by a `\x1f` character.
      const stmt = db.prepare("SELECT flds FROM notes");
      let cards = [];
      let i = 0;
      while (stmt.step()) {
          const row = stmt.getAsObject();
          const fields = row.flds.split('\x1f');
          if (fields.length >= 2) {
              cards.push({ id: `import-apkg-${Date.now()}-${i++}`, front: fields[0], back: fields[1] });
          }
      }
      stmt.free();
      db.close();
      
      return cards;
  }

  // --- UTILITY ---
  function hideModals() {
    deckModal.style.display = 'none';
    cardModal.style.display = 'none';
    importModal.style.display = 'none';
  }
  
  // --- START THE APP ---
  init();
});