function createmodifyWithdrawPass(options) {
    const {
      pin,
    } = options;

    const timestamp = Math.floor(Date.now() / 1000);

    return {
      withdraw_pass: pin,
      secondVerify : {
        type: 0,
        withdraw_pass: pin,
      },
      time: timestamp.toString()
    };
  }
  module.exports = createmodifyWithdrawPass;
  