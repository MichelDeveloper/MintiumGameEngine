document.addEventListener("DOMContentLoaded", function() {
    const grid = document.querySelector('.grid');
    const generateCodeBtn = document.getElementById('generateCode');
    const resetGridBtn = document.getElementById('resetGrid');
    const spriteCodeArea = document.getElementById('spriteCode');
    const penBtn = document.getElementById('pen');
    const eraserBtn = document.getElementById('eraser');

    let mode = 'draw';

    // Set the initial active tool
    penBtn.classList.add('tool-active');

    // Initialize the grid
    for (let i = 0; i < 64; i++) {
        const cell = document.createElement('div');
        cell.addEventListener('click', function() {
            if (mode === 'draw') {
                this.classList.add('active');
            } else {
                this.classList.remove('active');
            }
        });
        grid.appendChild(cell);
    }

    // Generate Sprite Code
    generateCodeBtn.addEventListener('click', function() {
        let spriteCode = 'pixels: [\n';
        const rows = [...grid.children];
        for (let i = 0; i < rows.length; i += 8) {
            let rowCode = '  "';
            for (let j = 0; j < 8; j++) {
                rowCode += rows[i + j].classList.contains('active') ? '1' : '0';
            }
            rowCode += '"';
            if (i < 56) rowCode += ',\n';
            spriteCode += rowCode;
        }
        spriteCode += '\n];';
        spriteCodeArea.value = spriteCode;
    });

    // Reset Grid
    resetGridBtn.addEventListener('click', function() {
        const cells = grid.children;
        for (let cell of cells) {
            cell.classList.remove('active');
        }
    });

    // Set mode to draw and update active tool visual
    penBtn.addEventListener('click', function() {
        mode = 'draw';
        penBtn.classList.add('tool-active');
        eraserBtn.classList.remove('tool-active');
    });

    // Set mode to erase and update active tool visual
    eraserBtn.addEventListener('click', function() {
        mode = 'erase';
        eraserBtn.classList.add('tool-active');
        penBtn.classList.remove('tool-active');
    });
});
