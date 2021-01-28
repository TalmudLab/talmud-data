export default {
  "2b": {
    rashi (sefaria, hb) {
      //The third rashi that sefaria has isn't there on Hebrewbooks - interestingly, both sources have it as a Tosafot
      const copy = [...sefaria]
      copy.splice(2, 1);
      return {
        sefaria: copy,
        hb
      }
    }
  },
  "5b": {
    rashi (sefaria, hb) {
      //rashi order discrepancy
      const swapped = [...sefaria.slice(0, 12), sefaria[14], sefaria[13], ...sefaria.slice(15)]
      return {
        sefaria: swapped,
        hb
      }
    }
  }
}