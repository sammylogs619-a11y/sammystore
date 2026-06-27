import { Bell } from 'lucide-react';

interface TopBarProps {
  pageTitle: string;
}

export default function TopBar({ pageTitle }: TopBarProps) {
  return (
    <div className="hidden lg:flex bg-[#0f1117]/95 backdrop-blur-xl border-b border-[#1e2030] px-8 py-4 items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="font-poppins text-xl font-bold text-white">{pageTitle}</h1>
        <p className="text-sm text-gray-500">Welcome back, User</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 rounded-full flex items-center gap-2">
          <span className="text-indigo-300 font-semibold">₦ 10,591.00</span>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-[#1a1d27]">
          <Bell className="w-6 h-6 text-gray-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-[#1e2030]">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
            U
          </div>
          <div>
            <p className="text-sm font-semibold text-white">User</p>
            <p className="text-xs text-gray-500">user@email.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
