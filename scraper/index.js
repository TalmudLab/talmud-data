import cheerio from "cheerio";
import tractates from "./tractates.js";
import { get } from "./http.js";
import { mergeMain, mergeTosafot, mergeRashi } from "./match-sefaria.js";
import { writeFile } from "fs/promises";

const uri = (mesechta, daf) => `https://hebrewbooks.org/shas.aspx?mesechta=${mesechta}&daf=${daf}&format=text`;

async function loadPage(tractateIndex, daf) {
  const body = await get(uri(tractateIndex, daf));
  if (body) {
    if (body.includes("Requested Page not found")) {
      throw "Invalid daf";
    } else {
      return body;
    }
  }
}

function incrementDaf (dafString) {
  const bIndex = dafString.indexOf('b');
  const b = bIndex > -1;
  const num = Number(b ? dafString.slice(0, bIndex) : dafString);
  if (b) {
    return String(num + 1);
  }
  return num + 'b';
}

async function* tractatePages(tractateIndex, startDaf = '2') {
  let daf = startDaf;
  let body;
  do {
    try {
      body = await loadPage(tractateIndex, daf);
      if (body) {
        yield {
          tractate: tractates[tractateIndex - 1],
          daf,
          body
        }
      }
      daf = incrementDaf(daf);
    } catch {
      return;
    }
  } while (body);
}

function linesArray(html) {
  let lines = [];
  if (html) {
    lines = html
      .split("\n")
      .map(line => line.trim()).filter(line => line);
  }
  return lines;
}


async function processPage(page) {
  const $ = cheerio.load(page.body);

  const replaceSpans = divSelector => {
    $(divSelector).find("span").replaceWith(function () {
      let inner = $(this).text();
      if ($(this).hasClass("mareimakom")) return inner;
      let newlineStart = false;
      let newlineEnd = false;
      if (inner[0] == '\n') {
        inner = inner.slice(1);
        newlineStart = true;
      }
      if (inner[inner.length - 1] == '\n') {
        inner = inner.slice(0, -1);
        newlineEnd = true;
      }

      return  `${newlineStart ? '\n' : ''}[${inner}]${newlineEnd ? '\n' : ''}`;
    })
    $(divSelector).find("div").replaceWith ( function () {
      return $(this).text();
    })
  }

  [".shastext2", ".shastext3", ".shastext4"].forEach(replaceSpans);
  const mainLines = linesArray($('.shastext2').html());
  const rashiLines = linesArray($(".shastext3").html());
  const tosafotLines = linesArray($(".shastext4").html());
  const main = await mergeMain(page.tractate, page.daf, mainLines);
  let tosafot, rashi;
  if (tosafotLines.length)
    tosafot = await mergeTosafot(page.tractate, page.daf, tosafotLines);
  if (rashiLines.length)
    rashi = await mergeRashi(page.tractate, page.daf, rashiLines);
  const output = {
    main,
    ...rashi && {rashi},
    ...tosafot && {tosafot},
  }
  return output;
}

//the first element in argv is the node executable, the second is the index.js file
const args = process.argv.slice(2);
const tractate = args[0];
const startDaf = args[1];
const validDaf = dafStr => { //TODO: Add check for tractate length
  if (dafStr.length != 2 && dafStr.length != 1)
    return false;
  if (Number.parseInt(dafStr[0]) == NaN)
    return false;
  if (dafStr[1] && dafStr[1] != 'b') {
    return false;
  }
  return true;
}

if (!tractate || !tractates.includes(tractate)) {
  console.error("Must pass valid tractate as first argument");
} else if (startDaf && !validDaf(startDaf)) {
  console.error ("Second argument must be valid daf, e.g., 4 or 8b")
} else {
  (async () => {
    for await (const page of tractatePages(tractates.indexOf(tractate) + 1, startDaf || '2')) {
      console.log(page.tractate, page.daf);
      const output = await processPage(page);
      output.dateProcessed = Date.now();
      await writeFile(`../output/${page.tractate}-${page.daf}.json`, JSON.stringify(output));
    }
  })();
}