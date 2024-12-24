          //surely theres a better way with an index. oh well. 
export const parselatex = (text:string):string => {
  let outText="";
  let mathmode = false;
  while (text !== ""){
    if (text.indexOf("\\(") == 0 ){
      if (mathmode){
        outText += "\\(";
        text = text.substring(2);  
      } else {
        mathmode = true;
        outText += "$";
        text = text.substring(2);
      }
    } else if (text.indexOf("\\)") == 0) {
      if (!mathmode){
        outText += "\\)";
        text = text.substring(2);  
      } else {
        mathmode = false;
        outText += "$";
        text = text.substring(2);
      }
    } else if (text.indexOf("\\(") == -1 && text.indexOf("\\)") == -1) {
      if (mathmode){
        outText += fixmathmodechars(text);
        outText+="$";
      }else {
        outText += text;
      }
      text = "";
    } else {
      let minseparator = Math.min(...[text.indexOf("\\("),text.indexOf("\\)")].filter(x=>x>=0))
      if (mathmode){
        outText += fixmathmodechars(text.substring(0,minseparator));
      } else {
        outText += text.substring(0,minseparator);
      }
      text = text.substring(minseparator)
    }
  }
  return outText;
}

function fixmathmodechars(s:string):string{
  const chars = {
    "ñ":"{\\tilde n}",
    "Ñ":"{\\tilde N}",
    "á":"{\\acute a}",
    "Á":"{\\acute A}",
    "é":"{\\acute e}",
    "É":"{\\acute E}",
    "í":"{\\acute i}",
    "Í":"{\\acute I}",
    "ó":"{\\acute o}",
    "Ó":"{\\acute O}",
    "ú":"{\\acute u}",
    "Ú":"{\\acute U}",
  }
  Object.entries(chars).forEach(x=>{s=s.replaceAll(x[0],x[1])});
  return s;

}