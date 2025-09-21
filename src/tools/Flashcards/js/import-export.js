// assets/js/flashcards/import-export.js
import { initializeCardSrs } from './srs.js';

// --- Import Logic ---
export async function parseImportFile(file) {
    const fileName = file.name || 'Unnamed File';
    let cards;

    if (fileName.toLowerCase().endsWith('.txt')) {
        cards = await parseTxtFile(file);
    } else {
        throw new Error('Unsupported file type. Please select a .txt file.');
    }

    if (!cards || cards.length === 0) {
        throw new Error('No valid cards were found in the file.');
    }

    const deckName = fileName.replace(/\.txt$/i, '');
    const newDeck = {
        id: `deck-${Date.now()}`,
        name: deckName,
        description: `Imported from ${fileName}`,
        cards: cards
    };
    newDeck.cards.forEach(initializeCardSrs);
    return newDeck;
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

// --- Export Logic ---
export function exportDeck(format, deck) {
    const deckName = deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (format === 'txt') {
        const content = deck.cards.map(card => `${card.front}\t${card.back}`).join('\n');
        downloadFile(content, `${deckName}.txt`, 'text/plain;charset=utf-8');
    } else if (format === 'pdf') {
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined' || typeof jspdf.jsPDF.API.autoTable === 'undefined') {
            alert('PDF library not fully loaded. Please check your internet connection and try again.');
            return;
        }
        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        doc.text(`Flashcard Deck: ${deck.name}`, 14, 15);
        
        // Convert card HTML content to plain text to avoid printing raw tags
        const bodyData = deck.cards.map(card => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = card.front;
            const frontText = tempDiv.innerText;

            tempDiv.innerHTML = card.back;
            const backText = tempDiv.innerText;
            
            return [frontText, backText];
        });
        
        doc.autoTable({
            head: [['Front (Question)', 'Back (Answer)']],
            body: bodyData,
            startY: 20,
            styles: { cellPadding: 3, fontSize: 10, valign: 'middle' },
            headStyles: { fillColor: [37, 52, 79], textColor: 240 }, // #25344f
            alternateRowStyles: { fillColor: [55, 78, 115], textColor: 240 }, // #374e73
            theme: 'grid'
        });

        doc.save(`${deckName}.pdf`);
    }
}

function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}