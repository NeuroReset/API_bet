function createRegisterBody(options) {
  const {
    domain,
    realName,
    inviterId,
    platformId,
    passwd,
    loginId,
    deviceModel,
    token
  } = options;

  // Garantir que domain tenha https://
  let domainWithProtocol = domain;
  if (!domainWithProtocol.startsWith('http://') && !domainWithProtocol.startsWith('https://')) {
    domainWithProtocol = `https://${domain}`;
  }

  // Garantir que inviterId seja número
  const inviterIdNum = typeof inviterId === 'number' ? inviterId : parseInt(inviterId) || 0;

  return {
    domain: domainWithProtocol,
    clientType: 2,
    jpush_id: "",
    loginId: loginId,
    os_type: 5,
    deviceOsType: 5,
    deviceModel: deviceModel,
    platformType: "1001",
    operationId: 0,
    pkgId: 1,
    fromClub: 2,
    token: token,
    version: 8,
    realName: realName,
    currency: "BRL",
    registerLink: `${domainWithProtocol}/?fixed.iswebclip=1`,
    platformId: platformId,
    passwd: passwd,
    registerType: 0,
    geeToken: "enabled",
    time: Math.floor(Date.now() / 1000)
  };
}
module.exports = createRegisterBody;
