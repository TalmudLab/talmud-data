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

(async () => mapJsonToMongo())();

function getClosestCandidate(compareTo, candidates) {
  if (!candidates.length) return false;
  const different = candidates.map( ([ref, text]) => {
    const split = text.split(/[–-]/g);
    const compareBody = (split.length > 1) ? split.slice(1).join("") : text;
    const diffed = stringSimilarity(compareTo, compareBody);
    return {
      ref,
      score: diffed
    }
  }).sort( (a,b) => b.score - a.score);
  const closest = different[0];
  console.log(closest.score, different[1]?.score);
  if (closest.score < 0.8) {
    return false;
  }
  return closest;
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