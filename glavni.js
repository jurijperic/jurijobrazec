const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const playerEl = document.getElementById('player');
const container = document.getElementById('game-container');

const cols = 20;
const rows = 25;

let cellSize;
let grid = [];
let gameStarted = false;
let isAutopilot = false;
let showPath = false;
let timerInterval = null;
let timeLeft = 10;
const keys = {};

const player = {
    row: 0,
    col: 0,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    moving: false,
    speed: 0.25,
    angle: 0
};

let dino = null;

function updateSizing() {
    const isMobile = window.innerWidth <= 768;

    cellSize = Math.floor(
        Math.min(
            (window.innerWidth - (isMobile ? 40 : 210)) / cols,
            (window.innerHeight - (isMobile ? 210 : 60)) / rows
        )
    );

    cellSize = Math.max(cellSize, 15);

    canvas.width = cols * cellSize;
    canvas.height = rows * cellSize;

    player.x = player.col * cellSize + cellSize / 2;
    player.y = player.row * cellSize + cellSize / 2;
    player.targetX = player.x;
    player.targetY = player.y;

    playerEl.style.width = (cellSize * 0.8) + "px";
    playerEl.style.height = (cellSize * 0.8) + "px";

    drawMaze();
    updateVisuals();
}

window.addEventListener('resize', updateSizing);

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code.includes('Arrow')) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function showInstructions() {
    Swal.fire({
        title: 'NAVODILA',
        html: `
            <div class="instructions-content">
                <p>🚗 Tvoj cilj je priti do konca labirinta, do zelenega polja.</p>
                <p>🦖 Dinozaver, ki te sledi, te ne sme ujeti.</p>
                <p>⌨ Premikaš se s puščicami na tipkovnici.</p>
                <p>⏱ Ko čas poteče, se pojavi dinozaver in začne lov.</p>
                <p>🗺 Gumb <b>POT</b> prikaže pot do cilja.</p>
                <p>🚀 Gumb <b>AUTO</b> vključi samodejno vožnjo.</p>
            </div>
        `,
        confirmButtonText: 'Razumem',
        background: '#0f172a',
        color: '#ffffff',
        customClass: {
            popup: 'tweet-alert-popup',
            title: 'tweet-alert-title',
            htmlContainer: 'tweet-alert-html',
            confirmButton: 'tweet-alert-confirm'
        }
    });
}

function setupMaze() {
    grid = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => ({
            r,
            c,
            walls: [true, true, true, true],
            visited: false
        }))
    );

    let stack = [];
    let current = grid[0][0];
    current.visited = true;

    while (true) {
        let neighbors = [];
        const { r, c } = current;

        if (r > 0 && !grid[r - 1][c].visited) neighbors.push(grid[r - 1][c]);
        if (r < rows - 1 && !grid[r + 1][c].visited) neighbors.push(grid[r + 1][c]);
        if (c > 0 && !grid[r][c - 1].visited) neighbors.push(grid[r][c - 1]);
        if (c < cols - 1 && !grid[r][c + 1].visited) neighbors.push(grid[r][c + 1]);

        if (neighbors.length > 0) {
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            next.visited = true;
            stack.push(current);
            removeWalls(current, next);
            current = next;
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break;
        }
    }

    updateSizing();
}

function removeWalls(a, b) {
    const dr = a.r - b.r;
    const dc = a.c - b.c;

    if (dr === 1) {
        a.walls[0] = false;
        b.walls[2] = false;
    } else if (dr === -1) {
        a.walls[2] = false;
        b.walls[0] = false;
    }

    if (dc === 1) {
        a.walls[3] = false;
        b.walls[1] = false;
    } else if (dc === -1) {
        a.walls[1] = false;
        b.walls[3] = false;
    }
}

function drawMaze() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showPath) {
        const path = findPath(player.row, player.col, rows - 1, cols - 1);
        if (path) {
            ctx.strokeStyle = "rgba(220, 38, 38, 0.7)";
            ctx.lineWidth = cellSize / 3;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);

            path.forEach(p => {
                ctx.lineTo(
                    p.c * cellSize + cellSize / 2,
                    p.r * cellSize + cellSize / 2
                );
            });

            ctx.stroke();
        }
    }

    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    grid.flat().forEach(cell => {
        const x = cell.c * cellSize;
        const y = cell.r * cellSize;

        if (cell.walls[0]) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellSize, y);
        }
        if (cell.walls[1]) {
            ctx.moveTo(x + cellSize, y);
            ctx.lineTo(x + cellSize, y + cellSize);
        }
        if (cell.walls[2]) {
            ctx.moveTo(x + cellSize, y + cellSize);
            ctx.lineTo(x, y + cellSize);
        }
        if (cell.walls[3]) {
            ctx.moveTo(x, y + cellSize);
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    ctx.fillStyle = "rgba(16, 185, 129, 0.8)";
    ctx.fillRect(
        (cols - 1) * cellSize + 4,
        (rows - 1) * cellSize + 4,
        cellSize - 8,
        cellSize - 8
    );
}

function findPath(sR, sC, eR, eC) {
    const queue = [[grid[sR][sC]]];
    const visited = new Set([`${sR},${sC}`]);

    while (queue.length > 0) {
        const path = queue.shift();
        const cell = path[path.length - 1];

        if (cell.r === eR && cell.c === eC) return path;

        [[-1, 0, 0], [0, 1, 1], [1, 0, 2], [0, -1, 3]].forEach(([dr, dc, w]) => {
            const nr = cell.r + dr;
            const nc = cell.c + dc;

            if (
                nr >= 0 &&
                nr < rows &&
                nc >= 0 &&
                nc < cols &&
                !cell.walls[w] &&
                !visited.has(`${nr},${nc}`)
            ) {
                visited.add(`${nr},${nc}`);
                queue.push([...path, grid[nr][nc]]);
            }
        });
    }

    return null;
}

function startGame() {
    if (gameStarted) return;

    gameStarted = true;
    document.getElementById('start-btn').style.display = "";

    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            document.getElementById('timer-display').innerText =
                `00:${timeLeft < 10 ? '0' : ''}${timeLeft}`;

            if (timeLeft === 0) {
                spawnDino();
            }
        }
    }, 1000);

    gameLoop();
}

function spawnDino() {
    if (dino) return;

    const el = document.createElement('div');
    el.className = 'dino';
    container.appendChild(el);

    dino = {
        el,
        row: 0,
        col: 0,
        x: cellSize / 2,
        y: cellSize / 2,
        targetX: cellSize / 2,
        targetY: cellSize / 2,
        moving: false,
        speed: 0.12,
        angle: 0
    };
}

function gameLoop() {
    if (!gameStarted) return;

    if (!player.moving) {
        if (isAutopilot) {
            const path = findPath(player.row, player.col, rows - 1, cols - 1);
            if (path && path.length > 1) {
                moveEntityTo(player, path[1].r, path[1].c, false);
            }
        } else {
            const cell = grid[player.row][player.col];

            if (keys['ArrowUp'] && !cell.walls[0]) {
                moveEntityTo(player, player.row - 1, player.col, false);
            } else if (keys['ArrowDown'] && !cell.walls[2]) {
                moveEntityTo(player, player.row + 1, player.col, false);
            } else if (keys['ArrowLeft'] && !cell.walls[3]) {
                moveEntityTo(player, player.row, player.col - 1, false);
            } else if (keys['ArrowRight'] && !cell.walls[1]) {
                moveEntityTo(player, player.row, player.col + 1, false);
            }
        }
    }

    updateEntityPos(player, false); 

    if (dino) {
        if (!dino.moving) {
            const path = findPath(dino.row, dino.col, player.row, player.col);
            if (path && path.length > 1) {
                moveEntityTo(dino, path[1].r, path[1].c, true);
            }
        }

        updateEntityPos(dino, true); 

        const hitDist = Math.hypot(dino.x - player.x, dino.y - player.y);
        
        if (hitDist < cellSize * 0.6) {
            gameStarted = false;
            clearInterval(timerInterval);

            Swal.fire({
                title: 'Dino te je ujel!',
                imageUrl: 'dino.jpg',
                confirmButtonText: 'POSKUSI ZNOVA',
                background: '#0f172a',
                color: '#ffffff',
                customClass: {
                    popup: 'tweet-alert-popup',
                    image: 'tweet-alert-image',
                    title: 'tweet-alert-title',
                    confirmButton: 'tweet-alert-confirm'
                }
            }).then(() => location.reload());

            return;
        }
    }

    updateVisuals();

    if (player.row === rows - 1 && player.col === cols - 1) {
        gameStarted = false;
        clearInterval(timerInterval);

        Swal.fire({
            title: 'ZMAGA!',
            text: 'Uspešno si pobegnil dinozavru!',
            background: '#0f172a',
            color: '#ffffff',
            customClass: {
                popup: 'tweet-alert-popup',
                title: 'tweet-alert-title',
                confirmButton: 'tweet-alert-confirm'
            }
        });
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function moveEntityTo(ent, r, c, isDino) {
    if (isDino) {
        if (r > ent.row) ent.angle = 0;
        else if (c > ent.col) ent.angle = 270;
        else if (c < ent.col) ent.angle = 90;
        else if (r < ent.row) ent.angle = 180;
    } else {
        if (c > ent.col) ent.angle = 0;
        else if (r > ent.row) ent.angle = 90;
        else if (c < ent.col) ent.angle = 180;
        else if (r < ent.row) ent.angle = 270;
    }

    ent.row = r;
    ent.col = c;
    ent.targetX = c * cellSize + cellSize / 2;
    ent.targetY = r * cellSize + cellSize / 2;
    ent.moving = true;
}

function updateEntityPos(ent, isDino = false) {
    if (!ent.moving) return;

    if (isDino) {
        const dx = ent.targetX - ent.x;
        const dy = ent.targetY - ent.y;
        const dist = Math.hypot(dx, dy);
        
        const pixelSpeed = 1.8; 

        if (dist <= pixelSpeed) {
            ent.x = ent.targetX;
            ent.y = ent.targetY;
            ent.moving = false;
        } else {
            ent.x += (dx / dist) * pixelSpeed;
            ent.y += (dy / dist) * pixelSpeed;
        }
    } else {
        ent.x += (ent.targetX - ent.x) * ent.speed;
        ent.y += (ent.targetY - ent.y) * ent.speed;

        if (Math.abs(ent.x - ent.targetX) < 0.5 && Math.abs(ent.y - ent.targetY) < 0.5) {
            ent.x = ent.targetX;
            ent.y = ent.targetY;
            ent.moving = false;

            if (showPath && ent === player) drawMaze();
        }
    }
}

function updateVisuals() {
    playerEl.style.left = player.x + "px";
    playerEl.style.top = player.y + "px";
    playerEl.style.transform = `translate(-50%, -50%) rotate(${player.angle}deg)`;

    if (dino) {
        dino.el.style.left = dino.x + "px";
        dino.el.style.top = dino.y + "px";
        dino.el.style.transform = `translate(-50%, -50%) rotate(${dino.angle}deg)`;
    }
}

function toggleAutopilot() {
    isAutopilot = !isAutopilot;
    document.getElementById('auto-btn').classList.toggle('active');
}

function togglePath() {
    showPath = !showPath;
    document.getElementById('path-btn').classList.toggle('active');
    drawMaze();
}

setupMaze();