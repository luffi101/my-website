// Select DOM elements
const form = document.getElementById('new-entry-form');
const titleInput = document.getElementById('entry-title');
const contentInput = document.getElementById('entry-content');
const entriesList = document.getElementById('entries-list');

// Load existing journal entries from local storage (if any)
document.addEventListener('DOMContentLoaded', () => {
    const savedEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
    savedEntries.forEach(entry => addEntryToPage(entry.title, entry.content));
});

// Handle form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get the input values
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (title && content) {
        // Add entry to the page
        addEntryToPage(title, content);

        // Save entry to local storage
        const savedEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        savedEntries.push({ title, content });
        localStorage.setItem('journalEntries', JSON.stringify(savedEntries));

        // Clear the form
        form.reset();
    }
});

// Function to add a journal entry to the page
function addEntryToPage(title, content) {
    const entryItem = document.createElement('li');
    entryItem.innerHTML = `<h3>${title}</h3><p>${content}</p>`;
    entriesList.appendChild(entryItem);
}
