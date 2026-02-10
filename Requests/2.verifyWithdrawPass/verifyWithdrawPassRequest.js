function createverifyWithdrawPassRequest(options) {
  const {
    url_api,
    domain,
    session_key,
    loginId,
    deviceBrand,
    deviceModel,
    requestId, 
    verifyWithdrawPassBodyCriptografado,
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
    "browsertype": browsertype,
    "operatingsystem": operatingsystem,
    "user-agent": userAgent,
    "webauthndomain": domain,
    "sec-fetch-site": "cross-site",
    "devicebrand": deviceBrand,
    "referer": `https://${domain}/`,
    "platformtype": "5",
    "domain": domain,
    "accept-language": "pt",
    "physicaldevicemodel": "unknown",
    "origin": `https://${domain}`,
    "sec-fetch-mode": "cors",
    "x-data-mode": "chipher",
    "x-version": xVersion,
    "x-device": "3-7",
    "appsystem": appsystem,
    "content-type": "text/plain",
    "x-object-id": objectId,
    "token": session_key,
    "appversion": appversion,
    "sec-fetch-dest": "empty",
    "language": "pt",
    "x-request-id": requestId,
    "devicemodel": deviceModel,
    "browserfingerid": "",
    "sitecode": sitecode,
    "priority": "u=3, i"
  };

  return {
    url: `${url_api}/hall/api/member/user/security/verifyWithdrawPass`,
    method: 'POST',
    headers: headers,
    body: verifyWithdrawPassBodyCriptografado
  };
}

module.exports = createverifyWithdrawPassRequest;