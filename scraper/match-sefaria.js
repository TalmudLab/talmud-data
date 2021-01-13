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
  console.log(tractate, daf);
  const {hebrew} = await getMain(tractate, daf);
  const processHebrew = string => string
    .replace(/<[^>]*>/g, "")
    .replace(/\([^\(\)]+\)/g, '')
    .replaceAll("׳", "'")
  const hebrewString = processHebrew(hebrew.join(sentenceSep));
  const diff = Diff.diffChars(hebrewString, mainLines.join(lineSep));
  let merged = "";
  diff.forEach((part) => {
    if (part.removed) {
      if (part.value.includes(sentenceSep))
        merged += sentenceSep;
    } else if (part.added) {
      if (part.value.includes ("]"))
        merged += "] ";
      if (part.value.includes(lineSep))
        merged += lineSep;
      if (part.value.includes("["))
        merged += "[";
    } else {
      merged += part.value;
    }
  });
  const issues = verifyMerged(merged, hebrew.map(processHebrew), mainLines);
  return {
    merged,
    issues
  };
}


function compareTextArrays (splitArr, originalArr) {
  const diffs = [];
  if (splitArr.length !== originalArr.length) {
    throw new Error("To compare two arrays, they must be the same size.");
  }
  for (let i = 0; i < splitArr.length; i++) {
    const currSplit = splitArr[i].trim().replaceAll('  ', ' ');
    const currOriginal = originalArr[i].trim().replaceAll('  ', ' ');
    if (currSplit != currOriginal) {
      diffs.push(i);
      console.log(i+":");
      console.log("Us      ", currSplit);
      console.log("Original", currOriginal);
      console.log();
    }
  }
  return diffs;
}

function verifyMerged (merged, sefariaArray, hbArray) {
  const splitBySentence = merged.replaceAll(lineSep, ' ').split(sentenceSep);
  const splitByLine = merged.replaceAll(sentenceSep, ' ').split(lineSep);

  console.log("SENTENCES")
  const sefariaDiffs = compareTextArrays(splitBySentence, sefariaArray);
  console.log("LINES");
  const hbDiffs = compareTextArrays(splitByLine, hbArray);
  return {
    sefaria: sefariaDiffs,
    hb: hbDiffs
  }
}
export { mergeMain }
