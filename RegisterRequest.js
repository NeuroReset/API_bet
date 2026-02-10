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
    inviterId,
    objectId
  } = options;

  const headers = {
    "Host": domain,
    "timestamp": Math.floor(Date.now() / 1000),
    "device": loginId,
    "x-custom-referer": `https://${domain}/?id=${inviterId}`,
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
    "origin": `https://${domain}/`,
    "sec-fetch-mode": "cors",
    "x-data-mode": "chipher",
    "x-version": "7.0.99",
    "x-device": "3-1",
    "appsystem": appsystem,
    "content-type": "text/plain",
    "x-object-id": objectId,
    "token": token,
    "appversion": "v7.0.99",
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
