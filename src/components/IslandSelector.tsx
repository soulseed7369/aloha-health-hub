import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const islands = [
  { value: "big-island", label: "Big Island" },
  { value: "maui", label: "Maui" },
  { value: "oahu", label: "O'ahu" },
  { value: "kauai", label: "Kaua'i" },
  { value: "molokai", label: "Moloka'i" },
  { value: "lanai", label: "Lāna'i" },
];

export function IslandSelector() {
  return (
    <Select defaultValue="big-island">
      <SelectTrigger className="w-[140px] text-sm">
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
