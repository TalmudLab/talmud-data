const request = require('request');
const tractates = require("./tractates");

const uri = (mesechta, daf) => `https://hebrewbooks.org/shas.aspx?mesechta=${mesechta}&daf=${daf}&format=text`;

function loadPage(tractateIndex, daf) {
  return new Promise(function(resolve, reject) {
    request(uri(tractateIndex, daf), (error, response, body) => {
      if (error) {
        reject(error);
      }
      if (body) {
        if (body.includes("Requested Page not found")) {
          reject("Invalid daf");
        } else {
          resolve(body);
        }
      }
    })
  })
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
async function* tractatePages(tractateIndex) {
  let daf = '62';
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

(async () => {
  for await (const page of tractatePages(1)) {
    console.log(page.daf);
  }
})();

