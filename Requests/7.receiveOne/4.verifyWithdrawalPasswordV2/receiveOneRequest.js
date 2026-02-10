function createreceiveOneRequest(options) {
  const {
    url_api,
    domain,
    session_key,
    loginId,
    deviceBrand,
    deviceModel,
    requestId,
    receiveOneBodyCriptografado,
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
    "Host":new URL(url_api).host,
    "timestamp":timestamp.toString(),
    "device":loginId,
    "x-custom-referer":`https://${domain}/home/task?fixed.iswebclip=1&eventCurrent=1&curTask=101`,
    "devicetype":"1",
    "clienttimezone":"-3",
    "currency":"BRL",
    "accept":"application/json, text/plain, */*",
    "content-type":"text/plain",
    "accept-language":"pt",
    "language":"pt",
    "browsertype":browsertype,
    "browserfingerid":"",
    "user-agent":userAgent,
    "operatingsystem":operatingsystem,
    "appsystem":appsystem,
    "appversion":appversion,
    "x-version":xVersion,
    "x-device":"3-7",
    "devicebrand":deviceBrand,
    "devicemodel":deviceModel,
    "physicaldevicemodel":"unknown",
    "platformtype":"5",
    "sitecode":sitecode,
    "domain":domain,
    "webauthndomain":domain,
    "referer":`https://${domain}/`,
    "origin":`https://${domain}`,
    "sec-fetch-site":"cross-site",
    "sec-fetch-mode":"cors",
    "sec-fetch-dest":"empty",
    "x-data-mode":"chipher",
    "x-request-id":requestId,
    "x-object-id":objectId,
    "token":session_key,
    "priority":"u=3, i"
  };

  return {
    url:`${url_api}/hall/api/active/tasks/receiveOne`,
    method:'POST',
    headers:headers,
    body:receiveOneBodyCriptografado
  };
}

module.exports = createreceiveOneRequest;
``
