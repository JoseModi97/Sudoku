document.addEventListener('DOMContentLoaded', () => {
    const userSelectDropdown = document.getElementById('user-select-saved-games');
    const savedGamesListElement = document.getElementById('saved-games-list');
    const noSavedGamesMsg = document.getElementById('no-saved-games-msg');

    // Initial setup
    populateUserDropdown();
    initializePage(); // Sets initial state based on localStorage or default

    userSelectDropdown.addEventListener('change', handleUserSelectionChange);

    function getUsersFromStorage() {
        const usersJSON = localStorage.getItem('sudokuUsers');
        if (!usersJSON) return [];
        try {
            // Ensure structure consistency, similar to other files
            const users = JSON.parse(usersJSON);
            return Array.isArray(users) ? users.map(user => ({
                ...user,
                savedGamesList: Array.isArray(user.savedGamesList) ? user.savedGamesList : [],
                gameHistory: Array.isArray(user.gameHistory) ? user.gameHistory : []
            })) : [];
        } catch (error) {
            console.error("Error parsing sudokuUsers from localStorage (saved_games.js):", error);
            return [];
        }
    }

    function populateUserDropdown() {
        const users = getUsersFromStorage();
        userSelectDropdown.innerHTML = '<option value="">--- Select User ---</option>'; // Default/placeholder
        users.forEach(user => {
            if (user && user.name) { // Basic check for valid user object
                const option = document.createElement('option');
                option.value = user.name;
                option.textContent = user.name;
                userSelectDropdown.appendChild(option);
            }
        });
    }

    function initializePage() {
        const activeUser = localStorage.getItem('activeUsername');
        if (activeUser) {
            const userExists = getUsersFromStorage().some(u => u.name === activeUser);
            if (userExists) {
                userSelectDropdown.value = activeUser;
                loadAndDisplaySavedGames(activeUser);
            } else {
                // Active user from localStorage doesn't exist in users list, clear it
                localStorage.removeItem('activeUsername');
                loadAndDisplaySavedGames(null); // Show "select user" state
            }
        } else {
            loadAndDisplaySavedGames(null); // No active user, show "select user" state
        }
    }

    function handleUserSelectionChange() {
        const selectedUsername = userSelectDropdown.value;
        if (selectedUsername) {
            localStorage.setItem('activeUsername', selectedUsername); // Update active user
            loadAndDisplaySavedGames(selectedUsername);
        } else {
            localStorage.removeItem('activeUsername'); // Clear active user if placeholder selected
            loadAndDisplaySavedGames(null); // Clear list and show prompt
        }
    }

    function loadAndDisplaySavedGames(username) {
        savedGamesListElement.innerHTML = ''; // Clear current list

        if (!username) {
            noSavedGamesMsg.textContent = 'Please select a user to view their saved games.';
            noSavedGamesMsg.style.display = 'block';
            savedGamesListElement.style.display = 'none'; // Hide list element too
            return;
        }

        savedGamesListElement.style.display = 'block'; // Ensure list is visible if user selected

        const users = getUsersFromStorage();
        const currentUser = users.find(user => user.name === username);

        if (currentUser && currentUser.savedGamesList && currentUser.savedGamesList.length > 0) {
            noSavedGamesMsg.style.display = 'none';
            // Sort games by savedAt date, newest first
            const sortedGames = currentUser.savedGamesList.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

            sortedGames.forEach(game => {
                const listItem = document.createElement('li');
                listItem.setAttribute('data-game-id', game.id);

                const gameInfo = document.createElement('span');
                const savedDate = new Date(game.savedAt).toLocaleString();
                const timePlayed = formatTime(game.elapsedTimeInSeconds);
                gameInfo.textContent = `Difficulty: ${game.difficulty}, Saved: ${savedDate}, Time: ${timePlayed} `;
                listItem.appendChild(gameInfo);

                const resumeButton = document.createElement('button');
                resumeButton.textContent = 'Resume';
                resumeButton.classList.add('resume-game-btn');
                resumeButton.addEventListener('click', () => resumeGame(game.id, username)); // Pass username for context
                listItem.appendChild(resumeButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.classList.add('delete-game-btn');
                deleteButton.addEventListener('click', () => deleteGame(game.id, username));
                listItem.appendChild(deleteButton);

                savedGamesListElement.appendChild(listItem);
            });
        } else {
            noSavedGamesMsg.textContent = 'No saved games found for the selected user.';
            noSavedGamesMsg.style.display = 'block';
        }
    }

    function resumeGame(gameId, usernameContext) {
        // Ensure the activeUsername is set to the user whose game is being resumed.
        // This is important if the user changes the dropdown, then clicks resume on a game
        // from a list that hasn't updated yet (though UI should prevent this).
        // Best practice is to ensure activeUsername is consistent.
        localStorage.setItem('activeUsername', usernameContext);
        localStorage.setItem('sudokuGameToLoad', gameId);
        window.location.href = 'game.html';
    }

    function deleteGame(gameId, usernameContext) {
        let users = getUsersFromStorage();
        const userIndex = users.findIndex(user => user.name === usernameContext);

        if (userIndex > -1 && users[userIndex].savedGamesList) {
            users[userIndex].savedGamesList = users[userIndex].savedGamesList.filter(game => game.id !== gameId);
            localStorage.setItem('sudokuUsers', JSON.stringify(users)); // Save the modified users array
            loadAndDisplaySavedGames(usernameContext); // Refresh the list for the current user
        }
    }

    function formatTime(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds === null || totalSeconds < 0) return "00:00";
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
});
