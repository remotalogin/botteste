require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');  // Para gerar QR Code como imagem
const qrcodeTerminal = require('terminal-qrcode');  // Alternativa para gerar QR Code no terminal
const fs = require('fs');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,  // Desativado, pois estamos gerando QR com outra biblioteca
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão fechada. Reconectando:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot conectado!');
    }
  });

  sock.ev.on('qr', (qr) => {
    // Gerar QR Code como imagem
    qrcode.toFile('qr.png', qr, {
      width: 150,  // Ajuste o tamanho da imagem aqui
      margin: 1,   // Ajuste a margem aqui
      color: {
        dark: '#000000',  // Cor do QR Code
        light: '#ffffff'  // Cor do fundo
      }
    }, (err) => {
      if (err) throw err;
      console.log('QR Code gerado como imagem: qr.png');
    });

    // Alternativamente, gerar o QR Code no terminal
    qrcodeTerminal.generate(qr, { small: true, margin: 1 });
    console.log('Escaneie o QR Code!');
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const message =
      msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (message?.toLowerCase() === 'oi') {
      const botName = process.env.BOT_NAME || 'Bot';
      const resposta =
        process.env.RESP_OLA?.replace('$BOT_NAME', botName) ||
        `Olá! 👋 Eu sou o ${botName}.`;
      await sock.sendMessage(sender, { text: resposta });
    }
  });
}

startBot();
