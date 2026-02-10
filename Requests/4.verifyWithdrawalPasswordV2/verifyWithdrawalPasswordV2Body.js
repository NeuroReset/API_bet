function createverifyWithdrawalPasswordV2(options) {
    const {
      pin,
    } = options;

    const timestamp = Math.floor(Date.now() / 1000);

    return {
      withdrawalPassword: pin,
      addWithdrawAccountType : 5,
      time: timestamp.toString()
    };
  }
  module.exports = createverifyWithdrawalPasswordV2;
  