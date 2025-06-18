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

document.addEventListener('DOMContentLoaded', () => {
    timerDisplayElement = document.getElementById('timer');
    gameBoardElement = document.getElementById('game-board');
    newGameBtn = document.getElementById('new-game-btn');
    messageArea = document.getElementById('message-area');

    if (!timerDisplayElement) console.error("Timer display element not found!");
    if (!gameBoardElement) console.error("Game board element not found!");
    if (!newGameBtn) console.error("New Game button not found!");
    if (!messageArea) console.error("Message area element not found!");

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
    setupNewGame();

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
});

function getCellElement(row, col) {
    return document.getElementById(`cell-${row}-${col}`);
}

function setupNewGame() {
    // Username and difficulty are now loaded from localStorage via global vars.
    // No need to save username here (done on welcome page).
    // No need to read difficulty from radio buttons here.

    // clearInterval(timerInterval); // startTimer will handle this

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
    const puzzleAndSolution = generateSudokuPuzzle(); // Uses currentDifficultySetting
    board = puzzleAndSolution.puzzle;
    solution = puzzleAndSolution.solution;

    renderBoard();
    // Display a welcome/info message with current settings
    displayMessage(`Playing as: ${currentGameUsername} | Difficulty: ${currentDifficultySetting}. Good luck!`, "info");
    startTimer();
    enableAllCells(); // Make sure cells are enabled for a new game
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
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    elapsedTimeInSeconds = 0; // Reset elapsed time
    updateTimerDisplay(); // Display 00:00 immediately
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

function checkWinCondition() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0 || board[r][c] !== solution[r][c]) {
                return false; // Not all cells are filled correctly or some are empty
            }
        }
    }
    // If loop completes, all cells are filled and correct - it's a win
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // Increment gamesCompleted for the active user
    const activeUsernameForStat = localStorage.getItem('activeUsername'); // Re-fetch for safety, though currentGameUsername should be set
    if (activeUsernameForStat) {
        const allUsersJSONForStat = localStorage.getItem('sudokuUsers');
        let allUsersForStat = allUsersJSONForStat ? JSON.parse(allUsersJSONForStat) : [];
        const userIndex = allUsersForStat.findIndex(user => user.name === activeUsernameForStat);

        if (userIndex > -1) {
            allUsersForStat[userIndex].gamesCompleted = (allUsersForStat[userIndex].gamesCompleted || 0) + 1;
            // Also update their lastDifficulty with the one used for this game, if it changed from their default
            // This assumes currentDifficultySetting reflects the difficulty of the just-completed game.
            allUsersForStat[userIndex].lastDifficulty = currentDifficultySetting;
            localStorage.setItem('sudokuUsers', JSON.stringify(allUsersForStat));
        } else {
            console.warn(`Could not find user '${activeUsernameForStat}' to update gamesCompleted stat.`);
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
