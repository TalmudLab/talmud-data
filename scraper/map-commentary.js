import {get as httpGet} from "./http.js";
import fs from "fs";
const readdir = fs.promises.readdir;
const readFile = fs.promises.readFile;

(async () => {
  const dirPath = "../output"
  const tractate = "Berakhot";
  const filenames = await readdir(dirPath);
  const sefariaTosafot = {}
  for (let daf = 2; daf <= 64; daf++) {
    const uri = `https://www.sefaria.org/api/texts/Tosafot_on_Berakhot.${daf}`
    const body = JSON.parse(await httpGet(uri));
    const amuds = body.he;
    if (amuds.length > 2) {
      throw new Exception("not 2");
    }
  }
  for (const filename of filenames) {
    if (!filename.includes(tractate)) continue;
    const content = JSON.parse(await readFile(dirPath + filename));

  }
})();
