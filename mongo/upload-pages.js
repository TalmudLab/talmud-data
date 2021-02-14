import connect from "./connect.js";
import fs from "fs";

const readdir = fs.promises.readdir;
const readFile = fs.promises.readFile;
async function* readFiles(dirPath) {
  const filenames = await readdir(dirPath);
  for (const filename of filenames) {
    const content =  JSON.parse(await readFile(dirPath + filename));
    yield { filename, content };
  }
}

(async () => {
  for await (const { filename, content } of readFiles("../output/")) {
    const [tractate, daf] = (filename.split('.')[0]).split('-');
    content.tractate = tractate;
    content.daf = daf;
    const query = { tractate, daf };
    const update = {
      $set: {...content}
    }
    const { client, db } = await connect();
    const collection = db.collection("pages");
    const result = await collection.updateOne(query, update, {upsert: true})
    console.dir(result);
    client.close();
  }
})();
