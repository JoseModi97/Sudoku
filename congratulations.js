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

    // Fireworks Animation
    const canvas = document.getElementById('fireworks-canvas');
    const ctx = canvas.getContext('2d');
    let fireworks = [];
    let particles = [];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    function Firework(x, y, targetX, targetY, color) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.color = color;
        this.speed = 3; // Speed of rocket
        this.angle = Math.atan2(targetY - y, targetX - x);
        this.distanceToTarget = Math.sqrt((targetX - x)**2 + (targetY - y)**2);
        this.distanceTraveled = 0;
        this.coordinates = [];
        this.coordinateCount = 3; // Trail length

        for (let i = 0; i < this.coordinateCount; i++) {
            this.coordinates.push([this.x, this.y]);
        }
    }

    Firework.prototype.update = function(index) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);

        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;
        this.x += vx;
        this.y += vy;
        this.distanceTraveled += Math.sqrt(vx**2 + vy**2);


        if (this.distanceTraveled >= this.distanceToTarget) {
            createParticles(this.targetX, this.targetY, this.color);
            fireworks.splice(index, 1); // Remove this firework
        }
    };

    Firework.prototype.draw = function() {
        ctx.beginPath();
        ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    function Particle(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 2 + 1;
        this.speed = Math.random() * 5 + 2; // Explosion speed
        this.angle = Math.random() * Math.PI * 2;
        this.gravity = 0.08; // Increased gravity for more noticeable fall
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.015; // Faster decay
        this.velX = Math.cos(this.angle) * this.speed;
        this.velY = Math.sin(this.angle) * this.speed;
    }

    Particle.prototype.update = function(index) {
        this.velY += this.gravity;
        this.x += this.velX;
        this.y += this.velY;
        this.alpha -= this.decay;

        if (this.alpha <= this.decay) { // Remove particle if almost invisible
            particles.splice(index, 1);
        }
    };

    Particle.prototype.draw = function() {
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.globalAlpha = 1; // Reset globalAlpha
    };

    function createParticles(x, y, color) {
        const particleCount = 100; // Number of particles per explosion
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function getRandomColor() {
        const colors = ['#FFEB3B', '#FFC107', '#FF5722', '#F44336', '#E91E63', '#9C27B0', '#2196F3', '#4CAF50', '#CDDC39'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    let lastLaunchTime = 0;
    const launchInterval = 1000; // Launch a new firework every 1 second (1000ms)
    let autoLaunchCount = 0;
    const maxAutoLaunches = 10; // Launch 10 fireworks automatically then stop

    function launchFirework(currentTime) {
        if (autoLaunchCount >= maxAutoLaunches) return; // Stop after max launches

        if (currentTime - lastLaunchTime > launchInterval) {
            const startX = canvas.width * Math.random(); // Launch from random bottom position
            const startY = canvas.height;
            const targetX = startX + (Math.random() - 0.5) * (canvas.width / 3); // Target somewhere above
            const targetY = Math.random() * (canvas.height / 2); // Explode in top half
            const color = getRandomColor();
            fireworks.push(new Firework(startX, startY, targetX, targetY, color));
            lastLaunchTime = currentTime;
            autoLaunchCount++;
        }
    }

    function animate(currentTime = 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Semi-transparent black for trails
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        launchFirework(currentTime);

        for (let i = fireworks.length - 1; i >= 0; i--) {
            fireworks[i].update(i);
            fireworks[i].draw();
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update(i);
            particles[i].draw();
        }

        // Only continue animation if there are fireworks or particles, or if we haven't launched all auto fireworks
        if (fireworks.length > 0 || particles.length > 0 || autoLaunchCount < maxAutoLaunches) {
            requestAnimationFrame(animate);
        } else {
            // Optional: clear canvas or leave last frame after all fireworks are done
            // ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            // ctx.fillRect(0, 0, canvas.width, canvas.height);
            console.log("Fireworks animation complete.");
        }
    }

    // Start the animation
    animate();
});
