export class DashboardStatsDto {
  totalBusinesses: number;
  activeCampaigns: number;
  messagesSent: number;
  totalLeads: number;
  trends: {
    businesses: string;
    campaigns: string;
    messages: string;
    leads: string;
  };
}
export interface DashboardStats {
  totalBusinesses: number;
  activeCampaigns: number;
  messagesSent: number;
  totalLeads: number;
  trends: {
    businesses: string;
    campaigns: string;
    messages: string;
    leads: string;
  };
}