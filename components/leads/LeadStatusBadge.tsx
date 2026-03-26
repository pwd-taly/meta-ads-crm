import { STATUS_CONFIG } from "@/lib/utils";

interface Props {
  status: string;
}

export function LeadStatusBadge({ status }: Props) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg}`}
    >
      {cfg.label}
    </span>
  );
}
