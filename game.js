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

    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
    console.log(`Arena dimensions: ${arenaWidth}x${arenaHeight} at (${arenaX},${arenaY})`);

    // --- Game State (placeholders) ---

// Added in Step 5: Player Representation
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 15;     // For collision or reference, not direct drawing size
        this.height = 15;   // For collision or reference, not direct drawing size
        this.color = '#33ff33';
        this.strokeColor = '#33ff33';
        this.lineWidth = 1.5;
        this.speed = 200; // Pixels per second
        this.lives = 3;
        // Add velocity components if needed for physics-based movement later
        // this.velocityX = 0;
        // this.velocityY = 0;
    }

    // Draw the player triangle centered around this.x, this.y
    draw(ctx) {
        // Points relative to this.x, this.y (tip points up)
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

    // update(deltaTime) method will be added in Step 6
}

// Instantiate the player - placed after Game Config, before Game Loop
// Position near bottom-center based on canvas size
const player = new Player(canvasWidth / 2, canvasHeight - 50);
console.log("Player instance created:", player);

    // (Variables for player, enemies, score, lives etc. will go here later)
    let lastTime = 0;

    // --- Main Game Loop ---
    function gameLoop(timestamp) {
        // Calculate delta time (time since last frame) for smooth, frame-rate independent movement
        const deltaTime = (timestamp - lastTime) / 1000; // Delta time in seconds
        lastTime = timestamp;

        // 1. Clear the Canvas
        // Clear entire canvas or fill with background color
        ctx.fillStyle = '#050010';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 2. --- Update Logic ---
        // (Update player position, enemy positions, check collisions, etc. based on deltaTime)
        // Placeholder for future steps

        // 3. --- Draw Logic ---
        // (Draw player, enemies, projectiles, UI elements, etc.)
        player.draw(ctx); // Added in Step 5

        // Draw the Arena Boundaries (as per Step 4 spec)
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(arenaX, arenaY, arenaWidth, arenaHeight);

        // Placeholder for future drawing

        // 4. Request the next frame
        requestAnimationFrame(gameLoop);
    }

    // --- Start the Game ---
    console.log("Starting game loop...");
    // Initialize lastTime for the first frame's deltaTime calculation
    lastTime = performance.now();
    // Start the loop
    requestAnimationFrame(gameLoop);

}); // End of window.onload listener

console.log("game.js script loaded."); // Log to confirm script parsing
