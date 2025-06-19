// Global Variables
let board = []; // 9x9 array for the current puzzle state
let solution = []; // 9x9 array for the solved puzzle
let timerInterval;
let elapsedTimeInSeconds = 0; // For the elapsed timer

// Global Variables (continued)
let currentGameUsername = 'Player'; // Default username, will be updated from localStorage
let currentDifficultySetting = 'medium'; // Default difficulty, will be updated

// DOM Element References
let timerDisplayElement;
let gameBoardElement;
let newGameBtn;
let messageArea;
let pauseGameBtn;
let resumeGameBtn;
let pauseOverlay;
let isGamePaused = false; // State variable
let activeGameId = null;

// Minimal getUsers for script.js, ensuring savedGame property is handled
function getUsers() {
    const usersJSON = localStorage.getItem('sudokuUsers');
    if (!usersJSON) return [];
    try {
        const users = JSON.parse(usersJSON);
        return Array.isArray(users) ? users.map(user => {
            let savedGamesList = [];
            if (Array.isArray(user.savedGamesList)) {
                savedGamesList = user.savedGamesList;
            }

            if (user.savedGame && typeof user.savedGame === 'object' && Object.keys(user.savedGame).length > 0) {
                if (savedGamesList.length === 0) {
                    const now = new Date().toISOString();
                    savedGamesList.push({
                        id: Date.now().toString() + "_migrated",
                        board: user.savedGame.board,
                        solution: user.savedGame.solution,
                        elapsedTimeInSeconds: user.savedGame.elapsedTimeInSeconds,
                        difficulty: user.savedGame.difficulty,
                        savedAt: now
                    });
                }
                delete user.savedGame;
            }

            return {
                ...user,
                gameHistory: Array.isArray(user.gameHistory) ? user.gameHistory : [],
                savedGamesList: savedGamesList,
                savedGame: undefined
            };
        }).map(user => { delete user.savedGame; return user; }) : [];
    } catch (error) {
        console.error("Error parsing sudokuUsers from localStorage (script.js):", error);
        return [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    timerDisplayElement = document.getElementById('timer');
    gameBoardElement = document.getElementById('game-board');
    newGameBtn = document.getElementById('new-game-btn');
    messageArea = document.getElementById('message-area');

    if (!timerDisplayElement) console.error("Timer display element not found!");
    if (!gameBoardElement) console.error("Game board element not found!");
    if (!newGameBtn) console.error("New Game button not found!");
    if (!messageArea) console.error("Message area element not found!");

    pauseGameBtn = document.getElementById('pause-game-btn');
    resumeGameBtn = document.getElementById('resume-game-btn');
    pauseOverlay = document.getElementById('pause-overlay');

    if (!pauseGameBtn) console.error("Pause Game button not found!");
    if (!resumeGameBtn) console.error("Resume Game button not found!");
    if (!pauseOverlay) console.error("Pause overlay element not found!");

    // Load active user and their settings
    const activeUsername = localStorage.getItem('activeUsername');
    const allUsersJSON = localStorage.getItem('sudokuUsers');
    const allUsers = allUsersJSON ? JSON.parse(allUsersJSON) : [];

    const activeUserObject = activeUsername ? allUsers.find(user => user.name === activeUsername) : null;

    if (activeUserObject) {
        currentGameUsername = activeUserObject.name;
        currentDifficultySetting = activeUserObject.lastDifficulty || 'medium'; // Use stored difficulty or default
    } else if (activeUsername) {
        // User was set, but not found in the user array (edge case, or if users array is cleared)
        console.warn(`Active user '${activeUsername}' not found in user data. Using default settings or last known general difficulty.`);
        currentGameUsername = activeUsername; // Still use the name if available
        // Fallback to the general difficulty setting if specific user data is missing
        currentDifficultySetting = localStorage.getItem('sudokuDifficulty') || 'medium';
    } else {
        // No activeUsername set, use defaults (should ideally not happen if welcome page sets it)
        console.warn("No active user set. Using default settings.");
        // currentGameUsername and currentDifficultySetting will retain their default 'Player' and 'medium'
    }

    // Automatically start the game now that settings are loaded.
    // setupNewGame(); // Original automatic call moved into resume logic

    // Load and Resume Game Logic
    let gameSuccessfullyResumed = false;
    const gameIdToLoad = localStorage.getItem('sudokuGameToLoad');
    localStorage.removeItem('sudokuGameToLoad'); // Consume the item

    // Ensure activeUserForResume is fetched using the script's getUsers
    const usersForResumeCheck = getUsers();
    const activeUserForResumeLogic = activeUsername ? usersForResumeCheck.find(user => user.name === activeUsername) : null;

    if (activeUserForResumeLogic && activeUserForResumeLogic.savedGamesList && activeUserForResumeLogic.savedGamesList.length > 0) {
        let gameToResume = null;

        if (gameIdToLoad) { // A specific game ID was passed
            gameToResume = activeUserForResumeLogic.savedGamesList.find(game => game.id === gameIdToLoad);
            if (gameToResume) {
                // console.log(`Loading specified game: ${gameToResume.id}`);
            } else {
                // console.warn(`Specified game ID ${gameIdToLoad} not found in user's saved games.`);
            }
        } else if (activeUserForResumeLogic.savedGamesList.length === 1) {
            // Only one saved game exists, prompt for that one
            const singleGame = activeUserForResumeLogic.savedGamesList[0];
            if (confirm(`${activeUserForResumeLogic.name}, you have an unfinished game (Difficulty: ${singleGame.difficulty}, Saved: ${new Date(singleGame.savedAt).toLocaleString()}). Would you like to resume it?`)) {
                gameToResume = singleGame;
            } else {
                // User declined to resume the single saved game. Clear it.
                // console.log("User declined to resume the single saved game. Clearing it.");
                activeUserForResumeLogic.savedGamesList = []; // Clear the list for this user
                // Update localStorage:
                const allUsers = getUsers();
                const userIndex = allUsers.findIndex(u => u.name === activeUserForResumeLogic.name);
                if (userIndex > -1) {
                    allUsers[userIndex].savedGamesList = []; // Ensure it's empty
                    allUsers[userIndex].savedGame = null; // Also clear old field if it somehow exists
                    localStorage.setItem('sudokuUsers', JSON.stringify(allUsers));
                }
            }
        }
        // If gameIdToLoad was set but gameToResume is still null (not found), or
        // if there are multiple games but no gameIdToLoad was specified,
        // gameToResume will be null. A new game will start.

        if (gameToResume) {
            board = gameToResume.board;
            solution = gameToResume.solution;
            elapsedTimeInSeconds = gameToResume.elapsedTimeInSeconds;
            currentDifficultySetting = gameToResume.difficulty;
            activeGameId = gameToResume.id; // CRITICAL: Set activeGameId
            // currentGameUsername is already set

            if (gameBoardElement) gameBoardElement.style.display = 'grid';
            if (timerDisplayElement) timerDisplayElement.style.display = 'block';

            renderBoard();
            updateTimerDisplay(); // Display correct time first
            timerInterval = setInterval(incrementTimer, 1000); // Then start interval
            enableAllCells();

            if (window.autoSaveInterval) clearInterval(window.autoSaveInterval);
            window.autoSaveInterval = setInterval(saveCurrentGame, 5000);

            gameSuccessfullyResumed = true;
            displayMessage(`Game (ID: ${activeGameId.slice(-6)}) resumed for ${currentGameUsername}. Difficulty: ${currentDifficultySetting}.`, "info");
        }
    }

    if (!gameSuccessfullyResumed) {
        // No game explicitly loaded/resumed, or user declined single game, or multiple games exist but none specified.
        setupNewGame(); // This sets up a fresh game and a new activeGameId.
    }

    // Event listener for the New Game button (still useful for starting another new game)
    if (newGameBtn) {
        newGameBtn.addEventListener('click', setupNewGame);
    }

    // Add event listeners to cells (they exist in DOM, just hidden)
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = getCellElement(r, c); // getCellElement uses document.getElementById
            if (cell) {
                cell.addEventListener('input', handleInput);
            } else {
                // This console error might be too noisy if cells are dynamically added/removed
                // For now, assuming they are always there as per index.html structure
                // console.error(`Cell element cell-${r}-${c} not found during initial setup.`);
            }
        }
    }
    // DO NOT call setupNewGame() here automatically on page load.
    // Game starts only when "New Game" button is clicked.

    // Save game state when the user is about to leave the page
    window.addEventListener('beforeunload', (event) => {
        if (gameBoardElement && gameBoardElement.style.display === 'grid') { // Check if game is active
             saveCurrentGame();
        }
    });

    // Alternative/additional: save on visibility change (e.g., tab switching)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            if (gameBoardElement && gameBoardElement.style.display === 'grid') { // Check if game is active
                saveCurrentGame();
            }
        }
    });

    // Pause/Resume Event Listeners
    if (pauseGameBtn) {
        pauseGameBtn.addEventListener('click', handlePauseGame);
    }
    if (resumeGameBtn) {
        resumeGameBtn.addEventListener('click', handleResumeGame);
    }
});

function getCellElement(row, col) {
    return document.getElementById(`cell-${row}-${col}`);
}

function setupNewGame() {
    // Username and difficulty are now loaded from localStorage via global vars.
    // No need to save username here (done on welcome page).
    // No need to read difficulty from radio buttons here.

    // clearInterval(timerInterval); // startTimer will handle this

    // Clear any existing saved game for the current user, as a new one is starting.
    // This is important if setupNewGame is called by the "New Game" button.
    const usersOnNewGame = getUsers();
    const currentUserIndex = usersOnNewGame.findIndex(user => user.name === currentGameUsername);
    if (currentUserIndex > -1 && usersOnNewGame[currentUserIndex].savedGame) {
        usersOnNewGame[currentUserIndex].savedGame = null;
        localStorage.setItem('sudokuUsers', JSON.stringify(usersOnNewGame));
        // console.log(`Cleared saved game for ${currentGameUsername} due to new game start.`);
    }

    // Reset pause state if a new game is started while paused
    if (isGamePaused) {
        isGamePaused = false;
        if (pauseOverlay) pauseOverlay.style.display = 'none';
        if (pauseGameBtn) pauseGameBtn.style.display = 'inline-block';
        if (resumeGameBtn) resumeGameBtn.style.display = 'none';
    }

    // Ensure board and timer are visible before starting everything
    if (gameBoardElement) {
        gameBoardElement.style.display = 'grid';
    } else {
        console.error("Game board element reference is missing in setupNewGame.");
        const gb = document.getElementById('game-board');
        if (gb) gb.style.display = 'grid';
    }

    if (timerDisplayElement) {
        timerDisplayElement.style.display = 'block';
    } else {
        console.error("Timer display element reference is missing in setupNewGame.");
        const td = document.getElementById('timer');
        if (td) td.style.display = 'block';
    }

    // currentDifficulty = getSelectedDifficulty(); // Removed: Use currentDifficultySetting

    // For a brand new game, reset timer and display message.
    elapsedTimeInSeconds = 0; // Explicitly reset for a new game
    activeGameId = Date.now().toString(); // Generate a new ID for this game session
    displayMessage(`Playing as: ${currentGameUsername} | Difficulty: ${currentDifficultySetting}. Good luck!`, "info");

    const puzzleAndSolution = generateSudokuPuzzle(); // Uses currentDifficultySetting
    board = puzzleAndSolution.puzzle;
    solution = puzzleAndSolution.solution;

    renderBoard();
    startTimer(); // This will start timer from 0 due to reset above
    enableAllCells(); // Make sure cells are enabled for a new game

    // Autosave periodically
    if (window.autoSaveInterval) clearInterval(window.autoSaveInterval);
    window.autoSaveInterval = setInterval(saveCurrentGame, 5000); // Save every 5 seconds
}

function renderBoard() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = getCellElement(r, c);
            if (!cell) continue; // Skip if cell not found

            cell.classList.remove('correct-input', 'incorrect-input', 'prefilled-cell');
            cell.removeAttribute('readonly');

            if (board[r][c] !== 0) { // 0 represents an empty cell in the puzzle
                cell.value = board[r][c];
                cell.setAttribute('readonly', true);
                cell.classList.add('prefilled-cell');
            } else {
                cell.value = '';
            }
        }
    }
}

function handleInput(event) {
    const cell = event.target;
    const idParts = cell.id.split('-'); // e.g., "cell-0-0"
    const row = parseInt(idParts[1]);
    const col = parseInt(idParts[2]);

    if (isGamePaused) {
        // Revert any attempted change if game is paused
        cell.value = board[row][col] !== 0 ? board[row][col].toString() : '';
        return;
    }

    // row and col are already defined above
    let value = cell.value;
    cell.classList.remove('correct-input', 'incorrect-input');

    if (!/^[1-9]$/.test(value) && value !== '') {
        cell.value = ''; // Clear invalid input
        board[row][col] = 0; // Update board model
        return;
    }

    const num = value === '' ? 0 : parseInt(value);
    board[row][col] = num;

    if (num !== 0) {
        if (num === solution[row][col]) {
            cell.classList.add('correct-input');
            checkWinCondition(); // Will handle win message and timer stop
        } else {
            cell.classList.add('incorrect-input');
        }
    }
}

function generateSudokuPuzzle() {
    let solvedBoard = generateFullSolution();
    let puzzle = JSON.parse(JSON.stringify(solvedBoard)); // Deep copy

    // Create puzzle by removing cells (e.g., 40 cells for medium)
    // This is a simple removal strategy. For ideal puzzles, uniqueness should be checked.
    // Create puzzle by removing cells based on difficulty
    // const difficulty = getSelectedDifficulty(); // Removed
    let cellsToActuallyRemove;
    if (currentDifficultySetting === 'easy') {
        cellsToActuallyRemove = 30; // Fewer cells removed for easy
    } else if (currentDifficultySetting === 'hard') {
        cellsToActuallyRemove = 50; // More cells removed for hard
    } else { // Medium or default (medium)
        cellsToActuallyRemove = 40;
    }

    let removedCount = 0;
    let attempts = 0; // Prevent infinite loop
    // Ensure not to remove too many cells making puzzle too sparse or generation too long
    const maxAttempts = 200; // Adjust as needed, relates to grid size

    while (removedCount < cellsToActuallyRemove && attempts < maxAttempts) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== 0) {
            puzzle[r][c] = 0; // Mark as empty
            removedCount++;
        }
        attempts++;
    }
    // For development: Log how many cells were actually removed
    // console.log(`Difficulty: ${currentDifficultySetting}, Target remove: ${cellsToActuallyRemove}, Actually removed: ${removedCount}`);

    return { puzzle: puzzle, solution: solvedBoard };
}

// function getSelectedDifficulty() { // REMOVED
//     const checkedRadio = document.querySelector('input[name="difficulty"]:checked');
//     return checkedRadio ? checkedRadio.value : 'medium'; // Default to medium
// }

function generateFullSolution() {
    let grid = Array(9).fill(null).map(() => Array(9).fill(0));
    solveSudokuHelper(grid);
    return grid;
}

function solveSudokuHelper(grid) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (grid[r][c] === 0) { // Find empty cell
                let numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                for (let num of numbers) {
                    if (isValidPlacement(grid, r, c, num)) {
                        grid[r][c] = num;
                        if (solveSudokuHelper(grid)) {
                            return true; // Solution found
                        }
                        grid[r][c] = 0; // Backtrack
                    }
                }
                return false; // No valid number works for this cell
            }
        }
    }
    return true; // All cells filled
}

function isValidPlacement(grid, row, col, num) {
    // Check row
    for (let c = 0; c < 9; c++) {
        if (grid[row][c] === num) return false;
    }
    // Check column
    for (let r = 0; r < 9; r++) {
        if (grid[r][col] === num) return false;
    }
    // Check 3x3 subgrid
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (grid[startRow + r][startCol + c] === num) return false;
        }
    }
    return true;
}

// Fisher-Yates shuffle
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


function startTimer() {
    // This function is called when a new game starts (resetting time via setupNewGame)
    // OR when a game is resumed (not resetting time here, just the interval).
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    // If elapsedTimeInSeconds is already > 0 (from a resumed game), it won't be reset here.
    // If it's a new game, setupNewGame explicitly resets elapsedTimeInSeconds.
    // startTimer itself will just honor the current elapsedTimeInSeconds.
    updateTimerDisplay(); // Display current time (could be 00:00 or resumed time)
    timerInterval = setInterval(incrementTimer, 1000);
}

function incrementTimer() { // Renamed from decrementTimer and logic changed
    elapsedTimeInSeconds++;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    if (!timerDisplayElement) return; // Guard clause

    const minutes = Math.floor(elapsedTimeInSeconds / 60);
    const seconds = elapsedTimeInSeconds % 60;
    // Format as MM:SS
    const formattedTime =
        (minutes < 10 ? '0' : '') + minutes + ':' +
        (seconds < 10 ? '0' : '') + seconds;

    if (timerDisplayElement) { // Check if the element exists
        timerDisplayElement.textContent = "Time: " + formattedTime;
    } else {
        // console.error("Timer display element not found for updating display.");
    }
}

// Cookie Helper Functions (setCookie, getCookie) are REMOVED.

function saveCurrentGame() {
    if (!currentGameUsername || typeof board === 'undefined' || board.length === 0 || !activeGameId) {
        // console.log("No active game session to save or board not ready.");
        return;
    }

    const users = getUsers(); // Uses the updated getUsers from script.js
    const userIndex = users.findIndex(user => user.name === currentGameUsername);

    if (userIndex > -1) {
        // Ensure savedGamesList exists (it should due to getUsers mapping)
        if (!users[userIndex].savedGamesList) {
            users[userIndex].savedGamesList = [];
        }

        const gameIndex = users[userIndex].savedGamesList.findIndex(game => game.id === activeGameId);
        const now = new Date().toISOString();
        const gameState = {
            id: activeGameId,
            board: board,
            solution: solution,
            elapsedTimeInSeconds: elapsedTimeInSeconds,
            difficulty: currentDifficultySetting,
            savedAt: now
        };

        if (gameIndex > -1) {
            // Update existing game in the list
            users[userIndex].savedGamesList[gameIndex] = gameState;
        } else {
            // Add new game to the list
            users[userIndex].savedGamesList.push(gameState);
        }

        // Optional: Limit the number of saved games (e.g., to 5)
        // if (users[userIndex].savedGamesList.length > 5) {
        //     users[userIndex].savedGamesList.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)); // Keep newest
        //     users[userIndex].savedGamesList = users[userIndex].savedGamesList.slice(0, 5);
        // }

        localStorage.setItem('sudokuUsers', JSON.stringify(users));
        // console.log(`Game session ${activeGameId} saved for ${currentGameUsername}`);
    } else {
        // console.warn(`User ${currentGameUsername} not found. Cannot save game state.`);
    }
}

function handlePauseGame() {
    if (isGamePaused) return; // Already paused

    if (timerInterval) clearInterval(timerInterval); // Stop the game timer
    if (window.autoSaveInterval) clearInterval(window.autoSaveInterval); // Stop autosave
    saveCurrentGame(); // Save the current state

    isGamePaused = true;
    if (pauseOverlay) pauseOverlay.style.display = 'flex'; // Show overlay
    if (pauseGameBtn) pauseGameBtn.style.display = 'none'; // Hide Pause button
    if (resumeGameBtn) resumeGameBtn.style.display = 'inline-block'; // Show Resume button

    displayMessage("Game paused. Press Resume Game to continue.", "info");
}

function handleResumeGame() {
    if (!isGamePaused) return; // Not paused

    // Restart timer (it will continue from global elapsedTimeInSeconds)
    if (timerInterval) clearInterval(timerInterval); // Clear just in case
    timerInterval = setInterval(incrementTimer, 1000);
    updateTimerDisplay(); // Update display immediately

    // Restart autosave
    if (window.autoSaveInterval) clearInterval(window.autoSaveInterval);
    window.autoSaveInterval = setInterval(saveCurrentGame, 5000);

    isGamePaused = false;
    if (pauseOverlay) pauseOverlay.style.display = 'none'; // Hide overlay
    if (pauseGameBtn) pauseGameBtn.style.display = 'inline-block'; // Show Pause button
    if (resumeGameBtn) resumeGameBtn.style.display = 'none'; // Hide Resume button

    clearMessage(); // Or display "Game Resumed"
}

function checkWinCondition() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0 || board[r][c] !== solution[r][c]) {
                return false; // Not all cells are filled correctly or some are empty
            }
        }
    }
    // If loop completes, all cells are filled and correct - it's a win
    if (timerInterval) clearInterval(timerInterval);
    if (window.autoSaveInterval) clearInterval(window.autoSaveInterval); // Stop autosave

    // Disable pause/resume buttons on win
    if (pauseGameBtn) pauseGameBtn.style.display = 'none';
    if (resumeGameBtn) resumeGameBtn.style.display = 'none';
    isGamePaused = false; // Ensure pause state is reset
    if (pauseOverlay && pauseOverlay.style.display !== 'none') { // Hide overlay if it was somehow visible
        pauseOverlay.style.display = 'none';
    }


    // Increment gamesCompleted for the active user
    const activeUsernameForStat = localStorage.getItem('activeUsername'); // Re-fetch for safety, though currentGameUsername should be set
    if (activeUsernameForStat) {
        const allUsersJSONForStat = localStorage.getItem('sudokuUsers');
        let allUsersForStat = allUsersJSONForStat ? JSON.parse(allUsersJSONForStat) : [];
        const userIndex = allUsersForStat.findIndex(user => user.name === activeUsernameForStat);

        if (userIndex > -1) {
            // Initialize gameHistory if it doesn't exist
            if (!allUsersForStat[userIndex].gameHistory) {
                allUsersForStat[userIndex].gameHistory = [];
            }

            // Create a new game record
            const gameRecord = {
                date: new Date().toISOString(),
                timeTaken: elapsedTimeInSeconds,
                difficulty: currentDifficultySetting
            };
            allUsersForStat[userIndex].gameHistory.push(gameRecord);

            // gamesCompleted can be derived from gameHistory.length, so direct increment is removed.
            // allUsersForStat[userIndex].gamesCompleted = (allUsersForStat[userIndex].gamesCompleted || 0) + 1; // Removed

            // Update lastDifficulty
            allUsersForStat[userIndex].lastDifficulty = currentDifficultySetting;

            // Remove the just-completed game from savedGamesList
            if (activeGameId && allUsersForStat[userIndex].savedGamesList) {
                allUsersForStat[userIndex].savedGamesList = allUsersForStat[userIndex].savedGamesList.filter(
                    game => game.id !== activeGameId
                );
                // console.log(`Game session ${activeGameId} removed from saved list after winning.`);
            }

            localStorage.setItem('sudokuUsers', JSON.stringify(allUsersForStat));
            activeGameId = null; // Current game session is finished.
        } else {
            console.warn(`Could not find user '${activeUsernameForStat}' to update game history stat.`);
        }
    } else {
        console.warn("No active user found to update gamesCompleted stat.");
    }

    // Prepare time string for message from elapsedTimeInSeconds
    const minutes = Math.floor(elapsedTimeInSeconds / 60);
    const seconds = elapsedTimeInSeconds % 60;
    const timeString = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

    displayMessage(`Congratulations, ${currentGameUsername}! You solved it in ${timeString} on ${currentDifficultySetting} difficulty!`, "success");
    disableAllCells();
    return true; // All cells filled correctly
}

function displayMessage(msg, type = "info") { // type can be "info", "success", "error"
    messageArea.textContent = msg;
    messageArea.className = 'message-area'; // Reset classes
    if (type === "success") {
        messageArea.classList.add('message-success');
    } else if (type === "error") {
        messageArea.classList.add('message-error');
    }
}

function clearMessage() {
    messageArea.textContent = '';
    messageArea.className = 'message-area';
}

function disableAllCells() {
    // Query all relevant input cells directly if cellInputs array is not maintained
    const cells = document.querySelectorAll('#game-board input');
    cells.forEach(cell => {
        cell.setAttribute('readonly', true);
    });
}
function enableAllCells() {
    // This is primarily handled by renderBoard, which removes readonly
    // from non-prefilled cells. This function can be used if a global
    // enable is needed outside of renderBoard context.
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) { // Only enable non-prefilled cells
                 const cell = getCellElement(r,c);
                 if(cell) cell.removeAttribute('readonly');
            }
        }
    }
}

console.log("Sudoku script loaded.");
