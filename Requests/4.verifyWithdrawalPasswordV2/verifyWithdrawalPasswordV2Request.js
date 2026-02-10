function createverifyWithdrawalPasswordV2Request(options) {
  const {
    url_api,
    domain,
    session_key,
    loginId,
    deviceBrand,
    deviceModel,
    requestId,
    verifyWithdrawalPasswordV2BodyCriptografado,
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
    "x-custom-referer":`https://${domain}/home/withdraw?fixed.iswebclip=1&active=10`,
    "devicetype":"3",
    "clienttimezone":"-3",
    "currency":"BRL",
    "accept":"application/json, text/plain, */*",
    "accept-language":"pt",
    "language":"pt",
    "browsertype":browsertype,
    "operatingsystem":operatingsystem,
    "appsystem":appsystem,
    "appversion":appversion,
    "x-version":xVersion,
    "x-device":"3-7",
    "platformtype":"5",
    "devicebrand":deviceBrand,
    "devicemodel":deviceModel,
    "physicaldevicemodel":"unknown",
    "browserfingerid":"",
    "user-agent":userAgent,
    "referer":`https://${domain}/`,
    "origin":`https://${domain}`,
    "domain":domain,
    "webauthndomain":domain,
    "sec-fetch-site":"cross-site",
    "sec-fetch-mode":"cors",
    "sec-fetch-dest":"empty",
    "content-type":"text/plain",
    "x-data-mode":"chipher",
    "x-object-id":objectId,
    "token":session_key,
    "x-request-id":requestId,
    "sitecode":sitecode,
    "priority":"u=3, i"
  };

  return {
    url:`${url_api}/hall/api/finance/certify/verifyWithdrawalPasswordV2`,
    method:"POST",
    headers:headers,
    body:verifyWithdrawalPasswordV2BodyCriptografado
  };
}

module.exports = createverifyWithdrawalPasswordV2Request;