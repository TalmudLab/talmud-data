export default {
  "2b": {
    rashi (sefaria, hb) {
      //The third rashi that sefaria has isn't there on HebrewBooks - interestingly, both sources have it as a Tosafot
      const fixedSefaria = [...sefaria]
      fixedSefaria.splice(2, 1);

      //Remove the א] that HebrewBooks appends to the last Rashi
      const fixedHb = [...hb];
      fixedHb[53] = fixedHb[53].replace('א]', '');
      return {
        sefaria: fixedSefaria,
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