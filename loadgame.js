document.addEventListener('DOMContentLoaded', () => {
    const loadGameUsernameSpan = document.getElementById('loadgame-username');
    const loadableGamesUl = document.getElementById('loadable-games-list');
    const noLoadableGamesMsg = document.getElementById('no-loadable-games-msg');

    let activeUsername = null;
    let allUsers = [];

    // --- Utility functions (adapted from welcome.js/report.js) ---
    function getUsers() {
        const usersJSON = localStorage.getItem('sudokuUsers');
        if (!usersJSON) return [];
        try {
            const users = JSON.parse(usersJSON);
            return Array.isArray(users) ? users.map(user => ({
                ...user,
                gameHistory: Array.isArray(user.gameHistory) ? user.gameHistory : [],
                savedGamesList: Array.isArray(user.savedGamesList) ? user.savedGamesList : []
            })) : [];
        } catch (error) {
            console.error("Error parsing sudokuUsers from localStorage (loadgame.js):", error);
            return [];
        }
    }

    function saveUsers(usersArray) { // Needed for delete functionality
         if (!Array.isArray(usersArray)) {
             console.error("Attempted to save non-array as sudokuUsers:", usersArray);
             return;
         }
         localStorage.setItem('sudokuUsers', JSON.stringify(usersArray));
     }

    function findUser(username, usersArray) {
        if (!username || !usersArray) return null;
        const usernameLower = username.toLowerCase();
        return usersArray.find(user => user && user.name && user.name.toLowerCase() === usernameLower);
    }

    function formatElapsedTime(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds === null || totalSeconds < 0) return "N/A";
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // --- Load Game Page Specific Logic ---
    function displaySavedGames() {
        allUsers = getUsers(); // Refresh allUsers data
        activeUsername = localStorage.getItem('activeUsername');

        if (!activeUsername) {
            loadGameUsernameSpan.textContent = "No active user selected.";
            noLoadableGamesMsg.textContent = "Please select a user from the Welcome page first.";
            noLoadableGamesMsg.style.display = 'block';
            loadableGamesUl.innerHTML = '';
            return;
        }

        loadGameUsernameSpan.textContent = activeUsername;
        const currentUser = findUser(activeUsername, allUsers);

        if (currentUser && currentUser.savedGamesList && currentUser.savedGamesList.length > 0) {
            loadableGamesUl.innerHTML = ''; // Clear previous list
            // Sort by savedAt date, newest first
            currentUser.savedGamesList.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

            currentUser.savedGamesList.forEach(game => {
                const li = document.createElement('li');
                li.setAttribute('data-game-id', game.id);

                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'game-details';
                const savedDate = new Date(game.savedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                const timePlayed = formatElapsedTime(game.elapsedTimeInSeconds);
                detailsDiv.innerHTML =
                    `Difficulty: <strong>${game.difficulty}</strong> | ` +
                    `Time Played: <strong>${timePlayed}</strong> | ` +
                    `Saved: <strong>${savedDate}</strong> (ID: ...${game.id.slice(-6)})`; // Show partial ID

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'game-actions';

                const resumeBtn = document.createElement('button');
                resumeBtn.className = 'resume-game-btn'; // Use class for styling
                resumeBtn.textContent = 'Resume';
                resumeBtn.onclick = () => handleResumeGame(game.id);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-game-btn'; // Use class for styling
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => handleDeleteSavedGame(game.id);

                actionsDiv.appendChild(resumeBtn);
                actionsDiv.appendChild(deleteBtn);

                li.appendChild(detailsDiv);
                li.appendChild(actionsDiv);
                loadableGamesUl.appendChild(li);
            });
            noLoadableGamesMsg.style.display = 'none';
        } else {
            loadableGamesUl.innerHTML = '';
            noLoadableGamesMsg.textContent = `No saved games found for ${activeUsername}.`;
            noLoadableGamesMsg.style.display = 'block';
        }
    }

    function handleResumeGame(gameId) {
        // activeUsername is already set and validated in displaySavedGames
        localStorage.setItem('sudokuGameToLoad', gameId);
        window.location.href = 'game.html';
    }

    function handleDeleteSavedGame(gameId) {
        if (!confirm("Are you sure you want to delete this saved game? This action cannot be undone.")) return;

        const userIndex = allUsers.findIndex(u => u.name === activeUsername);
        if (userIndex > -1) {
            const gameExists = allUsers[userIndex].savedGamesList.some(game => game.id === gameId);
            if (!gameExists) {
                console.warn("Attempted to delete a game that no longer exists in the list. Refreshing.");
                displaySavedGames(); // Refresh list if data mismatch
                return;
            }

            allUsers[userIndex].savedGamesList = allUsers[userIndex].savedGamesList.filter(game => game.id !== gameId);
            saveUsers(allUsers); // Save updated users array
            displaySavedGames(); // Refresh the displayed list
        }
    }

    // Initial Load
    if (loadGameUsernameSpan && loadableGamesUl && noLoadableGamesMsg) {
        displaySavedGames();
    } else {
        console.error("One or more critical elements for loadgame.js were not found.");
    }
});
