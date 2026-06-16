'use strict';

module.exports = {
  async chat({ homey, body }) {
    const { messages, instanceId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('No messages provided.');
    }

    if (!instanceId) {
      throw new Error('No instanceId provided.');
    }

    // Fire-and-forget: streaming happens via realtime events,
    // so we return immediately to avoid widget API timeout.
    homey.app.streamChat(instanceId, messages).catch(err => {
      homey.app.error('streamChat error:', err.message);
    });

    return { ok: true };
  },

  async getModels({ homey }) {
    return homey.app.getModels();
  },
};