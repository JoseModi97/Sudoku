document.addEventListener('DOMContentLoaded', () => {
    const usernameInputWelcome = document.getElementById('username-input-welcome');
    const difficultyRadiosWelcome = document.querySelectorAll('input[name="difficulty-welcome"]');
    const gamesCompletedDisplay = document.getElementById('games-completed-display');
    const startGameBtn = document.getElementById('start-game-btn');

    // Load and display saved username
    const savedUsername = localStorage.getItem('sudokuUsername');
    if (savedUsername && usernameInputWelcome) {
        usernameInputWelcome.value = savedUsername;
    }

    // Load and display saved difficulty
    const savedDifficulty = localStorage.getItem('sudokuDifficulty') || 'medium'; // Default to medium
    difficultyRadiosWelcome.forEach(radio => {
        if (radio.value === savedDifficulty) {
            radio.checked = true;
        }
    });

    // Load and display games completed
    const gamesCompleted = localStorage.getItem('gamesCompleted') || '0';
    if (gamesCompletedDisplay) {
        gamesCompletedDisplay.textContent = gamesCompleted;
    }

    // Event listener for Start Game button
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            // Save username
            if (usernameInputWelcome) {
                const username = usernameInputWelcome.value.trim();
                if (username) {
                    localStorage.setItem('sudokuUsername', username);
                } else {
                    // If username is empty, remove it from localStorage.
                    // This means if a user clears their name, it won't persist.
                    localStorage.removeItem('sudokuUsername');
                }
            }

            // Save difficulty
            const selectedDifficultyRadio = document.querySelector('input[name="difficulty-welcome"]:checked');
            if (selectedDifficultyRadio) {
                localStorage.setItem('sudokuDifficulty', selectedDifficultyRadio.value);
            } else {
                // Default to medium if somehow no radio is selected, though HTML has a default.
                localStorage.setItem('sudokuDifficulty', 'medium');
            }

            // Navigate to game page
            window.location.href = 'game.html';
        });
    } else {
        console.error("Start Game button not found!");
    }

    // Basic null checks for other elements to prevent errors if HTML is changed
    if (!usernameInputWelcome) console.error("Username input (welcome) not found!");
    if (difficultyRadiosWelcome.length === 0) console.error("Difficulty radios (welcome) not found!");
    if (!gamesCompletedDisplay) console.error("Games completed display not found!");

});
