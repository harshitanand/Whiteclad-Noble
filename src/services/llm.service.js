const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { ExternalServiceError } = require('../utils/errors');
const logger = require('../config/logger');

class LLMService {
  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: config.apis.openai.apiKey,
      organization: config.apis.openai.organization
    });

    // Initialize Anthropic
    this.anthropic = new Anthropic({
      apiKey: config.apis.anthropic.apiKey
    });
  }

  /**
   * Chat completion with automatic provider routing
   */
  async chatCompletion(params) {
    try {
      const { model, messages, ...options } = params;

      if (model.startsWith('gpt-')) {
        return await this.openaiChatCompletion({ model, messages, ...options });
      } else if (model.startsWith('claude-')) {
        return await this.anthropicChatCompletion({ model, messages, ...options });
      } else {
        throw new ExternalServiceError('LLM', `Unsupported model: ${model}`);
      }
    } catch (error) {
      logger.error('LLM chat completion failed:', error);
      throw error;
    }
  }

  /**
   * OpenAI chat completion
   */
  async openaiChatCompletion(params) {
    try {
      const response = await this.openai.chat.completions.create({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        frequency_penalty: params.frequency_penalty,
        presence_penalty: params.presence_penalty,
        stream: false
      });

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model,
        provider: 'openai'
      };
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new ExternalServiceError('OpenAI', error.message);
    }
  }

  /**
   * Anthropic chat completion
   */
  async anthropicChatCompletion(params) {
    try {
      // Convert OpenAI format to Anthropic format
      const systemMessage = params.messages.find(m => m.role === 'system');
      const userMessages = params.messages.filter(m => m.role !== 'system');

      const response = await this.anthropic.messages.create({
        model: params.model,
        max_tokens: params.max_tokens || 1000,
        temperature: params.temperature,
        system: systemMessage?.content,
        messages: userMessages
      });

      return {
        content: response.content[0].text,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        },
        model: response.model,
        provider: 'anthropic'
      };
    } catch (error) {
      logger.error('Anthropic API error:', error);
      throw new ExternalServiceError('Anthropic', error.message);
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels() {
    try {
      const [openaiModels, anthropicModels] = await Promise.all([
        this.getOpenAIModels(),
        this.getAnthropicModels()
      ]);

      return {
        openai: openaiModels,
        anthropic: anthropicModels,
        all: [...openaiModels, ...anthropicModels]
      };
    } catch (error) {
      logger.error('Failed to get available models:', error);
      throw error;
    }
  }

  async getOpenAIModels() {
    try {
      const response = await this.openai.models.list();
      return response.data
        .filter(model => model.id.includes('gpt'))
        .map(model => ({
          id: model.id,
          provider: 'openai',
          created: model.created
        }));
    } catch (error) {
      logger.warn('Failed to fetch OpenAI models:', error);
      return [
        { id: 'gpt-4', provider: 'openai' },
        { id: 'gpt-3.5-turbo', provider: 'openai' }
      ];
    }
  }

  async getAnthropicModels() {
    // Anthropic doesn't have a models endpoint, return static list
    return [
      { id: 'claude-3-sonnet-20240229', provider: 'anthropic' },
      { id: 'claude-3-haiku-20240307', provider: 'anthropic' }
    ];
  }
}

// Export singleton instance
module.exports = new LLMService();
