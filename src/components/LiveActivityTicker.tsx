import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { fetchRecentActivity } from "@/lib/recentActivity";

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
};

const LiveActivityTicker = () => {
  const { data: items = [] } = useQuery({
    queryKey: ["recent_activity"],
    queryFn: () => fetchRecentActivity(12),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % items.length);
        setFade(true);
      }, 250);
    }, 3500);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) return null;
  const current = items[index % items.length];

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 mx-2 md:mx-0 mb-2 overflow-hidden"
      style={{ background: "#fdf7f0", borderRadius: "6px", border: "1px solid #ecdfcf" }}
    >
      <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#b8681e" }} />
      <span
        className="text-[11px] font-medium truncate"
        style={{ color: "#7a5a44", opacity: fade ? 1 : 0, transition: "opacity 0.25s ease" }}
      >
        {current.province ? `Alguém em ${current.province}` : "Alguém"} comprou{" "}
        <strong style={{ color: "#4a3527" }}>{current.title}</strong> {relativeTime(current.created_at)}
      </span>
    </div>
  );
};

export default LiveActivityTicker;
