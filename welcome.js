// Helper functions for managing user data in localStorage
function getUsers() {
    const usersJSON = localStorage.getItem('sudokuUsers');
    if (!usersJSON) {
        return [];
    }
    try {
        const users = JSON.parse(usersJSON);
        return Array.isArray(users) ? users.map(user => {
            let savedGamesList = [];
            if (Array.isArray(user.savedGamesList)) {
                savedGamesList = user.savedGamesList;
            }

            // Migration: If old savedGame exists and savedGamesList is empty
            if (user.savedGame && typeof user.savedGame === 'object' && Object.keys(user.savedGame).length > 0) {
                if (savedGamesList.length === 0) { // Only migrate if list is empty
                    const now = new Date().toISOString();
                    savedGamesList.push({
                        id: Date.now().toString() + "_migrated",
                        board: user.savedGame.board,
                        solution: user.savedGame.solution,
                        elapsedTimeInSeconds: user.savedGame.elapsedTimeInSeconds,
                        difficulty: user.savedGame.difficulty,
                        savedAt: now
                    });
                    // console.log(`Migrated old savedGame for user ${user.name}`);
                }
                // Remove old savedGame property after attempting migration or if list already had items
                delete user.savedGame;
            }

            return {
                ...user, // Spread other user properties like name, lastDifficulty
                gameHistory: Array.isArray(user.gameHistory) ? user.gameHistory : [],
                savedGamesList: savedGamesList, // Ensure it's an array
                savedGame: undefined // Ensure old field is not present
            };
        })
        // Filter out the undefined 'savedGame' property explicitly after map
        .map(user => { delete user.savedGame; return user; })
        : [];
    } catch (error) {
        console.error("Error parsing sudokuUsers from localStorage (welcome.js):", error);
        // Optionally, clear the corrupted data: localStorage.removeItem('sudokuUsers');
        return []; // Return empty array on error
    }
}

function saveUsers(usersArray) {
    if (!Array.isArray(usersArray)) {
        console.error("Attempted to save non-array as sudokuUsers:", usersArray);
        return;
    }
    localStorage.setItem('sudokuUsers', JSON.stringify(usersArray));
}

function findUser(username, usersArray) {
    if (!username || !usersArray || !Array.isArray(usersArray)) return null;
    const usernameLower = username.toLowerCase();
    return usersArray.find(user => user && user.name && user.name.toLowerCase() === usernameLower);
}

// Modifies usersArray in place and also returns it for convenience
function updateOrAddUser(userObject, usersArray) {
    if (!userObject || typeof userObject.name !== 'string' || !Array.isArray(usersArray)) {
        console.error("Invalid arguments for updateOrAddUser:", userObject, usersArray);
        return usersArray;
    }

    const usernameLower = userObject.name.toLowerCase();
    const existingUserIndex = usersArray.findIndex(
        user => user && user.name && user.name.toLowerCase() === usernameLower
    );

    if (existingUserIndex > -1) {
        // Update existing user: merge properties, new object overwrites old
        const existingUser = usersArray[existingUserIndex];
        usersArray[existingUserIndex] = {
            ...existingUser,
            ...userObject,
            gameHistory: userObject.gameHistory || existingUser.gameHistory || [],
            savedGamesList: userObject.savedGamesList || existingUser.savedGamesList || []
        };
        delete usersArray[existingUserIndex].savedGame; // Cleanup old field
    } else {
        // Add new user
        if (!userObject.gameHistory) { // Ensure gameHistory from previous changes
            userObject.gameHistory = [];
        }
        if (!userObject.savedGamesList) {
            userObject.savedGamesList = [];
        }
        delete userObject.savedGame; // Ensure no old field for new user object
        usersArray.push(userObject);
    }
    return usersArray;
}


document.addEventListener('DOMContentLoaded', () => {
    const userSelectDropdown = document.getElementById('user-select-dropdown');
    const newUsernameInput = document.getElementById('new-username-input');
    const difficultyRadios = document.querySelectorAll('input[name="difficulty-welcome"]'); // Corrected name
    const gamesCompletedDisplay = document.getElementById('games-completed-display');
    const startGameBtn = document.getElementById('start-game-btn');
    // const savedGamesSection = document.getElementById('saved-games-section'); // Removed
    // const savedGamesUl = document.getElementById('saved-games-list'); // Removed
    // const noSavedGamesMsg = document.getElementById('no-saved-games-msg'); // Removed

    // Check if all elements are found
    if (!userSelectDropdown || !newUsernameInput || difficultyRadios.length === 0 || !gamesCompletedDisplay || !startGameBtn) {
        console.error("One or more essential UI elements for welcome.js were not found. Aborting setup.");
        // Log individual missing elements for easier debugging
        if (!userSelectDropdown) console.error("userSelectDropdown missing");
        if (!newUsernameInput) console.error("newUsernameInput missing");
        if (difficultyRadios.length === 0) console.error("difficultyRadios missing or empty");
        if (!gamesCompletedDisplay) console.error("gamesCompletedDisplay missing");
        if (!startGameBtn) console.error("startGameBtn missing");
        // if (!savedGamesSection) console.error("savedGamesSection missing"); // Removed
        // if (!savedGamesUl) console.error("savedGamesUl missing"); // Removed
        // if (!noSavedGamesMsg) console.error("noSavedGamesMsg missing"); // Removed
        return; // Stop further execution if critical elements are missing
    }

    // function formatElapsedTime(totalSeconds) { ... } // Removed - was for old saved games display
    // function handleResumeGame(username, gameId) { ... } // Removed - logic moved to saved_games.js
    // function handleDeleteSavedGame(username, gameId) { ... } // Removed - logic moved to saved_games.js

    function populateUserDropdown() {
        const users = getUsers();
        userSelectDropdown.innerHTML = ''; // Clear existing options

        const defaultOpt = new Option("--- Select Existing User ---", "");
        userSelectDropdown.add(defaultOpt);

        users.forEach(user => {
            if (user && user.name) { // Ensure user and user.name exist
                 userSelectDropdown.add(new Option(user.name, user.name));
            }
        });

        const lastActiveUser = localStorage.getItem('lastActiveUser');
        if (lastActiveUser) {
            const exists = Array.from(userSelectDropdown.options).some(opt => opt.value === lastActiveUser);
            if (exists) {
                userSelectDropdown.value = lastActiveUser;
            }
        }
        displayUserSettings(userSelectDropdown.value); // Update UI based on selection
    }

    function displayUserSettings(username) {
        const users = getUsers();
        const selectedUser = findUser(username, users);

        if (selectedUser) {
            // Update to derive gamesCompleted from gameHistory length
            gamesCompletedDisplay.textContent = (selectedUser.gameHistory ? selectedUser.gameHistory.length : 0).toString();
            difficultyRadios.forEach(radio => {
                radio.checked = (radio.value === selectedUser.lastDifficulty);
            });

            // Display saved games list - This section is removed as saved games are on a separate page.
            // savedGamesSection.style.display = 'none'; // Ensure it's hidden
            // noSavedGamesMsg.style.display = 'none'; // Ensure it's hidden
            // savedGamesUl.innerHTML = ''; // Clear any potential residue if elements were not removed from HTML

        } else { // No selectedUser
            gamesCompletedDisplay.textContent = "N/A";
            difficultyRadios.forEach(radio => {
                radio.checked = (radio.value === 'medium'); // Default to medium
            });
            // savedGamesSection.style.display = 'none'; // Ensure it's hidden
            // noSavedGamesMsg.style.display = 'none'; // Hide if no user is selected at all
        }
    }

    // Initial Load
    populateUserDropdown();

    // Event Listeners
    userSelectDropdown.addEventListener('change', () => {
        const selectedUsername = userSelectDropdown.value;
        displayUserSettings(selectedUsername);
        if (selectedUsername) { // If a user is selected (not the placeholder)
            newUsernameInput.value = ''; // Clear new user input
            localStorage.setItem('lastActiveUser', selectedUsername);
        } else {
            localStorage.removeItem('lastActiveUser'); // Clear if placeholder is selected
        }
    });

    newUsernameInput.addEventListener('input', () => {
        if (newUsernameInput.value.trim() !== "") {
            if (userSelectDropdown.value !== "") { // if an existing user was selected
                userSelectDropdown.value = ""; // Reset dropdown to placeholder
                displayUserSettings(""); // Update UI for a new user (resets stats/difficulty)
                localStorage.removeItem('lastActiveUser'); // Clear last active user since we're typing a new one
            }
        }
    });

    startGameBtn.addEventListener('click', () => {
        let activeUsername = userSelectDropdown.value;
        const newUsername = newUsernameInput.value.trim();
        let isNewUser = false;
        let users = getUsers();
        let currentUserData = null;

        if (newUsername !== "") { // Priority to new username input
            activeUsername = newUsername;
            currentUserData = findUser(activeUsername, users);
            if (currentUserData) { // Existing user with this new name typed
                isNewUser = false;
                // User typed an existing name, treat as selecting that user
                userSelectDropdown.value = activeUsername; // Reflect this in dropdown
                localStorage.setItem('lastActiveUser', activeUsername);
            } else { // Truly a new user
                isNewUser = true;
            }
        } else if (activeUsername !== "") { // Existing user selected from dropdown
            currentUserData = findUser(activeUsername, users);
            isNewUser = false; // Not a new user
        } else { // No selection and no new name
            alert("Please select a user or enter a name for a new user.");
            return;
        }

        const selectedDifficulty = document.querySelector('input[name="difficulty-welcome"]:checked').value;

        if (isNewUser) {
            // Initialize new user with gameHistory and savedGamesList arrays
            currentUserData = { name: activeUsername, gameHistory: [], savedGamesList: [], lastDifficulty: selectedDifficulty };
            users = updateOrAddUser(currentUserData, users);
        } else { // Existing user
            if (currentUserData) {
                currentUserData.lastDifficulty = selectedDifficulty;
                users = updateOrAddUser(currentUserData, users); // This updates the user in the array
            } else {
                // This case should ideally not be reached if logic above is correct
                // e.g. selected a user from dropdown that somehow isn't in `users` array after getUsers()
                console.error("Error: Selected user data not found. Cannot start game.");
                alert("An error occurred with user selection. Please try again.");
                return;
            }
        }

        saveUsers(users);
        localStorage.setItem('activeUsername', activeUsername); // For game.html to know who is playing
        localStorage.setItem('lastActiveUser', activeUsername); // For this page to remember next time
        // No need to save 'sudokuDifficulty' here directly, as game.js reads it from 'activeUsername's profile or a general setting.
        // However, the game page currently reads 'sudokuDifficulty'. So, let's save it for compatibility.
        localStorage.setItem('sudokuDifficulty', selectedDifficulty);


        window.location.href = 'game.html';
    });
});
