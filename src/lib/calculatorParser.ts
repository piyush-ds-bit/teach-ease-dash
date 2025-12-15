// Safe BODMAS-compliant calculator parser (NO eval())

type TokenType = 'NUMBER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'PERCENT';

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const expr = expression.replace(/\s/g, '').replace(/×/g, '*').replace(/÷/g, '/');

  while (i < expr.length) {
    const char = expr[i];

    // Numbers (including decimals)
    if (/\d/.test(char) || (char === '.' && /\d/.test(expr[i + 1] || ''))) {
      let num = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: num });
      continue;
    }

    // Operators
    if (['+', '-', '*', '/'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: char });
      i++;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: char });
      i++;
      continue;
    }

    // Percent
    if (char === '%') {
      tokens.push({ type: 'PERCENT', value: char });
      i++;
      continue;
    }

    // Skip unknown characters
    i++;
  }

  return tokens;
}

// Process percentage tokens into the token stream
function processPercentages(tokens: Token[]): Token[] {
  const result: Token[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === 'PERCENT') {
      // Find the previous number
      if (result.length > 0 && result[result.length - 1].type === 'NUMBER') {
        const numToken = result.pop()!;
        const percentValue = parseFloat(numToken.value) / 100;
        
        // Check what operator came before
        if (result.length > 0 && result[result.length - 1].type === 'OPERATOR') {
          const op = result[result.length - 1].value;
          
          if (op === '+' || op === '-') {
            // For + and -, we need to find the base value and calculate percentage of it
            // We'll mark this as a special percentage operation
            result.push({ type: 'NUMBER', value: `PERCENT:${numToken.value}` });
          } else {
            // For * and /, just convert to decimal
            result.push({ type: 'NUMBER', value: percentValue.toString() });
          }
        } else {
          // No operator before, just convert to decimal
          result.push({ type: 'NUMBER', value: percentValue.toString() });
        }
      }
    } else {
      result.push(token);
    }
  }

  return result;
}

// Shunting-yard algorithm for BODMAS
function shuntingYard(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const operators: Token[] = [];
  
  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
  };

  for (const token of tokens) {
    if (token.type === 'NUMBER') {
      output.push(token);
    } else if (token.type === 'OPERATOR') {
      while (
        operators.length > 0 &&
        operators[operators.length - 1].type === 'OPERATOR' &&
        precedence[operators[operators.length - 1].value] >= precedence[token.value]
      ) {
        output.push(operators.pop()!);
      }
      operators.push(token);
    } else if (token.type === 'LPAREN') {
      operators.push(token);
    } else if (token.type === 'RPAREN') {
      while (operators.length > 0 && operators[operators.length - 1].type !== 'LPAREN') {
        output.push(operators.pop()!);
      }
      operators.pop(); // Remove the left parenthesis
    }
  }

  while (operators.length > 0) {
    output.push(operators.pop()!);
  }

  return output;
}

// Evaluate RPN (Reverse Polish Notation)
function evaluateRPN(tokens: Token[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (token.type === 'NUMBER') {
      // Check for percentage marker
      if (token.value.startsWith('PERCENT:')) {
        const percentNum = parseFloat(token.value.split(':')[1]);
        // Get the base value from stack for percentage calculation
        if (stack.length > 0) {
          const base = stack[stack.length - 1];
          stack.push(base * (percentNum / 100));
        } else {
          stack.push(percentNum / 100);
        }
      } else {
        stack.push(parseFloat(token.value));
      }
    } else if (token.type === 'OPERATOR') {
      if (stack.length < 2) throw new Error('Invalid expression');
      const b = stack.pop()!;
      const a = stack.pop()!;
      
      switch (token.value) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          stack.push(a / b);
          break;
      }
    }
  }

  if (stack.length !== 1) throw new Error('Invalid expression');
  return stack[0];
}

export function calculateExpression(expression: string): string {
  try {
    if (!expression.trim()) return '';
    
    const tokens = tokenize(expression);
    if (tokens.length === 0) return '';
    
    const processedTokens = processPercentages(tokens);
    const rpn = shuntingYard(processedTokens);
    const result = evaluateRPN(rpn);
    
    // Format result (remove trailing zeros, handle precision)
    if (Number.isInteger(result)) {
      return result.toString();
    }
    
    // Round to 10 decimal places to avoid floating point issues
    const rounded = Math.round(result * 1e10) / 1e10;
    return rounded.toString();
  } catch {
    return 'Error';
  }
}

// History management
const HISTORY_KEY = 'calculator_history_v1';

export interface HistoryItem {
  expression: string;
  result: string;
}

export function getCalculatorHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(expression: string, result: string): void {
  if (result === 'Error' || !expression.trim()) return;
  
  const history = getCalculatorHistory();
  history.unshift({ expression, result });
  
  // Keep only last 10
  if (history.length > 10) {
    history.pop();
  }
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearCalculatorHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
