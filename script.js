// Get canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Sidebar elements
const monsterBodyDisplay = document.getElementById('monster-body');
// const brainZoomPlaceholder = document.getElementById('brain-zoom-placeholder'); // This will be replaced

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

function getOctagonVertices() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const numSides = 8;
    const radius = Math.min(canvas.width, canvas.height) * 0.4; // Same as room radius
    const vertices = [];

    for (let i = 0; i < numSides; i++) { // Iterate 0 to numSides-1
        vertices.push({
            x: centerX + radius * Math.cos(i * 2 * Math.PI / numSides),
            y: centerY + radius * Math.sin(i * 2 * Math.PI / numSides)
        });
    }
    return vertices;
}

function isPointInOctagon(pointX, pointY, octagonVertices) {
    let intersections = 0;
    const numVertices = octagonVertices.length;

    for (let i = 0; i < numVertices; i++) {
        const p1 = octagonVertices[i];
        const p2 = octagonVertices[(i + 1) % numVertices]; // Next vertex, wraps around

        // Check if the ray from the point (pointX, pointY) intersects with the edge (p1, p2)
        // Ray goes from (pointX, pointY) to the right (infinity)
        if (((p1.y <= pointY && pointY < p2.y) || (p2.y <= pointY && pointY < p1.y)) &&
            (pointX < (p2.x - p1.x) * (pointY - p1.y) / (p2.y - p1.y) + p1.x)) {
            intersections++;
        }
    }
    return (intersections % 2) === 1; // Odd number of intersections means point is inside
}

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
    const bodyX = monster.x;
    const bodyY = monster.y;
    const bodyWidth = monster.width; // Main body width
    const bodyHeight = monster.height * 0.5; // Abdomen height

    // Abdomen
    ctx.strokeRect(bodyX, bodyY, bodyWidth, bodyHeight);

    // Head
    if (monster.parts.head) {
        const headRadius = bodyWidth / 2.5; // Example size
        ctx.beginPath();
        // Position head centered on top of abdomen
        ctx.arc(bodyX + bodyWidth / 2, bodyY - headRadius, headRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Left Arm
    if (monster.parts.armLeft) {
        const armWidth = bodyWidth * 0.7;
        const armHeight = bodyHeight * 0.25;
        // Position arm extending from upper left of abdomen
        ctx.strokeRect(bodyX - armWidth, bodyY + bodyHeight * 0.1, armWidth, armHeight);
    }

    // Right Arm
    if (monster.parts.armRight) {
        const armWidth = bodyWidth * 0.7;
        const armHeight = bodyHeight * 0.25;
        // Position arm extending from upper right of abdomen
        ctx.strokeRect(bodyX + bodyWidth, bodyY + bodyHeight * 0.1, armWidth, armHeight);
    }

    // Leg (singular for now, as per monster.parts.legLeft)
    if (monster.parts.legLeft) {
        const legWidth = bodyWidth * 0.35;
        const legHeight = monster.height * 0.45; // Longer than abdomen section
        // Position leg centered below abdomen
        ctx.strokeRect(bodyX + (bodyWidth - legWidth) / 2, bodyY + bodyHeight, legWidth, legHeight);
    }
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
function positionItemsInRoom() {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.4; // Same as room radius

    items.find(item => item.id === 'armRight').x = centerX + radius * 0.5;
    items.find(item => item.id === 'armRight').y = centerY - radius * 0.3;

    items.find(item => item.id === 'legLeft').x = centerX - radius * 0.6;
    items.find(item => item.id === 'legLeft').y = centerY + radius * 0.5;

    monster.x = centerX;
    monster.y = centerY;
}


// --- Drawing Functions (Additions) ---

function drawItems() {
    items.forEach(item => {
        if (!item.isDiscovered) {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1;

            if (item.id === 'armRight') {
                ctx.strokeRect(item.x, item.y, item.width, item.height);
                const handWidth = item.height; 
                const handLength = item.width * 0.3;
                ctx.strokeRect(item.x + item.width, item.y, handLength, handWidth); 
            } else if (item.id === 'legLeft') {
                ctx.strokeRect(item.x, item.y, item.width, item.height);
                const footLength = item.width * 1.5; 
                const footThickness = item.height * 0.2;
                ctx.strokeRect(item.x - (footLength - item.width) / 2, item.y + item.height, footLength, footThickness);
            } else {
                ctx.strokeRect(item.x, item.y, item.width, item.height);
            }
        }
    });
}

// Modify drawGame to include items
function drawGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawOctagonRoom();
    drawItems(); 
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
    const currentSpeed = monster.canHop ? monster.speed * 2 : monster.speed; 

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

    if (dx === 0 && dy === 0) {
        return; 
    }

    const nextX = monster.x + dx;
    const nextY = monster.y + dy;
    
    const monsterBoundingBox = [
        { x: nextX, y: nextY },                                       
        { x: nextX + monster.width, y: nextY },                       
        { x: nextX + monster.width, y: nextY + monster.height },      
        { x: nextX, y: nextY + monster.height }                       
    ];

    const octagonVertices = getOctagonVertices();
    let canMove = true;

    for (const corner of monsterBoundingBox) {
        if (!isPointInOctagon(corner.x, corner.y, octagonVertices)) {
            canMove = false;
            break;
        }
    }

    if (canMove) {
        monster.x = nextX;
        monster.y = nextY;
    }
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
                monster.canHop = true; 
                console.log("Monster can now hop!");
            }
            updateSidebar();
        }
    });
}

// --- Game Loop (Modification) ---
function gameLoop() {
    handleMovement();
    checkCollisions();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// --- Brain Modal Logic ---
const brainModal = document.getElementById('brain-modal');
const brainZoomButton = document.getElementById('brain-zoom-button');
const closeButton = document.querySelector('.modal .close-button');

if (brainZoomButton) {
    brainZoomButton.onclick = function() {
        if (brainModal) brainModal.style.display = 'flex'; // Use flex for centering
    }
}

if (closeButton) {
    closeButton.onclick = function() {
        if (brainModal) brainModal.style.display = 'none';
    }
}

window.onclick = function(event) {
    if (event.target == brainModal) {
        if (brainModal) brainModal.style.display = 'none';
    }
}

// --- Init Game (Modification) ---
function initGame() {
    window.addEventListener('resize', () => {
        resizeCanvas();
        positionItemsInRoom(); 
    });
    resizeCanvas(); 
    positionItemsInRoom(); 
    updateSidebar(); 
    
    requestAnimationFrame(gameLoop);
}

// The existing initGame() call at the end of the file should remain
initGame();
