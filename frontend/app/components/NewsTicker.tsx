"use client";

import { useState, useEffect } from "react";
import { Newspaper } from "lucide-react";
import { api } from "../utils/api";

export default function NewsTicker() {
  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await api.getNews();
        setNews(data);
      } catch (err) {
        console.error("Error loading news feed:", err);
      }
    };

    fetchNews();
    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, []);

  if (news.length === 0) {
    return (
      <div className="bg-slate-900/40 border-y border-slate-800/80 py-2 flex items-center justify-center text-xs text-slate-500 font-medium">
        <RefreshLoader className="h-4 w-4 mr-2 animate-spin text-blue-500" /> Loading Indian markets news feed...
      </div>
    );
  }

  // Duplicate items to ensure smooth infinite scroll if they fit screen width
  const scrollItems = [...news, ...news, ...news];

  return (
    <div className="bg-slate-900/85 border-y border-slate-800/80 py-2 w-full overflow-hidden flex items-center relative z-10">
      <div className="px-4 bg-[#0d1324] border-r border-slate-800 flex items-center gap-2 text-xs font-bold text-blue-400 shrink-0 select-none z-20 shadow-md">
        <Newspaper className="h-4 w-4" />
        <span>NEWS TICKER</span>
      </div>

      <div className="flex w-full overflow-hidden relative">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12 pl-4">
          {scrollItems.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-300 hover:text-blue-400 font-medium transition inline-flex items-center gap-2"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              <span>{item.headline}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">[{item.source}]</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function RefreshLoader(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.72 2.78L21 8" />
      <polyline points="21 3 21 8 16 8" />
    </svg>
  );
}
