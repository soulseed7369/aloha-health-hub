import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const ISLANDS = [
  { value: "big-island", label: "Big Island",  path: "/" },
  { value: "maui",       label: "Maui",         path: "/maui" },
  { value: "oahu",       label: "Oahu",         path: "/oahu" },
  { value: "kauai",      label: "Kauai",        path: "/kauai" },
];

function currentIslandFromPath(pathname: string): string {
  if (pathname.startsWith('/maui'))  return 'maui';
  if (pathname.startsWith('/oahu'))  return 'oahu';
  if (pathname.startsWith('/kauai')) return 'kauai';
  return 'big-island';
}

export function IslandSelector({ compact }: { compact?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = currentIslandFromPath(location.pathname);

  return (
    <Select
      value={current}
      onValueChange={(val) => {
        const island = ISLANDS.find(i => i.value === val);
        if (island) navigate(island.path);
      }}
    >
      <SelectTrigger
        className={
          compact
            ? "h-8 w-auto gap-1 border-0 bg-transparent px-2 text-xs font-medium text-muted-foreground shadow-none focus:ring-0"
            : "w-[140px] text-sm"
        }
      >
        {compact && <MapPin className="h-3 w-3 shrink-0 text-primary" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ISLANDS.map((island) => (
          <SelectItem key={island.value} value={island.value}>
            {island.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
