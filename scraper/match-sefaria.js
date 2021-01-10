import { get as httpGet } from "./http.js"
import * as Diff from "diff"

async function getMain(tractate, daf) {
  const mainURI = 'https://www.sefaria.org/api/texts/' + tractate + '.' + daf + '?vhe=Wikisource_Talmud_Bavli';
  // rashiURI = 'https://www.sefaria.org/api/texts/Rashi_on_' + tractate + '.' + daf + '.1-100' + '?',
  // tosafotURI = 'https://www.sefaria.org/api/texts/Tosafot_on_' + tractate + '.' + daf + '.1-100' + '?';
  const body = await httpGet(mainURI);
  if (body) {
    const obj = JSON.parse(body);
    return {
      english: obj.text,
      hebrew: obj.he
    }
  };
}

const lineSep = '<br>';
const sentenceSep = '|';

async function mergeMain(tractate, daf, mainLines) {
  const {hebrew} = await getMain(tractate, daf);
  // console.log(hebrew);
  console.log(mainLines);
  const diff = Diff.diffChars(hebrew.join(sentenceSep), mainLines.join(lineSep));
  let merged = "";
  diff.forEach((part) => {
    if (part.removed) {
      if (part.value.includes(sentenceSep))
        merged += sentenceSep;
    } else if (part.added) {
      if (part.value.includes(lineSep))
        merged += lineSep;
    } else {
      merged += part.value;
    }
  });
  console.log(merged);
  return merged;
}
export { mergeMain }
