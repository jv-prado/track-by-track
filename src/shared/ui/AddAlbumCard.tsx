import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

interface AddAlbumCardProps {
  label: string;
}

export function AddAlbumCard({ label }: AddAlbumCardProps) {
  return (
    <Link
      to="/search"
      className="group flex w-full max-w-[220px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 aspect-square text-gray-400 transition-colors hover:border-dourado hover:text-dourado cursor-pointer"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-dourado/10">
        <Plus size={24} />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
