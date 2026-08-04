import { useState, type FormEvent, type ReactNode } from "react";
import { useAdminKey } from "../lib/adminKey";
import { buttonPrimaryClass, cardClass, inputClass, labelClass } from "./ui";

export function AdminKeyGate({ children }: { children: (key: string, clearKey: () => void) => ReactNode }) {
  const { key, setKey, clearKey } = useAdminKey();
  const [input, setInput] = useState("");

  if (!key) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4 dark:bg-neutral-950">
        <div className={`w-full max-w-sm ${cardClass}`}>
          <h1 className="mb-1 text-xl font-semibold text-neutral-900 dark:text-neutral-100">Área interna</h1>
          <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
            Digite a chave de administrador da plataforma para continuar.
          </p>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setKey(input);
            }}
            className="space-y-4"
          >
            <div>
              <label className={labelClass}>Chave</label>
              <input
                type="password"
                required
                autoFocus
                className={inputClass}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
            <button type="submit" className={`w-full ${buttonPrimaryClass}`}>
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children(key, clearKey)}</>;
}
