document.addEventListener('DOMContentLoaded', () => {
    const currentUserDisplay = document.getElementById('current-user-display');
    const savedGamesListElement = document.getElementById('saved-games-list');
    const noSavedGamesMsg = document.getElementById('no-saved-games-msg');

    const activeUsername = localStorage.getItem('activeUsername');

    if (!activeUsername) {
        currentUserDisplay.textContent = "No active user selected.";
        noSavedGamesMsg.textContent = "Please select a user on the main page to see saved games.";
        noSavedGamesMsg.style.display = 'block';
        return;
    }

    currentUserDisplay.textContent = activeUsername;

    loadAndDisplaySavedGames();

    function getUsersFromStorage() {
        const usersJSON = localStorage.getItem('sudokuUsers');
        if (!usersJSON) return [];
        try {
            return JSON.parse(usersJSON);
        } catch (error) {
            console.error("Error parsing sudokuUsers from localStorage:", error);
            return [];
        }
    }

    function saveUsersToStorage(users) {
        localStorage.setItem('sudokuUsers', JSON.stringify(users));
    }

    function loadAndDisplaySavedGames() {
        const users = getUsersFromStorage();
        const currentUser = users.find(user => user.name === activeUsername);

        savedGamesListElement.innerHTML = ''; // Clear current list

        if (currentUser && currentUser.savedGamesList && currentUser.savedGamesList.length > 0) {
            noSavedGamesMsg.style.display = 'none';
            currentUser.savedGamesList.forEach(game => {
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
                resumeButton.addEventListener('click', () => resumeGame(game.id));
                listItem.appendChild(resumeButton);

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.classList.add('delete-game-btn');
                deleteButton.addEventListener('click', () => deleteGame(game.id));
                listItem.appendChild(deleteButton);

                savedGamesListElement.appendChild(listItem);
            });
        } else {
            noSavedGamesMsg.style.display = 'block';
        }
    }

    function resumeGame(gameId) {
        localStorage.setItem('sudokuGameToLoad', gameId);
        window.location.href = 'game.html';
    }

    function deleteGame(gameId) {
        let users = getUsersFromStorage();
        const userIndex = users.findIndex(user => user.name === activeUsername);

        if (userIndex > -1 && users[userIndex].savedGamesList) {
            users[userIndex].savedGamesList = users[userIndex].savedGamesList.filter(game => game.id !== gameId);
            saveUsersToStorage(users);
            loadAndDisplaySavedGames(); // Refresh the list
        }
    }

    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
});
