function createbindalipayV3(options) {
    const {
      realName,
      pixkey,
    } = options;

    // Gerar CPF aleatório de 11 dígitos
    const cpf = String(Math.floor(10000000000 + Math.random() * 90000000000));
    const timestamp = Math.floor(Date.now() / 1000);

    return {
      name: realName,
      account : pixkey,
      extendInfo: cpf,
      cpf: "",
      subType: "EMAIL",
      accountType: 7,
      subTypeExtend: {
        bank: "",
        branchBank: "",
        companyName: "",
      },
      time: timestamp.toString()
    };
  }
  module.exports = createbindalipayV3;
  