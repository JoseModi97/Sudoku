// Global Variables
let board = []; // 9x9 array for the current puzzle state
let solution = []; // 9x9 array for the solved puzzle
let timerInterval;
let timeRemaining = 300; // 5 minutes in seconds

// DOM Element References
let timerDisplay;
let gameBoardElement;
let newGameBtn;
let messageArea;
let cellInputs = []; // Will store references to all 81 input cells

document.addEventListener('DOMContentLoaded', () => {
    timerDisplay = document.getElementById('timer');
    gameBoardElement = document.getElementById('game-board');
    newGameBtn = document.getElementById('new-game-btn');
    messageArea = document.getElementById('message-area');

    // Get cell input references (assuming they are already in the HTML)
    // This might be better done during renderBoard if cells are dynamically created
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = getCellElement(r, c);
            if (cell) { // Ensure cell exists
                cellInputs.push(cell);
                cell.addEventListener('input', handleInput);
            } else {
                console.error(`Cell element cell-${r}-${c} not found.`);
            }
        }
    }

    newGameBtn.addEventListener('click', setupNewGame);
    setupNewGame();
});

function getCellElement(row, col) {
    return document.getElementById(`cell-${row}-${col}`);
}

function setupNewGame() {
    clearInterval(timerInterval);
    timeRemaining = 300; // Reset to 5 minutes
    updateTimerDisplay(); // Show initial time

    const puzzleAndSolution = generateSudokuPuzzle();
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
            if (checkWinCondition()) {
                clearInterval(timerInterval);
                displayMessage("Congratulations! You solved it!", "success");
                disableAllCells();
            }
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
    let cellsToRemove = 40;
    let attempts = 0; // Prevent infinite loop for very difficult puzzles
    while (cellsToRemove > 0 && attempts < 1000) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== 0) {
            puzzle[r][c] = 0; // Mark as empty
            cellsToRemove--;
        }
        attempts++;
    }
    return { puzzle: puzzle, solution: solvedBoard };
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
    clearInterval(timerInterval); // Clear any existing timer
    timerInterval = setInterval(decrementTimer, 1000);
    updateTimerDisplay(); // Display initial time immediately
}

function decrementTimer() {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        displayMessage("Time's up! Game Over.", "error");
        disableAllCells();
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerDisplay.textContent = `Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function checkWinCondition() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0 || board[r][c] !== solution[r][c]) {
                return false; // Not all cells are filled correctly
            }
        }
    }
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
    cellInputs.forEach(cell => {
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
