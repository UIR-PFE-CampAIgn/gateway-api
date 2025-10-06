import { Injectable } from '@nestjs/common';
import { LeadsRepository } from '../../database/repositories/lead.repository';

@Injectable()
export class LeadService {
  constructor(private readonly leadsRepository: LeadsRepository) {}

  async findAll(options: {
    businessId: string;
    search?: string;
    provider?: string;
    limit?: number;
  }) {
    const leads = await this.leadsRepository.search(
      {
        search: options.search,
        provider: options.provider,
      },
      options.limit || 100,
    );

    return leads.map(lead => this.formatResponse(lead));
  }

  async findOne(id: string) {
    const lead = await this.leadsRepository.findById(id);
    return this.formatResponse(lead);
  }

  private formatResponse(lead: any) {
    return {
      id: lead._id,
      provider: lead.provider,
      provider_user_id: lead.provider_user_id,
      display_name: lead.display_name,
      created_at: lead.created_at,
    };
  }
}
