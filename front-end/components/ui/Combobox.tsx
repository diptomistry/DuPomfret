import React, { useEffect, useMemo, useRef, useState } from "react";

export type Option<T> = {
  value: string;
  label: string;
  meta?: T;
};

interface ComboboxProps<T> {
  options: Option<T>[];
  value?: string | null;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox<T>({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: ComboboxProps<T>) {
  const [input, setInput] = useState<string>(value ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInput(value ?? "");
  }, [value]);

  const filtered = useMemo(() => {
    const q = (input || "").toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q)
    );
  }, [options, input]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function selectOption(opt?: Option<T>) {
    onChange(opt ? opt.value : undefined);
    setInput(opt ? opt.label : "");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectOption(filtered[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className ?? ""}`}
      style={{ minWidth: 0 }}
    >
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="combobox-list"
        disabled={disabled}
        placeholder={placeholder}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        className="w-full rounded-md border px-2 py-1 text-sm"
      />

      {open && filtered.length > 0 && (
        <ul
          id="combobox-list"
          role="listbox"
          className="mt-1 max-h-48 w-full overflow-auto rounded-md border bg-card p-1 text-sm"
        >
          {filtered.map((opt, idx) => {
            const selected = value === opt.value;
            const highlighted = idx === highlight;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => {
                  // use onMouseDown to prevent blur before click
                  e.preventDefault();
                  selectOption(opt);
                }}
                className={`cursor-pointer rounded px-2 py-1 ${
                  highlighted ? "bg-muted/40" : ""
                } ${selected ? "font-medium" : ""}`}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Combobox;

