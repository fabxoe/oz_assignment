let isPowerOn = false;
let expression = "";
let justCalculated = false;

function getDisplay() {
    return document.getElementById("display");
}

function updateDisplay(value) {
    const display = getDisplay();
    display.value = value;
    display.scrollLeft = display.scrollWidth;
}

function togglePower() {
    isPowerOn = !isPowerOn;
    expression = "";
    justCalculated = false;

    const powerButton = document.querySelector(".on-off");
    powerButton.classList.toggle("on", isPowerOn);
    powerButton.setAttribute("aria-pressed", String(isPowerOn));
    updateDisplay(isPowerOn ? "0" : "OFF");
}

function clearDisplay() {
    if (!isPowerOn) {
        return;
    }

    expression = "";
    justCalculated = false;
    getDisplay().removeAttribute("title");
    updateDisplay("0");
}

function getCurrentNumber() {
    const parts = expression.split(/[+\-*/]/);
    return parts[parts.length - 1];
}

function appendNumber(value) {
    if (!isPowerOn) {
        return;
    }

    if (justCalculated) {
        expression = "";
        justCalculated = false;
    }

    if (value === ".") {
        const currentNumber = getCurrentNumber();

        if (currentNumber.includes(".")) {
            return;
        }

        if (expression === "" || /[+\-*/]$/.test(expression)) {
            expression += "0";
        }
    }

    expression += value;
    updateDisplay(expression);
}

function appendOperator(operator) {
    if (!isPowerOn || !"+-*/".includes(operator)) {
        return;
    }

    if (justCalculated) {
        justCalculated = false;
    }

    if (expression === "") {
        if (operator === "-") {
            expression = "-";
            updateDisplay(expression);
        }
        return;
    }

    if (/[+\-*/.]$/.test(expression)) {
        expression = expression.replace(/[+\-*/.]+$/, operator);
    } else {
        expression += operator;
    }

    updateDisplay(expression);
}

function tokenize(formula) {
    const tokens = [];
    let index = 0;

    while (index < formula.length) {
        const character = formula[index];

        if (/\s/.test(character)) {
            index += 1;
            continue;
        }

        if ("+-*/()".includes(character)) {
            tokens.push(character);
            index += 1;
            continue;
        }

        const numberMatch = formula
            .slice(index)
            .match(/^(?:\d+(?:\.\d*)?|\.\d+)/);

        if (!numberMatch) {
            throw new Error(`사용할 수 없는 문자 "${character}"가 포함되어 있습니다.`);
        }

        const number = Number(numberMatch[0]);

        if (!Number.isFinite(number)) {
            throw new Error("표현할 수 없는 숫자가 입력되었습니다.");
        }

        tokens.push(number);
        index += numberMatch[0].length;
    }

    return tokens;
}

function calculate(formula) {
    if (typeof formula !== "string" || formula.trim() === "") {
        throw new Error("계산식을 입력해주세요.");
    }

    const tokens = tokenize(formula);
    let position = 0;

    function peek() {
        return tokens[position];
    }

    function consume() {
        const token = tokens[position];
        position += 1;
        return token;
    }

    function parsePrimary() {
        const token = consume();

        if (typeof token === "number") {
            return token;
        }

        if (token === "(") {
            const value = parseExpression();

            if (consume() !== ")") {
                throw new Error("닫는 괄호가 필요합니다.");
            }

            return value;
        }

        throw new Error("숫자가 필요한 위치입니다.");
    }

    function parseUnary() {
        if (peek() === "+") {
            consume();
            return parseUnary();
        }

        if (peek() === "-") {
            consume();
            return -parseUnary();
        }

        return parsePrimary();
    }

    function parseTerm() {
        let result = parseUnary();

        while (peek() === "*" || peek() === "/") {
            const operator = consume();
            const right = parseUnary();

            if (operator === "/" && right === 0) {
                throw new Error("0으로 나눌 수 없습니다.");
            }

            result = operator === "*" ? result * right : result / right;
        }

        return result;
    }

    function parseExpression() {
        let result = parseTerm();

        while (peek() === "+" || peek() === "-") {
            const operator = consume();
            const right = parseTerm();
            result = operator === "+" ? result + right : result - right;
        }

        return result;
    }

    const result = parseExpression();

    if (position < tokens.length) {
        throw new Error("계산식의 숫자와 연산자 순서를 확인해주세요.");
    }

    if (!Number.isFinite(result)) {
        throw new Error("계산 결과가 너무 크거나 유효하지 않습니다.");
    }

    return Object.is(result, -0) ? 0 : result;
}

function performCalculate() {
    if (!isPowerOn || expression === "") {
        return;
    }

    const display = getDisplay();

    try {
        const result = calculate(expression);
        expression = String(result);
        justCalculated = true;
        display.removeAttribute("title");
        updateDisplay(expression);
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : "계산 중 오류가 발생했습니다.";

        expression = "";
        justCalculated = false;
        display.title = message;
        updateDisplay("Error");
        console.error(message);
    }
}

function handleKeyboard(event) {
    if (event.key >= "0" && event.key <= "9") {
        appendNumber(event.key);
    } else if (event.key === ".") {
        appendNumber(".");
    } else if ("+-*/".includes(event.key)) {
        appendOperator(event.key);
    } else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        performCalculate();
    } else if (event.key === "Escape" || event.key === "Delete") {
        clearDisplay();
    }
}

if (typeof document !== "undefined") {
    document.addEventListener("keydown", handleKeyboard);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculate, tokenize };
}
