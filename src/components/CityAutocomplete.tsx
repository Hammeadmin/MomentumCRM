import React, { useState, useRef, useEffect, useCallback } from 'react';
import { swedishCities } from '../data/swedishCities';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}

const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Stad',
  className,
  inputClassName,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const suggestions = useCallback((): string[] => {
    if (!inputValue) return [];
    const lower = inputValue.toLowerCase();
    const startsWith = swedishCities.filter(c => c.toLowerCase().startsWith(lower));
    const contains = swedishCities.filter(c => !c.toLowerCase().startsWith(lower) && c.toLowerCase().includes(lower));
    return [...startsWith, ...contains].slice(0, 8);
  }, [inputValue]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const handleSelect = (city: string) => {
    setInputValue(city);
    onChange(city);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter') {
      const list = suggestions();
      if (open && list.length > 0) {
        e.preventDefault();
        handleSelect(list[0]);
      }
    }
  };

  const list = suggestions();

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInput}
        onFocus={() => { if (list.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
        autoComplete="off"
      />
      {open && list.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-auto text-sm">
          {list.map(city => (
            <li
              key={city}
              onMouseDown={() => handleSelect(city)}
              className="px-3 py-1.5 cursor-pointer hover:bg-blue-50 hover:text-blue-700"
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CityAutocomplete;
