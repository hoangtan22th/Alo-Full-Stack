import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";

export function GrowthChartCard() {
  return (
    <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-8 shadow-minimal flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-surface">
            User Growth & Activity
          </h3>
          <p className="text-sm font-medium text-on-surface-variant">
            Daily active users over the last 30 days.
          </p>
        </div>
        <button className="p-2 rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant cursor-pointer">
          <EllipsisVerticalIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 min-h-[250px] flex items-end justify-between gap-2 pt-8 border-b border-surface-container-high relative">
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs font-medium text-outline-variant pb-8">
          <span>1.5M</span>
          <span>1.0M</span>
          <span>500K</span>
          <span>0</span>
        </div>
        <div className="ml-10 w-full flex items-end justify-between gap-1 h-full pb-1">
          {[30, 40, 35, 45, 60, 55, 70, 80, 75, 90].map((h, i) => (
            <div
              key={i}
              className="w-full bg-surface-container-high rounded-t-sm hover:bg-surface-variant transition-colors"
              style={{ height: `${h}%` }}
            ></div>
          ))}
          <div className="w-full bg-primary h-[100%] rounded-t-sm opacity-80 hover:opacity-100 transition-opacity relative group">
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-on-surface text-surface-container-lowest text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              1.24M Today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
