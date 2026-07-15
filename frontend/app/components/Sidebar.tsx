"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  TrendingUp, 
  History, 
  Landmark, 
  LogOut,
  GraduationCap
} from "lucide-react";
import { api } from "../utils/api";

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Market Analyzer", href: "/market", icon: TrendingUp },
    { name: "Bank Simulator", href: "/bank", icon: Landmark },
    { name: "History & Stats", href: "/history", icon: History },
  ];

  return (
    <aside className="w-64 bg-[#0d1324] border-r border-slate-800/80 flex flex-col h-screen fixed left-0 top-0 z-20">
      <div className="p-6 border-b border-slate-800/60 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg text-white block tracking-tight">FinLit Sim</span>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">India Market Edition</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition ${
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-850">
        <button
          onClick={() => api.logout()}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
