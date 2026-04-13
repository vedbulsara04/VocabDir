/* ============================================
   VocabDir — JavaScript Logic
   Free Dictionary API integration
   ============================================ */

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

// DOM Elements
const appContainer  = document.getElementById('app-container');
const searchForm    = document.getElementById('search-form');
const searchInput   = document.getElementById('search-input');
const loader        = document.getElementById('loader');
const errorCard     = document.getElementById('error');
const errorTitle    = document.getElementById('error-title');
const errorMessage  = document.getElementById('error-message');
const results       = document.getElementById('results');
const resultWord    = document.getElementById('result-word');
const resultPhonetic = document.getElementById('result-phonetic');
const audioBtn      = document.getElementById('audio-btn');
const audioEl       = document.getElementById('pronunciation-audio');
const meaningsContainer = document.getElementById('meanings-container');
const synonymsSection   = document.getElementById('synonyms-section');
const synonymsList      = document.getElementById('synonyms-list');

// ---- State ----
let currentAudioUrl = '';

// ---- Event Listeners ----
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const word = searchInput.value.trim();
    if (word) lookupWord(word);
});

audioBtn.addEventListener('click', () => {
    if (currentAudioUrl) {
        audioEl.src = currentAudioUrl;
        audioEl.play();
    }
});

// ---- Core: Fetch & Render ----
async function lookupWord(word) {
    showLoader();
    appContainer.classList.add('has-results');

    try {
        const res = await fetch(`${API_BASE}${encodeURIComponent(word)}`);

        if (!res.ok) {
            if (res.status === 404) {
                showError('Word not found', `We couldn't find a definition for "${word}". Please check the spelling and try again.`);
            } else {
                showError('Something went wrong', 'The dictionary service returned an error. Please try again later.');
            }
            return;
        }

        const data = await res.json();
        renderResults(data[0]);
    } catch (err) {
        showError('Network error', 'Unable to reach the dictionary service. Please check your internet connection.');
    }
}

// ---- Render Results ----
function renderResults(entry) {
    // Word + phonetic
    resultWord.textContent = entry.word;

    const phonetic = getPhonetic(entry);
    resultPhonetic.textContent = phonetic.text || '';

    // Audio
    currentAudioUrl = phonetic.audio || '';
    if (currentAudioUrl) {
        audioBtn.classList.remove('hidden');
    } else {
        audioBtn.classList.add('hidden');
    }

    // Meanings
    meaningsContainer.innerHTML = '';
    const allSynonyms = new Set();

    entry.meanings.forEach((meaning) => {
        const card = document.createElement('div');
        card.className = 'meaning-card';

        // Part of speech badge
        const posEl = document.createElement('span');
        posEl.className = 'part-of-speech';
        posEl.textContent = meaning.partOfSpeech;
        card.appendChild(posEl);

        // Definitions (limit to 3 per part of speech for clarity)
        const defs = meaning.definitions.slice(0, 3);
        defs.forEach((def, i) => {
            const item = document.createElement('div');
            item.className = 'definition-item';

            const defLine = document.createElement('p');
            defLine.className = 'definition-text';
            defLine.innerHTML = `<span class="definition-number">${i + 1}.</span> ${escapeHtml(def.definition)}`;
            item.appendChild(defLine);

            if (def.example) {
                const exLine = document.createElement('p');
                exLine.className = 'example-text';
                exLine.textContent = `"${def.example}"`;
                item.appendChild(exLine);
            }

            card.appendChild(item);
        });

        meaningsContainer.appendChild(card);

        // Collect synonyms
        if (meaning.synonyms) {
            meaning.synonyms.forEach((s) => allSynonyms.add(s));
        }
        meaning.definitions.forEach((def) => {
            if (def.synonyms) def.synonyms.forEach((s) => allSynonyms.add(s));
        });
    });

    // Synonyms
    if (allSynonyms.size > 0) {
        synonymsList.innerHTML = '';
        allSynonyms.forEach((syn) => {
            const chip = document.createElement('button');
            chip.className = 'synonym-chip';
            chip.textContent = syn;
            chip.addEventListener('click', () => {
                searchInput.value = syn;
                lookupWord(syn);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            synonymsList.appendChild(chip);
        });
        synonymsSection.classList.remove('hidden');
    } else {
        synonymsSection.classList.add('hidden');
    }

    // Show results
    hideAll();
    appContainer.classList.add('has-results');
    results.classList.remove('hidden');
}

// ---- Helpers ----

/** Extract the best phonetic text + audio url from the entry. */
function getPhonetic(entry) {
    // Prefer a phonetics entry that has both text and audio
    if (entry.phonetics && entry.phonetics.length) {
        const withBoth = entry.phonetics.find((p) => p.text && p.audio);
        if (withBoth) return withBoth;
        const withText = entry.phonetics.find((p) => p.text);
        if (withText) return withText;
        const withAudio = entry.phonetics.find((p) => p.audio);
        if (withAudio) return withAudio;
    }
    return { text: entry.phonetic || '', audio: '' };
}

/** Simple HTML escape to prevent XSS from API data. */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ---- UI State Helpers ----

function showLoader() {
    hideAll();
    loader.classList.remove('hidden');
}

function showError(title, message) {
    hideAll();
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorCard.classList.remove('hidden');
}

function hideAll() {
    loader.classList.add('hidden');
    errorCard.classList.add('hidden');
    results.classList.add('hidden');
}
