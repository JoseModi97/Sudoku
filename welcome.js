// Helper functions for managing user data in localStorage
function getUsers() {
    const usersJSON = localStorage.getItem('sudokuUsers');
    if (!usersJSON) {
        return [];
    }
    try {
        const users = JSON.parse(usersJSON);
        // Ensure it's an array and initialize gameHistory and savedGame if missing
        return Array.isArray(users) ? users.map(user => ({
            ...user,
            gameHistory: Array.isArray(user.gameHistory) ? user.gameHistory : [],
            savedGame: user.savedGame || null // Initialize if missing
        })) : [];
    } catch (error) {
        console.error("Error parsing sudokuUsers from localStorage:", error);
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
            // Ensure gameHistory is preserved or initialized
            gameHistory: (userObject.gameHistory || existingUser.gameHistory || [])
        };
        // Second check in case existingUser also didn't have it and userObject didn't provide it
        if (!usersArray[existingUserIndex].gameHistory) {
             usersArray[existingUserIndex].gameHistory = [];
        }
    } else {
        // Add new user
        // Ensure gameHistory is initialized if not provided (though startGameBtn logic should handle it)
        if (!userObject.gameHistory) {
            userObject.gameHistory = [];
        }
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

    // Check if all elements are found
    if (!userSelectDropdown || !newUsernameInput || difficultyRadios.length === 0 || !gamesCompletedDisplay || !startGameBtn) {
        console.error("One or more essential UI elements for welcome.js were not found. Aborting setup.");
        if (!userSelectDropdown) console.error("userSelectDropdown missing");
        if (!newUsernameInput) console.error("newUsernameInput missing");
        if (difficultyRadios.length === 0) console.error("difficultyRadios missing or empty");
        if (!gamesCompletedDisplay) console.error("gamesCompletedDisplay missing");
        if (!startGameBtn) console.error("startGameBtn missing");
        return; // Stop further execution if critical elements are missing
    }

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
        } else {
            gamesCompletedDisplay.textContent = "N/A";
            difficultyRadios.forEach(radio => {
                radio.checked = (radio.value === 'medium'); // Default to medium
            });
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
            // Initialize new user with gameHistory array
            currentUserData = { name: activeUsername, gameHistory: [], lastDifficulty: selectedDifficulty };
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
