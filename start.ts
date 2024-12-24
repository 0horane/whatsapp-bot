import bot from './bot';
import {existsSync, mkdirSync} from 'fs';

/*if (!existsSync("cache/audiofiles")){
  mkdirSync("cache/audiofiles");
}*/

let cont=true;
function bbot(){
  console.log("running")
  
  try {
    bot().catch(x=>{
      bbot()
    });
  } 
  catch(err)
  {
    bbot()
  }
}
bbot();
