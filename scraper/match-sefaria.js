import {get as httpGet} from "./http.js"
import * as Diff from "diff"
import exceptions from "../exceptions/index.js";
import colors from "colors";

const textURI = (tractate, daf, type) => {
  if (!daf.includes("b")) daf += "a";
  switch (type) {
    case "main":
      return 'https://www.sefaria.org/api/texts/' + tractate + '.' + daf + '?vhe=Wikisource_Talmud_Bavli';
    case "rashi":
      return 'https://www.sefaria.org/api/texts/Rashi_on_' + tractate + '.' + daf + '.1-100' + '?';
    case "tosafot":
      return 'https://www.sefaria.org/api/texts/Tosafot_on_' + tractate + '.' + daf + '.1-100' + '?';
  }
}

async function getText(tractate, daf, type) {
  const body = await httpGet(textURI(tractate, daf, type));
  if (body) {
    const obj = JSON.parse(body);
    return {
      english: obj.text,
      hebrew: obj.he.filter(arr => arr.length).flat().filter(str => str.length),
    }
  }
}

const lineSep = '<br>';
const sentenceSep = '|';
const processHebrew = string => string
  .replace(/<[^>]*>/g, "")
  .replaceAll("–", "")
  .replaceAll("׳", "'")

// .replace(/\([^\(\)]+\)/g, '')––

function diffsToString(diffs) {
  let merged = "";
  diffs.forEach((part) => {
    if (part.removed) {
      if (part.value.includes(sentenceSep))
        merged += sentenceSep
      else {
        if (part.value.trim())
          process.stdout.write(`Removed ${part.value} from Sefaria\n`.blue)
      }
    } else if (part.added) {
      let add = "";
      if (part.value.includes("]"))
        add += "] ";
      if (part.value.includes(lineSep))
        add += lineSep;
      if (part.value.includes("["))
        add += "[";
      merged += add;
      if (!add && part.value.trim()) {
        process.stdout.write(`Removed ${part.value} from Hebrew Books\n`.red)
      }
    } else {
      merged += part.value;
    }
  });
  return merged;
}

function mergeCommentary(sefariaLines, hbLines) {
  const hbString = hbLines.join(lineSep)
    .replace(/\]\[/g, "")
    .replace(/\]\s+\[/g, " ")
    .replaceAll("[ ", " [")
    .replaceAll(" ]", "] ")
    .replaceAll(" :", ":")
  let hbIndex = 0;
  const merged = [];
  sefariaLines.forEach((line, index) => {
      process.stdout.write(`Comment #${index + 1} `.green);
      const split = line.split(/[-–—]/g).map(str => str.trim());
      let justOne = false;
      if (split.length != 2) {
        if (split.length == 1) {
          justOne = true;
          if (split[0].includes('ה"ג')) {
            process.stdout.write(`Hachi Garsinan case\n`.red);
          } else {
            process.stdout.write(`No header\n`.red);
          }
        } else {
          process.stdout.write(`Expected one dash to delineate comment header; found ${split.length - 1}.
          Ignoring the last ${split.length - 2}\n`.red);
          const removed = split.splice(2);
          split[split.length - 1] += removed.join(' ');
        }
      } else {
        split[0] += ".";
      }
      const currMerged = [];
      split.forEach((substring, index) => {
        process.stdout.write(["Header ", "Comment "][index])
        let headerLength = substring.length;
        if (hbIndex != 0) {
          // there's either a space or a line break between each block
          if (hbString[hbIndex] == " ") {
            hbIndex++;
          } else if (hbString.substr(hbIndex, lineSep.length) == lineSep) {
            headerLength += lineSep.length;
          } else {
            throw new Error("Unexpected comment divisor")
          }
        }
        if (index == 0) {
          headerLength += 2; //account for starting and ending brackets
          //Sefaria never has the "gemara" label at their first comment on the gemara, so account for that
          const gemaraLabel = "[גמ' "
          if (hbString.substr(hbIndex, gemaraLabel.length) == gemaraLabel)
            headerLength += gemaraLabel.length;
        }
        let hbSubstring = hbString.slice(hbIndex, hbIndex + headerLength);
        /* So far, we've done our best job to grab the HebrewBooks substring that
         * corresponds to Sefaria section. But we haven't accounted for the fact that
         * the HebrewBooks string is filled with line separators, so when we
         * grab what we _think_ is the right length of text, we actually have to grab
         * a bunch more, moving the end of the selection forward according to the
         * number of line separators. And when we do move that selection forward,
         * if more line separators are revealed we have to move it again.
         */
        let lineSepCount = 0;
        let count = (hbSubstring.match(new RegExp(lineSep, 'g')) || []).length;
        while (count != lineSepCount) {
          headerLength += (count - lineSepCount) * (lineSep.length - 1);
          hbSubstring = hbString.slice(hbIndex, hbIndex + headerLength)
          if (hbIndex + headerLength >= hbString.length) {
            headerLength = hbString.length - hbIndex;
            break;
          }
          lineSepCount = count;
          count = (hbSubstring.match(new RegExp(lineSep, 'g')) || []).length;
        }
        let lastChar = hbSubstring[hbSubstring.length - 1];
        const desiredLastChar = (justOne || index == 1) ? ':' : ']';
        const negativeLookAhead = "(?!\\))"
        if (lastChar != desiredLastChar) {
          const regex = new RegExp(desiredLastChar + negativeLookAhead, "g")
          const index = hbSubstring.search(regex);
          if (index != -1) {
            const adjust = (hbSubstring.length - 1 - index)
            if (adjust > 100) {
              throw new Error("Needing to move too far back");
            }
            headerLength -= adjust;
            process.stdout.write("moved back " + adjust);
            hbSubstring = hbString.slice(hbIndex, hbIndex + headerLength);
            lastChar = hbSubstring[hbSubstring.length - 1];
          } else {
            //Try and move forward
            const remaining = hbString.slice(hbIndex + headerLength);
            const adjust = 1 + remaining.search(regex);
            if (adjust > 20) {
              throw new Error("Needing to move too far forward")
            }
            if (!adjust) {
              throw new Error(`Desired last char ${desiredLastChar} not found in string`);
            }
            headerLength += adjust;
            process.stdout.write("moved forward " + adjust);
            hbSubstring = hbString.slice(hbIndex, hbIndex + headerLength);
            lastChar = hbSubstring[hbSubstring.length - 1];
          }
        } else {
          process.stdout.write("looking good!")
        }
        if (justOne || index == 1) {
          console.log();
          if (lastChar != ":")
            throw new Error(`Comment ended in '${lastChar}' rather than ':'`)
        } else if (index == 0) {
          process.stdout.write(" ")
          if (lastChar != "]")
            throw new Error(`Header ended in '${lastChar}' rather than '['`)
        }
        const headerDiff = Diff.diffChars(substring, hbSubstring);
        const changes = headerDiff.filter(diff => diff.added || diff.removed)
        // const unexpectedChange = changes.find(change => change.value.length > Math.max(lineSep.length, sentenceSep.length));
        // if (unexpectedChange) {
        //   if (unexpectedChange.removed) {
        //     console.warn(`Removed ${unexpectedChange.value} from Sefaria`);
        //   } else {
        //     console.warn(`Removed ${unexpectedChange.value} from Hebrew Books`)
        //   }
        // }
        const merged = diffsToString(Diff.diffChars(substring, hbSubstring));
        currMerged.push(merged);
        hbIndex += headerLength;

      })
      merged.push(currMerged);
    }
  )
  return merged;
}

function merge(sefariaLines, hbLines) {

  const sefariaString = processHebrew(sefariaLines.join(sentenceSep));
  const diffs = Diff.diffChars(sefariaString, hbLines.join(lineSep));
  let merged = diffsToString(diffs);

  const issues = verifyMerged(merged, sefariaLines.map(processHebrew), hbLines);
  return {
    merged,
    issues
  };
}

function compareTextArrays(splitArr, originalArr) {
  const diffs = [];
  if (splitArr.length !== originalArr.length) {
    throw new Error("To compare two arrays, they must be the same size.");
  }
  for (let i = 0; i < splitArr.length; i++) {
    const currSplit = splitArr[i].trim().replaceAll('  ', ' ');
    const currOriginal = originalArr[i].trim().replaceAll('  ', ' ');
    if (currSplit != currOriginal) {
      diffs.push(i);
      console.log(i + ":");
      console.log("Us      ", currSplit);
      console.log("Original", currOriginal);
      console.log();
    }
  }
  return diffs;
}

function verifyMerged(merged, sefariaArray, hbArray) {
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

function checkForException(tractate, daf, text, sefariaLines, hbLines) {
  const exceptionObj = exceptions[tractate.toLowerCase()];
  if (exceptionObj?.[daf]?.[text]) {
    const {sefaria, hb} = exceptionObj[daf][text](sefariaLines, hbLines);
    return {sefaria, hb};
  }
  return {sefaria: sefariaLines, hb: hbLines};
}

async function mergeText(tractate, daf, text, hbLines) {
  const {hebrew} = await getText(tractate, daf, text);
  const {sefaria, hb} = checkForException(tractate, daf, text, hebrew, hbLines)
  return text == "main" ? merge(sefaria, hb) : mergeCommentary(sefaria, hb);
}

//Leave these as three separate functions for now
async function mergeMain(tractate, daf, mainLines) {
  console.log(tractate, daf, "Main");
  return await mergeText(tractate, daf, "main", mainLines)
}

async function mergeRashi(tractate, daf, rashiLines) {
  console.log(tractate, daf, "Rashi");
  return await mergeText(tractate, daf, "rashi", rashiLines)
}

async function mergeTosafot(tractate, daf, tosafotLines) {
  console.log(tractate, daf, "Tosafot");
  return await mergeText(tractate, daf, "tosafot", tosafotLines)
}

export {mergeMain, mergeRashi, mergeTosafot}
