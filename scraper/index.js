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
  console.log(mainLines.length, rashiLines.length, tosafotLines.length);
  // const main = await mergeMain(page.tractate, page.daf, mainLines);
  let tosafot, rashi;
  // if (tosafotLines.length)
  //   tosafot = await mergeTosafot(page.tractate, page.daf, tosafotLines);
  if (rashiLines.length)
    rashi = await mergeRashi(page.tractate, page.daf, rashiLines);
  const output = {
    main,
    ...rashi && {rashi},
    ...tosafot && {tosafot},
  }
  return output;
}

tractatePages(1, '2').next().then(page => processPage(page.value));
// (async () => {
//   for await (const page of tractatePages(1, '2')) {
//     console.log(page.tractate, page.daf);
//     const output = await processPage(page);
//     output.dateProcessed = Date.now();
//     await writeFile(`../output/${page.tractate}-${page.daf}.json`, JSON.stringify(output));
//   }
// })();
//
