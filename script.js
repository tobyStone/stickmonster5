// Get canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Sidebar elements
const monsterBodyDisplay = document.getElementById('monster-body');
const brainZoomPlaceholder = document.getElementById('brain-zoom-placeholder');

// Game state variables
let gameObjects = []; // To store monster, items, room elements
let monster = {
    x: 100, // Initial position
    y: 100,
    width: 30,
    height: 50,
    color: '#fff', // Monster will be a white outline
    parts: {
        head: true,
        abdomen: true,
        armLeft: true, // Has one arm initially
        armRight: false,
        legLeft: false,
        legRight: false // Assuming one leg is needed for hopping
    },
    speed: 2, // Crawling speed
    canHop: false
};

// --- Initial Setup Functions ---

function resizeCanvas() {
    const gameContainer = document.getElementById('game-container');
    canvas.width = gameContainer.clientWidth * 0.9; // Use 90% of container
    canvas.height = gameContainer.clientHeight * 0.9;
    // Ensure drawing is scaled if needed, or objects are redrawn according to new size
    drawGame(); // Redraw game on resize
}

// --- Drawing Functions ---

function drawOctagonRoom() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const numSides = 8;
    // Make radius responsive to canvas size, ensuring it fits
    const radius = Math.min(canvas.width, canvas.height) * 0.4; 

    ctx.beginPath();
    ctx.moveTo(centerX + radius * Math.cos(0), centerY + radius * Math.sin(0));

    for (let i = 1; i <= numSides; i++) {
        ctx.lineTo(
            centerX + radius * Math.cos(i * 2 * Math.PI / numSides),
            centerY + radius * Math.sin(i * 2 * Math.PI / numSides)
        );
    }

    ctx.strokeStyle = '#fff'; // White outline for the room
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();
}

function drawMonster() {
    ctx.strokeStyle = monster.color;
    ctx.lineWidth = 2;
    // Simple rectangle for now, will be refined later based on parts
    ctx.strokeRect(monster.x, monster.y, monster.width, monster.height);

    // TODO: Enhance drawing based on available body parts
    // For example, draw a separate shape for the head, abdomen, and arm(s)
}

// --- Sidebar Update Functions ---
function updateSidebar() {
    monsterBodyDisplay.innerHTML = ''; // Clear current parts

    if (monster.parts.head) {
        const headDiv = document.createElement('div');
        headDiv.textContent = 'Head';
        monsterBodyDisplay.appendChild(headDiv);
    }
    if (monster.parts.abdomen) {
        const abdomenDiv = document.createElement('div');
        abdomenDiv.textContent = 'Abdomen';
        monsterBodyDisplay.appendChild(abdomenDiv);
    }
    if (monster.parts.armLeft) {
        const armLDiv = document.createElement('div');
        armLDiv.textContent = 'Left Arm';
        monsterBodyDisplay.appendChild(armLDiv);
    }
    if (monster.parts.armRight) {
        const armRDiv = document.createElement('div');
        armRDiv.textContent = 'Right Arm';
        monsterBodyDisplay.appendChild(armRDiv);
    }
    if (monster.parts.legLeft) { // Assuming one leg for now
        const legLDiv = document.createElement('div');
        legLDiv.textContent = 'Leg'; // Generic 'Leg' for now
        monsterBodyDisplay.appendChild(legLDiv);
    }
    // Add more parts as needed
}


// --- Game Loop and Initialization ---

function gameLoop() {
    // Update game state (movement, collisions, etc.) - to be added
    // render game
    drawGame();
    requestAnimationFrame(gameLoop);
}

function initGame() {
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial sizing
    updateSidebar(); // Initial sidebar state
    gameLoop(); // Start the game loop
}

// Start the game when the script loads
initGame();

// --- Item Definitions ---
const items = [
    {
        id: 'armRight',
        x: canvas.width * 0.7, // Example position
        y: canvas.height * 0.3,
        width: 25,
        height: 15,
        color: '#fff',
        isDiscovered: false,
        name: 'Right Arm'
    },
    {
        id: 'legLeft', // Assuming one leg is needed for hopping
        x: canvas.width * 0.2, // Example position
        y: canvas.height * 0.8,
        width: 20,
        height: 30,
        color: '#fff',
        isDiscovered: false,
        name: 'A Leg'
    }
];

// Adjust item positions to be within the octagon after canvas is sized.
// This needs to be called after initial resize and potentially on subsequent resizes
// if item positions are meant to be relative to the dynamic octagon bounds.
function positionItemsInRoom() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.4; // Same as room radius

    // Example: Place right arm somewhere on the right side, leg on the left
    // These are approximate, more precise placement within octagon might be needed.
    items.find(item => item.id === 'armRight').x = centerX + radius * 0.5;
    items.find(item => item.id === 'armRight').y = centerY - radius * 0.3;

    items.find(item => item.id === 'legLeft').x = centerX - radius * 0.6;
    items.find(item => item.id === 'legLeft').y = centerY + radius * 0.5;

    // Ensure monster starts within bounds too
    monster.x = centerX;
    monster.y = centerY;
}


// --- Drawing Functions (Additions) ---

function drawItems() {
    items.forEach(item => {
        if (!item.isDiscovered) {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(item.x, item.y, item.width, item.height);
            // Optionally, draw text label
            // ctx.fillStyle = '#fff';
            // ctx.fillText(item.name, item.x, item.y - 5);
        }
    });
}

// Modify drawGame to include items
function drawGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawOctagonRoom();
    drawItems(); // Draw items before monster so monster can be on top
    drawMonster();
}

// --- Movement and Collision ---
const keysPressed = {};

document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;
});

document.addEventListener('keyup', (event) => {
    keysPressed[event.key] = false;
});

function handleMovement() {
    let dx = 0;
    let dy = 0;
    const currentSpeed = monster.canHop ? monster.speed * 2 : monster.speed; // Double speed if hopping

    if (keysPressed['ArrowUp'] || keysPressed['w']) {
        dy -= currentSpeed;
    }
    if (keysPressed['ArrowDown'] || keysPressed['s']) {
        dy += currentSpeed;
    }
    if (keysPressed['ArrowLeft'] || keysPressed['a']) {
        dx -= currentSpeed;
    }
    if (keysPressed['ArrowRight'] || keysPressed['d']) {
        dx += currentSpeed;
    }

    // Basic boundary detection (canvas edges)
    // More sophisticated boundary (octagon walls) will be complex
    const nextX = monster.x + dx;
    const nextY = monster.y + dy;

    // Check canvas boundaries
    if (nextX > 0 && nextX + monster.width < canvas.width) {
        monster.x = nextX;
    }
    if (nextY > 0 && nextY + monster.height < canvas.height) {
        monster.y = nextY;
    }
    
    // TODO: Implement collision with octagon walls for more precise movement
}

function checkCollisions() {
    items.forEach(item => {
        if (!item.isDiscovered &&
            monster.x < item.x + item.width &&
            monster.x + monster.width > item.x &&
            monster.y < item.y + item.height &&
            monster.y + monster.height > item.y) {
            
            item.isDiscovered = true;
            console.log(`Discovered ${item.name}`);
            
            if (item.id === 'armRight') {
                monster.parts.armRight = true;
            } else if (item.id === 'legLeft') {
                monster.parts.legLeft = true;
                monster.canHop = true; // Enable hopping
                console.log("Monster can now hop!");
            }
            updateSidebar();
        }
    });
}


// --- Game Loop (Modification) ---

// Modify gameLoop to call handleMovement and checkCollisions
function gameLoop() {
    handleMovement();
    checkCollisions();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// --- Init Game (Modification) ---
// Modify initGame to call positionItemsInRoom after first resize
// and also ensure gameLoop is correctly referenced
function initGame() {
    window.addEventListener('resize', () => {
        resizeCanvas();
        positionItemsInRoom(); // Reposition items if canvas size changes significantly
    });
    resizeCanvas(); // Initial sizing
    positionItemsInRoom(); // Position items and monster correctly after canvas is sized
    updateSidebar(); // Initial sidebar state
    
    // Ensure the modified gameLoop is called, not the old one if it was defined differently before.
    // If gameLoop was defined globally, this will use the latest definition.
    requestAnimationFrame(gameLoop); // Start the game loop using the modified gameLoop
}

// The existing initGame() call at the end of the file should remain
initGame();
