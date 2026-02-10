/**
 * =========================
 * CRIPTOGRAFIA DE SAQUE
 * =========================
 * Arquivo responsável pela criptografia das requisições de saque:
 * - verifyWithdrawPass
 * - modifyWithdrawPass
 * - verifyWithdrawalPasswordV2
 * - bindalipayV3
 * - receiveOne
 */

const CryptoJS = require('crypto-js');

// =========================
// CONFIGURAÇÃO
// =========================
const IV = CryptoJS.enc.Utf8.parse("5421698523412578");

// =========================
// FUNÇÕES AUXILIARES
// =========================

/**
 * Gera hash MD5 de uma string
 * @param {string} s - String para gerar hash
 * @returns {string} Hash MD5 em hexadecimal
 */
function md5(s) {
    return CryptoJS.MD5(s).toString();
}

// =========================
// GERAÇÃO DE CHAVE AES PARA PIN
// =========================

/**
 * Gera a chave AES usando session_key + userId (para criptografia de saque)
 * 
 * Algoritmo:
 * 1. Converte userId para string
 * 2. Concatena: sessionKey + userId
 * 3. Gera MD5 da concatenação
 * 4. Retorna os primeiros 16 caracteres do hash
 * 
 * @param {string} sessionKey - Session key obtida do login
 * @param {number|string} userId - User ID obtido do register
 * @returns {string} Chave AES de 16 caracteres
 */
function generateAESKeyForPIN(sessionKey, userId) {
    const accountIdStr = String(userId);
    const concatenated = sessionKey + accountIdStr;
    const hash = md5(concatenated);
    return hash.slice(0, 16); // Primeiros 16 caracteres
}

// =========================
// CRIPTOGRAFIA PIN
// =========================

/**
 * Criptografa texto usando AES CBC + ZeroPadding para requisições de saque
 * 
 * Parâmetros de criptografia:
 * - Algoritmo: AES
 * - Modo: CBC (Cipher Block Chaining)
 * - Padding: ZeroPadding
 * - IV: "5421698523412578" (fixo)
 * - Formato de saída: Base64 do ciphertext
 * 
 * @param {string} plainText - Texto plano (geralmente JSON stringificado)
 * @param {string} keyStr - Chave AES de 16 caracteres (gerada por generateAESKeyForPIN)
 * @returns {object} Objeto com { encryptString: "..." } contendo o Base64 criptografado
 * 
 * @example
 * const payload = { withdraw_pass: "111112", time: 1769141069 };
 * const payloadJson = JSON.stringify(payload);
 * const aesKey = generateAESKeyForPIN(sessionKey, userId);
 * const encrypted = encryptPIN(payloadJson, aesKey);
 * // encrypted = { encryptString: "aBc123..." }
 */
function encryptPIN(plainText, keyStr) {
    // Parse da chave para formato UTF-8
    const key = CryptoJS.enc.Utf8.parse(keyStr);
    
    // Criptografa usando AES CBC + ZeroPadding
    const encrypted = CryptoJS.AES.encrypt(
        CryptoJS.enc.Utf8.parse(plainText),
        key,
        {
            iv: IV,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.ZeroPadding,
        }
    );
    
    // Retorna no formato { encryptString: "..." } como no EncryptWithdrawPass.js
    const encryptedString = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
    return {
        encryptString: encryptedString
    };
}

// =========================
// DESCRIPTOGRAFIA PIN
// =========================

/**
 * Descriptografa texto criptografado com AES CBC + ZeroPadding
 * 
 * @param {string} ciphertextBase64 - Texto criptografado em Base64
 * @param {string} keyStr - Chave AES de 16 caracteres
 * @returns {string} Texto descriptografado
 */
function decryptPIN(ciphertextBase64, keyStr) {
    const key = CryptoJS.enc.Utf8.parse(keyStr);
    const decrypted = CryptoJS.AES.decrypt(ciphertextBase64, key, {
        iv: IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.ZeroPadding,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

// =========================
// EXPORT
// =========================
module.exports = {
    generateAESKeyForPIN,
    encryptPIN,
    decryptPIN,
    md5,
    IV
};

// =========================
// EXEMPLO DE USO
// =========================
if (require.main === module) {
    console.log("🔐 Teste de Criptografia de Saque\n");
    
    // Dados de exemplo
    const sessionKey = "abc123-session-key-example";
    const userId = 123456;
    
    // Gerar chave AES
    const aesKey = generateAESKeyForPIN(sessionKey, userId);
    console.log("Chave AES gerada:", aesKey);
    console.log("Tamanho da chave:", aesKey.length, "caracteres\n");
    
    // Payload de exemplo (verifyWithdrawPass)
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
        withdraw_pass: "111112",
        time: timestamp.toString()
    };
    const payloadJson = JSON.stringify(payload);
    console.log("Payload original:", payloadJson);
    
    // Criptografar
    const encrypted = encryptPIN(payloadJson, aesKey);
    console.log("Payload criptografado:", encrypted.encryptString);
    console.log("Tamanho do criptografado:", encrypted.encryptString.length, "caracteres\n");
    
    // Descriptografar (para verificação)
    const decrypted = decryptPIN(encrypted.encryptString, aesKey);
    console.log("Payload descriptografado:", decrypted);
    console.log("Match:", payloadJson === decrypted ? "✅" : "❌");
}
