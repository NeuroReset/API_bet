function createRegisterBody(options) {
  const {
    domain,
    realName,
    inviterId,
    deviceModel,
    platformId,
    passwd,
    loginId,
    token
  } = options;

  return {
    domain: domain,
    clientType: 5,
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
    inviterId: inviterId,
    registerLink: domain.startsWith('http') ? `${domain}/?id=${inviterId}` : `https://${domain}/?id=${inviterId}`,
    agent_type: 2,
    agent_code: inviterId,
    inviterIdSource: 1,
    platformId: platformId,
    passwd: passwd,
    registerType: 0,
    time: Math.floor(Date.now() / 1000)
  };
}
module.exports = createRegisterBody;
