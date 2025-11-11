module.exports = {
  async checkOllama({ homey, body }) {
    // access the post body and perform some action on it.
    return homey.app.checkOllama(body);
  },
};