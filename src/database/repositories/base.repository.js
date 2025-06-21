const { NotFoundError } = require('../../utils/errors');
const { parsePagination } = require('../../utils/helpers');
const logger = require('../../config/logger');

class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      logger.error(`Error creating ${this.model.modelName}:`, error);
      throw error;
    }
  }

  async findById(id, options = {}) {
    try {
      const { populate = [], select } = options;
      
      let query = this.model.findById(id);
      
      if (populate.length) {
        populate.forEach(pop => query = query.populate(pop));
      }
      
      if (select) {
        query = query.select(select);
      }

      const document = await query.exec();
      
      if (!document) {
        throw new NotFoundError(this.model.modelName);
      }

      return document;
    } catch (error) {
      logger.error(`Error finding ${this.model.modelName} by ID:`, error);
      throw error;
    }
  }

  async findOne(filter, options = {}) {
    try {
      const { populate = [], select } = options;
      
      let query = this.model.findOne(filter);
      
      if (populate.length) {
        populate.forEach(pop => query = query.populate(pop));
      }
      
      if (select) {
        query = query.select(select);
      }

      return await query.exec();
    } catch (error) {
      logger.error(`Error finding ${this.model.modelName}:`, error);
      throw error;
    }
  }

  async findMany(filter = {}, options = {}) {
    try {
      const { populate = [], select, pagination = {} } = options;
      const { page, limit, skip, sort } = parsePagination(pagination);
      
      let query = this.model.find(filter);
      
      if (populate.length) {
        populate.forEach(pop => query = query.populate(pop));
      }
      
      if (select) {
        query = query.select(select);
      }

      query = query.sort(sort).skip(skip).limit(limit);

      const [documents, total] = await Promise.all([
        query.exec(),
        this.model.countDocuments(filter)
      ]);

      return {
        documents,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error(`Error finding ${this.model.modelName} documents:`, error);
      throw error;
    }
  }

  async updateById(id, updates, options = {}) {
    try {
      const { runValidators = true, new: returnNew = true } = options;
      
      const document = await this.model.findByIdAndUpdate(
        id,
        updates,
        { runValidators, new: returnNew }
      );

      if (!document) {
        throw new NotFoundError(this.model.modelName);
      }

      return document;
    } catch (error) {
      logger.error(`Error updating ${this.model.modelName}:`, error);
      throw error;
    }
  }

  async deleteById(id, options = {}) {
    try {
      const { soft = true } = options;
      
      if (soft && this.model.schema.paths.deletedAt) {
        return await this.updateById(id, { 
          deletedAt: new Date(),
          isActive: false 
        });
      } else {
        const document = await this.model.findByIdAndDelete(id);
        
        if (!document) {
          throw new NotFoundError(this.model.modelName);
        }

        return document;
      }
    } catch (error) {
      logger.error(`Error deleting ${this.model.modelName}:`, error);
      throw error;
    }
  }

  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      logger.error(`Error counting ${this.model.modelName} documents:`, error);
      throw error;
    }
  }

  async exists(filter) {
    try {
      return await this.model.exists(filter);
    } catch (error) {
      logger.error(`Error checking ${this.model.modelName} existence:`, error);
      throw error;
    }
  }

  async aggregate(pipeline) {
    try {
      return await this.model.aggregate(pipeline);
    } catch (error) {
      logger.error(`Error aggregating ${this.model.modelName}:`, error);
      throw error;
    }
  }
}

module.exports = BaseRepository;
