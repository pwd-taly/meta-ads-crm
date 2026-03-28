"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  name: string;
  spend: number;
  leads: number;
  cpl: number;
  status: string;
  ctr: number;
}

interface CampaignTableProps {
  campaigns: Campaign[];
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign Name</TableHead>
            <TableHead className="text-right">Spend</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Cost per Lead</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id} className="hover:bg-white/[0.03] transition-colors">
              <TableCell className="font-medium text-text-primary">{campaign.name}</TableCell>
              <TableCell className="text-right text-text-primary font-medium">
                {formatCurrency(campaign.spend)}
              </TableCell>
              <TableCell className="text-right text-text-primary">{campaign.leads}</TableCell>
              <TableCell className="text-right text-text-primary">
                {formatCurrency(campaign.cpl)}
              </TableCell>
              <TableCell className="text-right text-text-primary">{campaign.ctr}%</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {campaign.status === "active" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  <Badge variant={campaign.status === "active" ? "success" : "secondary"}>
                    {campaign.status === "active" ? "Active" : "Paused"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
