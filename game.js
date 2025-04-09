'use strict';

// Wait for the DOM to be fully loaded before running the script
window.addEventListener('load', () => {
    console.log("DOM loaded, initializing game setup...");

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Fatal Error: Canvas element with ID 'gameCanvas' not found!");
        return; // Stop execution if canvas isn't found
    }
    console.log("Canvas element obtained:", canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Fatal Error: Unable to get 2D rendering context!");
        alert("Your browser does not support the HTML5 Canvas element. Please update or use a different browser.");
        return; // Stop execution if context isn't supported
    }
    console.log("2D context obtained:", ctx);

    // --- Game Configuration ---
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const arenaPadding = 10; // Padding from canvas edge for arena border
    const arenaX = arenaPadding;
    const arenaY = arenaPadding;
    const arenaWidth = canvasWidth - 2 * arenaPadding;
    const arenaHeight = canvasHeight - 2 * arenaPadding;
    const projectileSpeed = 400; // Moved config together
    const enemySpeed = 100; // Moved config together

    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
    console.log(`Arena dimensions: ${arenaWidth}x${arenaHeight} at (${arenaX},${arenaY})`);

    // --- Class Definitions ---

    // Added in Step 5: Player Representation
    class Player {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 15;     // For collision or reference
            this.height = 15;   // For collision or reference
            this.color = '#33ff33';
            this.strokeColor = '#33ff33';
            this.lineWidth = 1.5;
            this.speed = 200; // Pixels per second
            this.lives = 3;
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

            // Boundary Checks
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

    // Added in Step 7: Projectile Representation
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
                   this.y < -this.radius || this.y > canvasHeight + this.radius; // Allow slightly offscreen before removal
        }
    }

    // Added in Step 8: Basic Enemy Representation (Corrected definition)
    class Enemy {
        constructor(x, y, type = 'square') {
            this.x = x;
            this.y = y;
            this.type = type; // For future expansion
            // Properties specific to type
            this.width = 30; // Example size for square
            this.height = 30; // Example size for square
            this.color = '#ff00ff'; // Magenta for square
            this.speed = enemySpeed; // Use configured speed
            this.health = 1; // Simple enemy, 1 hit
        }

        update(deltaTime) {
            // Basic movement (e.g., move downwards)
            this.y += this.speed * deltaTime;
            // Add boundary checks/wrapping later (e.g., reset to top if off bottom)
             if (this.y - this.height / 2 > canvasHeight) {
                 this.y = -this.height / 2; // Reset position to top
                 this.x = Math.random() * arenaWidth + arenaX; // Randomize X position on wrap
             }
        }

        draw(ctx) {
            // Draw based on type
            if (this.type === 'square') {
                const halfSize = this.width / 2;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.strokeRect(this.x - halfSize, this.y - halfSize, this.width, this.height);
            }
            // Add drawing for other types later
        }
    }

    // --- Game State Initialization ---
    let lastTime = 0;
    let mousePos = { x: 0, y: 0 };
    const keysPressed = {}; // Moved listener setup lower

    const player = new Player(canvasWidth / 2, canvasHeight - 50);
    const playerProjectiles = [];
    const enemies = [];

    console.log("Player instance created:", player);

    // Spawn initial enemies for testing
    enemies.push(new Enemy(150, 100));
    enemies.push(new Enemy(650, 150));
    console.log(`Spawned ${enemies.length} initial enemies.`);

    // --- Helper Functions ---
    function getMousePos(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    // --- Main Game Loop ---
    function gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        // 1. Clear Canvas
        ctx.fillStyle = '#050010';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 2. Update Logic
        player.update(deltaTime, arenaX, arenaY, arenaWidth, arenaHeight);

        // Update Projectiles & Remove Off-screen ones
        for (let i = playerProjectiles.length - 1; i >= 0; i--) {
            const p = playerProjectiles[i];
            p.update(deltaTime);
            if (p.isOffScreen(canvasWidth, canvasHeight)) {
                playerProjectiles.splice(i, 1);
            }
        }

        // Update Enemies (Corrected placement)
        enemies.forEach(enemy => enemy.update(deltaTime));
        // Add boundary checks/removal for enemies later is now inside Enemy.update

        // --- Collision Detection (Placeholder for Step 9) ---
        // checkCollisions();

        // 3. Draw Logic
        player.draw(ctx);
        playerProjectiles.forEach(p => p.draw(ctx));
        enemies.forEach(enemy => enemy.draw(ctx)); // Draw enemies

        // Draw Arena Boundaries
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(arenaX, arenaY, arenaWidth, arenaHeight);

        // --- Draw UI (Placeholder for Step 10) ---
        // drawUI();

        // 4. Request Next Frame
        requestAnimationFrame(gameLoop);
    }

    // --- Event Listeners Setup --- (Corrected placement, no nesting)
    console.log("Setting up event listeners...");

    // Keyboard Listeners
    window.addEventListener('keydown', (event) => {
        keysPressed[event.key.toLowerCase()] = true;
        // Optional: event.preventDefault(); for specific keys
    });
    window.addEventListener('keyup', (event) => {
        keysPressed[event.key.toLowerCase()] = false;
    });

    // Mouse Listeners (Attached to CANVAS)
    canvas.addEventListener('mousemove', (event) => {
        mousePos = getMousePos(canvas, event);
    });
    canvas.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // Left mouse button
            const dx = mousePos.x - player.x;
            const dy = mousePos.y - player.y;
            const angle = Math.atan2(dy, dx);
            const velocityX = Math.cos(angle) * projectileSpeed;
            const velocityY = Math.sin(angle) * projectileSpeed;
            playerProjectiles.push(new Projectile(player.x, player.y, velocityX, velocityY));
        }
    });

    // --- Start the Game ---
    console.log("Starting game loop...");
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);

}); // End of window.onload listener

console.log("game.js script loaded.");