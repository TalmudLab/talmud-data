function grab(textArr, ...indexes) {
  return indexes.map(index => textArr[index]);
}
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
      return {
        sefaria: grab(sefaria, 0, 1, 2, 4, 3),
        hb
      }
    }
  },
  "3b": {
    tosafot (sefaria, hb) {
      //Out of order and duplicates, plus an extra Tosafot that HebrewBooks doesn't have
      return {
        sefaria: grab(sefaria, 1, 2, 5, 4, 6),
        hb
      }
    }
  },
  "4": {
    rashi (sefaria, hb) {
      /*
      Swap the second and third Rashi. Note that the original order is actually the
      correct one according to Mesoret Hashas, but I'm changing it to reflect the actual
      appearance of the printed Vilna.
       */
      const swapped = [sefaria[0], sefaria[2], sefaria[1], ...sefaria.slice(3)];
      return {
        sefaria: swapped,
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