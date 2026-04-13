export function Dashboard() {
  return (
    <>
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-extrabold font-manrope text-on-background tracking-tight">
            System Overview
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Real-time infrastructure and user engagement metrics.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/10 rounded-lg text-sm font-semibold hover:bg-surface-container transition-colors">
            Download Report
          </button>
          <button className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">
            Live View
          </button>
        </div>
      </div>

      {/* Top Row: Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1: Live CCU */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/5 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-bold text-on-surface-variant font-manrope uppercase tracking-wider">
              Live CCU
            </span>
            <div className="flex items-center gap-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              STABLE
            </div>
          </div>
          <div className="text-3xl font-extrabold font-manrope text-on-background">
            1,240
          </div>
          <div className="mt-6 h-12 w-full flex items-end gap-0.5">
            <div className="flex-1 bg-primary/10 h-1/2 rounded-t-sm group-hover:bg-primary/20 transition-colors"></div>
            <div className="flex-1 bg-primary/10 h-2/3 rounded-t-sm group-hover:bg-primary/20 transition-colors"></div>
            <div className="flex-1 bg-primary/10 h-1/3 rounded-t-sm group-hover:bg-primary/20 transition-colors"></div>
            <div className="flex-1 bg-primary/10 h-4/5 rounded-t-sm group-hover:bg-primary/20 transition-colors"></div>
            <div className="flex-1 bg-primary/10 h-1/2 rounded-t-sm group-hover:bg-primary/20 transition-colors"></div>
            <div className="flex-1 bg-primary/20 h-3/4 rounded-t-sm group-hover:bg-primary/30 transition-colors"></div>
            <div className="flex-1 bg-primary/30 h-1/2 rounded-t-sm group-hover:bg-primary/40 transition-colors"></div>
            <div className="flex-1 bg-primary h-full rounded-t-sm"></div>
          </div>
        </div>

        {/* Card 2: Total Users */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/5 relative group overflow-hidden">
          <span
            className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl text-slate-100 dark:text-slate-800/50 -rotate-12 pointer-events-none"
            data-icon="group"
          >
            group
          </span>
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-bold text-on-surface-variant font-manrope uppercase tracking-wider">
              Total Users
            </span>
            <span
              className="material-symbols-outlined text-primary-dim"
              data-icon="trending_up"
            >
              trending_up
            </span>
          </div>
          <div className="text-3xl font-extrabold font-manrope text-on-background">
            15,420
          </div>
          <div className="mt-2 text-xs text-on-surface-variant font-medium">
            +240 since last login
          </div>
        </div>

        {/* Card 3: Messages Today */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/5 group">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-bold text-on-surface-variant font-manrope uppercase tracking-wider">
              Messages Today
            </span>
            <div className="p-2 bg-secondary-container rounded-lg">
              <span
                className="material-symbols-outlined text-on-secondary-container text-sm"
                data-icon="chat"
              >
                chat
              </span>
            </div>
          </div>
          <div className="text-3xl font-extrabold font-manrope text-on-background">
            45,210
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-green-600">
            <span
              className="material-symbols-outlined text-sm font-bold"
              data-icon="arrow_upward"
            >
              arrow_upward
            </span>
            <span className="text-xs font-extrabold">12%</span>
            <span className="text-xs text-on-surface-variant font-medium ml-1">
              vs yesterday
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Large Traffic Chart */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/5 overflow-hidden">
        <div className="px-8 pt-8 pb-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-extrabold font-manrope text-on-background">
              Server Traffic (Messages/sec)
            </h3>
            <p className="text-sm text-on-surface-variant">
              Real-time data throughput over the last 24 hours
            </p>
          </div>
          <div className="flex bg-surface-container p-1 rounded-lg">
            <button className="px-3 py-1 text-xs font-bold bg-white rounded-md shadow-sm">
              24h
            </button>
            <button className="px-3 py-1 text-xs font-bold text-on-surface-variant">
              7d
            </button>
            <button className="px-3 py-1 text-xs font-bold text-on-surface-variant">
              30d
            </button>
          </div>
        </div>
        <div className="h-64 px-8 pb-8 flex items-end gap-1.5">
          <svg
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
            viewBox="0 0 1000 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="areaGradient"
                x1="0%"
                x2="0%"
                y1="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#575e70" stopOpacity="0.15"></stop>
                <stop offset="100%" stopColor="#575e70" stopOpacity="0"></stop>
              </linearGradient>
            </defs>
            <path
              d="M0,160 C100,150 150,180 200,140 C250,100 300,120 350,80 C400,40 450,100 500,60 C550,20 600,40 650,50 C700,60 750,140 800,120 C850,100 900,150 1000,140 L1000,200 L0,200 Z"
              fill="url(#areaGradient)"
            ></path>
            <path
              d="M0,160 C100,150 150,180 200,140 C250,100 300,120 350,80 C400,40 450,100 500,60 C550,20 600,40 650,50 C700,60 750,140 800,120 C850,100 900,150 1000,140"
              fill="none"
              stroke="#575e70"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            ></path>
            <circle
              cx="500"
              cy="60"
              fill="#575e70"
              r="5"
              stroke="white"
              strokeWidth="2"
            >
              <animate
                attributeName="r"
                dur="2s"
                repeatCount="indefinite"
                values="5;7;5"
              ></animate>
            </circle>
          </svg>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Table Card */}
        <div className="xl:col-span-2 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/5 overflow-hidden">
          <div className="p-8 border-b border-surface-container">
            <h3 className="text-lg font-extrabold font-manrope text-on-background">
              Recent Users Management
            </h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-8 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">
                  User ID
                </th>
                <th className="px-8 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">
                  Avatar & Name
                </th>
                <th className="px-8 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">
                  Email
                </th>
                <th className="px-8 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">
                  Status
                </th>
                <th className="px-8 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              <tr className="hover:bg-surface-container-low transition-colors">
                <td className="px-8 py-4 text-xs font-mono text-on-surface-variant">
                  #US-9921
                </td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      alt="User 1"
                      className="w-8 h-8 rounded-full"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZv6e4BCiMdBwXGGKfESn53LmRFABPy0JH_SmqhwvJmowCbX-9Ii8HJcjBB3Vxw65506_B0SXdgFCcKbDFL6zjTt9KJtv1ZqXm6vR663QK-9yGdg0c9DEhJjLoIAQMyCAkj0ReERKnKhAJzr455KZwF6uaZYPYNI8eabx3cRGiaDbc8Ikl7IxDFi1MRiOnIOa2Z4Hkxt0oDE7IlKRXvYX26FyqT_IocdOxI0HXYYOjU36zKYies6_n7m8vZZx1JdG4wsfIM1UGpfI"
                    />
                    <span className="text-sm font-bold text-on-background">
                      Alex River
                    </span>
                  </div>
                </td>
                <td className="px-8 py-4 text-sm text-on-surface-variant">
                  alex.r@alo-chat.com
                </td>
                <td className="px-8 py-4">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-extrabold rounded-full">
                    ACTIVE
                  </span>
                </td>
                <td className="px-8 py-4 text-right space-x-2">
                  <button className="px-3 py-1.5 border border-outline text-outline text-[10px] font-bold rounded-lg hover:bg-surface-container transition-colors">
                    BAN
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low transition-colors">
                <td className="px-8 py-4 text-xs font-mono text-on-surface-variant">
                  #US-9918
                </td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      alt="User 2"
                      className="w-8 h-8 rounded-full"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaE_f5SdnHgXE4XRWx7H8UDj-1QIWqlqOjNT4KCxCZgaFkhfBi2Ch53iAugZKEXhjQXFia4GOvKb8HisJ_dn8fJ-ty39yIybCu6A--QxRvrTO6pm76l5dbckNJUTdTRj1vi9_92qBgtrkm-i1MLuEYCJg2-XjqGqNpWWiBK8uTCr5HV6dvpCzboWim3O5_Oc9pjVoQ1CyGZyw5X1kyjFw_WDFewRn4lWClfoT8qMAwBRQudOsTzOcQj8sEnUl0D1H_-Pxs4DkWzik"
                    />
                    <span className="text-sm font-bold text-on-background">
                      Sarah Kong
                    </span>
                  </div>
                </td>
                <td className="px-8 py-4 text-sm text-on-surface-variant">
                  skong@webmail.io
                </td>
                <td className="px-8 py-4">
                  <span className="px-3 py-1 bg-error-container/20 text-error text-[10px] font-extrabold rounded-full">
                    BANNED
                  </span>
                </td>
                <td className="px-8 py-4 text-right space-x-2">
                  <button className="px-3 py-1.5 bg-error text-on-error text-[10px] font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
                    UNBAN
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low transition-colors">
                <td className="px-8 py-4 text-xs font-mono text-on-surface-variant">
                  #US-9915
                </td>
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      alt="User 3"
                      className="w-8 h-8 rounded-full"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuByOSkQptJ8jNl1H8lvKNnDr5_oB8IDA6603CMSCgYjDbHgNmS4FrR3YEvHtKbL_zq2-vUBSnnfwA9IgIg8zZqc-aXaJ0ZhHqGoGycgzJTFs7wFoML6hNNrGDVZNd8MokuRhnH6wSo0XDejn7YoIntAv07MjKfB1hpUWg3nJzz7MM33gGaPIHMk5LUzWMimWrylPM6qz1H_9xwBIROxxzk5RIDbA22LOLgSXbDXwMdNiMmSjjKHJeuzZv5Xr2-0Dk2I-l7AbPj_DeI"
                    />
                    <span className="text-sm font-bold text-on-background">
                      Liam Neils
                    </span>
                  </div>
                </td>
                <td className="px-8 py-4 text-sm text-on-surface-variant">
                  liam.n@company.com
                </td>
                <td className="px-8 py-4">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-extrabold rounded-full">
                    ACTIVE
                  </span>
                </td>
                <td className="px-8 py-4 text-right space-x-2">
                  <button className="px-3 py-1.5 border border-outline text-outline text-[10px] font-bold rounded-lg hover:bg-surface-container transition-colors">
                    BAN
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Broadcast Card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/5 p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
              <span
                className="material-symbols-outlined text-primary"
                data-icon="campaign"
              >
                campaign
              </span>
            </div>
            <h3 className="text-lg font-extrabold font-manrope text-on-background">
              Loa Phường
            </h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
            Broadcast an urgent announcement to all connected clients
            immediately. This will trigger a global pop-up notification.
          </p>
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest">
                Message Content
              </label>
              <textarea
                className="w-full h-32 bg-surface-container-low border-none focus:ring-2 focus:outline-none focus:ring-primary/20 rounded-xl p-4 text-sm text-on-background resize-none"
                placeholder="Nhập thông báo tại đây..."
              ></textarea>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <input
                className="rounded border-outline-variant/30 text-primary focus:ring-primary h-4 w-4"
                id="urgent"
                type="checkbox"
              />
              <label
                className="text-xs font-medium text-on-surface-variant cursor-pointer"
                htmlFor="urgent"
              >
                Mark as High Priority
              </label>
            </div>
          </div>
          <button className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <span
              className="material-symbols-outlined text-sm"
              data-icon="send"
            >
              send
            </span>
            Gửi thông báo toàn hệ thống
          </button>
        </div>
      </div>
    </>
  );
}
