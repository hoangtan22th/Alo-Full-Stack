import { ChevronDownIcon } from "@heroicons/react/24/outline";

export function FilterSelect({ icon, defaultValue }: any) {
  return (
    <div className="relative group">
      <select className="appearance-none bg-surface-container border-none text-on-surface text-sm rounded-xl py-3 pl-10 pr-10 focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest focus:outline-none cursor-pointer h-full transition-colors font-medium hover:bg-surface-container-highest">
        <option>{defaultValue}</option>
        <option>Option 1</option>
        <option>Option 2</option>
      </select>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        {icon}
      </div>
      <ChevronDownIcon className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
    </div>
  );
}
