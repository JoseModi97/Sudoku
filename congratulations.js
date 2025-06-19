document.addEventListener('DOMContentLoaded', () => {
    const congratsMessageElement = document.getElementById('congrats-message');
    const gameStatsElement = document.getElementById('game-stats');

    // Get data from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');
    const timeTaken = urlParams.get('time');
    const difficulty = urlParams.get('difficulty');

    if (username) {
        congratsMessageElement.textContent = `Well done, ${decodeURIComponent(username)}! You're a Sudoku Master!`;
    } else {
        congratsMessageElement.textContent = "Amazing job! You're a Sudoku Master!";
    }

    if (timeTaken && difficulty) {
        gameStatsElement.textContent = `You solved the puzzle in ${decodeURIComponent(timeTaken)} on ${decodeURIComponent(difficulty)} difficulty.`;
    } else {
        gameStatsElement.textContent = "You showed that puzzle who's boss!";
    }
});
