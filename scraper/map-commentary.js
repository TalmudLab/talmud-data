import {get as httpGet} from "./http.js";
import { stringSimilarity} from "string-similarity-js";
import fs from "fs";
const readdir = fs.promises.readdir;
const readFile = fs.promises.readFile;
const writeFile = fs.promises.writeFile;

function mapKey(tractate, daf, amud, sentence, index) {
  return `${tractate}.${daf}${amud}.${sentence}.${index}`;
}

function registerAmuds(tractate, daf, amuds, map) {
  amuds.forEach( (list, amudIndex) =>
    list.forEach( (sentenceGroup, sentenceIndex) =>
      sentenceGroup.forEach( (comment, commentIndex) => {
        const amud = amudIndex ? "b" : "a";
        const key = mapKey(tractate, daf, amud, sentenceIndex + 1, commentIndex + 1)
        map[key] = comment;
      })
    )
  );
}

async function loadCommentaries() {
  const tractate = "Berakhot";
  const sefariaTosafot = {}
  for (let daf = 2; daf <= 64; daf++) {
    const uri = `https://www.sefaria.org/api/texts/Tosafot_on_Berakhot.${daf}a:1-${daf}b:100`;
    const body = JSON.parse(await httpGet(uri));
    const amuds = body.he;
    if (!amuds.length || amuds.length != 2) {
      continue;
    }
    console.log(body.he);
    registerAmuds(tractate, daf, amuds, sefariaTosafot);
  }
  await writeFile(`../output/${tractate}-tosafot.json`, JSON.stringify(sefariaTosafot));
  console.log("done");
}

(async () => mapJsonToExisting())();

function getClosestCandidate(compareTo, candidates, split = true) {
  if (!candidates.length) return false;
  const different = candidates.map( ([ref, text]) => {
    let compareBody;
    if (split) {
      const split = text.split(/[–-]/g);
      compareBody = (split.length > 1) ? split.slice(1).join("") : text;
    } else {
      compareBody = text.replaceAll(/ [–-]/g, ".").replaceAll(/\([^()]*\)/g, "");
    }
    const diffed = stringSimilarity(compareTo, compareBody);
    return {
      ref,
      score: diffed
    }
  }).sort( (a,b) => b.score - a.score);
  const closest = different[0];
  console.log(closest.score, different[1]?.score);
  if (closest.score < 0.8) {
    if (compareTo.length <= 20 && closest.score > 0.5) {
      return closest;
    }
    debugger;
    return false;
  }
  return closest;
}

async function mapRashi() {
  const dirPath = "../output/"
  const filenames = (await readdir(dirPath)).sort( (a, b) => parseInt(a.split("-")[1]) - parseInt(b.split("-")[1]));
  const tractate = "Berakhot"
  const rashiEntries = Object.entries(JSON.parse(await readFile(dirPath + tractate + "-rashi.json")));
  const entriesForDaf = (daf) => {
    const dafstr = `${tractate}.${daf}`;
    return rashiEntries.filter( ([ref, text]) =>
      ref.includes(dafstr + 'a') || ref.includes(dafstr + 'b'));
  }
  const rashiMap = {};
  for (const filename of filenames) {
    if (!filename.includes(tractate)) continue;
    const content = JSON.parse(await readFile(dirPath + filename));
    if (!content.rashi) continue;
    const headerRegex = /(\{[^\{\}]+\})+/g
    const rashiSplit = content.rashi
      .split(headerRegex)
      .filter(t => t.trim())
    let rashis = []
    let nextRashi = ""
    rashiSplit.forEach(str => {
     if (str.includes("{") || str.includes("}")) {
       nextRashi += str.replaceAll("{", "").replaceAll("}", "")
     } else {
       nextRashi += str;
       rashis.push(nextRashi);
       nextRashi = "";
     }
    })
    rashis = rashis.map (rashi => rashi.replaceAll("<br>", " ").replaceAll(/\([^()]*\)/g, ""));
    console.log(filename);
    const filenameSplit = filename.split('-');
    const daf = parseInt(filenameSplit[1]);
    rashiMap[filename] = [];
    rashis.forEach( (rashi, index) => {
      let closest;
      let candidates = entriesForDaf(daf);
      closest = getClosestCandidate(rashi, candidates, false)
      if (!closest) {
        candidates = entriesForDaf(daf + 1);
        closest = getClosestCandidate(rashi, candidates, false)
        if (!closest) {
          candidates = entriesForDaf(daf - 1);
          closest = getClosestCandidate(rashi, candidates, false)
        }
      }
      if (closest) {
        rashiMap[filename].push(closest.ref);
        const index = rashiEntries.findIndex (([ref, text]) => ref == closest.ref);
        rashiEntries.splice(index, 1);
      } else {
        rashiMap[filename].push(false);
      }
    })
    await writeFile(`../output/${tractate}-rashiMap.json`, JSON.stringify(rashiMap));
  }
  await writeFile(`../output/${tractate}-rashiMap.json`, JSON.stringify(rashiMap));
  console.log("done");
}
async function mapTosafot() {
  const dirPath = "../output/"
  const filenames = (await readdir(dirPath)).sort( (a, b) => parseInt(a.split("-")[1]) - parseInt(b.split("-")[1]));
  const tractate = "Berakhot"
  const tosafotEntries = Object.entries(JSON.parse(await readFile(dirPath + tractate + "-tosafot.json")));
  const entriesForDaf = (daf) => {
    const dafstr = `${tractate}.${daf}`;
    return tosafotEntries.filter( ([ref, text]) =>
      ref.includes(dafstr + 'a') || ref.includes(dafstr + 'b'));
  }
  const tosafotMap = {};
  for (const filename of filenames) {
    if (!filename.includes(tractate)) continue;
    const content = JSON.parse(await readFile(dirPath + filename));
    if (!content.tosafot) continue;
    const headerRegex = /(\{[^\{\}]+\})+/g
    const tosafotBodies = content.tosafot
      .split(headerRegex)
      .slice(1)
      .filter( (text, i) => (i % 2))
      .map(text => text.replaceAll("<br>", " "));
    console.log(filename);
    const filenameSplit = filename.split('-');
    const daf = parseInt(filenameSplit[1]);
    tosafotMap[filename] = [];
    tosafotBodies.forEach( (body, index) => {
      let closest;
      let candidates = entriesForDaf(daf);
      closest = getClosestCandidate(body, candidates)
      if (!closest) {
        candidates = entriesForDaf(daf + 1);
        closest = getClosestCandidate(body, candidates)
        if (!closest) {
          candidates = entriesForDaf(daf - 1);
          closest = getClosestCandidate(body, candidates)
        }
      }
      if (closest) {
        tosafotMap[filename].push(closest.ref);
        const index = tosafotEntries.findIndex (([ref, text]) => ref == closest.ref);
        tosafotEntries.splice(index, 1);
      } else {
        tosafotMap[filename].push(false);
      }
    })
    await writeFile(`../output/${tractate}-tosafotMap.json`, JSON.stringify(tosafotMap));
  }
  await writeFile(`../output/${tractate}-tosafotMap.json`, JSON.stringify(tosafotMap));
  console.log("done");
}

async function mapJsonToMongo() {
  const obj = JSON.parse(await readFile("../output/Berakhot-tosafotMap.json"))
  const entries = Object.entries(obj);
  const newFile = entries.map( ([page, arr]) => {
    const split = page.split(".")[0].split("-");
    const tractate = split[0];
    const daf = split[1];
    return {
      tractate,
      daf,
      tosafotMap: arr
    }
    }
  )
  await writeFile(`../output/Berakhot-tosafotMap-mongo.json`, JSON.stringify(newFile));
  debugger;
}

async function mapJsonToExisting() {

  const obj = JSON.parse(await readFile("../output/Berakhot-rashiMap.json"))
  const existing = JSON.parse(await readFile("../output/Berakhot-tosafotMap-mongo.json"));
  const entries = Object.entries(obj);
  entries.forEach( ([page, arr]) => {
    const split = page.split(".")[0].split("-");
    const tractate = split[0];
    const daf = split[1];
    const insert = existing.findIndex(entry => entry.tractate == tractate && entry.daf == daf);
    if (existing[insert]) {
      existing[insert].rashiMap = arr;
    } else {
      existing.push({
        tractate,
        daf,
        rashiMap: arr
      })
    }
  })
  await writeFile(`../output/Berakhot-commentaryMap-mongo.json`, JSON.stringify(existing));
}