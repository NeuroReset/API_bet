function createreceiveOneBody(options) {
    const {
      idbonuscadastro,
    } = options;

    const timestamp = Math.floor(Date.now() / 1000);

    return {
      template: 1,
      receiveLogIds : idbonuscadastro.toString(),
      time: timestamp.toString()
    };
  }
  module.exports = createreceiveOneBody;
  