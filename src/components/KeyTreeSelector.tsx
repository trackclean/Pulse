import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { cn } from '@/lib/utils';

interface KeyTreeSelectorProps {
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  className?: string;
}

const MAJOR_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];

export function KeyTreeSelector({ value, onChange, disabled, className }: KeyTreeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [majorOpen, setMajorOpen] = useState(true);
  const [minorOpen, setMinorOpen] = useState(true);

  const displayValue = value || 'Set key';

  const handleKeySelect = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-7 text-xs font-mono w-full justify-between px-2', className)}
          disabled={disabled}
        >
          <span className="flex-1 text-left truncate">{displayValue}</span>
          <ChevronDown className="h-3 w-3 opacity-50 ml-1 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-2">
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs justify-start h-7 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
            >
              Clear selection
            </Button>
          )}

          {/* Major Keys */}
          <Collapsible open={majorOpen} onOpenChange={setMajorOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2 font-semibold text-xs"
              >
                <ChevronDown
                  className={cn('h-3 w-3 mr-2 transition-transform', !majorOpen && '-rotate-90')}
                />
                Major Keys
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="grid grid-cols-3 gap-1 mt-1">
              {MAJOR_KEYS.map((key) => (
                <Button
                  key={key}
                  variant={value === key ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs font-mono"
                  onClick={() => handleKeySelect(key)}
                >
                  {key}
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Minor Keys */}
          <Collapsible open={minorOpen} onOpenChange={setMinorOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-2 font-semibold text-xs mt-2"
              >
                <ChevronDown
                  className={cn('h-3 w-3 mr-2 transition-transform', !minorOpen && '-rotate-90')}
                />
                Minor Keys
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="grid grid-cols-3 gap-1 mt-1">
              {MINOR_KEYS.map((key) => (
                <Button
                  key={key}
                  variant={value === key ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs font-mono"
                  onClick={() => handleKeySelect(key)}
                >
                  {key}
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </PopoverContent>
    </Popover>
  );
}
