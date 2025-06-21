#!/usr/bin/env node

const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const config = require('../src/config');
const logger = require('../src/config/logger');

// Import models
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');
const Agent = require('../src/models/Agent');

class DatabaseSeeder {
  constructor() {
    this.users = [];
    this.organizations = [];
    this.agents = [];
  }

  async connect() {
    try {
      await mongoose.connect(config.database.uri, {
        ...config.database.options,
        dbName: config.database.name
      });
      logger.info('Connected to database for seeding');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.connection.close();
      logger.info('Disconnected from database');
    } catch (error) {
      logger.error('Failed to disconnect from database:', error);
    }
  }

  async clearData() {
    try {
      await User.deleteMany({});
      await Organization.deleteMany({});
      await Agent.deleteMany({});
      logger.info('Cleared existing data');
    } catch (error) {
      logger.error('Failed to clear data:', error);
      throw error;
    }
  }

  async seedUsers() {
    logger.info('Seeding users...');
    
    const userData = [
      {
        clerkId: 'user_admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin'
      },
      {
        clerkId: 'user_demo',
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'org:admin'
      }
    ];

    // Add random users
    for (let i = 0; i < 10; i++) {
      userData.push({
        clerkId: `user_${faker.string.uuid()}`,
        email: faker.internet.email(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: faker.helpers.arrayElement(['org:member', 'agent_creator', 'team_lead'])
      });
    }

    this.users = await User.insertMany(userData);
    logger.info(`Created ${this.users.length} users`);
  }

  async seedOrganizations() {
    logger.info('Seeding organizations...');
    
    const orgData = [
      {
        clerkId: 'org_demo',
        name: 'Demo Organization',
        slug: 'demo-org',
        description: 'A demo organization for testing',
        plan: 'pro'
      }
    ];

    // Add random organizations
    for (let i = 0; i < 5; i++) {
      const name = faker.company.name();
      orgData.push({
        clerkId: `org_${faker.string.uuid()}`,
        name,
        slug: faker.helpers.slugify(name).toLowerCase(),
        description: faker.company.catchPhrase(),
        plan: faker.helpers.arrayElement(['free', 'pro', 'enterprise'])
      });
    }

    this.organizations = await Organization.insertMany(orgData);
    logger.info(`Created ${this.organizations.length} organizations`);
  }

  async seedAgents() {
    logger.info('Seeding agents...');
    
    const agentTypes = ['chatbot', 'assistant', 'analyzer', 'generator', 'classifier'];
    const models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet-20240229'];
    
    const agentData = [];

    this.organizations.forEach(org => {
      // Create 3-8 agents per organization
      const agentCount = faker.number.int({ min: 3, max: 8 });
      
      for (let i = 0; i < agentCount; i++) {
        const createdBy = faker.helpers.arrayElement(this.users).clerkId;
        const type = faker.helpers.arrayElement(agentTypes);
        
        agentData.push({
          name: faker.lorem.words(3),
          description: faker.lorem.paragraph(),
          type,
          organizationId: org.clerkId,
          createdBy,
          status: faker.helpers.arrayElement(['draft', 'published']),
          config: {
            model: faker.helpers.arrayElement(models),
            instructions: faker.lorem.paragraphs(2),
            temperature: faker.number.float({ min: 0.1, max: 1.5, fractionDigits: 1 }),
            maxTokens: faker.number.int({ min: 100, max: 2000 })
          },
          tags: faker.lorem.words(3).split(' '),
          isPublic: faker.datatype.boolean(),
          analytics: {
            totalConversations: faker.number.int({ min: 0, max: 100 }),
            totalMessages: faker.number.int({ min: 0, max: 1000 }),
            averageResponseTime: faker.number.int({ min: 100, max: 3000 }),
            successRate: faker.number.float({ min: 85, max: 100, fractionDigits: 1 })
          }
        });
      }
    });

    this.agents = await Agent.insertMany(agentData);
    logger.info(`Created ${this.agents.length} agents`);
  }

  async updateUsageCounts() {
    logger.info('Updating organization usage counts...');
    
    for (const org of this.organizations) {
      const agentCount = await Agent.countDocuments({ 
        organizationId: org.clerkId,
        isActive: true 
      });
      
      await Organization.findByIdAndUpdate(org._id, {
        'usage.agentCount': agentCount,
        'usage.memberCount': faker.number.int({ min: 1, max: 10 }),
        'usage.apiCallsThisMonth': faker.number.int({ min: 0, max: 5000 })
      });
    }
    
    logger.info('Updated organization usage counts');
  }

  async seed() {
    try {
      await this.connect();
      
      const shouldClear = process.argv.includes('--clear');
      if (shouldClear) {
        await this.clearData();
      }
      
      await this.seedUsers();
      await this.seedOrganizations();
      await this.seedAgents();
      await this.updateUsageCounts();
      
      logger.info('🎉 Database seeding completed successfully!');
      
      console.log('\n📊 Seeded Data Summary:');
      console.log(`👥 Users: ${this.users.length}`);
      console.log(`🏢 Organizations: ${this.organizations.length}`);
      console.log(`🤖 Agents: ${this.agents.length}`);
      
      console.log('\n🔐 Demo Credentials:');
      console.log('Email: admin@example.com (Super Admin)');
      console.log('Email: demo@example.com (Org Admin)');
      
    } catch (error) {
      logger.error('Seeding failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI handling
async function main() {
  const seeder = new DatabaseSeeder();
  
  try {
    await seeder.seed();
  } catch (error) {
    logger.error('Seeding process failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DatabaseSeeder;
