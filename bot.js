const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const axios = require('axios');
const https = require('https');
const { randomUUID } = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const readline = require('readline');
const createRegisterBody = require('./Requests/1.Register/RegisterBody.js');
const createRegisterRequest = require('./Requests/1.Register/RegisterRequest.js');
const createverifyWithdrawPassBody = require('./Requests/2.verifyWithdrawPass/verifyWithdrawPassBody.js');
const createverifyWithdrawPassRequest = require('./Requests/2.verifyWithdrawPass/verifyWithdrawPassRequest.js');
const createmodifyWithdrawPass = require('./Requests/3.modifyWithdrawPass/modifyWithdrawPassBody.js');
const createmodifyWithdrawPassRequest = require('./Requests/3.modifyWithdrawPass/modifyWithdrawPassRequest.js');
const createverifyWithdrawalPasswordV2 = require('./Requests/4.verifyWithdrawalPasswordV2/verifyWithdrawalPasswordV2Body.js');
const createverifyWithdrawalPasswordV2Request = require('./Requests/4.verifyWithdrawalPasswordV2/verifyWithdrawalPasswordV2Request.js');
const createbindalipayV3 = require('./Requests/5.bindalipayV3/bindalipayV3Body.js');
const createbindalipayV3Request = require('./Requests/5.bindalipayV3/bindalipayV3Request.js');
const pop_canReceiveRewardRequest = require('./Requests/6.pop_canReceiveReward/pop_canReceiveRewardRequest.js');
const createreceiveOneBody = require('./Requests/7.receiveOne/4.verifyWithdrawalPasswordV2/receiveOneBody.js');
const createreceiveOneRequest = require('./Requests/7.receiveOne/4.verifyWithdrawalPasswordV2/receiveOneRequest.js');
const { generateAESKeyForPIN, encryptPIN, decryptPIN } = require('./Requests/encryptWithdrawPass.js');

// Axios: desabilitar validação SSL (aplica para requisições HTTPS sem proxy)
const insecureHttpsAgent = new https.Agent({ rejectUnauthorized: false });
axios.defaults.httpsAgent = insecureHttpsAgent;

// Funções de criptografia do EncryptBodyRegister.js
const IV = CryptoJS.enc.Utf8.parse("5421698523412578");

function md5(s) {
  return CryptoJS.MD5(s).toString();
}

function key_doubleToken(token) {
  return md5(token + md5(token)).slice(2, 18); // 16 bytes
}

function encrypt(plainText, keyStr) {
  const key = CryptoJS.enc.Utf8.parse(keyStr);
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(plainText),
    key,
    {
      iv: IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.ZeroPadding,
    }
  );
  // IMPORTANTÍSSIMO: somente o Base64 do ciphertext
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

function decrypt(ciphertextBase64, keyStr) {
  const key = CryptoJS.enc.Utf8.parse(keyStr);
  const decrypted = CryptoJS.AES.decrypt(ciphertextBase64, key, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

function tryParseJson(s) {
  if (!s || typeof s !== 'string') {
    return null;
  }
  
  // Limpar a string primeiro
  let cleaned = s.trim();
  
  // Remover caracteres nulos e outros caracteres não-printáveis
  cleaned = cleaned.replace(/\0/g, '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Tentar parsear diretamente
  try {
    return JSON.parse(cleaned);
  } catch {
    // Se falhar, tentar extrair apenas a parte JSON (entre { e })
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonOnly = cleaned.substring(jsonStart, jsonEnd + 1);
      try {
        return JSON.parse(jsonOnly);
  } catch {
        return null;
      }
    }
    
    return null;
  }
}

// Função para parsear linha CSV considerando aspas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Função para obter user-agent aleatório do CSV
function getRandomUserAgent() {
  const csvPath = path.join(__dirname, 'data', 'user-agent.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    throw new Error('Arquivo user-agent.csv não possui dados suficientes');
  }
  
  // Primeira linha é o cabeçalho
  const headers = parseCSVLine(lines[0]);
  
  // Escolher uma linha aleatória (excluindo cabeçalho)
  const randomIndex = Math.floor(Math.random() * (lines.length - 1)) + 1;
  const randomLine = lines[randomIndex];
  const values = parseCSVLine(randomLine);
  
  // Criar objeto com as variáveis
  const userAgentInfo = {};
  headers.forEach((header, index) => {
    // Remover aspas do valor se houver
    let value = values[index] || '';
    value = value.replace(/^"|"$/g, '');
    userAgentInfo[header] = value;
  });
  
  return {
    appsystem: userAgentInfo['appsystem'] || '',
    browsertype: userAgentInfo['browsertype'] || '',
    devicebrand: userAgentInfo['devicebrand'] || '',
    devicemodel: userAgentInfo['devicemodel'] || '',
    operatingsystem: userAgentInfo['operatingsystem'] || '',
    userAgent: userAgentInfo['user-agent'] || ''
  };
}

// Função para ler arquivo CSV simples (uma coluna)
function readSimpleCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line !== '');
  } catch (error) {
    console.error(`Erro ao ler arquivo ${filePath}:`, error.message);
    return [];
  }
}

// Função para pegar e remover proxy da lista
function getAndRemoveProxy(shouldRemove = true) {
  const proxyPath = path.join(__dirname, 'data', 'Proxy.csv');
  const proxies = readSimpleCSV(proxyPath);
  
  if (proxies.length === 0) {
    throw new Error('Nenhuma proxy disponível na lista');
  }
  
  // Pegar primeira proxy
  const proxy = proxies[0];
  
  // Remover da lista apenas se shouldRemove for true
  if (shouldRemove) {
  const remainingProxies = proxies.slice(1);
  fs.writeFileSync(proxyPath, remainingProxies.join('\n') + '\n', 'utf-8');
  }
  
  return proxy;
}

// Função para gerar chave PIX baseada no realName
function generatePixKey(realName) {
  // Remover espaços e converter para minúsculas
  const namePart = realName.replace(/\s+/g, '').toLowerCase();
  
  // Gerar 5 dígitos aleatórios
  const randomDigits = Math.floor(10000 + Math.random() * 90000); // Garante 5 dígitos (10000-99999)
  
  // Combinar: name+lastname+5digitos+@tuamaeaquelaursa.com
  const pixKey = `${namePart}${randomDigits}@tuamaeaquelaursa.com`;
  
  return pixKey;
}

// Função para criar URL da proxy
function createProxyUrl(proxyString) {
  const raw = (proxyString || '').trim();
  if (!raw) {
    throw new Error('Proxy vazia');
  }
  
  // Se já vier com esquema (http://, https://, socks5://, etc.), usar como está
  if (/^\w+:\/\//.test(raw)) {
    return raw;
  }
  
  // Se vier no formato user:pass@host:port
  if (raw.includes('@')) {
    return `http://${raw}`;
  }
  
  // Parsear proxy: host:port:username:password
  const parts = raw.split(':');
  if (parts.length < 4) {
    throw new Error('Formato de proxy inválido. Esperado: host:port:username:password');
  }
  
  const proxyHost = parts[0];
  const proxyPort = parts[1];
  const proxyUsername = encodeURIComponent(parts[2]);
  const proxyPassword = encodeURIComponent(parts.slice(3).join(':')); // Caso a senha tenha ':'
  
  // Criar URL da proxy (formato: http://usuario:senha@host:porta)
  return `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
}

// Função para verificar IP real da proxy
async function getRealProxyIP(proxyString) {
  const proxyUrl = createProxyUrl(proxyString);
  
  // Usar HttpProxyAgent para requisições HTTP e HttpsProxyAgent para HTTPS
  const httpProxyAgent = new HttpProxyAgent(proxyUrl);
  const https = require('https');
  const httpsAgentOptions = {
    rejectUnauthorized: false
  };
  const httpsAgent = new https.Agent(httpsAgentOptions);
  const httpsProxyAgent = new HttpsProxyAgent(proxyUrl, {
    agent: httpsAgent
  });
  
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://api.ipify.org/?format=json',
      httpsAgent: httpsProxyAgent,
      httpAgent: httpProxyAgent,
      timeout: 10000,
      validateStatus: () => true // Aceita qualquer status
    });
    
    if (response.data && response.data.ip) {
      return response.data.ip;
    } else if (typeof response.data === 'string') {
      return response.data.trim();
    } else {
      throw new Error('Resposta inválida do serviço de IP');
    }
  } catch (error) {
    throw new Error(`Erro ao verificar IP da proxy: ${error.message}`);
  }
}

// Função para fazer requisição HTTP através de proxy usando axios
async function makeRequestThroughProxy(requestConfig, proxyString) {
  const proxyUrl = createProxyUrl(proxyString);
  
  // Configurar os agents para suportar proxy HTTP
  // Para requisições HTTP, usar HttpProxyAgent
  // Para requisições HTTPS, usar HttpsProxyAgent com opções SSL
  const https = require('https');
  
  // Agent HTTP para requisições HTTP
  const httpProxyAgent = new HttpProxyAgent(proxyUrl);
  
  // Agent HTTPS para requisições HTTPS através de proxy HTTP
  const httpsAgentOptions = {
    rejectUnauthorized: false
  };
  const httpsAgent = new https.Agent(httpsAgentOptions);
  const httpsProxyAgent = new HttpsProxyAgent(proxyUrl, {
    agent: httpsAgent
  });
  
  try {
    const config = {
      method: requestConfig.method.toLowerCase(),
      url: requestConfig.url,
      httpsAgent: httpsProxyAgent,  // Para requisições HTTPS
      httpAgent: httpProxyAgent,     // Para requisições HTTP
      timeout: 60000, // Aumentar timeout para 60 segundos
      headers: requestConfig.headers,
      validateStatus: () => true // Aceita qualquer status para não lançar erro
    };

    // Sanitizar e alinhar headers com o host da URL (teste imediato)
    if (!config.headers) {
      config.headers = {};
    }
    delete config.headers.Host;
    delete config.headers.host;
    delete config.headers['user-agent'];

    config.headers['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
    config.headers['content-type'] = 'application/json';

    const apiHost = new URL(config.url).hostname;
    config.headers.origin = `https://${apiHost}`;
    config.headers.referer = `https://${apiHost}/`;
    config.headers.domain = apiHost;
    config.headers.webauthndomain = apiHost;
    delete config.headers['x-custom-referer'];
    delete config.httpsAgent;
    
    // Adicionar body criptografado no payload da requisição
    if (requestConfig.body) {
      config.data = requestConfig.body;
    }
    
    console.log("=== AXIOS CONFIG DEBUG ===");
    console.log("URL:", config.url);
    console.log("METHOD:", config.method);
    console.log("HEADERS:", config.headers);
    console.log("HTTPS AGENT:", !!config.httpsAgent);
    console.log("PROXY:", config.proxy);
    console.log("TIMEOUT:", config.timeout);

    let response;
    try {
      response = await axios(config);
    } catch (err) {
      console.log("AXIOS_ERR_CODE:", err.code);
      console.log("AXIOS_ERR_MESSAGE:", err.message);
      console.log("AXIOS_ERR_SYSCALL:", err.syscall);
      throw err;
    }
    
    // Garantir que o body seja uma string
    let responseBody = '';
    if (typeof response.data === 'string') {
      responseBody = response.data;
    } else if (response.data) {
      responseBody = JSON.stringify(response.data);
    }
    
    return {
      statusCode: response.status,
      headers: response.headers,
      body: responseBody
    };
  } catch (error) {
    // Melhorar mensagem de erro SSL
    if (error.code === 'EPROTO' || error.code === 'ECONNRESET' || 
        error.message.includes('SSL') || error.message.includes('TLS') || 
        error.message.includes('handshake')) {
      const errorMsg = `Erro SSL/TLS na conexão através da proxy: ${error.message}. ` +
        `A proxy pode não suportar HTTPS corretamente ou pode estar bloqueando a conexão. ` +
        `Código do erro: ${error.code || 'N/A'}`;
      throw new Error(errorMsg);
    } else if (error.response) {
      // Se houver resposta do servidor, retornar ela
      return {
        statusCode: error.response.status,
        headers: error.response.headers,
        body: typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)
      };
    } else {
      throw error;
    }
  }
}

// Função para gerar username (sempre exatamente 16 caracteres)
function generateUsername(name, lastName) {
  // Converter para minúsculas e remover espaços e caracteres especiais
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanLastName = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Combinar nome e sobrenome
  const namePart = cleanName + cleanLastName;
  
  // Se a combinação for muito curta, adicionar números aleatórios
  // Se for muito longa, cortar e adicionar números
  let base = namePart;
  if (base.length > 13) {
    // Se muito longo, cortar para 13 caracteres para deixar espaço para 3 dígitos
    base = base.substring(0, 13);
  }
  
  // Calcular quantos dígitos precisamos para completar 16 caracteres
  const neededDigits = 16 - base.length;
  
  // Gerar número aleatório com exatamente o número de dígitos necessários
  const min = Math.pow(10, neededDigits - 1);
  const max = Math.pow(10, neededDigits) - 1;
  const randomNum = String(Math.floor(Math.random() * (max - min + 1)) + min);
  
  // Combinar e garantir exatamente 16 caracteres
  let username = (base + randomNum).substring(0, 16);
  
  // Se ainda não tiver 16 caracteres, preencher com letras aleatórias
  if (username.length < 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    while (username.length < 16) {
      username += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return username.substring(0, 16);
}

// Função para gerar senha (sempre exatamente 12 caracteres)
function generatePassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const all = uppercase + lowercase + numbers;
  
  let password = '';
  
  // Garantir pelo menos uma maiúscula, uma minúscula e um número
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Completar até exatamente 12 caracteres
  for (let i = password.length; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Embaralhar os caracteres
  password = password.split('').sort(() => Math.random() - 0.5).join('');
  
  // Garantir exatamente 12 caracteres
  return password.substring(0, 12);
}

// Função para gerar dados do usuário
function generateUserData() {
  // Ler nomes e sobrenomes
  const names = readSimpleCSV(path.join(__dirname, 'data', 'Names.csv'));
  const lastNames = readSimpleCSV(path.join(__dirname, 'data', 'LastName.csv'));
  
  if (names.length === 0 || lastNames.length === 0) {
    throw new Error('Arquivos de nomes ou sobrenomes vazios');
  }
  
  // Escolher nome e sobrenome aleatórios
  const name = names[Math.floor(Math.random() * names.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  // Gerar realName
  const realName = `${name} ${lastName}`;
  
  // Gerar username (garantir exatamente 16 caracteres)
  let username = generateUsername(name, lastName);
  if (username.length !== 16) {
    // Se não tiver 16 caracteres, preencher ou cortar
    if (username.length < 16) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      while (username.length < 16) {
        username += chars[Math.floor(Math.random() * chars.length)];
      }
    } else {
      username = username.substring(0, 16);
    }
  }
  
  // Gerar senha (garantir exatamente 12 caracteres)
  let password = generatePassword();
  if (password.length !== 12) {
    // Se não tiver 12 caracteres, preencher ou cortar
    if (password.length < 12) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      while (password.length < 12) {
        password += chars[Math.floor(Math.random() * chars.length)];
      }
    } else {
      password = password.substring(0, 12);
    }
  }
  
  // Gerar UUIDs aleatórios
  const loginId = randomUUID();
  const token = randomUUID();
  
  return {
    realName,
    username,
    password,
    loginId,
    token // Token extraído do BetRequest.txt
  };
}

// Função para extrair informações do .env
function extractEnvInfo() {
  const envPath = path.join(__dirname, '.env');
  
  let pin = null;
  let convite = null;
  let ipProxy = null;
  let contas = null;
  let proxyRotativa = null;
  
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      
      // Extrair PIN
      const pinMatch = content.match(/PIN\s*=\s*(.+)/);
      if (pinMatch) {
        pin = pinMatch[1].trim();
      }
      
      // Extrair CONVITE
      const conviteMatch = content.match(/CONVITE\s*=\s*(.+)/);
      if (conviteMatch) {
        convite = conviteMatch[1].trim();
      }
      
      // Extrair IP_PROXY
      const ipProxyMatch = content.match(/IP_PROXY\s*=\s*(.+)/);
      if (ipProxyMatch) {
        ipProxy = ipProxyMatch[1].trim();
      }
      
      // Extrair CONTAS
      const contasMatch = content.match(/CONTAS\s*=\s*(.+)/);
      if (contasMatch) {
        contas = contasMatch[1].trim();
      }
      
      // Extrair PROXY_ROTATIVA
      const proxyRotativaMatch = content.match(/PROXY_ROTATIVA\s*=\s*(.+)/);
      if (proxyRotativaMatch) {
        proxyRotativa = proxyRotativaMatch[1].trim();
      }
    }
  } catch (error) {
    console.error('Erro ao ler arquivo .env:', error.message);
  }
  
  return {
    pin,
    convite,
    ipProxy,
    contas,
    proxyRotativa
  };
}

// Função para extrair informações de um arquivo de request (BetRequest.txt ou arquivos da pasta Plataformas)
function extractRequestInfo(content = null) {
  // Se não recebeu conteúdo, ler do BetRequest.txt (compatibilidade)
  if (!content) {
  const filePath = path.join(__dirname, 'BetRequest.txt');
    content = fs.readFileSync(filePath, 'utf-8');
  }
  
  // Extrair URL da API (api) - URL completa do curl (suporta aspas simples ou duplas)
  const urlMatch = content.match(/curl\s+(?:-X\s+\w+\s+)?["']([^"']+)["']/);
  const urlApi = urlMatch ? urlMatch[1] : null;
  
  // Extrair URL origin (do header origin) - suporta aspas simples ou duplas e case-insensitive
  let urlOriginMatch = content.match(/-H\s+["']origin:\s*([^"']+)["']/i);
  let urlOrigin = urlOriginMatch ? urlOriginMatch[1] : null;
  
  // Se não encontrou origin, tentar usar referer como fallback (case-insensitive)
  if (!urlOrigin) {
    const refererMatch = content.match(/-H\s+["']referer:\s*([^"']+)["']/i);
    if (refererMatch) {
      // Extrair a URL base do referer (remover path se houver)
      const refererUrl = refererMatch[1];
      try {
        const url = new URL(refererUrl);
        urlOrigin = `${url.protocol}//${url.host}${url.port ? `:${url.port}` : ''}`;
      } catch (e) {
        // Se não conseguir fazer parse, usar o referer completo
        urlOrigin = refererUrl.split('/').slice(0, 3).join('/');
      }
    }
  }
  
  // Extrair token (do header token) - suporta aspas simples ou duplas
  const tokenMatch = content.match(/-H\s+["']token:\s*([^"']+)["']/);
  const token = tokenMatch ? tokenMatch[1] : null;
  
  // Extrair --data-raw ou --data-binary - suporta aspas simples ou duplas
  const dataRawMatch = content.match(/--data-(?:raw|binary)\s+["']([^"']+)["']/s);
  const dataRaw = dataRawMatch ? dataRawMatch[1] : null;
  
  // Extrair domain do header domain (sem https://) - suporta aspas simples ou duplas
  const domainMatch = content.match(/-H\s+["']domain:\s*([^"']+)["']/);
  let domain = domainMatch ? domainMatch[1] : null;
  
  // Extrair sitecode - suporta aspas simples ou duplas e case-insensitive
  const sitecodeMatch = content.match(/-H\s+["']sitecode:\s*([^"']+)["']/i);
  const sitecode = sitecodeMatch ? sitecodeMatch[1] : null;
  
  // Extrair appversion - suporta aspas simples ou duplas
  const appversionMatch = content.match(/-H\s+["']appversion:\s*([^"']+)["']/);
  const appversion = appversionMatch ? appversionMatch[1] : null;
  
  // Extrair x-version - suporta aspas simples ou duplas
  const xVersionMatch = content.match(/-H\s+["']x-version:\s*([^"']+)["']/i);
  const xVersion = xVersionMatch ? xVersionMatch[1] : null;
  
  // Extrair todos os headers para usar nas requisições (como no bot Chinesa) - suporta aspas simples ou duplas
  const headers = {};
  const headerMatches = content.matchAll(/-H\s+["']([^"']+)["']/g);
  for (const match of headerMatches) {
    const headerLine = match[1].trim();
    
    // Verificar se tem dois pontos (tem valor)
    if (headerLine.includes(':')) {
      const colonIndex = headerLine.indexOf(':');
      const key = headerLine.substring(0, colonIndex).trim();
      const value = headerLine.substring(colonIndex + 1).trim();
      
      // Validar nome do header (deve ser válido HTTP token)
      if (key && /^[a-zA-Z0-9_-]+$/.test(key) && value) {
        headers[key] = value;
      }
    }
    // Se não tem dois pontos, ignorar (como browserfingerid;)
  }
  
  return {
    urlApi: urlApi,           // URL da API para disparar as requisições
    urlOrigin: urlOrigin,     // URL origin para salvar no banco
    token: token,             // Token do request original
    dataRaw: dataRaw,         // --data-raw ou --data-binary para descriptografar
    domain: domain,            // Domain sem https:// (para headers)
    sitecode: sitecode,       // Sitecode
    appversion: appversion,    // Appversion
    xVersion: xVersion,        // X-Version
    headers: headers           // Headers extraídos do request
  };
}

// Função para obter data e horário formatados
function getFormattedDateTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}:${seconds}`,
    timeOnly: `${hours}:${minutes}:${seconds}`
  };
}

// Função para salvar conta em arquivo CSV na pasta Contas
function saveAccount(casaName, username, password, totalPrize) {
  try {
    const safeCasaNameRaw = (casaName || 'casa').toString().trim();
    const safeCasaName = safeCasaNameRaw.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') || 'casa';
    // Criar pasta Contas se não existir
    const contasDir = path.join(__dirname, 'Contas');
    if (!fs.existsSync(contasDir)) {
      fs.mkdirSync(contasDir, { recursive: true });
    }
    
    const fileName = `${safeCasaName}_contas.csv`;
    const filePath = path.join(contasDir, fileName);
    const { date, time } = getFormattedDateTime();
    
    // Verificar se o arquivo existe para adicionar cabeçalho
    const fileExists = fs.existsSync(filePath);
    
    // Criar linha CSV: data, hora, username, password, totalPrize
    const csvLine = `${date},${time},${username},${password},${totalPrize.toFixed(2)}\n`;
    
    // Se o arquivo não existe, adicionar cabeçalho primeiro
    if (!fileExists) {
      const header = 'Data,Hora,Username,Password,TotalPrize\n';
      fs.writeFileSync(filePath, header, 'utf-8');
    }
    
    // Adicionar linha ao arquivo
    fs.appendFileSync(filePath, csvLine, 'utf-8');
    return true;
  } catch (error) {
    console.log(`[ERRO] Falha ao salvar conta no CSV: ${error.message}`);
    return false;
  }
}

// Função principal - apenas extrair e exibir
async function runBot(casaName, platformInfo = null, debugMode = false) {
  let registrationSucceeded = false;
  let accountSaved = false;
  let userData = null;
  let totalPrize = 0;
  try {
    if (debugMode) {
      console.log(`\n[DEBUG] Iniciando criação de conta para ${casaName}`);
    }
    let urlApi, urlOrigin, domain, sitecode, appversion, xVersion, extractedToken, extractedHeaders;
    
    // Se recebeu informações da plataforma, usar elas
    if (platformInfo) {
      urlApi = platformInfo.urlApi;
      urlOrigin = platformInfo.urlOrigin;
      domain = platformInfo.domain;
      sitecode = platformInfo.sitecode;
      appversion = platformInfo.appversion;
      xVersion = platformInfo.xVersion;
      extractedToken = platformInfo.extractedToken;
      extractedHeaders = platformInfo.extractedHeaders;
    } else {
      // Caso contrário, extrair do BetRequest.txt (compatibilidade)
      const requestInfo = extractRequestInfo();
      ({ urlApi, urlOrigin, domain, sitecode, appversion, xVersion, token: extractedToken, headers: extractedHeaders } = requestInfo);
    }
    
    if (!urlApi || !urlOrigin || !domain || !sitecode || !extractedToken) {
      throw new Error('Não foi possível extrair todas as informações necessárias');
    }
    
    // Extrair informações do .env
    const { pin, convite, ipProxy, proxyRotativa } = extractEnvInfo();
    
    // Escolher user-agent aleatório
    const userAgentInfo = getRandomUserAgent();
    
    // Gerar dados do usuário
    userData = generateUserData();
    
    // Criar RegisterBody com as variáveis substituídas
    const apiHost = new URL(urlApi).hostname;
    const registerBody = createRegisterBody({
      domain: `https://${apiHost}`, // Alinhar domain do payload com o host da API
      realName: userData.realName,
      inviterId: convite || 0,
      deviceModel: userAgentInfo.devicemodel,
      platformId: userData.username,
      passwd: userData.password,
      loginId: userData.loginId,
      token: extractedToken // Usar token extraído do BetRequest.txt
    });
    
    // Criptografar o RegisterBody
    const key = key_doubleToken(extractedToken); // Usar token extraído do BetRequest.txt
    const registerBodyJson = JSON.stringify(registerBody);
    console.log("REGISTER BODY JSON (ANTES DE CRIPTO):", registerBodyJson);
    if (debugMode) {
      console.log(`[DEBUG] RegisterBody (antes de criptografar):`, registerBodyJson);
    }
    const encryptedBody = encrypt(registerBodyJson, key);
    if (debugMode) {
      console.log(`[DEBUG] RegisterBody (criptografado):`, encryptedBody);
    }
    
    // Criar RegisterRequest
    
    // Gerar timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Gerar requestId (UUID)
    const requestId = crypto.randomUUID();
    
    // Criar objectId baseado no exemplo do BetRequest.txt
    const objectId = JSON.stringify({
      uid: "",
      browserLanguage: "pt-BR",
      init: {
        device: "",
        created: Date.now(), // em milissegundos
        version: 1768830892000
      }
    });
    
    // Extrair base URL da API (sem o path)
    let apiBase = urlApi;
    if (apiBase.includes('/hall/api/member/register')) {
      apiBase = apiBase.split('/hall/api/member/register')[0];
    }
    
    const registerRequest = createRegisterRequest({
      url_api: apiBase,
      domain: domain, // domain sem https:// para headers domain e webauthndomain
      token: extractedToken, // Usar token extraído do BetRequest.txt
      timestamp: timestamp,
      loginId: userData.loginId,
      deviceBrand: userAgentInfo.devicebrand,
      deviceModel: userAgentInfo.devicemodel,
      requestId: requestId,
      objectId: objectId,
      registerBodyCriptografado: encryptedBody,
      appsystem: userAgentInfo.appsystem,
      browsertype: userAgentInfo.browsertype,
      operatingsystem: userAgentInfo.operatingsystem,
      sitecode: sitecode,
      userAgent: userAgentInfo.userAgent,
      inviterId: convite || 0,
      appversion: appversion || 'v7.0.99', // Usar appversion extraído ou valor padrão
      xVersion: xVersion || '7.0.99' // Usar xVersion extraído ou valor padrão
    });
    
    // Ajustar os headers conforme o BetRequest.txt (como no bot Chinesa)
    // domain e webauthndomain devem ser sem https://
    registerRequest.headers.domain = domain;
    registerRequest.headers.webauthndomain = domain;
    // origin e referer devem ser com https://
    registerRequest.headers.origin = urlOrigin;
    registerRequest.headers.referer = `${urlOrigin}/`;
    registerRequest.headers['x-custom-referer'] = `${urlOrigin}/home/register?id=${convite || 0}`;
    
    // Atualizar timestamp e device com valores corretos
    registerRequest.headers.timestamp = timestamp.toString();
    registerRequest.headers.device = userData.loginId;
    
    // Pegar proxy da lista (remover apenas se PROXY_ROTATIVA não for 1)
    const shouldRemoveProxy = proxyRotativa !== '1';
    const proxyString = getAndRemoveProxy(shouldRemoveProxy);
    
    // Verificar IP real da proxy (apenas se IP_PROXY=1 no .env)
    let realProxyIP = null;
    if (ipProxy === '1') {
    try {
      realProxyIP = await getRealProxyIP(proxyString);
    } catch (error) {
      }
    }
    
    // Enviar requisição através da proxy
    let response = null;
    try {
      if (debugMode) {
        console.log(`[DEBUG] Enviando RegisterRequest para: ${registerRequest.url}`);
        console.log(`[DEBUG] Headers:`, JSON.stringify(registerRequest.headers, null, 2));
        console.log(`[DEBUG] Proxy: ${proxyString}`);
      }
      console.log("REGISTER BODY:", registerRequest.body);
      response = await makeRequestThroughProxy(registerRequest, proxyString);
      if (debugMode) {
        console.log(`[DEBUG] RegisterResponse Status: ${response.statusCode}`);
        console.log(`[DEBUG] RegisterResponse Body (criptografado): ${response.body.substring(0, 200)}...`);
      }
    } catch (error) {
      if (debugMode) {
        console.log(`[DEBUG] Erro ao enviar RegisterRequest:`, error.message);
        console.log(`[DEBUG] Stack:`, error.stack);
      }
      // Criar um response vazio para não quebrar o fluxo
      response = {
        statusCode: 0,
        headers: {},
        body: ''
      };
    }
    
    // Validar resposta básica do registro
    if (!response || !response.body) {
      const statusInfo = response ? response.statusCode : 'N/A';
      console.log(`[ERRO] RegisterResponse vazio. Status: ${statusInfo}`);
      throw new Error('❌ ERRO CRÍTICO: RegisterResponse vazio.');
    }
    
    // Descriptografar o response body
    let decryptedResponseBody = null;
    let decryptedResponseJson = null;
    const rawResponseBody = response.body;
    if (typeof rawResponseBody === 'string' && rawResponseBody.trim().startsWith('{')) {
      console.log("Resposta ja e JSON puro.");
      decryptedResponseBody = rawResponseBody;
      decryptedResponseJson = tryParseJson(rawResponseBody.trim());
    } else {
      try {
        const responseKey = key_doubleToken(extractedToken); // Usar token extraido do BetRequest.txt
        
        if (debugMode) {
          console.log(`[DEBUG] Descriptografando RegisterResponse...`);
        }
        decryptedResponseBody = decrypt(rawResponseBody, responseKey);
        if (debugMode) {
          console.log(`[DEBUG] RegisterResponse (descriptografado):`, decryptedResponseBody);
        }
        // Limpar caracteres nulos e espacos
        let cleanedResponse = decryptedResponseBody.replace(/\0/g, '').trim();
        
        // Tentar remover caracteres invalidos no final (caracteres nao-printaveis)
        cleanedResponse = cleanedResponse.replace(/[\x00-\x1F\x7F-\x9F]+$/g, '');
        
        // Tentar parsear o JSON diretamente primeiro
        try {
          decryptedResponseJson = JSON.parse(cleanedResponse);
        } catch (parseError) {
          // Tentar encontrar onde esta o JSON valido (entre { e })
          const jsonStart = cleanedResponse.indexOf('{');
          const jsonEnd = cleanedResponse.lastIndexOf('}');
          
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            const jsonOnly = cleanedResponse.substring(jsonStart, jsonEnd + 1);
            try {
              decryptedResponseJson = JSON.parse(jsonOnly);
            } catch (parseError2) {
              // Tentar usar tryParseJson como ultimo recurso
              decryptedResponseJson = tryParseJson(jsonOnly);
              if (!decryptedResponseJson) {
                decryptedResponseJson = tryParseJson(cleanedResponse);
              }
            }
        } else {
            // Usar tryParseJson como fallback
            decryptedResponseJson = tryParseJson(cleanedResponse);
          }
        }
      } catch (error) {
        console.log("Resposta nao criptografada, usando raw.");
        decryptedResponseBody = rawResponseBody;
        decryptedResponseJson = tryParseJson(
          typeof rawResponseBody === 'string' ? rawResponseBody.trim() : String(rawResponseBody)
        );
      }
    }
    // Extrair userId e session_key do response descriptografado
    let extractedUserId = null;
    let extractedSessionKey = null;
    
    if (decryptedResponseJson) {
      // Extrair userId de data.userId
      if (decryptedResponseJson.data && decryptedResponseJson.data.userId) {
        extractedUserId = decryptedResponseJson.data.userId;
      }
      
      // Extrair session_key de data.userInfos.session_key
      if (decryptedResponseJson.data && decryptedResponseJson.data.userInfos) {
        if (decryptedResponseJson.data.userInfos.session_key) {
          extractedSessionKey = decryptedResponseJson.data.userInfos.session_key;
        }
      }
    }
    
    // Validar se os dados essenciais foram extraídos - PARAR se não tiver
    if (!extractedUserId) {
      console.log(`[ERRO] RegisterResponse (descriptografado): ${decryptedResponseBody || 'N/A'}`);
      if (decryptedResponseJson) {
        console.log(`[ERRO] RegisterResponse (JSON limpo): ${JSON.stringify(decryptedResponseJson)}`);
      } else {
        console.log('[ERRO] RegisterResponse (JSON limpo): N/A');
      }
      throw new Error('❌ ERRO CRÍTICO: Não foi possível extrair userId do response do registro. Não é possível prosseguir.');
    }
    if (!extractedSessionKey) {
      throw new Error('❌ ERRO CRÍTICO: Não foi possível extrair session_key do response do registro. Não é possível prosseguir.');
    }
    registrationSucceeded = true;
    
    // Criar objectidwithlogincode com o formato especificado
    const objectidwithlogincode = JSON.stringify({
      uid: extractedUserId,
      browserLanguage: "pt-BR",
      init: {
        device: userData.loginId,
        created: Date.now(),
        version: 1769246265000
      }
    });
    
    // SEMPRE enviar requisição verifyWithdrawPass (passo obrigatório)
    
    // Tentar executar
    try {
      // userId e session_key já foram validados acima
      const verifyUserId = extractedUserId;
      const verifySessionKey = extractedSessionKey;
      const verifyPin = pin || '000000';
      
      // Criar verifyWithdrawPassBody
      const verifyWithdrawPassBody = createverifyWithdrawPassBody({
        pin: verifyPin
      });
      
      // Gerar chave AES usando sessionKey + userId
      const aesKey = generateAESKeyForPIN(verifySessionKey, verifyUserId);
      
      // Criptografar o body
      const verifyWithdrawPassBodyJson = JSON.stringify(verifyWithdrawPassBody);
      const encryptedVerifyBody = encryptPIN(verifyWithdrawPassBodyJson, aesKey);
      
      // Gerar timestamp e requestId para verifyWithdrawPass
      const verifyTimestamp = Math.floor(Date.now() / 1000);
      const verifyRequestId = crypto.randomUUID();
      
      // Criar objectId para verifyWithdrawPass (similar ao register)
      const verifyObjectId = JSON.stringify({
        uid: "",
        browserLanguage: "pt-BR",
        init: {
          device: userData.loginId,
          created: Date.now(),
          version: 1768830892000
        }
      });
      
      // Criar verifyWithdrawPassRequest
      const verifyWithdrawPassRequest = createverifyWithdrawPassRequest({
        url_api: apiBase,
        domain: domain,
        session_key: verifySessionKey,
        loginId: userData.loginId,
        deviceBrand: userAgentInfo.devicebrand,
        deviceModel: userAgentInfo.devicemodel,
        requestId: verifyRequestId,
        verifyWithdrawPassBodyCriptografado: encryptedVerifyBody.encryptString,
        appsystem: userAgentInfo.appsystem,
        browsertype: userAgentInfo.browsertype,
        operatingsystem: userAgentInfo.operatingsystem,
        sitecode: sitecode,
        userAgent: userAgentInfo.userAgent,
        objectId: verifyObjectId,
        appversion: appversion || 'v7.0.99',
        xVersion: xVersion || '7.0.99'
      });
      
      // Ajustar headers
      verifyWithdrawPassRequest.headers.domain = domain;
      verifyWithdrawPassRequest.headers.webauthndomain = domain;
      verifyWithdrawPassRequest.headers.origin = urlOrigin;
      verifyWithdrawPassRequest.headers.referer = `${urlOrigin}/`;
      const verifyUrlObj = new URL(verifyWithdrawPassRequest.url);
      verifyWithdrawPassRequest.headers.Host = verifyUrlObj.hostname + (verifyUrlObj.port ? `:${verifyUrlObj.port}` : '');
      verifyWithdrawPassRequest.headers.timestamp = verifyTimestamp.toString();
      verifyWithdrawPassRequest.headers.device = userData.loginId;
      
      // Enviar requisição verifyWithdrawPass
      let verifyResponse;
      try {
        if (debugMode) {
          console.log(`[DEBUG] Enviando verifyWithdrawPassRequest...`);
        }
        verifyResponse = await makeRequestThroughProxy(verifyWithdrawPassRequest, proxyString);
        if (debugMode) {
          console.log(`[DEBUG] verifyWithdrawPassResponse Status: ${verifyResponse.statusCode}`);
        }
        
        // Descriptografar o response usando a mesma chave AES
        let decryptedVerifyResponseBody = null;
        let decryptedVerifyResponseJson = null;
        try {
          decryptedVerifyResponseBody = decryptPIN(verifyResponse.body, aesKey);
          const cleanedVerifyResponse = decryptedVerifyResponseBody.replace(/\0/g, '').trim();
          decryptedVerifyResponseJson = tryParseJson(cleanedVerifyResponse);
        } catch (error) {
        }
      } catch (error) {
      }
    } catch (error) {
    }
    
    // SEMPRE enviar requisição modifyWithdrawPass (passo obrigatório)
    
    // Tentar executar
    try {
      // userId e session_key já foram validados acima
      const modifyUserId = extractedUserId;
      const modifySessionKey = extractedSessionKey;
      const modifyPin = pin || '000000';
      
      // Criar modifyWithdrawPassBody
      const modifyWithdrawPassBody = createmodifyWithdrawPass({
        pin: modifyPin
      });
      
      // Gerar chave AES usando sessionKey + userId (mesma chave do verifyWithdrawPass)
      const modifyAesKey = generateAESKeyForPIN(modifySessionKey, modifyUserId);
      
      // Criptografar o body
      const modifyWithdrawPassBodyJson = JSON.stringify(modifyWithdrawPassBody);
      const encryptedModifyBody = encryptPIN(modifyWithdrawPassBodyJson, modifyAesKey);
      
      // Gerar timestamp e requestId para modifyWithdrawPass
      const modifyTimestamp = Math.floor(Date.now() / 1000);
      const modifyRequestId = crypto.randomUUID();
      
      // Criar objectId para modifyWithdrawPass (similar ao register)
      const modifyObjectId = JSON.stringify({
        uid: "",
        browserLanguage: "pt-BR",
        init: {
          device: userData.loginId,
          created: Date.now(),
          version: 1768830892000
        }
      });
      
      // Criar modifyWithdrawPassRequest
      const modifyWithdrawPassRequest = createmodifyWithdrawPassRequest({
        url_api: apiBase,
        domain: domain,
        session_key: modifySessionKey,
        loginId: userData.loginId,
        deviceBrand: userAgentInfo.devicebrand,
        deviceModel: userAgentInfo.devicemodel,
        requestId: modifyRequestId,
        modifyWithdrawPassBodyCriptografado: encryptedModifyBody.encryptString,
        appsystem: userAgentInfo.appsystem,
        browsertype: userAgentInfo.browsertype,
        operatingsystem: userAgentInfo.operatingsystem,
        sitecode: sitecode,
        userAgent: userAgentInfo.userAgent,
        objectId: modifyObjectId,
        appversion: appversion || 'v7.0.99',
        xVersion: xVersion || '7.0.99'
      });
      
      // Ajustar headers
      modifyWithdrawPassRequest.headers.domain = domain;
      modifyWithdrawPassRequest.headers.webauthndomain = domain;
      modifyWithdrawPassRequest.headers.origin = urlOrigin;
      modifyWithdrawPassRequest.headers.referer = `${urlOrigin}/`;
      const modifyUrlObj = new URL(modifyWithdrawPassRequest.url);
      modifyWithdrawPassRequest.headers.Host = modifyUrlObj.hostname + (modifyUrlObj.port ? `:${modifyUrlObj.port}` : '');
      modifyWithdrawPassRequest.headers.timestamp = modifyTimestamp.toString();
      modifyWithdrawPassRequest.headers.device = userData.loginId;
      
      // Enviar requisição modifyWithdrawPass
      let modifyResponse;
      try {
        if (debugMode) {
          console.log(`[DEBUG] Enviando modifyWithdrawPassRequest...`);
        }
        modifyResponse = await makeRequestThroughProxy(modifyWithdrawPassRequest, proxyString);
        if (debugMode) {
          console.log(`[DEBUG] modifyWithdrawPassResponse Status: ${modifyResponse.statusCode}`);
        }
        
        // Descriptografar o response usando a mesma chave AES
        let decryptedModifyResponseBody = null;
        let decryptedModifyResponseJson = null;
        try {
          decryptedModifyResponseBody = decryptPIN(modifyResponse.body, modifyAesKey);
          const cleanedModifyResponse = decryptedModifyResponseBody.replace(/\0/g, '').trim();
          decryptedModifyResponseJson = tryParseJson(cleanedModifyResponse);
        } catch (error) {
        }
      } catch (error) {
      }
    } catch (error) {
    }
    
    // SEMPRE enviar requisição verifyWithdrawalPasswordV2 (passo obrigatório)
    
    // Declarar withdrawal_uuid no escopo correto para uso posterior
    let withdrawal_uuid = null;
    
    // Tentar executar
    try {
      // userId e session_key já foram validados acima
      const verifyV2UserId = extractedUserId;
      const verifyV2SessionKey = extractedSessionKey;
      const verifyV2Pin = pin || '000000';
      
      // Criar verifyWithdrawalPasswordV2Body
      const verifyWithdrawalPasswordV2Body = createverifyWithdrawalPasswordV2({
        pin: verifyV2Pin
      });
      
      // Gerar chave AES usando sessionKey + userId (mesma chave do verifyWithdrawPass)
      const verifyV2AesKey = generateAESKeyForPIN(verifyV2SessionKey, verifyV2UserId);
      
      // Criptografar o body
      const verifyWithdrawalPasswordV2BodyJson = JSON.stringify(verifyWithdrawalPasswordV2Body);
      const encryptedVerifyV2Body = encryptPIN(verifyWithdrawalPasswordV2BodyJson, verifyV2AesKey);
      
      // Gerar timestamp e requestId para verifyWithdrawalPasswordV2
      const verifyV2Timestamp = Math.floor(Date.now() / 1000);
      const verifyV2RequestId = crypto.randomUUID();
      
      // Criar objectId para verifyWithdrawalPasswordV2 (similar ao register)
      const verifyV2ObjectId = JSON.stringify({
        uid: "",
        browserLanguage: "pt-BR",
        init: {
          device: userData.loginId,
          created: Date.now(),
          version: 1768830892000
        }
      });
      
      // Criar verifyWithdrawalPasswordV2Request
      const verifyWithdrawalPasswordV2Request = createverifyWithdrawalPasswordV2Request({
        url_api: apiBase,
        domain: domain,
        session_key: verifyV2SessionKey,
        loginId: userData.loginId,
        deviceBrand: userAgentInfo.devicebrand,
        deviceModel: userAgentInfo.devicemodel,
        requestId: verifyV2RequestId,
        verifyWithdrawalPasswordV2BodyCriptografado: encryptedVerifyV2Body.encryptString,
        appsystem: userAgentInfo.appsystem,
        browsertype: userAgentInfo.browsertype,
        operatingsystem: userAgentInfo.operatingsystem,
        sitecode: sitecode,
        userAgent: userAgentInfo.userAgent,
        objectId: verifyV2ObjectId,
        appversion: appversion || 'v7.0.99',
        xVersion: xVersion || '7.0.99'
      });
      
      // Ajustar headers
      verifyWithdrawalPasswordV2Request.headers.domain = domain;
      verifyWithdrawalPasswordV2Request.headers.webauthndomain = domain;
      verifyWithdrawalPasswordV2Request.headers.origin = urlOrigin;
      verifyWithdrawalPasswordV2Request.headers.referer = `${urlOrigin}/`;
      const verifyV2UrlObj = new URL(verifyWithdrawalPasswordV2Request.url);
      verifyWithdrawalPasswordV2Request.headers.Host = verifyV2UrlObj.hostname + (verifyV2UrlObj.port ? `:${verifyV2UrlObj.port}` : '');
      verifyWithdrawalPasswordV2Request.headers.timestamp = verifyV2Timestamp.toString();
      verifyWithdrawalPasswordV2Request.headers.device = userData.loginId;
      
      // Enviar requisição verifyWithdrawalPasswordV2
      let verifyV2Response;
      try {
        if (debugMode) {
          console.log(`[DEBUG] Enviando verifyWithdrawalPasswordV2Request...`);
        }
        verifyV2Response = await makeRequestThroughProxy(verifyWithdrawalPasswordV2Request, proxyString);
        if (debugMode) {
          console.log(`[DEBUG] verifyWithdrawalPasswordV2Response Status: ${verifyV2Response.statusCode}`);
        }
        
        // Descriptografar o response usando a mesma chave AES
        let decryptedVerifyV2ResponseBody = null;
        let decryptedVerifyV2ResponseJson = null;
        try {
          decryptedVerifyV2ResponseBody = decryptPIN(verifyV2Response.body, verifyV2AesKey);
          const cleanedVerifyV2Response = decryptedVerifyV2ResponseBody.replace(/\0/g, '').trim();
          decryptedVerifyV2ResponseJson = tryParseJson(cleanedVerifyV2Response);
        } catch (error) {
        }
        
        // Extrair withdrawal_uuid (key) do response descriptografado
        if (decryptedVerifyV2ResponseJson && decryptedVerifyV2ResponseJson.data && decryptedVerifyV2ResponseJson.data.key) {
          withdrawal_uuid = decryptedVerifyV2ResponseJson.data.key;
        }
        
      } catch (error) {
      }
    } catch (error) {
    }
    
    // SEMPRE enviar requisição bindalipayV3 (passo obrigatório)
    // Verificar withdrawal_uuid - PARAR se não tiver
    if (!withdrawal_uuid) {
      throw new Error('❌ ERRO CRÍTICO: withdrawal_uuid não encontrado no response do verifyWithdrawalPasswordV2. Não é possível prosseguir.');
    }
    
    // Tentar executar
    try {
      // userId e session_key já foram validados acima
      const bindUserId = extractedUserId;
      const bindSessionKey = extractedSessionKey;
      const bindWithdrawalUuid = withdrawal_uuid;
      
      // Gerar chave PIX baseada no realName
      const pixKey = generatePixKey(userData.realName);
      
      // Criar bindalipayV3Body
      const bindalipayV3Body = createbindalipayV3({
        realName: userData.realName,
        pixkey: pixKey
      });
      
      // Gerar chave AES usando sessionKey + userId (mesma chave do verifyWithdrawPass)
      const bindAesKey = generateAESKeyForPIN(bindSessionKey, bindUserId);
      
      // Criptografar o body
      const bindalipayV3BodyJson = JSON.stringify(bindalipayV3Body);
      const encryptedBindBody = encryptPIN(bindalipayV3BodyJson, bindAesKey);
      
      // Printar body criptografado
      
      // Gerar timestamp e requestId para bindalipayV3
      const bindTimestamp = Math.floor(Date.now() / 1000);
      const bindRequestId = crypto.randomUUID();
      
      // Criar objectId para bindalipayV3 (similar ao register)
      const bindObjectId = JSON.stringify({
        uid: "",
        browserLanguage: "pt-BR",
        init: {
          device: userData.loginId,
          created: Date.now(),
          version: 1768830892000
        }
      });
      
      // Criar bindalipayV3Request
      const bindalipayV3Request = createbindalipayV3Request({
        url_api: apiBase,
        domain: domain,
        session_key: bindSessionKey,
        loginId: userData.loginId,
        deviceBrand: userAgentInfo.devicebrand,
        deviceModel: userAgentInfo.devicemodel,
        requestId: bindRequestId,
        bindalipayV3Criptografado: encryptedBindBody.encryptString,
        appsystem: userAgentInfo.appsystem,
        browsertype: userAgentInfo.browsertype,
        operatingsystem: userAgentInfo.operatingsystem,
        sitecode: sitecode,
        userAgent: userAgentInfo.userAgent,
        objectId: bindObjectId,
        appversion: appversion || 'v7.0.99',
        xVersion: xVersion || '7.0.99',
        withdrawal_uuid: bindWithdrawalUuid
      });
      
      // Ajustar headers
      bindalipayV3Request.headers.domain = domain;
      bindalipayV3Request.headers.webauthndomain = domain;
      bindalipayV3Request.headers.origin = urlOrigin;
      bindalipayV3Request.headers.referer = `${urlOrigin}/`;
      const bindUrlObj = new URL(bindalipayV3Request.url);
      bindalipayV3Request.headers.Host = bindUrlObj.hostname + (bindUrlObj.port ? `:${bindUrlObj.port}` : '');
      bindalipayV3Request.headers.timestamp = bindTimestamp.toString();
      bindalipayV3Request.headers.device = userData.loginId;
      
      // Printar URL da requisição
      
      // Enviar requisição bindalipayV3
      let bindResponse;
      try {
        if (debugMode) {
          console.log(`[DEBUG] Enviando bindalipayV3Request...`);
        }
        bindResponse = await makeRequestThroughProxy(bindalipayV3Request, proxyString);
        if (debugMode) {
          console.log(`[DEBUG] bindalipayV3Response Status: ${bindResponse.statusCode}`);
        }
        
        // Printar o response criptografado primeiro
        
        // Descriptografar o response usando a mesma chave AES
        let decryptedBindResponseBody = null;
        let decryptedBindResponseJson = null;
        try {
          decryptedBindResponseBody = decryptPIN(bindResponse.body, bindAesKey);
          const cleanedBindResponse = decryptedBindResponseBody.replace(/\0/g, '').trim();
          decryptedBindResponseJson = tryParseJson(cleanedBindResponse);
        } catch (error) {
        }
      } catch (error) {
      }
    } catch (error) {
    }
    
    // ========== 6. POP CAN RECEIVE REWARD ==========
    
    // Declarar idbonuscadastro e idbonusapp no escopo correto para uso posterior
    let idbonuscadastro = null;
    let idbonusapp = null;
    
    try {
      // Gerar requestId e objectId para esta requisição
      const popCanReceiveRewardRequestId = randomUUID();
      const popCanReceiveRewardObjectId = randomUUID();
      const popCanReceiveRewardTimestamp = Math.floor(Date.now() / 1000);
      
      const popCanReceiveRewardRequest = pop_canReceiveRewardRequest({
        url_api: apiBase,
        domain: domain,
        session_key: extractedSessionKey,
        loginId: userData.loginId,
        deviceBrand: userAgentInfo.devicebrand,
        deviceModel: userAgentInfo.devicemodel,
        requestId: popCanReceiveRewardRequestId,
        appsystem: userAgentInfo.appsystem,
        browsertype: userAgentInfo.browsertype,
        operatingsystem: userAgentInfo.operatingsystem,
        sitecode: sitecode,
        userAgent: userAgentInfo.userAgent,
        objectId: popCanReceiveRewardObjectId,
        appversion: appversion || 'v7.0.99',
        xVersion: xVersion || '7.0.99'
      });
      
      // Ajustar headers - seguir o mesmo padrão das outras requisições
      popCanReceiveRewardRequest.headers.domain = domain;
      popCanReceiveRewardRequest.headers.webauthndomain = domain;
      popCanReceiveRewardRequest.headers.origin = urlOrigin;
      popCanReceiveRewardRequest.headers.referer = `${urlOrigin}/`;
      const popCanReceiveRewardUrlObj = new URL(popCanReceiveRewardRequest.url);
      popCanReceiveRewardRequest.headers.Host = popCanReceiveRewardUrlObj.hostname + (popCanReceiveRewardUrlObj.port ? `:${popCanReceiveRewardUrlObj.port}` : '');
      popCanReceiveRewardRequest.headers.timestamp = popCanReceiveRewardTimestamp.toString();
      popCanReceiveRewardRequest.headers.device = userData.loginId;
      
      
      if (debugMode) {
        console.log(`[DEBUG] Enviando popCanReceiveRewardRequest...`);
      }
      const popCanReceiveRewardResponse = await makeRequestThroughProxy(popCanReceiveRewardRequest, proxyString);
      if (debugMode) {
        console.log(`[DEBUG] popCanReceiveRewardResponse Status: ${popCanReceiveRewardResponse.statusCode}`);
      }
      
      // Descriptografar o response usando session_key e userId (mesmo padrão das requisições de saque)
      let decryptedPopCanReceiveRewardResponseBody = null;
      let decryptedPopCanReceiveRewardResponseJson = null;
      try {
        const popCanReceiveRewardAesKey = generateAESKeyForPIN(extractedSessionKey, extractedUserId);
        decryptedPopCanReceiveRewardResponseBody = decryptPIN(popCanReceiveRewardResponse.body, popCanReceiveRewardAesKey);
        const cleanedPopCanReceiveRewardResponse = decryptedPopCanReceiveRewardResponseBody.replace(/\0/g, '').trim();
        decryptedPopCanReceiveRewardResponseJson = tryParseJson(cleanedPopCanReceiveRewardResponse);
      } catch (error) {
      }
      
      if (decryptedPopCanReceiveRewardResponseJson) {
        // Extrair idbonuscadastro (id) do primeiro item e idbonusapp (id) do segundo item
        if (decryptedPopCanReceiveRewardResponseJson.data && 
            decryptedPopCanReceiveRewardResponseJson.data.list && 
            Array.isArray(decryptedPopCanReceiveRewardResponseJson.data.list)) {
          
          // Extrair idbonuscadastro do primeiro item (índice 0)
          if (decryptedPopCanReceiveRewardResponseJson.data.list.length > 0 &&
              decryptedPopCanReceiveRewardResponseJson.data.list[0].id) {
            idbonuscadastro = decryptedPopCanReceiveRewardResponseJson.data.list[0].id;
          }
          
          // Extrair idbonusapp do segundo item (índice 1)
          if (decryptedPopCanReceiveRewardResponseJson.data.list.length > 1 &&
              decryptedPopCanReceiveRewardResponseJson.data.list[1].id) {
            idbonusapp = decryptedPopCanReceiveRewardResponseJson.data.list[1].id;
          }
        }
      }
      
    } catch (error) {
    }
    
    // ========== 7. RECEIVE ONE (PRIMEIRO - idbonuscadastro) ==========
    
    // Verificar idbonuscadastro - PARAR se não tiver
    if (!idbonuscadastro) {
      throw new Error('❌ ERRO CRÍTICO: idbonuscadastro não encontrado no response do pop_canReceiveReward. Não é possível prosseguir.');
    }
    
    // Variáveis para armazenar os prizes
    let prize1 = 0;
    let prize2 = 0;
    totalPrize = 0;
    
    try {
      // userId e session_key já foram validados acima
      const receiveOneUserId = extractedUserId;
      const receiveOneSessionKey = extractedSessionKey;
      
      // Gerar chave AES usando sessionKey + userId (será usada em ambas as requisições)
      const receiveOneAesKey = generateAESKeyForPIN(receiveOneSessionKey, receiveOneUserId);
      
      // ========== PRIMEIRA REQUEST RECEIVE ONE (idbonuscadastro) ==========
      // Criar receiveOneBody com idbonuscadastro
      const receiveOneBody1 = createreceiveOneBody({
        idbonuscadastro: idbonuscadastro
      });
      
      // Print do body antes de criptografar
      const receiveOneBodyJson1 = JSON.stringify(receiveOneBody1);
      
      // Criptografar o body
      const encryptedReceiveOneBody1 = encryptPIN(receiveOneBodyJson1, receiveOneAesKey);
      
      // Print do body criptografado
      
      // Gerar timestamp e requestId para receiveOne
      const receiveOneTimestamp1 = Math.floor(Date.now() / 1000);
      const receiveOneRequestId1 = crypto.randomUUID();
      
      // Criar receiveOneRequest usando objectidwithlogincode
      const receiveOneRequest1 = createreceiveOneRequest({
        url_api: apiBase,
        domain: domain,
        session_key: receiveOneSessionKey,
        loginId: userData.loginId,
        deviceBrand: userAgentInfo.devicebrand,
        deviceModel: userAgentInfo.devicemodel,
        requestId: receiveOneRequestId1,
        receiveOneBodyCriptografado: encryptedReceiveOneBody1.encryptString,
        appsystem: userAgentInfo.appsystem,
        browsertype: userAgentInfo.browsertype,
        operatingsystem: userAgentInfo.operatingsystem,
        sitecode: sitecode,
        userAgent: userAgentInfo.userAgent,
        objectId: objectidwithlogincode,
        appversion: appversion || 'v7.0.99',
        xVersion: xVersion || '7.0.99'
      });
      
      // Ajustar headers
      receiveOneRequest1.headers.domain = domain;
      receiveOneRequest1.headers.webauthndomain = domain;
      receiveOneRequest1.headers.origin = urlOrigin;
      receiveOneRequest1.headers.referer = `${urlOrigin}/`;
      const receiveOneUrlObj1 = new URL(receiveOneRequest1.url);
      receiveOneRequest1.headers.Host = receiveOneUrlObj1.hostname + (receiveOneUrlObj1.port ? `:${receiveOneUrlObj1.port}` : '');
      receiveOneRequest1.headers.timestamp = receiveOneTimestamp1.toString();
      receiveOneRequest1.headers.device = userData.loginId;
      
      
      // Enviar primeira requisição receiveOne
      let receiveOneResponse1;
      try {
        if (debugMode) {
          console.log(`[DEBUG] Enviando receiveOneRequest1 (idbonuscadastro)...`);
        }
        receiveOneResponse1 = await makeRequestThroughProxy(receiveOneRequest1, proxyString);
        if (debugMode) {
          console.log(`[DEBUG] receiveOneResponse1 Status: ${receiveOneResponse1.statusCode}`);
        }
        
        // Print do body antes de descriptografar
        
        // Verificar se o response já é um JSON (não criptografado) ou se precisa descriptografar
        let decryptedReceiveOneResponseJson1 = null;
        
        // Tentar parsear diretamente como JSON primeiro
        const directJson1 = tryParseJson(receiveOneResponse1.body);
        if (directJson1) {
          // Response já é JSON (não criptografado)
          decryptedReceiveOneResponseJson1 = directJson1;
        } else {
          // Tentar descriptografar o response usando a mesma chave AES
          try {
            const decryptedReceiveOneResponseBody1 = decryptPIN(receiveOneResponse1.body, receiveOneAesKey);
            const cleanedReceiveOneResponse1 = decryptedReceiveOneResponseBody1.replace(/\0/g, '').trim();
            decryptedReceiveOneResponseJson1 = tryParseJson(cleanedReceiveOneResponse1);
          } catch (error) {
          }
        }
        
        if (decryptedReceiveOneResponseJson1) {
          // Extrair prize do primeiro receiveOne
          if (decryptedReceiveOneResponseJson1.data && decryptedReceiveOneResponseJson1.data.prize !== undefined) {
            prize1 = parseFloat(decryptedReceiveOneResponseJson1.data.prize) || 0;
          }
        }
        
      } catch (error) {
      }
      
      // ========== SEGUNDA REQUEST RECEIVE ONE (idbonusapp) ==========
      if (idbonusapp) {
        
        // Criar receiveOneBody com idbonusapp
        const receiveOneBody2 = createreceiveOneBody({
          idbonuscadastro: idbonusapp
        });
        
        // Print do body antes de criptografar
        const receiveOneBodyJson2 = JSON.stringify(receiveOneBody2);
        
        // Criptografar o body
        const encryptedReceiveOneBody2 = encryptPIN(receiveOneBodyJson2, receiveOneAesKey);
        
        // Print do body criptografado
        
        // Gerar timestamp e requestId para receiveOne 2
        const receiveOneTimestamp2 = Math.floor(Date.now() / 1000);
        const receiveOneRequestId2 = crypto.randomUUID();
        
        // Criar receiveOneRequest usando objectidwithlogincode
        const receiveOneRequest2 = createreceiveOneRequest({
          url_api: apiBase,
          domain: domain,
          session_key: receiveOneSessionKey,
          loginId: userData.loginId,
          deviceBrand: userAgentInfo.devicebrand,
          deviceModel: userAgentInfo.devicemodel,
          requestId: receiveOneRequestId2,
          receiveOneBodyCriptografado: encryptedReceiveOneBody2.encryptString,
          appsystem: userAgentInfo.appsystem,
          browsertype: userAgentInfo.browsertype,
          operatingsystem: userAgentInfo.operatingsystem,
          sitecode: sitecode,
          userAgent: userAgentInfo.userAgent,
          objectId: objectidwithlogincode,
          appversion: appversion || 'v7.0.99',
          xVersion: xVersion || '7.0.99'
        });
        
        // Ajustar headers
        receiveOneRequest2.headers.domain = domain;
        receiveOneRequest2.headers.webauthndomain = domain;
        receiveOneRequest2.headers.origin = urlOrigin;
        receiveOneRequest2.headers.referer = `${urlOrigin}/`;
        const receiveOneUrlObj2 = new URL(receiveOneRequest2.url);
        receiveOneRequest2.headers.Host = receiveOneUrlObj2.hostname + (receiveOneUrlObj2.port ? `:${receiveOneUrlObj2.port}` : '');
        receiveOneRequest2.headers.timestamp = receiveOneTimestamp2.toString();
        receiveOneRequest2.headers.device = userData.loginId;
        
        
        // Enviar segunda requisição receiveOne
        let receiveOneResponse2;
        try {
          if (debugMode) {
            console.log(`[DEBUG] Enviando receiveOneRequest2 (idbonusapp)...`);
          }
          receiveOneResponse2 = await makeRequestThroughProxy(receiveOneRequest2, proxyString);
          if (debugMode) {
            console.log(`[DEBUG] receiveOneResponse2 Status: ${receiveOneResponse2.statusCode}`);
          }
          
          // Print do body antes de descriptografar
          
          // Verificar se o response já é um JSON (não criptografado) ou se precisa descriptografar
          let decryptedReceiveOneResponseJson2 = null;
          
          // Tentar parsear diretamente como JSON primeiro
          const directJson2 = tryParseJson(receiveOneResponse2.body);
          if (directJson2) {
            // Response já é JSON (não criptografado)
            decryptedReceiveOneResponseJson2 = directJson2;
          } else {
            // Tentar descriptografar o response usando a mesma chave AES
            try {
              const decryptedReceiveOneResponseBody2 = decryptPIN(receiveOneResponse2.body, receiveOneAesKey);
              const cleanedReceiveOneResponse2 = decryptedReceiveOneResponseBody2.replace(/\0/g, '').trim();
              decryptedReceiveOneResponseJson2 = tryParseJson(cleanedReceiveOneResponse2);
            } catch (error) {
            }
          }
          
          if (decryptedReceiveOneResponseJson2) {
            // Extrair prize do segundo receiveOne
            if (decryptedReceiveOneResponseJson2.data && decryptedReceiveOneResponseJson2.data.prize !== undefined) {
              prize2 = parseFloat(decryptedReceiveOneResponseJson2.data.prize) || 0;
            }
          }
          
        } catch (error) {
        }
      }
      
      // Somar os prizes
      totalPrize = prize1 + prize2;
      
    } catch (error) {
      if (debugMode) {
        console.log(`[DEBUG] Erro geral no runBot:`, error.message);
        console.log(`[DEBUG] Stack:`, error.stack);
      }
    }
    
    // Atualizar estatísticas (sempre incrementar total de contas)
    statistics.totalAccounts++;
    
    // Print final no formato solicitado (apenas se totalPrize >= 0.40)
    if (totalPrize >= 0.40) {
      statistics.successfulAccounts++;
      const formattedTotalPrize = totalPrize.toFixed(2);
      const redColor = '\x1b[31m'; // Código ANSI para vermelho
      const resetColor = '\x1b[0m'; // Código ANSI para resetar cor
      const { timeOnly } = getFormattedDateTime();
      console.log(`\n[${timeOnly}] [${casaName}] ${userData.username} | ${userData.password} | ${redColor}R$${formattedTotalPrize}${resetColor}`);
    }
    
    // Salvar conta em arquivo (sempre)
    const safeTotalPrize = Number.isFinite(totalPrize) ? totalPrize : 0;
    accountSaved = saveAccount(casaName, userData.username, userData.password, safeTotalPrize);
    
    // Adicionar informações descriptografadas e extraídas ao response
    const responseWithDecrypted = {
      ...response,
      decryptedBody: decryptedResponseBody,
      decryptedJson: decryptedResponseJson,
      extractedUserId: extractedUserId,
      extractedSessionKey: extractedSessionKey
    };
    
    return {
      api: urlApi,
      domain: `https://${apiHost}`, // Alinhar domain do payload com o host da API
      sitecode,
      pin,
      convite,
      proxy: proxyString,
      realProxyIP: realProxyIP,
      ...userAgentInfo,
      ...userData,
      registerBody,
      encryptedBody,
      registerRequest,
      response: responseWithDecrypted,
      userId: extractedUserId,
      sessionKey: extractedSessionKey,
      totalPrize: totalPrize,  // Incluir totalPrize no retorno para rastreamento de cooldown
      casaName: casaName        // Incluir casaName para facilitar rastreamento
    };
    
  } catch (error) {
    throw error;
  } finally {
    // Salvar apenas se o registro foi concluído com sucesso
    if (registrationSucceeded && userData && !accountSaved) {
      const safeTotalPrize = Number.isFinite(totalPrize) ? totalPrize : 0;
      try {
        accountSaved = saveAccount(casaName, userData.username, userData.password, safeTotalPrize);
      } catch (saveError) {
      }
    }
  }
}


// Função para ler todas as plataformas da pasta Plataformas
function loadPlatforms() {
  const platformsDir = path.join(__dirname, 'Plataformas');
  const platforms = [];
  
  try {
    if (!fs.existsSync(platformsDir)) {
      throw new Error('Pasta Plataformas não encontrada');
    }
    
    const files = fs.readdirSync(platformsDir);
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    
    if (txtFiles.length === 0) {
      throw new Error('Nenhum arquivo .txt encontrado na pasta Plataformas');
    }
    
    const rejectedPlatforms = [];
    
    for (const file of txtFiles) {
      const filePath = path.join(platformsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const casaName = path.basename(file, '.txt');
      
      // Extrair informações do arquivo
      const requestInfo = extractRequestInfo(content);
      const { urlApi, urlOrigin, domain, sitecode, appversion, xVersion, token: extractedToken, headers: extractedHeaders } = requestInfo;
      
      if (urlApi && urlOrigin && domain && sitecode && extractedToken) {
        platforms.push({
          casaName,
          filePath,
          content,
          requestInfo,
          urlApi,
          urlOrigin,
          domain,
          sitecode,
          appversion,
          xVersion,
          extractedToken,
          extractedHeaders
        });
      } else {
        // Plataforma rejeitada - falta alguma informação
        const missing = [];
        if (!urlApi) missing.push('urlApi');
        if (!urlOrigin) missing.push('urlOrigin');
        if (!domain) missing.push('domain');
        if (!sitecode) missing.push('sitecode');
        if (!extractedToken) missing.push('token');
        rejectedPlatforms.push({ casaName, missing });
      }
    }
    
    // Mostrar plataformas rejeitadas se houver
    if (rejectedPlatforms.length > 0) {
      console.log(`\n[AVISO] ${rejectedPlatforms.length} plataforma(s) rejeitada(s) por falta de informações:`);
      for (const rejected of rejectedPlatforms) {
        console.log(`  - ${rejected.casaName}: faltando ${rejected.missing.join(', ')}`);
      }
      console.log('');
    }
    
    return platforms;
  } catch (error) {
    throw new Error(`Erro ao carregar plataformas: ${error.message}`);
  }
}

// Sistema de rastreamento de estado das plataformas
const platformStates = new Map();

// Sistema de rastreamento de estatísticas
const statistics = {
  totalAccounts: 0,        // Total de contas criadas
  successfulAccounts: 0    // Contas com saldo >= 0.40
};

// Função para inicializar estado de uma plataforma
function initPlatformState(casaName) {
  if (!platformStates.has(casaName)) {
    platformStates.set(casaName, {
      lastSuccess: null,        // Timestamp do último sucesso (totalPrize >= 0.40)
      cooldownUntil: null,      // Timestamp até quando está em cooldown
      isInCooldown: false,      // Flag de cooldown
      consecutiveCooldowns: 0,  // Contador de cooldowns consecutivos
      isIgnored: false          // Flag indicando se a plataforma foi ignorada (5 cooldowns seguidos)
    });
  }
  return platformStates.get(casaName);
}

// Função para verificar se plataforma deve entrar em cooldown (5 min sem sucesso)
function checkCooldownTrigger(casaName) {
  const state = platformStates.get(casaName);
  if (!state) return false;
  
  const now = Date.now();
  const COOLDOWN_TRIGGER_TIME = 5 * 60 * 1000; // 5 minutos em milissegundos
  
  // Se nunca teve sucesso, não entrar em cooldown ainda
  if (state.lastSuccess === null) return false;
  
  // Se já está em cooldown, não fazer nada
  if (state.isInCooldown) return false;
  
  // Se passou mais de 5 minutos sem sucesso, entrar em cooldown
  if (now - state.lastSuccess > COOLDOWN_TRIGGER_TIME) {
    const COOLDOWN_DURATION = 15 * 60 * 1000; // 15 minutos em milissegundos
    state.cooldownUntil = now + COOLDOWN_DURATION;
    state.isInCooldown = true;
    
    // Incrementar contador de cooldowns consecutivos
    state.consecutiveCooldowns++;
    
    // Se chegou a 5 cooldowns consecutivos, ignorar a plataforma nesta sessão
    if (state.consecutiveCooldowns >= 5) {
      state.isIgnored = true;
      console.log(`[COOLDOWN] ${casaName} entrou em cooldown por 15 minutos (${state.consecutiveCooldowns}º cooldown consecutivo)`);
      console.log(`[IGNORADA] ${casaName} foi ignorada nesta sessão (5 cooldowns consecutivos)`);
    } else {
      console.log(`[COOLDOWN] ${casaName} entrou em cooldown por 15 minutos (${state.consecutiveCooldowns}º cooldown consecutivo)`);
    }
    
    return true;
  }
  
  return false;
}

// Função para verificar se plataforma pode sair do cooldown
function checkCooldownExpiry(casaName) {
  const state = platformStates.get(casaName);
  if (!state || !state.isInCooldown) return false;
  
  const now = Date.now();
  
  // Se o cooldown expirou, sair do cooldown
  if (state.cooldownUntil && now >= state.cooldownUntil) {
    state.isInCooldown = false;
    state.cooldownUntil = null;
    // Resetar contador de uso quando sair do cooldown para garantir nova chance
    platformUsageCount.set(casaName, 0);
    console.log(`[COOLDOWN] ${casaName} saiu do cooldown`);
    return true;
  }
  
  return false;
}

// Função para atualizar estado após execução
function updatePlatformState(casaName, totalPrize) {
  const state = initPlatformState(casaName);
  const now = Date.now();
  
  // Se teve sucesso (totalPrize >= 0.40), atualizar último sucesso
  if (totalPrize >= 0.40) {
    state.lastSuccess = now;
    // Resetar contador de cooldowns consecutivos ao ter sucesso
    state.consecutiveCooldowns = 0;
    // Se estava em cooldown, sair imediatamente
    if (state.isInCooldown) {
      state.isInCooldown = false;
      state.cooldownUntil = null;
      // Resetar contador de uso quando sair do cooldown para garantir nova chance
      platformUsageCount.set(casaName, 0);
      console.log(`[COOLDOWN] ${casaName} saiu do cooldown (sucesso detectado)`);
    }
    // Se estava ignorada, não remover o flag (só será resetado ao reiniciar o bot)
  }
  
  // Verificar se deve entrar em cooldown
  checkCooldownTrigger(casaName);
  
  // Verificar se pode sair do cooldown
  checkCooldownExpiry(casaName);
}

// Função para obter plataformas ativas (não em cooldown e não ignoradas)
function getActivePlatforms(platforms) {
  return platforms.filter(platform => {
    const state = platformStates.get(platform.casaName);
    if (!state) return true; // Se não tem estado, considerar ativa
    
    // Verificar se pode sair do cooldown
    checkCooldownExpiry(platform.casaName);
    
    // Retornar apenas se não estiver em cooldown e não estiver ignorada
    return !state.isInCooldown && !state.isIgnored;
  });
}

// Variável para rastrear índice round-robin por plataforma
const platformUsageCount = new Map();

// Função para selecionar plataforma para criar conta (com distribuição inteligente)
function selectPlatform(platforms, finalConcurrentAccounts) {
  const activePlatforms = getActivePlatforms(platforms);
  
  // Se não há plataformas ativas, retornar null
  if (activePlatforms.length === 0) {
    return null;
  }
  
  // Inicializar contadores de uso para plataformas que ainda não foram usadas
  activePlatforms.forEach(platform => {
    if (!platformUsageCount.has(platform.casaName)) {
      platformUsageCount.set(platform.casaName, 0);
    }
  });
  
  // Encontrar a plataforma com menor número de usos
  let minUsage = Infinity;
  let selectedPlatform = null;
  
  for (const platform of activePlatforms) {
    const usage = platformUsageCount.get(platform.casaName) || 0;
    if (usage < minUsage) {
      minUsage = usage;
      selectedPlatform = platform;
    }
  }
  
  // Se encontrou uma plataforma, incrementar seu contador
  if (selectedPlatform) {
    const currentUsage = platformUsageCount.get(selectedPlatform.casaName) || 0;
    platformUsageCount.set(selectedPlatform.casaName, currentUsage + 1);
  }
  
  return selectedPlatform;
}

// Função para selecionar casa(s) usando readline
function selectCasa(platforms) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n=== SELECIONE A CASA ===\n');
    console.log('0 - Todas as casas');
    platforms.forEach((platform, index) => {
      console.log(`${index + 1} - ${platform.casaName}`);
    });
    console.log('');
    
    rl.question('Digite o número da opção: ', (answer) => {
      rl.close();
      const choice = parseInt(answer.trim(), 10);
      
      if (isNaN(choice) || choice < 0 || choice > platforms.length) {
        console.log('Opção inválida! Usando todas as casas.\n');
        resolve(null); // null = todas as casas
      } else if (choice === 0) {
        console.log('Todas as casas selecionadas.\n');
        resolve(null); // null = todas as casas
      } else {
        const selectedPlatform = platforms[choice - 1];
        console.log(`Casa selecionada: ${selectedPlatform.casaName}\n`);
        resolve(selectedPlatform.casaName);
      }
    });
  });
}

// Função para perguntar sobre quantidade máxima de contas
function askMaxAccounts() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    console.log('\n=== QUANTIDADE MÁXIMA DE CONTAS ===\n');
    console.log('Deseja definir uma quantidade máxima de contas a serem criadas?');
    console.log('0 - Sem limite (criar infinitamente)');
    console.log('1 - Sim, definir limite\n');
    
    rl.question('Digite o número da opção: ', (answer) => {
      const choice = parseInt(answer.trim(), 10);
      
      if (choice === 1) {
        rl.question('Digite a quantidade máxima de contas: ', (maxAnswer) => {
          rl.close();
          const maxAccounts = parseInt(maxAnswer.trim(), 10);
          
          if (isNaN(maxAccounts) || maxAccounts <= 0) {
            console.log('Valor inválido! Usando sem limite.\n');
            resolve(null); // null = sem limite
          } else {
            console.log(`Quantidade máxima definida: ${maxAccounts} contas\n`);
            resolve(maxAccounts);
          }
        });
      } else {
        rl.close();
        if (choice === 0) {
          console.log('Sem limite de contas definido.\n');
        } else {
          console.log('Opção inválida! Usando sem limite.\n');
        }
        resolve(null); // null = sem limite
      }
    });
  });
}

// Função para executar o bot em loop com paralelismo para múltiplas plataformas
async function runBotLoop(concurrentAccounts = 5) {
  // Carregar todas as plataformas
  console.log('=== CARREGANDO PLATAFORMAS ===\n');
  const allPlatforms = loadPlatforms();
  
  if (allPlatforms.length === 0) {
    throw new Error('Nenhuma plataforma válida encontrada');
  }
  
  // Permitir seleção de casa
  const selectedCasaName = await selectCasa(allPlatforms);
  
  // Perguntar sobre quantidade máxima de contas
  const maxAccounts = await askMaxAccounts();
  
  // Filtrar plataformas baseado na seleção
  let platforms = allPlatforms;
  if (selectedCasaName) {
    platforms = allPlatforms.filter(p => p.casaName === selectedCasaName);
    if (platforms.length === 0) {
      throw new Error(`Plataforma ${selectedCasaName} não encontrada`);
    }
  }
  
  // Inicializar estados de todas as plataformas selecionadas
  platforms.forEach(platform => {
    initPlatformState(platform.casaName);
  });
  
  console.log(`Plataformas carregadas: ${platforms.length}`);
  for (const platform of platforms) {
    console.log(`  - ${platform.casaName}`);
  }
  console.log('');
  
  // Mostrar informações de extração apenas uma vez
  console.log('=== INFORMAÇÕES DAS PLATAFORMAS ===\n');
  for (const platform of platforms) {
    console.log(`[${platform.casaName}]`);
    console.log('  Token:', platform.extractedToken);
    console.log('  URL API:', platform.urlApi);
    console.log('  URL Origin:', platform.urlOrigin);
    console.log('  Domain:', platform.domain);
    console.log('  Sitecode:', platform.sitecode);
    if (platform.appversion) {
      console.log('  Appversion:', platform.appversion);
    }
    if (platform.xVersion) {
      console.log('  X-Version:', platform.xVersion);
    }
    console.log('');
  }
  
  const { pin, convite, ipProxy, contas } = extractEnvInfo();
  
  if (pin) {
    console.log('PIN:', pin);
  }
  if (convite) {
    console.log('CONVITE:', convite);
  }
  
  // Usar o valor passado como parâmetro ou o do .env
  const finalConcurrentAccounts = concurrentAccounts || (contas ? parseInt(contas, 10) || 15 : 15);
  console.log('Contas simultâneas (total):', finalConcurrentAccounts);
  
  // Contar plataformas ativas (não em cooldown e não ignoradas)
  const activePlatformsCount = getActivePlatforms(platforms).length;
  console.log(`Plataformas carregadas: ${platforms.length}`);
  console.log(`Plataformas ativas: ${activePlatformsCount}`);
  if (maxAccounts) {
    console.log(`Quantidade máxima de contas: ${maxAccounts}`);
  } else {
    console.log('Quantidade máxima de contas: Sem limite');
  }
  console.log('\n=== INICIANDO LOOP DE CONTAS ===\n');
  
  // Contador de contas criadas (concluídas) e iniciadas
  let accountsCreated = 0;
  let accountsStarted = 0;
  
  // Loop infinito com processamento contínuo (ou até atingir o limite)
  const activePromises = new Set();
  
  while (true) {
    // Verificar se atingiu o limite máximo de contas
    if (maxAccounts && accountsStarted >= maxAccounts) {
      console.log(`\n[LIMITE] Quantidade máxima de ${maxAccounts} contas atingida!`);
      // Aguardar todas as contas em execução terminarem
      while (activePromises.size > 0) {
        await Promise.race(Array.from(activePromises));
      }
      break;
    }
    
    // Manter sempre o número máximo de contas rodando simultaneamente
    while (activePromises.size < finalConcurrentAccounts) {
      // Verificar se atingiu o limite antes de criar nova conta
      if (maxAccounts && accountsStarted >= maxAccounts) {
        break;
      }
      
      // Selecionar plataforma usando lógica inteligente
      const platform = selectPlatform(platforms, finalConcurrentAccounts);
      
      // Se não há plataformas ativas, aguardar um pouco
      if (!platform) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // Ativar modo debug se contas simultâneas for 1
      const debugMode = finalConcurrentAccounts === 1;
      // Marcar tentativa antes de iniciar para respeitar o limite total
      accountsStarted++;
      const promise = runBot(platform.casaName, platform, debugMode)
        .then((result) => {
          // Incrementar contador de contas criadas
          accountsCreated++;
          
          // Atualizar estado da plataforma baseado no resultado
          if (result && result.totalPrize !== undefined) {
            updatePlatformState(platform.casaName, result.totalPrize);
          } else {
            // Se não teve resultado válido, considerar como falha (totalPrize = 0)
            updatePlatformState(platform.casaName, 0);
          }
          
          // Mostrar progresso se houver limite
          if (maxAccounts) {
            console.log(`[PROGRESSO] Contas criadas: ${accountsCreated}/${maxAccounts}`);
          }
          
          return result;
        })
        .catch((error) => {
          // Incrementar contador mesmo em caso de erro (conta foi tentada)
          accountsCreated++;
          
          // Em caso de erro, considerar como falha (totalPrize = 0)
          console.log(`[ERRO] Falha ao criar conta em ${platform.casaName}: ${error.message}`);
          if (debugMode) {
            console.log(`[DEBUG] Stack:`, error.stack);
          }
          updatePlatformState(platform.casaName, 0);
          
          // Mostrar progresso se houver limite
          if (maxAccounts) {
            console.log(`[PROGRESSO] Contas criadas: ${accountsCreated}/${maxAccounts}`);
          }
          
          // Silenciar erros individuais, apenas continuar
          return null;
        })
        .finally(() => {
          // Remover da lista quando terminar
          activePromises.delete(promise);
        });
      
      activePromises.add(promise);
    }
    
    // Aguardar pelo menos uma conta terminar antes de adicionar mais
    if (activePromises.size > 0) {
      await Promise.race(Array.from(activePromises));
    } else {
      // Pequeno delay apenas se não houver nenhuma conta ativa
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

// Função para mostrar resumo de estatísticas
function showStatisticsSummary() {
  console.log('\n\n=== RESUMO DE ESTATÍSTICAS ===');
  console.log(`Total de contas criadas: ${statistics.totalAccounts}`);
  console.log(`Contas com saldo >= R$0.40: ${statistics.successfulAccounts}`);
  console.log(`Taxa de sucesso: ${statistics.totalAccounts > 0 ? ((statistics.successfulAccounts / statistics.totalAccounts) * 100).toFixed(2) : 0}%`);
  console.log('==============================\n');
}

// Executar bot
if (require.main === module) {
  // Extrair número de contas do .env
  const { contas } = extractEnvInfo();
  const concurrentAccounts = contas ? parseInt(contas, 10) || 15 : 15;
  
  // Handler para Ctrl+C (SIGINT)
  process.on('SIGINT', () => {
    console.log('\n\n[INTERRUPÇÃO] Bot sendo encerrado...');
    showStatisticsSummary();
    process.exit(0);
  });
  
  // Handler para SIGTERM (encerramento gracioso)
  process.on('SIGTERM', () => {
    console.log('\n\n[ENCERRAMENTO] Bot sendo finalizado...');
    showStatisticsSummary();
    process.exit(0);
  });
  
  runBotLoop(concurrentAccounts)
    .catch((error) => {
      console.error('Erro fatal:', error.message);
      showStatisticsSummary();
      process.exit(1);
    });
}

module.exports = { extractRequestInfo, extractEnvInfo, getRandomUserAgent, generateUserData, runBot };
