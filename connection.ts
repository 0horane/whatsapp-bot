import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import {Boom} from '@hapi/boom'
import path from "path";

export const connectToWA = async ()=>{
  const { state, saveCreds } = await useMultiFileAuthState('cache/auth_info_baileys')    
  const socket = makeWASocket({
    printQRInTerminal:true,
    auth:state,
//    browser: Browsers.macOS('Desktop')
    //version:[2,2417,79]
    version: (await fetchLatestBaileysVersion()).version
  });

  socket.ev.on ('creds.update', saveCreds);
  await socket.waitForConnectionUpdate(({ connection }) => connection === "open" );
  
  socket.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    console.log("conn "+JSON.stringify(connection));
    if(connection === 'close') {
        const disconnectReason= (lastDisconnect?.error as Boom)?.output?.statusCode;
        console.log('connection closed due to ', lastDisconnect?.error);
        // reconnect if not logged out
        if(disconnectReason !== DisconnectReason.loggedOut) {
          console.log('connection closed due to ', disconnectReason);
          console.log('reconnecting ');  
          setTimeout(async ()=>{
              await connectToWA();
          },4000);
          
        }
    } else if(connection === 'open') {
        console.log('opened connection');
    }
  })

  return socket;
};  