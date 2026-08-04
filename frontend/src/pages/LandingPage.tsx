import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Logo } from "../components/Logo";
import { buttonAccentClass, buttonSecondaryClass } from "../components/ui";

const PAIN_POINTS = [
  {
    icon: "📱",
    title: "Pedidos perdidos no WhatsApp",
    text: "Solicitação vira mensagem de áudio, print de planilha e ninguém sabe mais o que já foi aprovado.",
  },
  {
    icon: "🐢",
    title: "Aprovação que trava",
    text: "Sem regra clara de quem aprova o quê, todo pedido acima de um certo valor fica esperando alguém lembrar de responder.",
  },
  {
    icon: "🔀",
    title: "Cotação sem comparação",
    text: "Preço, frete e prazo de cada fornecedor ficam espalhados em conversas e e-mails diferentes.",
  },
  {
    icon: "❓",
    title: "Sem visibilidade do gasto",
    text: "No fim do mês, ninguém sabe ao certo quanto cada setor gastou nem se a negociação valeu a pena.",
  },
];

const FEATURES = [
  {
    icon: "🔄",
    title: "Aprovação em etapas",
    text: "Defina regras por setor e faixa de valor. Cada pedido segue automaticamente a fila de aprovação certa.",
  },
  {
    icon: "🧾",
    title: "Cotações lado a lado",
    text: "Compare preço, frete, prazo e condição de vários fornecedores no mesmo pedido antes de decidir.",
  },
  {
    icon: "🏢",
    title: "Catálogo de fornecedores",
    text: "Histórico de cotações, taxa de vitória e preço médio de cada fornecedor, sempre à mão.",
  },
  {
    icon: "📊",
    title: "Dashboard e indicadores",
    text: "Gasto por setor, tempo médio de aprovação e economia obtida nas negociações, em tempo real.",
  },
  {
    icon: "🔔",
    title: "Notificações no lugar certo",
    text: "Aprovações pendentes, cotações atrasadas e prazos vencendo, tudo centralizado num sino só.",
  },
  {
    icon: "🔒",
    title: "Multiempresa e isolado",
    text: "Cada empresa cadastrada tem seus próprios dados, totalmente isolados dos demais clientes.",
  },
];

const STEPS = [
  { icon: "📝", title: "Solicitado", text: "Quem precisa de algo abre o pedido com os itens e a justificativa." },
  { icon: "✅", title: "Aprovado", text: "Segue automaticamente para quem tem que aprovar, na ordem certa." },
  { icon: "🧾", title: "Cotação", text: "O comprador registra as propostas dos fornecedores e escolhe a melhor." },
  { icon: "📦", title: "Recebido", text: "Pedido enviado, entregue e o histórico fica registrado pra sempre." },
];

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`px-6 py-16 sm:py-20 ${className}`}>{children}</section>;
}

function SectionInner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-6xl ${className}`}>{children}</div>;
}

export function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-svh bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo />
          <div className="flex items-center gap-3 text-sm">
            <Link to="/login" className="font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
              Entrar
            </Link>
            <Link to="/registrar" className={buttonAccentClass}>
              Criar empresa
            </Link>
          </div>
        </div>
      </header>

      <Section className="pb-12 pt-14 sm:pb-20 sm:pt-20">
        <SectionInner className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Pedidos de compra e aprovações,{" "}
              <span className="text-blue-700 dark:text-blue-400">sem planilha e sem WhatsApp perdido</span>
            </h1>
            <p className="mt-5 text-lg text-neutral-600 dark:text-neutral-400">
              O SupplyOR organiza solicitação, aprovação, cotação e recebimento num só lugar — com regras claras de
              quem aprova o quê e visibilidade total do que sua empresa está comprando.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/registrar" className={`${buttonAccentClass} px-6 py-3 text-base`}>
                Criar empresa
              </Link>
              <Link to="/login" className={`${buttonSecondaryClass} px-6 py-3 text-base`}>
                Já tenho conta
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Aguardando aprovação", value: "3", color: "text-amber-600 dark:text-amber-400" },
                { label: "Em cotação", value: "2", color: "text-cyan-600 dark:text-cyan-400" },
                { label: "Economia obtida", value: "R$ 4.200", color: "text-emerald-600 dark:text-emerald-400" },
              ].map((tile) => (
                <div key={tile.label} className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
                  <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{tile.label}</p>
                  <p className={`mt-1 text-lg font-bold ${tile.color}`}>{tile.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="mb-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400">Compras por mês</p>
              <div className="flex h-24 items-end gap-2">
                {[35, 55, 40, 70, 50, 90].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-blue-600" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-950">
              <span>✓</span>
              <span className="text-neutral-600 dark:text-neutral-400">Pedido aprovado por 2 etapas — dentro da regra do setor Agrícola</span>
            </div>
          </div>
        </SectionInner>
      </Section>

      <Section className="bg-neutral-50 dark:bg-neutral-900/40">
        <SectionInner>
          <h2 className="text-center text-2xl font-bold sm:text-3xl">O jeito manual de comprar tem um custo</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                <span className="text-2xl">{p.icon}</span>
                <h3 className="mt-3 font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{p.text}</p>
              </div>
            ))}
          </div>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Tudo que a compra da sua empresa precisa</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{f.text}</p>
              </div>
            ))}
          </div>
        </SectionInner>
      </Section>

      <Section className="bg-neutral-50 dark:bg-neutral-900/40">
        <SectionInner>
          <h2 className="text-center text-2xl font-bold sm:text-3xl">Do pedido ao recebimento, em 4 passos</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
                <span className="text-xs font-semibold text-neutral-400">Passo {i + 1}</span>
                <div className="mt-2 text-2xl">{s.icon}</div>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{s.text}</p>
              </div>
            ))}
          </div>
        </SectionInner>
      </Section>

      <Section className="bg-blue-700 text-white dark:bg-blue-800">
        <SectionInner className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Organize as compras da sua empresa agora</h2>
          <p className="max-w-xl text-blue-100">
            Cadastre sua empresa e comece a usar o SupplyOR — sem precisar migrar planilha nenhuma.
          </p>
          <Link to="/registrar" className="rounded-md bg-white px-6 py-3 text-base font-medium text-blue-700 hover:bg-blue-50">
            Criar empresa
          </Link>
        </SectionInner>
      </Section>

      <footer className="border-t border-neutral-200 px-6 py-8 dark:border-neutral-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            © {new Date().getFullYear()} SupplyOR. Sistema de pedidos de compra.
          </p>
          <Link to="/login" className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white">
            Entrar
          </Link>
        </div>
      </footer>
    </div>
  );
}
