'use strict';

const Homey = require('homey');
const axios = require('axios');

module.exports = class OllamaApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Ollama has been initialized');
    const generateResponseCard = this.homey.flow.getActionCard("generate_response");
    const generateResponseImageCard = this.homey.flow.getActionCard("generate_response_image");
    const setSystemPromptCard = this.homey.flow.getActionCard("set_system_prompt");
    try {
      const portNumber = await this.homey.settings.get('port');
      if (portNumber && (portNumber < 1 || portNumber > 65535)) {
        this.homey.settings.set('port', 11434);
      }
    } catch (error) {
      this.error('Error validating port number in settings:', error);
    }
    generateResponseCard.registerArgumentAutocompleteListener(
      "model",
      async (query, args) => this.autocompleteModel(query));
    generateResponseImageCard.registerArgumentAutocompleteListener(
      "model",
      async (query, args) => this.autocompleteModel(query));
    generateResponseCard.registerRunListener(async (args, state) => {
      try {
        const ollamaIp = await this.homey.settings.get('ip');
        const ollamaPort = await this.homey.settings.get('port');
        const systemPrompt = await this.homey.settings.get('systemPrompt');
        if (!systemPrompt) {
          this.error('Please set a system prompt in the app settings.');
          throw new Error('Please set a system prompt in the app settings.');
        }
        if (!ollamaIp || !ollamaPort) {
          this.error('Ollama IP or port not set in settings. Please visit the app settings to connect to your Ollama instance.');
          throw new Error('Ollama IP or port not set in settings.');
        }
        const ollamaUrl = `http://${ollamaIp}:${ollamaPort}`;
        const payload = {
          model: args.model.id,
          prompt: args.prompt,
          system: systemPrompt || "You are an Assistant for Homey Pro. Users send messages and you should generate a response. Always respond friendly and give detailed responses.",
          stream: false
        };
        const response = await axios.post(`${ollamaUrl}/api/generate`, payload);
        const data = response.data;
        return {
          response: data.response
        };
      } catch (error) {
        throw new Error('Error generating response from Ollama: ' + error.message);
      }
    });
    setSystemPromptCard.registerRunListener(async (args, state) => {
      try {
        if (args.sysprompt) {
          this.homey.settings.set('systemPrompt', args.sysprompt);
          return true;
        }
      } catch (error) {
        throw new Error('Error setting system prompt: ' + error.message);
      }
    });
    generateResponseImageCard.registerRunListener(async (args, state) => {
      try {
        const ollamaIp = await this.homey.settings.get('ip');
        const ollamaPort = await this.homey.settings.get('port');
        const systemPrompt = await this.homey.settings.get('systemPrompt');
        if (!systemPrompt) {
          throw new Error('Please set a system prompt in the app settings.');
        }
        if (!ollamaIp || !ollamaPort) {
          throw new Error('Ollama IP or port not set in settings.');
        }
        const ollamaUrl = `http://${ollamaIp}:${ollamaPort}`;
        if (!args.droptoken) {
          throw new Error('Please provide an image.');
        }
        const imageBase64 = await this.getImageBase64(args.droptoken);
        const payload = {
          model: args.model.id,
          prompt: args.prompt,
          system: systemPrompt || "You are an Assistant for Homey Pro. Users send messages and you should generate a response. Always respond friendly and give detailed responses.",
          images: [imageBase64],
          stream: false
        };
        const response = await axios.post(`${ollamaUrl}/api/generate`, payload);
        const data = response.data;
        return {
          response: data.response
        };
      } catch (error) {
        throw new Error('Error generating response from Ollama: ' + error.message);
      }
    });
  }
  async getImageBase64(image) {
    const stream = await image.getStream();

    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", chunk => chunks.push(chunk));
      stream.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString("base64"));
      });
      stream.on("error", reject);
    });
  }
  async autocompleteModel(query) {
    try {
      const ollamaIp = await this.homey.settings.get('ip');
      const ollamaPort = await this.homey.settings.get('port');
      if (!ollamaIp || !ollamaPort) {
        throw new Error('Ollama IP or port not set in settings. Please visit the app settings to connect to your Ollama instance.');
      }
      const ollamaUrl = `http://${ollamaIp}:${ollamaPort}`;
      const response = await axios.get(`${ollamaUrl}/api/tags`);
      const data = response.data;
      const results = data.models.map(m => ({
        name: m.model,
        id: m.model
      }));
      return results.filter(result =>
        result.name.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      throw new Error('Error fetching models from Ollama: ' + error.message);
    }
  }
};
