function createmodifyWithdrawPassRequest(options) {
  const {
    url_api,
    domain,
    session_key,
    loginId,
    deviceBrand,
    deviceModel,
    requestId, 
    modifyWithdrawPassBodyCriptografado,
    appsystem,
    browsertype,
    operatingsystem,
    sitecode,
    userAgent,
    objectId,
    appversion,
    xVersion
  } = options;

  const timestamp = Math.floor(Date.now() / 1000);

  const headers = {
    "Host": new URL(url_api).host,
    "timestamp": timestamp.toString(),
    "device": loginId,
    "x-custom-referer": `https://${domain}/home/security?fixed.iswebclip=1&active=5&redirect=%257B%2522name%2522%253A%2522withdraw%2522%252C%2522query%2522%253A%257B%2522active%2522%253A0%257D%257D`,
    "devicetype": "3",
    "clienttimezone": "-3",
    "currency": "BRL",
    "accept": "application/json, text/plain, */*",
    "accept-language": "pt",
    "language": "pt",
    "browsertype": browsertype,
    "browserfingerid": "",
    "user-agent": userAgent,
    "operatingsystem": operatingsystem,
    "appsystem": appsystem,
    "appversion": appversion,
    "x-version": xVersion,
    "x-device": "3-7",
    "devicebrand": deviceBrand,
    "devicemodel": deviceModel,
    "physicaldevicemodel": "unknown",
    "platformtype": "5",
    "sitecode": sitecode,
    "domain": domain,
    "webauthndomain": domain,
    "referer": `https://${domain}/`,
    "origin": `https://${domain}`,
    "sec-fetch-site": "cross-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "x-data-mode": "chipher",
    "content-type": "text/plain",
    "x-request-id": requestId,
    "x-object-id": objectId,
    "token": session_key,
    "priority": "u=3, i"
  };

  return {
    url: `${url_api}/hall/api/member/user/security/modifyWithdrawPass`,
    method: 'POST',
    headers: headers,
    body: modifyWithdrawPassBodyCriptografado
  };
}

module.exports = createmodifyWithdrawPassRequest;