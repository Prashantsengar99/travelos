// ============================================================
// SPLIT CALCULATOR - Standalone Module
// ============================================================

function renderSplitCalculator() {
    const content = document.getElementById('content');
    
    content.innerHTML = `
    <div style="margin-bottom:24px;">
        <h2 style="font-size:24px;font-weight:800;">🧮 Split Calculator</h2>
        <p style="color:var(--text2);font-size:14px;margin-top:4px;">Calculate exactly how much each person needs to pay</p>
    </div>
    
    <div class="calculator-card">
        <!-- Display -->
        <input type="text" id="calcScreen" class="calculator-display" readonly placeholder="0">
        
        <!-- Buttons Grid -->
        <div class="calculator-grid">
            <button class="calc-btn clear" onclick="calcClear()">C</button>
            <button class="calc-btn operator" onclick="calcAppend('/')">÷</button>
            <button class="calc-btn operator" onclick="calcAppend('*')">×</button>
            <button class="calc-btn operator" onclick="calcAppend('-')">−</button>
            
            <button class="calc-btn" onclick="calcAppend('7')">7</button>
            <button class="calc-btn" onclick="calcAppend('8')">8</button>
            <button class="calc-btn" onclick="calcAppend('9')">9</button>
            <button class="calc-btn operator plus" onclick="calcAppend('+')">+</button>
            
            <button class="calc-btn" onclick="calcAppend('4')">4</button>
            <button class="calc-btn" onclick="calcAppend('5')">5</button>
            <button class="calc-btn" onclick="calcAppend('6')">6</button>
            
            <button class="calc-btn" onclick="calcAppend('1')">1</button>
            <button class="calc-btn" onclick="calcAppend('2')">2</button>
            <button class="calc-btn" onclick="calcAppend('3')">3</button>
            <button class="calc-btn equal" onclick="calcCalculate()">=</button>
            
            <button class="calc-btn zero" onclick="calcAppend('0')">0</button>
            <button class="calc-btn" onclick="calcAppend('.')">.</button>
        </div>
        
        <!-- How to Use -->
        <div class="calculator-info">
            <p><strong>💡 How to use:</strong></p>
            <p>• Enter total trip expense and number of people</p>
            <p>• Example: <strong>15000 + 8000 + 5000 = 28000</strong></p>
            <p>• Then divide by number of people: <strong>28000 ÷ 4</strong> = 7000 per person</p>
        </div>
    </div>
    `;
}

// ============================================================
// CALCULATOR FUNCTIONS
// ============================================================

function calcAppend(value) {
    const screen = document.getElementById('calcScreen');
    if (!screen) return;
    
    if (screen.value === '0' || screen.value === 'Error') {
        screen.value = value;
    } else {
        screen.value += value;
    }
}

function calcClear() {
    const screen = document.getElementById('calcScreen');
    if (screen) screen.value = '0';
}

function calcCalculate() {
    const screen = document.getElementById('calcScreen');
    if (!screen) return;
    
    try {
        if (screen.value !== '' && screen.value !== '0') {
            let result = eval(screen.value);
            if (result.toString().includes('.')) {
                result = parseFloat(result.toFixed(2));
            }
            screen.value = result;
        }
    } catch (error) {
        screen.value = 'Error';
    }
}

// ============================================================
// KEYBOARD SUPPORT
// ============================================================
document.addEventListener('keydown', function(e) {
    const screen = document.getElementById('calcScreen');
    if (!screen || !document.querySelector('.calculator-card')) return;
    
    const key = e.key;
    if (key >= '0' && key <= '9') calcAppend(key);
    else if (key === '.') calcAppend('.');
    else if (key === '+') calcAppend('+');
    else if (key === '-') calcAppend('-');
    else if (key === '*') calcAppend('*');
    else if (key === '/') calcAppend('/');
    else if (key === 'Enter' || key === '=') { e.preventDefault(); calcCalculate(); }
    else if (key === 'Backspace') {
        e.preventDefault();
        const current = screen.value;
        if (current.length > 1) screen.value = current.slice(0, -1);
        else screen.value = '0';
    }
    else if (key === 'Escape' || key === 'c' || key === 'C') calcClear();
});

// ============================================================
// MAKE GLOBALLY AVAILABLE
// ============================================================
window.renderSplitCalculator = renderSplitCalculator;
window.calcAppend = calcAppend;
window.calcClear = calcClear;
window.calcCalculate = calcCalculate;

console.log('✅ Split Calculator loaded!');