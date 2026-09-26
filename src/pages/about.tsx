export function AboutPage() {
  return (
    <div className="max-w-2xl flex flex-col gap-6 overflow-auto">
      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
          dev
        </span>
        <h1 className="text-gray-900 text-sm font-semibold tracking-widest uppercase">
          About
        </h1>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        A minimal desktop app boilerplate built with{" "}
        <span className="text-gray-700">Electron</span>,{" "}
        <span className="text-gray-700">Vite</span>,{" "}
        <span className="text-gray-700">React</span>,{" "}
        <span className="text-gray-700">better-sqlite3</span>,{" "}
        <span className="text-gray-700">Drizzle ORM</span>, and{" "}
        <span className="text-gray-700">Zod</span>.
      </p>

      <a
        href="https://github.com/sezginbozdemir/electron-vite-react-bettersql3"
        target="_blank"
        rel="noreferrer"
        className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors w-fit border-b border-gray-300 hover:border-gray-500 pb-0.5"
      >
        github.com/sezginbozdemir/electron-vite-react-bettersql3 →
      </a>
    </div>
  );
}
