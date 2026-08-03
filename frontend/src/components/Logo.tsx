import { Link } from "react-router-dom";
import logoIcon from "../assets/logo-icon.png";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

/**
 * Ícone em fundo branco (rounded) pra manter contraste tanto no header claro
 * quanto no dark mode — o PNG original tem fundo branco sólido, não transparente.
 * Sempre linka pro dashboard, que é a tela inicial do sistema.
 */
export function Logo({ className = "", showWordmark = true }: LogoProps) {
  return (
    <Link to="/dashboard" className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white p-1 shadow-sm ring-1 ring-black/5">
        <img src={logoIcon} alt="SupplyOR" className="h-full w-full object-contain" />
      </span>

      {showWordmark && (
        <span className="text-xl font-extrabold tracking-tight" translate="no">
          <span className="text-blue-800 dark:text-blue-400">Supply</span>
          <span className="text-orange-500">OR</span>
        </span>
      )}
    </Link>
  );
}
