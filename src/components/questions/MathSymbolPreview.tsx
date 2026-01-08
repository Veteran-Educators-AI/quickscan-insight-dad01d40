import { useState } from 'react';
import { Eye, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { renderMathText, mathSymbols, superscripts, subscripts, fractions } from '@/lib/mathRenderer';

const exampleExpressions = [
  { input: 'Find the area of a circle with radius 5. Use pi in your answer.', label: 'Greek letters' },
  { input: 'Solve for x: x^2 + 3x - 10 = 0', label: 'Exponents' },
  { input: 'The angle theta measures 45 degrees', label: 'Angles' },
  { input: 'If sqrt(x) = 4, find x', label: 'Square root' },
  { input: 'Triangle ABC is congruent to triangle DEF', label: 'Geometry' },
  { input: 'a_1 + a_2 + ... + a_n = Sigma', label: 'Subscripts' },
  { input: 'x <= 5 and y >= 3, so x != y', label: 'Inequalities' },
  { input: 'The slope is 1/2 and the y-intercept is 3/4', label: 'Fractions' },
];

const quickReference = [
  { category: 'Greek Letters', symbols: ['pi → π', 'theta → θ', 'alpha → α', 'beta → β', 'Delta → Δ', 'Sigma → Σ'] },
  { category: 'Operations', symbols: ['sqrt → √', '<= → ≤', '>= → ≥', '!= → ≠', '+- → ±', 'times → ×'] },
  { category: 'Geometry', symbols: ['angle → ∠', 'degrees/deg → °', 'triangle → △', 'congruent → ≅', 'perp → ⊥', 'parallel → ∥'] },
  { category: 'Exponents', symbols: ['x^2 → x²', 'x^3 → x³', 'x^n → xⁿ', 'x^{10} → x¹⁰'] },
  { category: 'Subscripts', symbols: ['a_1 → a₁', 'x_n → xₙ', 'a_{12} → a₁₂'] },
  { category: 'Fractions', symbols: ['1/2 → ½', '1/4 → ¼', '3/4 → ¾', '1/3 → ⅓'] },
];

export function MathSymbolPreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showReference, setShowReference] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Math Symbol Preview
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-3 space-y-4">
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-4">
            {/* Custom Input */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                Try it yourself
                <Badge variant="secondary" className="text-xs">Live preview</Badge>
              </Label>
              <Input
                placeholder="Type math notation like: x^2 + pi * sqrt(4)..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="font-mono text-sm"
              />
              {customInput && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Rendered:</p>
                  <p className="font-serif text-base leading-relaxed">{renderMathText(customInput)}</p>
                </div>
              )}
            </div>

            {/* Example Expressions */}
            <div className="space-y-2">
              <Label className="text-sm">Example transformations</Label>
              <div className="grid gap-2">
                {exampleExpressions.map((example, index) => (
                  <div 
                    key={index} 
                    className="flex flex-col gap-1 p-2 bg-muted/50 rounded-md text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">{example.label}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      <p className="text-muted-foreground font-mono text-xs truncate" title={example.input}>
                        {example.input}
                      </p>
                      <p className="font-serif leading-relaxed">
                        → {renderMathText(example.input)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Reference Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReference(!showReference)}
              className="w-full text-xs text-muted-foreground"
            >
              <Info className="h-3 w-3 mr-1" />
              {showReference ? 'Hide' : 'Show'} symbol reference
            </Button>

            {/* Quick Reference */}
            {showReference && (
              <div className="space-y-3 pt-2 border-t">
                {quickReference.map((category) => (
                  <div key={category.category} className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">{category.category}</Label>
                    <div className="flex flex-wrap gap-1">
                      {category.symbols.map((symbol) => (
                        <Badge 
                          key={symbol} 
                          variant="secondary" 
                          className="text-xs font-mono"
                        >
                          {symbol}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
