const BaseRepository = require('./base.repository');
const Organization = require('../../models/Organization');

class OrganizationRepository extends BaseRepository {
  constructor() {
    super(Organization);
  }

  async findByClerkId(clerkId) {
    return this.findOne({ 
      clerkId, 
      isActive: true, 
      deletedAt: null 
    });
  }

  async findBySlug(slug) {
    return this.findOne({ 
      slug, 
      isActive: true, 
      deletedAt: null 
    });
  }

  async incrementUsage(clerkId, usageType, amount = 1) {
    const updateField = `usage.${usageType}`;
    
    return this.model.findOneAndUpdate(
      { clerkId },
      { $inc: { [updateField]: amount } },
      { new: true }
    );
  }

  async resetMonthlyUsage(clerkId) {
    return this.model.findOneAndUpdate(
      { clerkId },
      { 
        'usage.apiCallsThisMonth': 0,
        'usage.lastResetDate': new Date()
      },
      { new: true }
    );
  }

  async getUsageStats(clerkId) {
    const org = await this.findByClerkId(clerkId);
    if (!org) return null;

    return {
      current: org.usage,
      limits: org.limits,
      utilization: {
        agents: org.limits.maxAgents === -1 ? 0 : 
                 (org.usage.agentCount / org.limits.maxAgents) * 100,
        members: org.limits.maxMembers === -1 ? 0 : 
                 (org.usage.memberCount / org.limits.maxMembers) * 100,
        apiCalls: org.limits.apiCallsPerMonth === -1 ? 0 : 
                  (org.usage.apiCallsThisMonth / org.limits.apiCallsPerMonth) * 100
      }
    };
  }
}

module.exports = new OrganizationRepository();
