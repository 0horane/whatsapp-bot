import { connectToWA } from "./connection";
import { parselatex } from "./latex"
import { writeFile, open ,mkdir, rmdir} from 'fs/promises'
import { unlink } from 'fs'
import makeWASocket, { downloadMediaMessage } from "@whiskeysockets/baileys";
import {Mutex, Semaphore, withTimeout} from 'async-mutex';
import Sharp from 'sharp'
import {exec} from 'shelljs'
//doing the socket error things and restarts with mutextes would have been nice, but errors are the way to go i think here
 
const unsupportedCommands = ['\\usepackage', '\\input', '\\include', '\\write18', '\\immediate', '\\verbatiminput'];
const tempDir = "./cache/tex";

export default async ()=>{
  let socket = await connectToWA();
  console.log("connected");
  //for every received message
  socket.ev.on('messages.upsert', async (message)=> {
        for (const messageInQuestion of message.messages){
        console.log(`message received from ${messageInQuestion.pushName} at at time ${messageInQuestion.messageTimestamp} \n. `);
        let text = messageInQuestion.message?.conversation ?? "";
        if (text == ""){
          text = messageInQuestion.message?.extendedTextMessage?.text ?? ""
        }
        const id = messageInQuestion.key.id ?? generateID();
        if (text.indexOf("\\(") >= 0 && text.indexOf("\\)") >=0){
          
          try {
            
          
          let outText = parselatex(text);
          console.log(outText);
          await mkdir(`${tempDir}/${id}`);
          await writeFile(`${tempDir}/${id}/equation.tex`, getLatexTemplate(outText));
          await execAsync(getDockerCommand(id, 3.0));

          const inputSvgFileName = `${tempDir}/${id}/equation.svg`;
          const outputFileName = `${tempDir}/img/img-${id}.png`;

          await Sharp(inputSvgFileName, { density: 96 })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .toFile(outputFileName); // Sharp's PNG type is implicitly determined via the output file extension

          await socket.sendMessage(messageInQuestion.key.remoteJid!, 
            { image: {url: `${tempDir}/img/img-${id}.png`}  },
            //{ text: "Mensaje con TeX detectado: "+ outText}, 
            { quoted: messageInQuestion });
          } catch (error) {
              console.log("failed to generate");
          }
          await cleanupTempFilesAsync(id);
          
          
        }//else{console.log("nothing found in "+text);console.log(JSON.stringify(messageInQuestion))}
          
        
    }
    
    //await socket.sendMessage(message.messages[0].key.remoteJid!, { text: 'Hello there!' })

  });


}; 



// Get the LaTeX document template for the requested equation
function getLatexTemplate(equation:string):string {
  return `
    \\documentclass[12pt]{article}
    \\usepackage{amsmath}
    \\usepackage{amssymb}
    \\usepackage{amsfonts}
    \\usepackage{xcolor}
    \\usepackage[utf8]{inputenc}

    \\usepackage{amscd}
    \\usepackage{centernot}
    \\usepackage{color}
    \\usepackage{colortbl}
    \\usepackage{empheq}
    \\usepackage{mathtools}
    \\usepackage{textcomp}
    \\usepackage{unicode}

    \\thispagestyle{empty}
    \\begin{document}
    ${equation}
    \\end{document}`;
}

// Get the final command responsible for launching the Docker container and generating a svg file
function getDockerCommand(id:string, output_scale:number):string {
  // Commands to run within the container
  const containerCmds = `
    # Prevent LaTeX from reading/writing files in parent directories
    echo 'openout_any = p\nopenin_any = p' > /tmp/texmf.cnf
    export TEXMFCNF='/tmp:'

    # Compile .tex file to .dvi file. Timeout kills it after 5 seconds if held up
    timeout 5 latex -no-shell-escape -interaction=nonstopmode -halt-on-error equation.tex

    # Convert .dvi to .svg file. Timeout kills it after 5 seconds if held up
    timeout 5 dvisvgm --no-fonts --scale=${output_scale} --exact equation.dvi`;

  // Start the container in the appropriate directory and run commands within it.
  // Files in this directory will be accessible under /data within the container.
  return `
    cd ${tempDir}/${id}
    /bin/bash -c "${containerCmds}"`;
}

// Deletes temporary files created during a conversion request
function cleanupTempFilesAsync(id:string) {
  return rmdir(`${tempDir}/${id}`, { recursive: true });
}

// Execute a shell command
function execAsync(cmd:string, opts = {}) {
  return new Promise((resolve, reject) => {
exec(cmd, opts, (code:number, stdout, stderr) => {
      if (code != 0) reject(new Error(stderr));
      else resolve(stdout);
    });
  });
}

function generateID():string {
  // Generate a random 16-char hexadecimal ID
  let output = '';
  for (let i = 0; i < 16; i++) {
    output += '0123456789abcdef'.charAt(Math.floor(Math.random() * 16));
  }
  return output;
}
