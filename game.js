'use strict';

// Wait for the DOM to be fully loaded before running the script
window.addEventListener('load', () => {
    console.log("DOM loaded, initializing game setup...");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Fatal Error: Canvas element with ID 'gameCanvas' not found!");
        return;
    }
    console.log("Canvas element obtained:", canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Fatal Error: Unable to get 2D rendering context!");
        alert("Your browser does not support the HTML5 Canvas element. Please update or use a different browser.");
        return;
    }
    console.log("2D context obtained:", ctx);

    // --- Game Configuration ---
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const arenaPadding = 10;
    const arenaX = arenaPadding;
    const arenaY = arenaPadding;
    const arenaWidth = canvasWidth - 2 * arenaPadding;
    const arenaHeight = canvasHeight - 2 * arenaPadding;
    const projectileSpeed = 400;
    const enemySpeed = 100;
    const scorePerEnemy = 100;
    const initialPlayerLives = 2; // Configurable initial lives

    // UI Config
    const uiFont = "20px 'Courier New', Courier, monospace";
    const uiColor = "#ffffff";
    const scoreX = 25;
    const scoreY = 40;
    const livesX = 670;
    const livesY = 40;
    const lifeIconSpacing = 20;
    const lifeIconColor = "#33ff33";
    const gameOverFontLarge = "48px 'Courier New', Courier, monospace";
    const gameOverFontMedium = "24px 'Courier New', Courier, monospace";
    const gameOverColor = "#ff3333"; // Red

    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
    console.log(`Arena dimensions: ${arenaWidth}x${arenaHeight} at (${arenaX},${arenaY})`);

    // --- Class Definitions ---

    class Player {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 15;
            this.height = 15;
            this.color = '#33ff33';
            this.strokeColor = '#33ff33';
            this.lineWidth = 1.5;
            this.speed = 200;
            this.lives = initialPlayerLives; // Use config
        }

        draw(ctx) {
            const topX = this.x;
            const topY = this.y - this.height / 2;
            const leftX = this.x - this.width / 2;
            const leftY = this.y + this.height / 2;
            const rightX = this.x + this.width / 2;
            const rightY = this.y + this.height / 2;

            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(leftX, leftY);
            ctx.lineTo(rightX, rightY);
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.lineWidth;
            ctx.stroke();
        }

        update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight) {
            const moveAmount = this.speed * deltaTime;
            if (keysPressed['w'] || keysPressed['arrowup']) { this.y -= moveAmount; }
            if (keysPressed['s'] || keysPressed['arrowdown']) { this.y += moveAmount; }
            if (keysPressed['a'] || keysPressed['arrowleft']) { this.x -= moveAmount; }
            if (keysPressed['d'] || keysPressed['arrowright']) { this.x += moveAmount; }

            const halfWidth = this.width / 2;
            const halfHeight = this.height / 2;
            const leftBound = arenaX + halfWidth;
            const rightBound = arenaX + arenaWidth - halfWidth;
            const topBound = arenaY + halfHeight;
            const bottomBound = arenaY + arenaHeight - halfHeight;

            if (this.x < leftBound) { this.x = leftBound; }
            if (this.x > rightBound) { this.x = rightBound; }
            if (this.y < topBound) { this.y = topBound; }
            if (this.y > bottomBound) { this.y = bottomBound; }
        }
    }

    class Projectile {
        constructor(x, y, velocityX, velocityY) {
            this.x = x;
            this.y = y;
            this.velocityX = velocityX;
            this.velocityY = velocityY;
            this.radius = 3;
            this.color = '#33ff33';
        }
        update(deltaTime) {
            this.x += this.velocityX * deltaTime;
            this.y += this.velocityY * deltaTime;
        }
        draw(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        isOffScreen(canvasWidth, canvasHeight) {
            return this.x < -this.radius || this.x > canvasWidth + this.radius ||
                   this.y < -this.radius || this.y > canvasHeight + this.radius;
        }
    }

    class Enemy {
        constructor(x, y, type = 'square') {
            this.x = x;
            this.y = y;
            this.type = type;
            this.width = 30;
            this.height = 30;
            this.color = '#ff00ff';
            this.speed = enemySpeed;
            this.health = 1;
        }
        update(deltaTime) {
            this.y += this.speed * deltaTime;
            if (this.y - this.height / 2 > canvasHeight) {
                this.y = -this.height / 2;
                this.x = Math.random() * arenaWidth + arenaX;
            }
        }
        draw(ctx) {
            if (this.type === 'square') {
                const halfSize = this.width / 2;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x - halfSize, this.y - halfSize, this.width, this.height);
            }
        }
    }

    // --- Game State Definition (Step 11) ---
    const GameState = {
        // MENU: 'menu', // To be added later
        PLAYING: 'playing',
        GAME_OVER: 'gameOver'
    };

    // --- Game State Initialization ---
    let lastTime = 0;
    let mousePos = { x: 0, y: 0 };
    const keysPressed = {};
    let score = 0;
    let currentState = GameState.PLAYING; // Start in PLAYING state (Step 11)

    const player = new Player(canvasWidth / 2, canvasHeight - 50);
    const playerProjectiles = [];
    const enemies = [];

    console.log("Player instance created:", player);

    // --- Helper Functions ---
    function getMousePos(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    function rectRectCollision(rect1, rect2) {
        // AABB Collision Check
        const rect1Left = rect1.x - rect1.width / 2;
        const rect1Right = rect1.x + rect1.width / 2;
        const rect1Top = rect1.y - rect1.height / 2;
        const rect1Bottom = rect1.y + rect1.height / 2;
        const rect2Left = rect2.x - rect2.width / 2;
        const rect2Right = rect2.x + rect2.width / 2;
        const rect2Top = rect2.y - rect2.height / 2;
        const rect2Bottom = rect2.y + rect2.height / 2;
        return rect1Left < rect2Right && rect1Right > rect2Left && rect1Top < rect2Bottom && rect1Bottom > rect2Top;
    }

    function circleRectCollision(circle, rect) {
        // Circle-Rectangle Collision Check
        const rectHalfWidth = rect.width / 2;
        const rectHalfHeight = rect.height / 2;
        const rectLeft = rect.x - rectHalfWidth;
        const rectRight = rect.x + rectHalfWidth;
        const rectTop = rect.y - rectHalfHeight;
        const rectBottom = rect.y + rectHalfHeight;
        const closestX = Math.max(rectLeft, Math.min(circle.x, rectRight));
        const closestY = Math.max(rectTop, Math.min(circle.y, rectBottom));
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
        return distanceSquared < (circle.radius * circle.radius);
    }

    function drawUI(ctx) {
        // Draw Score
        ctx.font = uiFont;
        ctx.fillStyle = uiColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`SCORE: ${score}`, scoreX, scoreY);

        // Draw Lives Text
        ctx.textAlign = 'right';
        ctx.fillText('LIVES:', livesX, livesY);

        // Draw Life Icons
        ctx.fillStyle = lifeIconColor;
        ctx.strokeStyle = lifeIconColor;
        ctx.lineWidth = 1;
        for (let i = 0; i < player.lives; i++) {
            const iconXOffset = livesX + 10 + (i * lifeIconSpacing);
            const topX = iconXOffset;
            const topY = scoreY - 5; // Align vertically approx
            const leftX = iconXOffset - 5;
            const leftY = topY + 10;
            const rightX = iconXOffset + 5;
            const rightY = topY + 10;
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(leftX, leftY);
            ctx.lineTo(rightX, rightY);
            ctx.closePath();
            ctx.fill();
        }
        ctx.textAlign = 'left'; // Reset alignment
    }

    // Added in Step 11: Reset Game Function
    function resetGame() {
        console.log("Resetting game state...");
        score = 0;
        player.lives = initialPlayerLives;
        player.x = canvasWidth / 2;
        player.y = canvasHeight - 50;
        playerProjectiles.length = 0;
        enemies.length = 0;
        // Respawn initial enemies
        spawnInitialEnemies(); // Use a helper for clarity
        console.log("Game reset complete.");
    }

    // Helper to spawn initial set of enemies
    function spawnInitialEnemies() {
        enemies.push(new Enemy(150, 100));
        enemies.push(new Enemy(650, 150));
    }


    // --- Main Game Loop ---
    function gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        // --- State-Dependent Logic (Step 11) ---
        if (currentState === GameState.PLAYING) {

            // 1. Clear Canvas (Inside Playing State)
            ctx.fillStyle = '#050010';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // 2. Update Logic (Inside Playing State)
            player.update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight);
            enemies.forEach(enemy => enemy.update(deltaTime));

            // Update Projectiles & Remove Off-screen ones
            for (let i = playerProjectiles.length - 1; i >= 0; i--) {
                const p = playerProjectiles[i];
                p.update(deltaTime);
                if (p.isOffScreen(canvasWidth, canvasHeight)) {
                    playerProjectiles.splice(i, 1);
                }
            }

            // --- Collision Detection (Inside Playing State) ---
            // Projectile vs Enemy
            for (let i = playerProjectiles.length - 1; i >= 0; i--) {
                const projectile = playerProjectiles[i];
                let projectileHit = false;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (circleRectCollision(projectile, enemy)) {
                        console.log("Collision: Projectile hit Enemy");
                        enemies.splice(j, 1); // Remove enemy
                        score += scorePerEnemy; // Increment score (Step 10)
                        projectileHit = true;
                        // Add effects later
                        break;
                    }
                }
                if (projectileHit) {
                    playerProjectiles.splice(i, 1); // Remove projectile
                }
            }

            // Enemy vs Player
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                if (rectRectCollision(player, enemy)) {
                    console.log("Collision: Enemy hit Player!");
                    enemies.splice(i, 1); // Remove enemy
                    player.lives--;
                    console.log(`Player lives remaining: ${player.lives}`);
                    // Check for Game Over (Step 11)
                    if (player.lives <= 0) {
                        console.log("GAME OVER!");
                        currentState = GameState.GAME_OVER;
                        // Optional: Break or return here if needed to prevent further updates this frame
                    }
                    // Add player hit effects later
                }
            }

            // 3. Draw Logic (Inside Playing State)
            player.draw(ctx);
            playerProjectiles.forEach(p => p.draw(ctx));
            enemies.forEach(enemy => enemy.draw(ctx));

            // Draw Arena Boundaries
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(arenaX, arenaY, arenaWidth, arenaHeight);

            // Draw UI
            drawUI(ctx);

        } else if (currentState === GameState.GAME_OVER) {
            // --- Draw Game Over Screen (Step 11) ---
            // Optional: Only draw static elements once, or draw every frame
            // Draw semi-transparent overlay first if needed on subsequent frames too
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.font = gameOverFontLarge;
            ctx.fillStyle = gameOverColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 40);

            ctx.font = gameOverFontMedium;
            ctx.fillStyle = uiColor; // White for score
            ctx.fillText(`Final Score: ${score}`, canvasWidth / 2, canvasHeight / 2 + 10);

            ctx.font = gameOverFontMedium;
            ctx.fillStyle = uiColor; // White for prompt
            ctx.fillText('Press ENTER to Restart', canvasWidth / 2, canvasHeight / 2 + 60);
        }

        // 4. Request Next Frame (Always run to handle state transitions)
        requestAnimationFrame(gameLoop);
    }

    // --- Event Listeners Setup ---
    console.log("Setting up event listeners...");

    window.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        keysPressed[key] = true;

        // Restart Logic (Step 11)
        if (currentState === GameState.GAME_OVER && key === 'enter') {
            console.log("Restarting game...");
            resetGame(); // Call reset function
            currentState = GameState.PLAYING; // Go back to playing state
        }
        // Optional: event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
        keysPressed[event.key.toLowerCase()] = false;
    });
    canvas.addEventListener('mousemove', (event) => {
        mousePos = getMousePos(canvas, event);
    });
    canvas.addEventListener('mousedown', (event) => {
        // Only allow shooting if playing (Step 11)
        if (currentState === GameState.PLAYING && event.button === 0) { // Left click
            const dx = mousePos.x - player.x;
            const dy = mousePos.y - player.y;
            const angle = Math.atan2(dy, dx);
            const velocityX = Math.cos(angle) * projectileSpeed;
            const velocityY = Math.sin(angle) * projectileSpeed;
            playerProjectiles.push(new Projectile(player.x, player.y, velocityX, velocityY));
        }
    });

    // --- Start the Game ---
    spawnInitialEnemies(); // Spawn enemies before game starts
    console.log("Starting game loop...");
    lastTime = performance.now();
    currentState = GameState.PLAYING; // Explicitly set initial state
    requestAnimationFrame(gameLoop);

}); // End of window.onload listener

console.log("game.js script loaded.");