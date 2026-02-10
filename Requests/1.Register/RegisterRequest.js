function createRegisterRequest(options) {
  const {
    url_api,
    domain,
    token,
    loginId,
    deviceBrand,
    deviceModel,
    requestId, 
    registerBodyCriptografado,
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
    "x-custom-referer": `https://${domain}/?fixed.iswebclip=1`,
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
    "token": token,
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
    url: `${url_api}/hall/api/member/register`,
    method: 'POST',
    headers: headers,
    body: registerBodyCriptografado
  };
}

module.exports = createRegisterRequest;