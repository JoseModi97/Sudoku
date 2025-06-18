// Global Variables
let board = []; // 9x9 array for the current puzzle state
let solution = []; // 9x9 array for the solved puzzle
let timerInterval;
let elapsedTimeInSeconds = 0; // For the elapsed timer

// Global Variables (continued)
let currentDifficulty = 'medium'; // Can be updated by getSelectedDifficulty

// DOM Element References
let timerDisplayElement; // For the timer display itself
let gameBoardElement;    // For the game board container
let newGameBtn;
let messageArea;
let usernameInput;       // For the username input field
// cellInputs array is not strictly needed if we query cells by ID or use event.target

document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements once the DOM is ready
    timerDisplayElement = document.getElementById('timer');
    gameBoardElement = document.getElementById('game-board');
    newGameBtn = document.getElementById('new-game-btn');
    messageArea = document.getElementById('message-area');
    usernameInput = document.getElementById('username-input');

    if (!timerDisplayElement) console.error("Timer display element not found!");
    if (!gameBoardElement) console.error("Game board element not found!");
    if (!newGameBtn) console.error("New Game button not found!");
    if (!messageArea) console.error("Message area element not found!");
    if (!usernameInput) console.error("Username input element not found!");

    // Load username from cookie
    const savedUsername = getCookie('sudokuUsername');
    if (savedUsername && usernameInput) {
        usernameInput.value = savedUsername;
    }

    // Event listener for the New Game button
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
    // Save username if entered
    if (usernameInput) {
        const currentUsername = usernameInput.value.trim();
        if (currentUsername) { // Only save if not empty
            setCookie('sudokuUsername', currentUsername, 30); // Save for 30 days
        }
        // Optional: To delete cookie if username is cleared
        // else { setCookie('sudokuUsername', '', -1); }
    }

    // clearInterval(timerInterval); // startTimer will handle this
    // timeRemaining = 300; // Reset to 5 minutes -> No longer needed for elapsed timer

    // Ensure board and timer are visible before starting everything
    if (gameBoardElement) {
        gameBoardElement.style.display = 'grid';
    } else {
        console.error("Game board element reference is missing in setupNewGame.");
        // Fallback query if not initialized, though it should be
        const gb = document.getElementById('game-board');
        if (gb) gb.style.display = 'grid';
    }

    if (timerDisplayElement) {
        timerDisplayElement.style.display = 'block'; // Or appropriate (e.g., 'flex' if it's a flex container)
    } else {
        console.error("Timer display element reference is missing in setupNewGame.");
        const td = document.getElementById('timer');
        if (td) td.style.display = 'block';
    }

    // updateTimerDisplay(); // startTimer will call this after resetting time
    currentDifficulty = getSelectedDifficulty(); // Update difficulty setting
    const puzzleAndSolution = generateSudokuPuzzle(); // Uses currentDifficulty
    board = puzzleAndSolution.puzzle;
    solution = puzzleAndSolution.solution;

    renderBoard();
    clearMessage();
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
    const difficulty = getSelectedDifficulty();
    let cellsToActuallyRemove;
    if (difficulty === 'easy') {
        cellsToActuallyRemove = 30; // Fewer cells removed for easy
    } else if (difficulty === 'hard') {
        cellsToActuallyRemove = 50; // More cells removed for hard
    } else { // Medium or default
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
    // console.log(`Difficulty: ${currentDifficulty}, Target remove: ${cellsToActuallyRemove}, Actually removed: ${removedCount}`);

    return { puzzle: puzzle, solution: solvedBoard };
}

function getSelectedDifficulty() {
    const checkedRadio = document.querySelector('input[name="difficulty"]:checked');
    return checkedRadio ? checkedRadio.value : 'medium'; // Default to medium
}

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

// Cookie Helper Functions
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/; SameSite=Lax";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
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
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    // Prepare time string for message from elapsedTimeInSeconds
    const minutes = Math.floor(elapsedTimeInSeconds / 60);
    const seconds = elapsedTimeInSeconds % 60;
    const timeString = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

    displayMessage(`Congratulations! You solved it in ${timeString}!`, "success");
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
