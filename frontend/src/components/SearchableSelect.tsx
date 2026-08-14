import { useEffect, useMemo, useState, type FocusEvent } from "react";
import { cardClass, inputClass, labelClass } from "./ui";

export type SearchableSelectOption = { id: string; label: string };

/** Campo de busca com lista suspensa pra escolher um item numa lista que pode crescer bastante
 * (ex: solicitante, fornecedor) — substitui um <select> simples. */
export function SearchableSelect({
  label,
  placeholder,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (id: string) => void;
  options: SearchableSelectOption[];
  allLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) return;
    const selected = options.find((o) => o.id === value);
    setQuery(value ? selected?.label ?? "" : "");
  }, [value, options, open]);

  const filtered = useMemo(() => {
    const all = [{ id: "", label: allLabel }, ...options];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, allLabel]);

  function select(id: string, optLabel: string) {
    onChange(id);
    setQuery(optLabel);
    setOpen(false);
  }

  function closeIfFocusLeft(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
  }

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative" onBlur={closeIfFocusLeft}>
        <input
          className={inputClass}
          placeholder={placeholder}
          value={query}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.currentTarget.blur();
          }}
        />
        {open && (
          <div className={`${cardClass} absolute z-20 mt-1 max-h-64 w-full overflow-y-auto p-0 shadow-lg`}>
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">Nada encontrado.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id || "__all__"}
                  type="button"
                  onClick={() => select(o.id, o.label)}
                  className={`block w-full truncate border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50 ${
                    o.id === value ? "bg-blue-50 font-medium dark:bg-blue-900/20" : ""
                  }`}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
