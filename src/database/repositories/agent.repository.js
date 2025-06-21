const BaseRepository = require('./base.repository');
const Agent = require('../../models/Agent');

class AgentRepository extends BaseRepository {
  constructor() {
    super(Agent);
  }

  async findByOrganization(organizationId, filter = {}, options = {}) {
    const combinedFilter = {
      organizationId,
      isActive: true,
      deletedAt: null,
      ...filter
    };

    return this.findMany(combinedFilter, options);
  }

  async findPublicAgents(filter = {}, options = {}) {
    const combinedFilter = {
      isPublic: true,
      status: 'published',
      isActive: true,
      deletedAt: null,
      ...filter
    };

    return this.findMany(combinedFilter, options);
  }

  async findByCreator(createdBy, filter = {}, options = {}) {
    const combinedFilter = {
      createdBy,
      isActive: true,
      deletedAt: null,
      ...filter
    };

    return this.findMany(combinedFilter, options);
  }

  async updateAnalytics(agentId, analytics) {
    return this.model.findByIdAndUpdate(
      agentId,
      { $set: { analytics } },
      { new: true }
    );
  }

  async incrementUsage(agentId) {
    return this.model.findByIdAndUpdate(
      agentId,
      { 
        $inc: { 
          'analytics.totalConversations': 1,
          'analytics.usageThisMonth': 1
        },
        $set: {
          'analytics.lastUsedAt': new Date()
        }
      },
      { new: true }
    );
  }

  async getPopularAgents(organizationId, limit = 10) {
    return this.model.find({
      organizationId,
      isPublic: true,
      status: 'published',
      isActive: true,
      deletedAt: null
    })
    .sort({ 'analytics.totalConversations': -1 })
    .limit(limit)
    .exec();
  }

  async searchAgents(organizationId, searchTerm, options = {}) {
    const searchFilter = {
      organizationId,
      isActive: true,
      deletedAt: null,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { tags: { $in: [new RegExp(searchTerm, 'i')] } }
      ]
    };

    return this.findMany(searchFilter, options);
  }
}

module.exports = new AgentRepository();
