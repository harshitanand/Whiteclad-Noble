const BaseRepository = require('./base.repository');
const User = require('../../models/User');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByClerkId(clerkId) {
    return this.findOne({ clerkId, deletedAt: null });
  }

  async findByEmail(email) {
    return this.findOne({ 
      email: email.toLowerCase(), 
      deletedAt: null 
    });
  }

  async findActiveUsers(filter = {}) {
    return this.findMany({ 
      ...filter, 
      isActive: true, 
      deletedAt: null 
    });
  }

  async updateLastLogin(clerkId) {
    return this.model.findOneAndUpdate(
      { clerkId },
      { lastLoginAt: new Date() },
      { new: true }
    );
  }

  async softDelete(clerkId) {
    return this.model.findOneAndUpdate(
      { clerkId },
      { 
        deletedAt: new Date(),
        isActive: false 
      },
      { new: true }
    );
  }
}

module.exports = new UserRepository();
