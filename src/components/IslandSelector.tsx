import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

const islands = [
  { value: "big-island", label: "Big Island" },
  { value: "maui", label: "Maui" },
  { value: "oahu", label: "O'ahu" },
  { value: "kauai", label: "Kaua'i" },
  { value: "molokai", label: "Moloka'i" },
  { value: "lanai", label: "Lāna'i" },
];

export function IslandSelector({ compact }: { compact?: boolean }) {
  return (
    <Select defaultValue="big-island">
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
        {islands.map((island) => (
          <SelectItem key={island.value} value={island.value}>
            {island.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
