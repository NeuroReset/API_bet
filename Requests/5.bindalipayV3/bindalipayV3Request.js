function createbindalipayV3(options) {
  const {
    url_api,
    domain,
    session_key,
    loginId,
    deviceBrand,
    deviceModel,
    requestId,
    bindalipayV3Criptografado,
    appsystem,
    browsertype,
    operatingsystem,
    sitecode,
    userAgent,
    objectId,
    appversion,
    xVersion,
    withdrawal_uuid
  } = options;

  const timestamp = Math.floor(Date.now() / 1000);

const headers = {
  "Host":new URL(url_api).host,
  "accept":"application/json, text/plain, */*",
  "accept-language":"pt",
  "language":"pt",
  "appsystem":appsystem,
  "appversion":appversion,
  "browserfingerid":"",
  "browsertype":browsertype,
  "clienttimezone":"-3",
  "content-type":"text/plain",
  "currency":"BRL",
  "device":loginId,
  "devicebrand":deviceBrand,
  "devicemodel":deviceModel,
  "devicetype":"3",
  "domain":domain,
  "operatingsystem":operatingsystem,
  "origin":`https://${domain}`,
  "physicaldevicemodel":"unknown",
  "platformtype":"5",
  "priority":"u=3, i",
  "referer":`https://${domain}/`,
  "sec-fetch-dest":"empty",
  "sec-fetch-mode":"cors",
  "sec-fetch-site":"cross-site",
  "sitecode":sitecode,
  "timestamp":timestamp.toString(),
  "token":session_key,
  "user-agent":userAgent,
  "webauthndomain":domain,
  "x-custom-referer":`https://${domain}/home/withdraw?fixed.iswebclip=1&active=10`,
  "x-data-mode":"chipher",
  "x-device":"3-7",
  "x-object-id":objectId,
  "x-request-id":requestId,
  "x-version":xVersion
};

  return {
    url:`${url_api}/hall/api/finance/certify/bindalipayV3?withdrawal_uuid=${withdrawal_uuid}`,
    method:'POST',
    headers:headers,
    body:bindalipayV3Criptografado
  };
}

module.exports = createbindalipayV3;
