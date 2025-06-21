#!/usr/bin/env node

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const config = require('../src/config');
const logger = require('../src/config/logger');

class MigrationRunner {
  constructor() {
    this.migrationsPath = path.join(__dirname, '../src/database/migrations');
    this.migrations = [];
  }

  async loadMigrations() {
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.js'))
        .sort();

      this.migrations = files.map(file => {
        const migration = require(path.join(this.migrationsPath, file));
        migration.filename = file;
        return migration;
      });

      logger.info(`Loaded ${this.migrations.length} migrations`);
    } catch (error) {
      logger.error('Failed to load migrations:', error);
      throw error;
    }
  }

  async connect() {
    try {
      await mongoose.connect(config.database.uri, {
        ...config.database.options,
        dbName: config.database.name
      });
      logger.info('Connected to database for migrations');
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

  async getExecutedMigrations() {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('migrations');
      const executed = await collection.find({}).toArray();
      return executed.map(m => m.version);
    } catch (error) {
      // Collection doesn't exist yet
      return [];
    }
  }

  async markMigrationExecuted(migration) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('migrations');
      await collection.insertOne({
        version: migration.version,
        description: migration.description,
        executedAt: new Date(),
        filename: migration.filename
      });
    } catch (error) {
      logger.error('Failed to mark migration as executed:', error);
      throw error;
    }
  }

  async markMigrationReverted(version) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection('migrations');
      await collection.deleteOne({ version });
    } catch (error) {
      logger.error('Failed to mark migration as reverted:', error);
      throw error;
    }
  }

  async runMigrations() {
    try {
      await this.connect();
      await this.loadMigrations();

      const executedMigrations = await this.getExecutedMigrations();
      const pendingMigrations = this.migrations.filter(
        m => !executedMigrations.includes(m.version)
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Running ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        logger.info(`Running migration ${migration.version}: ${migration.description}`);
        
        try {
          await migration.up();
          await this.markMigrationExecuted(migration);
          logger.info(`Migration ${migration.version} completed successfully`);
        } catch (error) {
          logger.error(`Migration ${migration.version} failed:`, error);
          throw error;
        }
      }

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration process failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async rollbackMigration(version) {
    try {
      await this.connect();
      await this.loadMigrations();

      const migration = this.migrations.find(m => m.version === version);
      if (!migration) {
        throw new Error(`Migration ${version} not found`);
      }

      const executedMigrations = await this.getExecutedMigrations();
      if (!executedMigrations.includes(version)) {
        throw new Error(`Migration ${version} has not been executed`);
      }

      logger.info(`Rolling back migration ${version}: ${migration.description}`);

      await migration.down();
      await this.markMigrationReverted(version);

      logger.info(`Migration ${version} rolled back successfully`);
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async status() {
    try {
      await this.connect();
      await this.loadMigrations();

      const executedMigrations = await this.getExecutedMigrations();

      console.log('\nMigration Status:');
      console.log('================');

      this.migrations.forEach(migration => {
        const status = executedMigrations.includes(migration.version) ? '✅ EXECUTED' : '⏳ PENDING';
        console.log(`${migration.version} - ${migration.description} - ${status}`);
      });

      console.log(`\nTotal: ${this.migrations.length} migrations`);
      console.log(`Executed: ${executedMigrations.length}`);
      console.log(`Pending: ${this.migrations.length - executedMigrations.length}`);
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI handling
async function main() {
  const runner = new MigrationRunner();
  const command = process.argv[2];
  const version = process.argv[3];

  try {
    switch (command) {
      case 'up':
      case 'run':
        await runner.runMigrations();
        break;
      case 'down':
      case 'rollback':
        if (!version) {
          console.error('Please specify migration version to rollback');
          process.exit(1);
        }
        await runner.rollbackMigration(version);
        break;
      case 'status':
        await runner.status();
        break;
      default:
        console.log('Usage:');
        console.log('  npm run migrate up           - Run pending migrations');
        console.log('  npm run migrate down <version> - Rollback specific migration');
        console.log('  npm run migrate status        - Show migration status');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Migration command failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationRunner;
