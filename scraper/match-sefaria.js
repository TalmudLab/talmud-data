const httpGet = require("./http").get

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

async function divideMain (tractate, daf, mainText) {
 const {hebrew} = await getMain(tractate, daf);

}


module.exports = {
  divideMain
}

