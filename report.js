document.addEventListener('DOMContentLoaded', () => {
    const reportUserSelect = document.getElementById('report-user-select');
    const performanceSummaryDiv = document.getElementById('performance-summary');
    const summaryUsernameH2 = document.getElementById('summary-username');
    const totalGamesSpan = document.getElementById('total-games');
    const difficultyStatsDiv = document.getElementById('difficulty-stats');
    const performanceAnalysisDiv = document.getElementById('performance-analysis');
    const sharpnessAssessmentDiv = document.getElementById('sharpness-assessment');
    const improvementRoomDiv = document.getElementById('improvement-room');

    // --- Utility functions (can be shared or adapted from welcome.js) ---
    function getUsers() {
        const usersJSON = localStorage.getItem('sudokuUsers');
        if (!usersJSON) return [];
        try {
            const users = JSON.parse(usersJSON);
            return Array.isArray(users) ? users.map(user => ({
                ...user,
                gameHistory: Array.isArray(user.gameHistory) ? user.gameHistory : []
            })) : [];
        } catch (error) {
            console.error("Error parsing sudokuUsers from localStorage:", error);
            return [];
        }
    }

    function findUser(username, usersArray) {
        if (!username || !usersArray) return null;
        const usernameLower = username.toLowerCase();
        return usersArray.find(user => user && user.name && user.name.toLowerCase() === usernameLower);
    }

    // --- Report Page Specific Logic ---
    function populateUserDropdown() {
        const users = getUsers();
        reportUserSelect.innerHTML = ''; // Clear existing

        const defaultOpt = new Option("--- Select User ---", "");
        reportUserSelect.add(defaultOpt);

        users.forEach(user => {
            if (user && user.name) {
                reportUserSelect.add(new Option(user.name, user.name));
            }
        });

        // Optionally, select the last active user or first user if available
        const lastActiveUser = localStorage.getItem('lastActiveUser');
        if (lastActiveUser && users.some(u => u.name === lastActiveUser)) {
            reportUserSelect.value = lastActiveUser;
            displayReportForUser(lastActiveUser);
        }
    }

    function formatTime(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds === null || totalSeconds < 0) return "N/A";
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function displayReportForUser(username) {
        const users = getUsers();
        const selectedUser = findUser(username, users);

        if (!selectedUser || !selectedUser.gameHistory) {
            performanceSummaryDiv.style.display = 'none';
            performanceAnalysisDiv.style.display = 'none';
            return;
        }

        summaryUsernameH2.textContent = `${selectedUser.name}'s Performance`;
        totalGamesSpan.textContent = selectedUser.gameHistory.length.toString();

        difficultyStatsDiv.innerHTML = ''; // Clear previous stats
        const difficulties = ['easy', 'medium', 'hard'];

        // Data collection for improvement suggestions
        let playedDifficulties = { easy: 0, medium: 0, hard: 0 };
        let avgTimes = { easy: null, medium: null, hard: null };

        difficulties.forEach(diff => {
            const gamesForDifficulty = selectedUser.gameHistory.filter(game => game.difficulty === diff);
            const gamesCount = gamesForDifficulty.length;
            let avgTime = null;
            let fastestTime = null;
            let difficultySharpnessText = "N/A";

            playedDifficulties[diff] = gamesCount; // Populate for improvement suggestions

            if (gamesCount > 0) {
                const totalTime = gamesForDifficulty.reduce((sum, game) => sum + game.timeTaken, 0);
                avgTime = Math.round(totalTime / gamesCount);
                if (avgTime !== null) avgTimes[diff] = avgTime; // Populate for improvement suggestions
                fastestTime = gamesForDifficulty.reduce((min, game) => Math.min(min, game.timeTaken), gamesForDifficulty[0].timeTaken);

                // Per-difficulty sharpness assessment
                const benchmarks = {
                    easy: { fast: 60, good: 120, fair: 180 },
                    medium: { fast: 180, good: 300, fair: 420 },
                    hard: { fast: 360, good: 600, fair: 900 }
                };
                if (avgTime <= benchmarks[diff].fast) {
                    difficultySharpnessText = "Excellent! Very fast times.";
                } else if (avgTime <= benchmarks[diff].good) {
                    difficultySharpnessText = "Great! Solid and speedy.";
                } else if (avgTime <= benchmarks[diff].fair) {
                    difficultySharpnessText = "Good! Consistent effort.";
                } else {
                    difficultySharpnessText = "Keep practicing to improve speed!";
                }
                if (gamesCount < 3) { // Add a note if not many games played
                    difficultySharpnessText += " (Play more for fuller assessment)";
                }
            }

            const block = document.createElement('div');
            block.className = 'difficulty-block';
            block.innerHTML = `
                <h4>${diff.charAt(0).toUpperCase() + diff.slice(1)}</h4>
                <p>Games Played: <span>${gamesCount}</span></p>
                <p>Average Time: <span>${formatTime(avgTime)}</span></p>
                <p>Fastest Time: <span>${formatTime(fastestTime)}</span></p>
                <p>Sharpness: <span>${difficultySharpnessText}</span></p>
            `;
            difficultyStatsDiv.appendChild(block);
        });

        performanceSummaryDiv.style.display = 'block';

        // Clear old overall sharpness assessment
        sharpnessAssessmentDiv.innerHTML = '';

        // Refined Improvement Suggestions
        let improvementText = "";
        if (selectedUser.gameHistory.length < 5) {
            improvementText += "Play a few more games across different difficulties to get personalized improvement tips! ";
        }

        if (playedDifficulties.easy > 0 && (avgTimes.easy !== null && avgTimes.easy < 120)) { // Fast at easy
            if (playedDifficulties.medium === 0) {
                improvementText += "You're doing great on 'Easy'! Try stepping up to 'Medium' puzzles. ";
            }
        }
        if (playedDifficulties.medium > 0 && (avgTimes.medium !== null && avgTimes.medium < 300)) { // Fast at medium
            if (playedDifficulties.hard === 0) {
                improvementText += "Excellent performance on 'Medium'! Ready for the 'Hard' challenge? ";
            }
        }

        if (avgTimes.hard !== null && avgTimes.hard > 900 && playedDifficulties.hard > 2) { // Slow on hard
            improvementText += "Practice on 'Hard' puzzles can help improve your completion times. ";
        } else if (playedDifficulties.hard > 0 && (avgTimes.hard !== null && avgTimes.hard <= 600)) { // Good on hard
             improvementText += "You're mastering 'Hard' puzzles! Keep pushing your limits! ";
        }

        if (improvementText.trim() === "") { // Check if trim is needed if only the initial part was added
            improvementText = "Keep enjoying the game and challenging yourself!";
        }

        improvementRoomDiv.innerHTML = `<p><strong>Room for Improvement:</strong> ${improvementText.trim()}</p>`;

        performanceAnalysisDiv.style.display = 'block';
    }

    // Event Listeners
    reportUserSelect.addEventListener('change', () => {
        const selectedUsername = reportUserSelect.value;
        if (selectedUsername) {
            localStorage.setItem('lastActiveUser', selectedUsername); // Remember selection for next time
            displayReportForUser(selectedUsername);
        } else {
            performanceSummaryDiv.style.display = 'none';
            performanceAnalysisDiv.style.display = 'none';
        }
    });

    // Initial Load
    populateUserDropdown();
});
