import { BellIcon, Bars3Icon } from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  return (
    <header className="flex justify-between items-center w-full px-8 h-16 bg-surface-container-low top-0 sticky z-40">
      <div className="md:hidden">
        <span className="text-lg font-bold text-on-surface">
          Alo-Chat Admin
        </span>
      </div>

      <button className="md:hidden text-on-surface">
        <Bars3Icon className="w-6 h-6" />
      </button>

      <div className="hidden md:flex flex-1 items-center justify-between">
        <div className="text-lg font-bold text-on-surface invisible">
          Alo-Chat Admin
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 scale-95 active:opacity-80 p-2 rounded-full hover:bg-surface-container">
            <BellIcon className="w-5 h-5" />
          </button>
          <Avatar className="h-8 w-8 bg-surface-container-high border-none cursor-pointer">
            <AvatarImage
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCTRJClnC72b0x50aweDtr2jJN66MeONhUz-6gDZABNQQqUFKXYhC2jZSwmTwVAE62vuv5CXojbh20e7vcYi13nNSfs4Uv3E2jFRmH6Cwa60e9dQJYKRSD9-xO3ilmdLdorRUxgl0qZOP2nYRjczf-fuD0sPLy_7Tlxu74Bfl9Pqe3sn5764JSY2rS7nkcnVidIfutGFDuidhDIUpuWBysU4gsB8G49Ba76Ej9IqqgUMbvw1GNdLrnOKN_sTKvM7qXFxnyhxb5B2xpN"
              alt="Admin Avatar"
            />
            <AvatarFallback className="bg-surface-container-high text-xs text-on-surface">
              AD
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
