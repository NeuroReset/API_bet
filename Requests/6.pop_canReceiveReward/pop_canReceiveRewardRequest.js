function pop_canReceiveRewardRequest(options) {
  const {
    url_api,
    domain,
    session_key,
    loginId,
    deviceBrand,
    requestId,
    appsystem,
    browsertype,
    operatingsystem,
    sitecode,
    userAgent,
    objectId,
    appversion,
    deviceModel,
    xVersion
  } = options;

  const timestamp = Math.floor(Date.now() / 1000);

  const headers = {
    "Host":new URL(url_api).host,
    "timestamp":timestamp.toString(),
    "device":loginId,
    "x-custom-referer":`https://${domain}/?fixed.iswebclip=1`,
    "devicetype":"3",
    "clienttimezone":"-3",
    "currency":"BRL",
    "accept":"application/json, text/plain, */*",
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
    url:`${url_api}/hall/api/active/pop_canReceiveReward`,
    method:'POST',
    headers:headers,
    body:''
  };
}

module.exports = pop_canReceiveRewardRequest;
