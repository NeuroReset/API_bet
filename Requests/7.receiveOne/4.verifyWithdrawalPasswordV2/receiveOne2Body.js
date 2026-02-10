function createreceiveOneBody(options) {
    const {
      idbonusapp,
    } = options;

    const timestamp = Math.floor(Date.now() / 1000);

    return {
      template: 1,
      receiveLogIds : idbonusapp.toString(),
      time: timestamp.toString()
    };
  }
  module.exports = createreceiveOneBody;
  