import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Delete } from "lucide-react";
import {
  calculateExpression,
  getCalculatorHistory,
  saveToHistory,
  clearCalculatorHistory,
  HistoryItem,
} from "@/lib/calculatorParser";

const buttons = [
  ["C", "⌫", "(", ")"],
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "-"],
  ["0", ".", "%", "+"],
];

export function AdminCalculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(getCalculatorHistory());
  }, []);

  useEffect(() => {
    if (expression) {
      const calculated = calculateExpression(expression);
      setResult(calculated);
    } else {
      setResult("");
    }
  }, [expression]);

  const handleButtonClick = (value: string) => {
    switch (value) {
      case "C":
        setExpression("");
        setResult("");
        break;
      case "⌫":
        setExpression((prev) => prev.slice(0, -1));
        break;
      case "=":
        if (expression && result && result !== "Error") {
          saveToHistory(expression, result);
          setHistory(getCalculatorHistory());
          setExpression(result);
          setResult("");
        }
        break;
      default:
        setExpression((prev) => prev + value);
    }
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setExpression(item.expression);
  };

  const handleClearHistory = () => {
    clearCalculatorHistory();
    setHistory([]);
  };

  const getButtonVariant = (value: string) => {
    if (value === "C") return "destructive";
    if (value === "⌫") return "secondary";
    if (["÷", "×", "-", "+", "%", "(", ")"].includes(value)) return "outline";
    return "ghost";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Display */}
      <div className="bg-muted rounded-lg p-4 mb-4">
        <div className="text-right text-muted-foreground text-sm min-h-[24px] break-all">
          {expression || "0"}
        </div>
        <div className="text-right text-2xl font-bold min-h-[36px] text-foreground">
          {result || "0"}
        </div>
      </div>

      {/* Button Grid */}
      <div className="grid gap-2 mb-4">
        {buttons.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-2">
            {row.map((btn) => (
              <Button
                key={btn}
                variant={getButtonVariant(btn)}
                className="h-12 text-lg font-medium"
                onClick={() => handleButtonClick(btn)}
              >
                {btn === "⌫" ? <Delete className="h-5 w-5" /> : btn}
              </Button>
            ))}
          </div>
        ))}
        {/* Equals button */}
        <Button
          variant="default"
          className="h-12 text-lg font-medium"
          onClick={() => handleButtonClick("=")}
        >
          =
        </Button>
      </div>

      {/* History Section */}
      <div className="flex-1 border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-muted-foreground">History</h4>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <ScrollArea className="h-[150px]">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No calculations yet
            </p>
          ) : (
            <div className="space-y-1">
              {history.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(item)}
                  className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                >
                  <div className="text-xs text-muted-foreground truncate">
                    {item.expression}
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    = {item.result}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
