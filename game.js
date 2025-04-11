'use strict';

window.addEventListener('load', () => {
    console.log("DOM loaded, initializing game setup...");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    console.log("Canvas element obtained:", canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { console.error("2D context not supported!"); alert("Canvas not supported!"); return; }
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
    const initialPlayerLives = 3;
    const scorePerEnemy = 100;

    // Enemy Base Config
    const baseEnemySpeed = 100;

    // Enemy Type Config (Step 13)
    const squareEnemyConfig = {
        type: 'square', shape: 'rect',
        color: '#ff00ff', width: 30, height: 30,
        speed: baseEnemySpeed, health: 1
    };
    const circleEnemyConfig = {
        type: 'circle', shape: 'circle',
        color: '#ffff00', // Yellow
        radius: 15,
        speed: baseEnemySpeed * 1.2, // Slightly faster
        health: 1
    };

    // UI Config
    const uiFont = "20px 'Courier New', Courier, monospace"; /* ... other UI vars ... */
    const uiColor = "#ffffff"; const scoreX = 25; const scoreY = 40; const livesX = 670; const livesY = 40;
    const lifeIconSpacing = 20; const lifeIconColor = "#33ff33"; const gameOverFontLarge = "48px 'Courier New', Courier, monospace";
    const gameOverFontMedium = "24px 'Courier New', Courier, monospace"; const gameOverColor = "#ff3333";

    // Wave Configuration (Updated Step 13)
    const waveConfigs = [
        { wave: 1, enemies: [{ type: 'square', count: 3 }] },
        { wave: 2, enemies: [{ type: 'square', count: 5 }] },
        { wave: 3, enemies: [{ type: 'square', count: 4 }, { type: 'circle', count: 2 }] }, // Added Circles
        { wave: 4, enemies: [{ type: 'square', count: 6 }, { type: 'circle', count: 3 }] },
        { wave: 5, enemies: [{ type: 'circle', count: 6 }] }, // Only Circles
        { wave: 6, enemies: [{ type: 'square', count: 10 }, { type: 'circle', count: 5 }] },
        // Add more waves
    ];

    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
    console.log(`Arena dimensions: ${arenaWidth}x${arenaHeight} at (${arenaX},${arenaY})`);

    // --- Class Definitions ---

    class Player { /* ... Player class remains the same ... */
        constructor(x, y) {
            this.x = x; this.y = y; this.width = 15; this.height = 15; this.shape = 'rect'; // Define shape for collision
            this.color = '#33ff33'; this.strokeColor = '#33ff33'; this.lineWidth = 1.5;
            this.speed = 200; this.lives = initialPlayerLives;
        }
        draw(ctx) { /* ... draw remains the same ... */
            const topX = this.x, topY = this.y - this.height / 2; const leftX = this.x - this.width / 2, leftY = this.y + this.height / 2;
            const rightX = this.x + this.width / 2, rightY = this.y + this.height / 2; ctx.beginPath(); ctx.moveTo(topX, topY);
            ctx.lineTo(leftX, leftY); ctx.lineTo(rightX, rightY); ctx.closePath(); ctx.fillStyle = this.color; ctx.fill();
            ctx.strokeStyle = this.strokeColor; ctx.lineWidth = this.lineWidth; ctx.stroke();
        }
        update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight) { /* ... update remains the same ... */
            const moveAmount = this.speed * deltaTime;
            if (keysPressed['w'] || keysPressed['arrowup']) { this.y -= moveAmount; } if (keysPressed['s'] || keysPressed['arrowdown']) { this.y += moveAmount; }
            if (keysPressed['a'] || keysPressed['arrowleft']) { this.x -= moveAmount; } if (keysPressed['d'] || keysPressed['arrowright']) { this.x += moveAmount; }
            const halfWidth = this.width / 2, halfHeight = this.height / 2; const leftBound = arenaX + halfWidth, rightBound = arenaX + arenaWidth - halfWidth;
            const topBound = arenaY + halfHeight, bottomBound = arenaY + arenaHeight - halfHeight; if (this.x < leftBound) { this.x = leftBound; }
            if (this.x > rightBound) { this.x = rightBound; } if (this.y < topBound) { this.y = topBound; } if (this.y > bottomBound) { this.y = bottomBound; }
        }
    }

    class Projectile { /* ... Projectile class remains the same (is a circle) ... */
        constructor(x, y, velocityX, velocityY) {
            this.x = x; this.y = y; this.velocityX = velocityX; this.velocityY = velocityY;
            this.radius = 3; this.color = '#33ff33'; this.shape = 'circle'; // Define shape
        }
        update(deltaTime) { this.x += this.velocityX * deltaTime; this.y += this.velocityY * deltaTime; }
        draw(ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); }
        isOffScreen(w, h) { return this.x < -this.radius || this.x > w + this.radius || this.y < -this.radius || this.y > h + this.radius; }
    }

    // Updated Step 13: Enemy Class handles types
    class Enemy {
        constructor(x, y, type = 'square') {
            this.x = x;
            this.y = y;
            this.type = type;
            this.health = 1; // Default health

            // Set properties based on type
            let config;
            if (type === 'circle') {
                config = circleEnemyConfig;
                this.radius = config.radius;
                this.shape = config.shape;
                this.speed = config.speed;
                this.color = config.color;
                 // Simple diagonal movement vector (can be randomized later)
                const angle = Math.PI / 4; // 45 degrees down-right
                this.vx = Math.cos(angle) * this.speed;
                this.vy = Math.sin(angle) * this.speed;

            } else { // Default to square
                config = squareEnemyConfig;
                this.width = config.width;
                this.height = config.height;
                this.shape = config.shape;
                this.speed = config.speed;
                this.color = config.color;
                this.vx = 0; // Square only moves down
                this.vy = this.speed;
            }
            this.health = config.health;
        }

        update(deltaTime) {
            // Update position based on velocity
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;

            // Simple Wrap-around logic (same for both for now)
            const checkY = this.shape === 'circle' ? this.y - this.radius : this.y - this.height / 2;
            const checkXLeft = this.shape === 'circle' ? this.x - this.radius : this.x - this.width / 2;
            const checkXRight = this.shape === 'circle' ? this.x + this.radius : this.x + this.width / 2;

            if (checkY > canvasHeight) { // Off bottom
                this.y = this.shape === 'circle' ? -this.radius : -this.height / 2;
                this.x = Math.random() * arenaWidth + arenaX; // Randomize X
            }
             // Optional: Wrap X for diagonal movers (can lead to clumping)
            if (checkXRight < 0) { // Off left
                 this.x = canvasWidth + (this.shape === 'circle' ? this.radius : this.width / 2);
            } else if (checkXLeft > canvasWidth) { // Off right
                 this.x = -(this.shape === 'circle' ? this.radius : this.width / 2);
            }
        }

        draw(ctx) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            if (this.shape === 'rect') { // Draw square
                const halfSize = this.width / 2;
                ctx.strokeRect(this.x - halfSize, this.y - halfSize, this.width, this.height);
            } else if (this.shape === 'circle') { // Draw circle
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke(); // Draw outline
            }
        }
    }

    // --- Game State Definition ---
    const GameState = { PLAYING: 'playing', GAME_OVER: 'gameOver' };

    // --- Game State Initialization ---
    let lastTime = 0; let mousePos = { x: 0, y: 0 }; const keysPressed = {};
    let score = 0; let currentState = GameState.PLAYING; let currentWave = 1;
    const player = new Player(canvasWidth / 2, canvasHeight - 50);
    const playerProjectiles = []; const enemies = [];
    console.log("Player instance created:", player);

    // --- Helper Functions ---
    function getMousePos(canvas, event) { /* ... */ const rect = canvas.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }

    // Collision Utilities (Updated Step 13)
    function rectRectCollision(rect1, rect2) { /* ... */
        const r1L=rect1.x-rect1.width/2, r1R=rect1.x+rect1.width/2, r1T=rect1.y-rect1.height/2, r1B=rect1.y+rect1.height/2;
        const r2L=rect2.x-rect2.width/2, r2R=rect2.x+rect2.width/2, r2T=rect2.y-rect2.height/2, r2B=rect2.y+rect2.height/2;
        return r1L<r2R && r1R>r2L && r1T<r2B && r1B>r2T; }
    function circleRectCollision(circle, rect) { /* ... */
        const rHW=rect.width/2, rHH=rect.height/2, rL=rect.x-rHW, rR=rect.x+rHW, rT=rect.y-rHH, rB=rect.y+rHH;
        const cX=Math.max(rL, Math.min(circle.x, rR)), cY=Math.max(rT, Math.min(circle.y, rB));
        const dX=circle.x-cX, dY=circle.y-cY; const dSq=(dX*dX)+(dY*dY); return dSq<(circle.radius*circle.radius); }
    // Added Step 13: Circle-Circle Collision
    function circleCircleCollision(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const distanceSquared = dx * dx + dy * dy;
        const radiiSumSquared = (circle1.radius + circle2.radius) * (circle1.radius + circle2.radius);
        return distanceSquared < radiiSumSquared;
    }

    function drawUI(ctx) { /* ... drawUI remains the same (displays wave number) ... */
        ctx.font = uiFont; ctx.fillStyle = uiColor; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${score}`, scoreX, scoreY); ctx.textAlign = 'center';
        ctx.fillText(`WAVE: ${currentWave}`, canvasWidth / 2, scoreY); ctx.textAlign = 'right';
        ctx.fillText('LIVES:', livesX, livesY); ctx.fillStyle = lifeIconColor; ctx.strokeStyle = lifeIconColor; ctx.lineWidth = 1;
        for (let i = 0; i < player.lives; i++) { const iconXOffset = livesX + 10 + (i * lifeIconSpacing); const topX = iconXOffset, topY = scoreY - 5;
            const leftX = iconXOffset - 5, leftY = topY + 10; const rightX = iconXOffset + 5, rightY = topY + 10; ctx.beginPath();
            ctx.moveTo(topX, topY); ctx.lineTo(leftX, leftY); ctx.lineTo(rightX, rightY); ctx.closePath(); ctx.fill(); }
        ctx.textAlign = 'left';
    }

    function startWave(waveNumber) { /* ... startWave remains the same (uses type from config) ... */
        console.log(`Starting Wave ${waveNumber}`); currentWave = waveNumber;
        const config = waveConfigs.find(w => w.wave === waveNumber);
        if (!config) { console.log("All waves completed!"); return; }
        config.enemies.forEach(group => { const type = group.type;
            for (let i = 0; i < group.count; i++) {
                const spawnX = Math.random() * arenaWidth + arenaX; const spawnY = -50;
                enemies.push(new Enemy(spawnX, spawnY, type)); // Pass type here
            } });
        console.log(`Spawned enemies for wave ${currentWave}. Total: ${enemies.length}`);
    }

    function resetGame() { /* ... resetGame remains the same ... */
        console.log("Resetting game state..."); score = 0; player.lives = initialPlayerLives;
        player.x = canvasWidth / 2; player.y = canvasHeight - 50; playerProjectiles.length = 0; enemies.length = 0;
        currentWave = 1; startWave(1); console.log("Game reset complete.");
    }

    // --- Main Game Loop ---
    function gameLoop(timestamp) {
        const deltaTime = (timestamp - lastTime) / 1000; lastTime = timestamp;

        if (currentState === GameState.PLAYING) {
            // 1. Clear Canvas
            ctx.fillStyle = '#050010'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // 2. Update Logic
            player.update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight);
            enemies.forEach(enemy => enemy.update(deltaTime));
            // Update Projectiles
            for (let i = playerProjectiles.length - 1; i >= 0; i--) {
                const p = playerProjectiles[i]; p.update(deltaTime);
                if (p.isOffScreen(canvasWidth, canvasHeight)) { playerProjectiles.splice(i, 1); }
            }

            // --- Collision Detection (Updated Step 13) ---
            // Projectile vs Enemy
            for (let i = playerProjectiles.length - 1; i >= 0; i--) {
                const projectile = playerProjectiles[i]; // Always a circle
                let projectileHit = false;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    let collision = false;
                    // Check collision based on enemy shape
                    if (enemy.shape === 'rect') {
                        collision = circleRectCollision(projectile, enemy);
                    } else if (enemy.shape === 'circle') {
                        collision = circleCircleCollision(projectile, enemy);
                    }

                    if (collision) {
                        console.log(`Collision: Projectile hit Enemy (${enemy.type})`);
                        enemies.splice(j, 1); score += scorePerEnemy; projectileHit = true; break;
                    }
                }
                if (projectileHit) { playerProjectiles.splice(i, 1); }
            }
            // Enemy vs Player
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                let collision = false;
                // Check collision based on enemy shape (player is always rect here)
                if (enemy.shape === 'rect') {
                    collision = rectRectCollision(player, enemy);
                } else if (enemy.shape === 'circle') {
                    // circleRectCollision expects (circle, rect)
                    collision = circleRectCollision(enemy, player);
                }

                if (collision) {
                    console.log(`Collision: Enemy (${enemy.type}) hit Player!`);
                    enemies.splice(i, 1); player.lives--; console.log(`Player lives remaining: ${player.lives}`);
                    if (player.lives <= 0) { console.log("GAME OVER!"); currentState = GameState.GAME_OVER; }
                    // Add player hit effects later
                }
            }

            // Check for Wave Completion
            if (enemies.length === 0 && currentState === GameState.PLAYING) { // Ensure not already game over
                console.log(`Wave ${currentWave} cleared!`);
                startWave(currentWave + 1);
            }

            // 3. Draw Logic
            player.draw(ctx);
            playerProjectiles.forEach(p => p.draw(ctx));
            enemies.forEach(enemy => enemy.draw(ctx)); // Draws based on type
            ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 2; // Arena Border
            ctx.strokeRect(arenaX, arenaY, arenaWidth, arenaHeight);
            drawUI(ctx);

        } else if (currentState === GameState.GAME_OVER) {
            // Draw Game Over Screen
             ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvasWidth, canvasHeight);
             ctx.font = gameOverFontLarge; ctx.fillStyle = gameOverColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
             ctx.fillText('GAME OVER', canvasWidth / 2, canvasHeight / 2 - 40); ctx.font = gameOverFontMedium; ctx.fillStyle = uiColor;
             ctx.fillText(`Final Score: ${score}`, canvasWidth / 2, canvasHeight / 2 + 10);
             ctx.fillText('Press ENTER to Restart', canvasWidth / 2, canvasHeight / 2 + 60);
        }

        // 4. Request Next Frame
        requestAnimationFrame(gameLoop);
    }

    // --- Event Listeners Setup ---
    console.log("Setting up event listeners...");
    window.addEventListener('keydown', (event) => { /* ... */ const key = event.key.toLowerCase(); keysPressed[key] = true; if (currentState === GameState.GAME_OVER && key === 'enter') { console.log("Restarting game..."); resetGame(); currentState = GameState.PLAYING; } });
    window.addEventListener('keyup', (event) => { /* ... */ keysPressed[event.key.toLowerCase()] = false; });
    canvas.addEventListener('mousemove', (event) => { /* ... */ mousePos = getMousePos(canvas, event); });
    canvas.addEventListener('mousedown', (event) => { /* ... */ if (currentState === GameState.PLAYING && event.button === 0) { const dx = mousePos.x - player.x, dy = mousePos.y - player.y, angle = Math.atan2(dy, dx); const vX = Math.cos(angle) * projectileSpeed, vY = Math.sin(angle) * projectileSpeed; playerProjectiles.push(new Projectile(player.x, player.y, vX, vY)); } });

    // --- Start the Game ---
    console.log("Starting game...");
    resetGame(); // Sets initial state and starts wave 1
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);

}); // End of window.onload listener

console.log("game.js script loaded.");