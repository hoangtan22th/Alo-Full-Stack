import { Link, useLocation } from "react-router-dom";

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-100 dark:bg-slate-900 flex flex-col py-8 px-6 z-50">
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-xl overflow-hidden">
          <img
            alt="Alo-Chat Logo"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBw2xvyrRnJKSUt9p7t7v0NlSWNRnc2HrtHeoF3ERiG-uAXfWeKXpwPTnY7wlwtMB-25p-poAaKgsIpkP9X342MC-NoEYWqwpEf_VZqrJQZNlH6AYQZB5kQEnxGWWbCOkOKQyb0hdYfLep9anBiQJ1pYNdflXdq_uHRVBxQGQvEUjhA_6AaxACydHZ0V41g9rA5qUR6In8w37n95lBJaQgXXiWBmYD4LXiu8ryMKb6q7koBSUcs4Togyhyw4JynEoWRK2U_gkZPpXE"
          />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-700 dark:text-slate-200 font-manrope tracking-tight">
            Alo-Chat
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            Admin Control
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-2">
        <Link
          to="/"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-bold ${
            location.pathname === "/"
              ? "bg-slate-200/50 dark:bg-slate-800 text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <span className="material-symbols-outlined" data-icon="dashboard">
            dashboard
          </span>
          <span className="font-manrope text-sm tracking-tight">Overview</span>
        </Link>
        <Link
          to="/users"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-bold ${
            location.pathname === "/users"
              ? "bg-slate-200/50 dark:bg-slate-800 text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <span className="material-symbols-outlined" data-icon="group">
            group
          </span>
          <span className="font-manrope text-sm tracking-tight">
            User Management
          </span>
        </Link>
        <Link
          to="/broadcast"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-bold ${
            location.pathname === "/broadcast"
              ? "bg-slate-200/50 dark:bg-slate-800 text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <span className="material-symbols-outlined" data-icon="campaign">
            campaign
          </span>
          <span className="font-manrope text-sm tracking-tight">
            Global Broadcast
          </span>
        </Link>
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-bold ${
            location.pathname === "/settings"
              ? "bg-slate-200/50 dark:bg-slate-800 text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
          }`}
        >
          <span className="material-symbols-outlined" data-icon="settings">
            settings
          </span>
          <span className="font-manrope text-sm tracking-tight">Settings</span>
        </Link>
      </nav>
      <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-2">
          <img
            alt="Admin Profile"
            className="w-10 h-10 rounded-full ring-2 ring-white"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuACp0GF2aKEGTtOKtDsnBNB98m7NzLn-rWytHmXJ3hXIq-n5jS_ogMEiW6W3j1C6lODaFuC2vrQr5pzdxHCiq798QnMYmrDaFoAXK2ZzafiJsxGMCdYUmWPQJx4dXiTJSNvrZkqzZce04FtJyVp4jFjjDBsPHwfVAxgKfR8y0cdvhSxaj3LoeFHpjf9CpgrcOjy5VigxfOSPRVoqXcJCGU4YqRArJ_-yCB9dp5wIUEqoVIeBGuWEBrvBSLhWOH_sa0b6uMjQiZau7I"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Admin Staff
            </span>
            <span className="text-xs text-slate-500">Super User</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
