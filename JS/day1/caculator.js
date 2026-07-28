function add(a, b) {
    return a + b;
}

function subtract(a, b) {
    return a - b;
}

function multiply(a, b) {
    return a * b;
}

function divide(a, b) {
    if (b === 0) {
        throw new Error("0으로 나눌 수 없습니다.");
    }

    return a / b;
}

function inputFormula() {
    return prompt("계산식을 입력하세요. (예: 10 + 2 * (8 - 3) / 5)");
}

/**
 * 계산식 문자열을 숫자와 연산자 토큰으로 분리합니다.
 * 공백이 없는 식, 소수, 괄호도 처리할 수 있습니다.
 */
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

        if (numberMatch) {
            const value = Number(numberMatch[0]);

            if (!Number.isFinite(value)) {
                throw new Error("표현할 수 없는 숫자가 입력되었습니다.");
            }

            tokens.push(value);
            index += numberMatch[0].length;
            continue;
        }

        throw new Error(
            `사용할 수 없는 문자 "${character}"가 ${index + 1}번째 위치에 있습니다.`
        );
    }

    return tokens;
}

/**
 * 연산자 우선순위에 따라 계산합니다.
 *
 * expression: 덧셈과 뺄셈
 * term:       곱셈과 나눗셈
 * unary:      양수·음수 부호
 * primary:    숫자 또는 괄호식
 */
function calculate(formula) {
    if (typeof formula !== "string" || formula.trim() === "") {
        return "계산식을 입력해주세요.";
    }

    try {
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

            if (token === undefined) {
                throw new Error("숫자 또는 괄호식이 필요합니다.");
            }

            throw new Error(`"${token}" 앞에 숫자가 필요합니다.`);
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

                result = operator === "*"
                    ? multiply(result, right)
                    : divide(result, right);
            }

            return result;
        }

        function parseExpression() {
            let result = parseTerm();

            while (peek() === "+" || peek() === "-") {
                const operator = consume();
                const right = parseTerm();

                result = operator === "+"
                    ? add(result, right)
                    : subtract(result, right);
            }

            return result;
        }

        const result = parseExpression();

        if (position < tokens.length) {
            throw new Error(`"${tokens[position]}" 위치의 계산식을 확인해주세요.`);
        }

        if (!Number.isFinite(result)) {
            throw new Error("계산 결과가 너무 크거나 유효하지 않습니다.");
        }

        return result;
    } catch (error) {
        return error instanceof Error
            ? error.message
            : "계산 중 알 수 없는 오류가 발생했습니다.";
    }
}

function start(formula) {
    let input = formula;

    if (input === undefined) {
        input = inputFormula();
    }

    if (input === null || String(input).trim() === "") {
        console.log("계산식을 입력해주세요.");
        return;
    }

    const result = calculate(String(input));

    if (typeof result === "string") {
        console.error(`에러 발생: ${result}`);
        return;
    }

    console.log(`결과: ${result}`);
    return result;
}

// Node.js에서도 테스트할 수 있도록 내보내고, 브라우저에서는 전역 함수를 유지합니다.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { calculate, tokenize };
}
