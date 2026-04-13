export function Header() {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-8 z-40">
      <div className="flex items-center gap-4 bg-surface-container rounded-full px-4 py-2 w-96">
        <span
          className="material-symbols-outlined text-slate-400"
          data-icon="search"
        >
          search
        </span>
        <input
          className="bg-transparent border-none outline-none focus:ring-0 text-sm w-full text-slate-600"
          placeholder="Search data, users or logs..."
          type="text"
        />
      </div>
      <div className="flex items-center gap-6">
        <div className="relative">
          <span
            className="material-symbols-outlined text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer transition-opacity opacity-80"
            data-icon="notifications"
          >
            notifications
          </span>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full"></span>
        </div>
        <div className="flex items-center gap-2 cursor-pointer transition-opacity opacity-80">
          <span
            className="material-symbols-outlined text-slate-600 dark:text-slate-400"
            data-icon="account_circle"
          >
            account_circle
          </span>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Admin
          </span>
        </div>
      </div>
    </header>
  );
}
