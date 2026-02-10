// cryptBot.js
// npm i crypto-js
const CryptoJS = require("crypto-js");
const readline = require("readline");

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
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Interface de leitura do terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log("\n=== BOT DE CRIPTOGRAFIA ===\n");

  // Pergunta se quer criptografar ou descriptografar
  let operation;
  while (true) {
    const answer = await question("Deseja criptografar ou descriptografar? (c/d): ");
    const op = answer.trim().toLowerCase();
    if (op === "c" || op === "criptografar") {
      operation = "encrypt";
      break;
    } else if (op === "d" || op === "descriptografar") {
      operation = "decrypt";
      break;
    } else {
      console.log("Por favor, digite 'c' para criptografar ou 'd' para descriptografar.");
    }
  }

  // Pede o token
  const token = await question("\nDigite o token: ");
  if (!token.trim()) {
    console.error("Token não pode estar vazio!");
    rl.close();
    process.exit(1);
  }

  // Pede a mensagem
  const messagePrompt =
    operation === "encrypt"
      ? "\nDigite a mensagem/JSON para criptografar: "
      : "\nDigite o texto criptografado (Base64) para descriptografar: ";
  const message = await question(messagePrompt);

  if (!message.trim()) {
    console.error("Mensagem não pode estar vazia!");
    rl.close();
    process.exit(1);
  }

  const key = key_doubleToken(token.trim());

  console.log("\n=== PROCESSANDO ===\n");
  console.log("Token:", token.trim());
  console.log("Key:", key);

  if (operation === "encrypt") {
    // Criptografa
    let payload = message.trim();
    
    // Tenta parsear como JSON para manter minificado
    try {
      const json = JSON.parse(payload);
      payload = JSON.stringify(json);
    } catch {
      // Se não for JSON válido, usa como está
      console.log("Aviso: Mensagem não é um JSON válido, será criptografada como texto.");
    }

    const encrypted = encrypt(payload, key);

    console.log("\n=== RESULTADO (CRIPTOGRAFADO) ===");
    console.log(encrypted);
    console.log("\nTexto copiado acima ↑");
  } else {
    // Descriptografa
    const decrypted = decrypt(message.trim(), key);
    const json = tryParseJson(decrypted);

    console.log("\n=== RESULTADO (DESCRIPTOGRAFADO) ===");
    if (json) {
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log(decrypted);
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error("Erro:", err);
  rl.close();
  process.exit(1);
});
