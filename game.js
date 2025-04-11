'use strict';

// Wait for the DOM to be fully loaded before running the script
window.addEventListener('load', () => {
    console.log("DOM loaded, initializing game setup...");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error("Fatal Error: Canvas element with ID 'gameCanvas' not found!"); return; }
    console.log("Canvas element obtained:", canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("Fatal Error: Unable to get 2D rendering context!"); alert("Your browser does not support the HTML5 Canvas element."); return; }
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
    const initialPlayerLives = 3;

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
    const gameOverColor = "#ff3333";

    // Added Step 12: Wave Configuration
    const waveConfigs = [
        { wave: 1, enemies: [{ type: 'square', count: 3 }] },
        { wave: 2, enemies: [{ type: 'square', count: 5 }] },
        { wave: 3, enemies: [{ type: 'square', count: 7 }] },
        { wave: 4, enemies: [{ type: 'square', count: 10 }] }, // Increase difficulty
        // { wave: 5, enemies: [{ type: 'square', count: 6 }, { type: 'circle', count: 2 }] }, // Example with future types
        // Add more complex wave definitions here
    ];

    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
    console.log(`Arena dimensions: ${arenaWidth}x${arenaHeight} at (${arenaX},${arenaY})`);

    // --- Class Definitions ---

    class Player { /* ... Player class remains the same ... */
        constructor(x, y) {
            this.x = x; this.y = y; this.width = 15; this.height = 15;
            this.color = '#33ff33'; this.strokeColor = '#33ff33'; this.lineWidth = 1.5;
            this.speed = 200; this.lives = initialPlayerLives;
        }
        draw(ctx) {
            const topX = this.x, topY = this.y - this.height / 2;
            const leftX = this.x - this.width / 2, leftY = this.y + this.height / 2;
            const rightX = this.x + this.width / 2, rightY = this.y + this.height / 2;
            ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(leftX, leftY); ctx.lineTo(rightX, rightY); ctx.closePath();
            ctx.fillStyle = this.color; ctx.fill(); ctx.strokeStyle = this.strokeColor; ctx.lineWidth = this.lineWidth; ctx.stroke();
        }
        update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight) {
            const moveAmount = this.speed * deltaTime;
            if (keysPressed['w'] || keysPressed['arrowup']) { this.y -= moveAmount; }
            if (keysPressed['s'] || keysPressed['arrowdown']) { this.y += moveAmount; }
            if (keysPressed['a'] || keysPressed['arrowleft']) { this.x -= moveAmount; }
            if (keysPressed['d'] || keysPressed['arrowright']) { this.x += moveAmount; }
            const halfWidth = this.width / 2, halfHeight = this.height / 2;
            const leftBound = arenaX + halfWidth, rightBound = arenaX + arenaWidth - halfWidth;
            const topBound = arenaY + halfHeight, bottomBound = arenaY + arenaHeight - halfHeight;
            if (this.x < leftBound) { this.x = leftBound; } if (this.x > rightBound) { this.x = rightBound; }
            if (this.y < topBound) { this.y = topBound; } if (this.y > bottomBound) { this.y = bottomBound; }
        }
    }

    class Projectile { /* ... Projectile class remains the same ... */
        constructor(x, y, velocityX, velocityY) {
            this.x = x; this.y = y; this.velocityX = velocityX; this.velocityY = velocityY;
            this.radius = 3; this.color = '#33ff33';
        }
        update(deltaTime) { this.x += this.velocityX * deltaTime; this.y += this.velocityY * deltaTime; }
        draw(ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); }
        isOffScreen(w, h) { return this.x < -this.radius || this.x > w + this.radius || this.y < -this.radius || this.y > h + this.radius; }
    }

    class Enemy { /* ... Enemy class remains the same ... */
        constructor(x, y, type = 'square') {
            this.x = x; this.y = y; this.type = type; this.width = 30; this.height = 30;
            this.color = '#ff00ff'; this.speed = enemySpeed; this.health = 1;
        }
        update(deltaTime) {
            this.y += this.speed * deltaTime;
            if (this.y - this.height / 2 > canvasHeight) {
                this.y = -this.height / 2; this.x = Math.random() * arenaWidth + arenaX;
            }
        }
        draw(ctx) {
            if (this.type === 'square') {
                const halfSize = this.width / 2;
                ctx.strokeStyle = this.color; ctx.lineWidth = 2;
                ctx.strokeRect(this.x - halfSize, this.y - halfSize, this.width, this.height);
            }
        }
    }

    // --- Game State Definition ---
    const GameState = { PLAYING: 'playing', GAME_OVER: 'gameOver' };

    // --- Game State Initialization ---
    let lastTime = 0;
    let mousePos = { x: 0, y: 0 };
    const keysPressed = {};
    let score = 0;
    let currentState = GameState.PLAYING;
    let currentWave = 1; // Added Step 12

    const player = new Player(canvasWidth / 2, canvasHeight - 50);
    const playerProjectiles = [];
    const enemies = [];

    console.log("Player instance created:", player);

    // --- Helper Functions ---
    function getMousePos(canvas, event) { /* ... remains the same ... */
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    function rectRectCollision(rect1, rect2) { /* ... remains the same ... */
        const r1L = rect1.x - rect1.width / 2, r1R = rect1.x + rect1.width / 2;
        const r1T = rect1.y - rect1.height / 2, r1B = rect1.y + rect1.height / 2;
        const r2L = rect2.x - rect2.width / 2, r2R = rect2.x + rect2.width / 2;
        const r2T = rect2.y - rect2.height / 2, r2B = rect2.y + rect2.height / 2;
        return r1L < r2R && r1R > r2L && r1T < r2B && r1B > r2T;
    }
    function circleRectCollision(circle, rect) { /* ... remains the same ... */
        const rHW = rect.width / 2, rHH = rect.height / 2;
        const rL = rect.x - rHW, rR = rect.x + rHW;
        const rT = rect.y - rHH, rB = rect.y + rHH;
        const cX = Math.max(rL, Math.min(circle.x, rR));
        const cY = Math.max(rT, Math.min(circle.y, rB));
        const dX = circle.x - cX, dY = circle.y - cY;
        const dSq = (dX * dX) + (dY * dY);
        return dSq < (circle.radius * circle.radius);
    }

    function drawUI(ctx) {
        ctx.font = uiFont;
        ctx.fillStyle = uiColor;
        ctx.textBaseline = 'top';

        // Draw Score
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${score}`, scoreX, scoreY);

        // Draw Wave Number (Added Step 12)
        ctx.textAlign = 'center'; // Center align wave text
        ctx.fillText(`WAVE: ${currentWave}`, canvasWidth / 2, scoreY); // Position top-center

        // Draw Lives Text
        ctx.textAlign = 'right';
        ctx.fillText('LIVES:', livesX, livesY);

        // Draw Life Icons
        ctx.fillStyle = lifeIconColor;
        ctx.strokeStyle = lifeIconColor;
        ctx.lineWidth = 1;
        for (let i = 0; i < player.lives; i++) {
            const iconXOffset = livesX + 10 + (i * lifeIconSpacing);
            const topX = iconXOffset, topY = scoreY - 5;
            const leftX = iconXOffset - 5, leftY = topY + 10;
            const rightX = iconXOffset + 5, rightY = topY + 10;
            ctx.beginPath(); ctx.moveTo(topX, topY); ctx.lineTo(leftX, leftY); ctx.lineTo(rightX, rightY); ctx.closePath(); ctx.fill();
        }
        ctx.textAlign = 'left'; // Reset alignment
    }

    // Added Step 12: Start Wave Function
    function startWave(waveNumber) {
        console.log(`Starting Wave ${waveNumber}`);
        currentWave = waveNumber; // Update state

        const config = waveConfigs.find(w => w.wave === waveNumber);
        if (!config) {
            console.log("All defined waves completed! (Or wave config missing)");
            // Implement looping or end condition later
            return; // Stop spawning if config not found
        }

        // Clear existing enemies? No, assume cleared before calling startWave or handled by game state reset.

        config.enemies.forEach(enemyGroup => {
            // In the future, use enemyGroup.type
            const enemyType = enemyGroup.type; // Currently always 'square'
            for (let i = 0; i < enemyGroup.count; i++) {
                // Spawn near top edge, random X within arena
                const spawnX = Math.random() * arenaWidth + arenaX;
                const spawnY = -50; // Start slightly above screen
                enemies.push(new Enemy(spawnX, spawnY, enemyType));
            }
        });
         console.log(`Spawned enemies for wave ${currentWave}. Total enemies: ${enemies.length}`);
    }


    function resetGame() { // Updated Step 12
        console.log("Resetting game state...");
        score = 0;
        player.lives = initialPlayerLives;
        player.x = canvasWidth / 2;
        player.y = canvasHeight - 50;
        playerProjectiles.length = 0;
        enemies.length = 0; // Clear enemies array
        currentWave = 1; // Reset wave number (Step 12)
        startWave(1); // Start the first wave (Step 12)
        console.log("Game reset complete.");
    }

    // Removed spawnInitialEnemies() function (Step 12)

    // --- Main Game Loop ---
    function gameLoop(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        if (currentState === GameState.PLAYING) {
            // 1. Clear Canvas
            ctx.fillStyle = '#050010';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // 2. Update Logic
            player.update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight);
            enemies.forEach(enemy => enemy.update(deltaTime));

            // Update Projectiles
            for (let i = playerProjectiles.length - 1; i >= 0; i--) {
                const p = playerProjectiles[i];
                p.update(deltaTime);
                if (p.isOffScreen(canvasWidth, canvasHeight)) { playerProjectiles.splice(i, 1); }
            }

            // --- Collision Detection ---
            // Projectile vs Enemy
            for (let i = playerProjectiles.length - 1; i >= 0; i--) {
                const projectile = playerProjectiles[i];
                let projectileHit = false;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (circleRectCollision(projectile, enemy)) {
                        console.log("Collision: Projectile hit Enemy");
                        enemies.splice(j, 1);
                        score += scorePerEnemy;
                        projectileHit = true;
                        break;
                    }
                }
                if (projectileHit) { playerProjectiles.splice(i, 1); }
            }
            // Enemy vs Player
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                if (rectRectCollision(player, enemy)) {
                    console.log("Collision: Enemy hit Player!");
                    enemies.splice(i, 1);
                    player.lives--;
                    console.log(`Player lives remaining: ${player.lives}`);
                    if (player.lives <= 0) {
                        console.log("GAME OVER!");
                        currentState = GameState.GAME_OVER;
                    }
                }
            }

            // Added Step 12: Check for Wave Completion
            if (enemies.length === 0 && currentWave < waveConfigs.length) { // Check if all enemies are defeated
                console.log(`Wave ${currentWave} cleared!`);
                startWave(currentWave + 1); // Start the next wave
            }

            // 3. Draw Logic
            player.draw(ctx);
            playerProjectiles.forEach(p => p.draw(ctx));
            enemies.forEach(enemy => enemy.draw(ctx));
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; // Arena Border
            ctx.strokeRect(arenaX, arenaY, arenaWidth, arenaHeight);
            drawUI(ctx); // Draw Score, Lives, Wave

        } else if (currentState === GameState.GAME_OVER) {
            // Draw Game Over Screen
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.font = gameOverFontLarge; ctx.fillStyle = gameOverColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 40);
            ctx.font = gameOverFontMedium; ctx.fillStyle = uiColor;
            ctx.fillText(`Final Score: ${score}`, canvasWidth / 2, canvasHeight / 2 + 10);
            ctx.fillText('Press ENTER to Restart', canvasWidth / 2, canvasHeight / 2 + 60);
        }

        // 4. Request Next Frame
        requestAnimationFrame(gameLoop);
    }

    // --- Event Listeners Setup ---
    console.log("Setting up event listeners...");
    window.addEventListener('keydown', (event) => { /* ... keydown listener remains the same (includes restart) ... */
        const key = event.key.toLowerCase();
        keysPressed[key] = true;
        if (currentState === GameState.GAME_OVER && key === 'enter') {
            console.log("Restarting game..."); resetGame(); currentState = GameState.PLAYING;
        }
    });
    window.addEventListener('keyup', (event) => { /* ... keyup listener remains the same ... */
        keysPressed[event.key.toLowerCase()] = false;
    });
    canvas.addEventListener('mousemove', (event) => { /* ... mousemove listener remains the same ... */
        mousePos = getMousePos(canvas, event);
    });
    canvas.addEventListener('mousedown', (event) => { /* ... mousedown listener remains the same (includes PLAYING check) ... */
        if (currentState === GameState.PLAYING && event.button === 0) {
            const dx = mousePos.x - player.x, dy = mousePos.y - player.y, angle = Math.atan2(dy, dx);
            const vX = Math.cos(angle) * projectileSpeed, vY = Math.sin(angle) * projectileSpeed;
            playerProjectiles.push(new Projectile(player.x, player.y, vX, vY));
        }
    });

    // --- Start the Game ---
    console.log("Starting game...");
    resetGame(); // Call resetGame once to set initial state and start wave 1 (Step 12 change)
    // currentState = GameState.PLAYING; // Set by resetGame now
    lastTime = performance.now();
    requestAnimationFrame(gameLoop); // Start the main loop

}); // End of window.onload listener

console.log("game.js script loaded.");