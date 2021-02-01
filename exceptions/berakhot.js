export default {
  "2b": {
    rashi (sefaria, hb) {
      //The third rashi that sefaria has isn't there on HebrewBooks - interestingly, both sources have it as a Tosafot
      const fixedSefaria = [...sefaria]
      fixedSefaria.splice(2, 1);

      //Remove the א] that HebrewBooks appends to the last Rashi
      const fixedHb = [...hb];
      fixedHb[53] = fixedHb[53].replace('א] ', '');
      return {
        sefaria: fixedSefaria,
        hb: fixedHb
      }
    }
  },
  "3": {
    tosafot (sefaria, hb) {
      //Sefaria duplicates two Tosafot and puts them in the wrong place
      const wantedIndices = [0, 1, 2, 4, 3]
      return {
        sefaria: wantedIndices.map(v => sefaria[v]),
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