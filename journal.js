// Select DOM elements
const form = document.getElementById('new-entry-form');
const titleInput = document.getElementById('entry-title');
const contentInput = document.getElementById('entry-content');
const privateInput = document.getElementById('entry-private');
const showPrivateToggle = document.getElementById('show-private'); // New toggle checkbox
const entriesList = document.getElementById('entries-list');

// Load existing journal entries from local storage
document.addEventListener('DOMContentLoaded', () => {
    displayEntries();
});

// Handle form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get input values
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const isPrivate = privateInput.checked; 

    if (title && content) {
        // Save entry to local storage
        const savedEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        savedEntries.push({ title, content, isPrivate });
        localStorage.setItem('journalEntries', JSON.stringify(savedEntries));

        // Refresh display
        displayEntries();

        // Clear form
        form.reset();
    }
});

// Function to display journal entries
function displayEntries() {
    entriesList.innerHTML = ''; // Clear existing list

    const savedEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
    savedEntries.forEach(entry => {
        // Only show private entries if the toggle is enabled
        if (!entry.isPrivate || showPrivateToggle.checked) {
            addEntryToPage(entry.title, entry.content, entry.isPrivate);
        }
    });
}

// Function to add a journal entry to the page
function addEntryToPage(title, content, isPrivate) {
    const entryItem = document.createElement('div');
    entryItem.classList.add('journal-entry');
    const date = new Date().toLocaleString();
    
    entryItem.innerHTML = `
        <h3>${title}</h3>
        <p>${content}</p>
        <small>${date}</small>
        ${isPrivate ? '<span class="private-label">Private</span>' : ''}
        <button class="delete-entry">Delete</button>
    `;

    entriesList.appendChild(entryItem);

    // Add delete functionality
    entryItem.querySelector('.delete-entry').addEventListener('click', () => {
        entryItem.remove();
        // Update local storage
        const savedEntries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        const updatedEntries = savedEntries.filter(entry => !(entry.title === title && entry.content === content));
        localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
    });
}

// Add event listener for the "Show Private Entries" toggle
showPrivateToggle.addEventListener('change', displayEntries);

// Function to clear all entries
const clearButton = document.getElementById('clear-all');

clearButton.addEventListener('click', () => {
    const confirmClear = confirm('Are you sure you want to clear all entries?');
    if (confirmClear) {
        localStorage.removeItem('journalEntries'); // Clear local storage
        entriesList.innerHTML = ''; // Clear the list
    }
});
