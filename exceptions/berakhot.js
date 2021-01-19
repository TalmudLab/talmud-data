export default {
  "5b": {
    rashi (sefaria, hb) {
      //rashi order discrepancy
      const swapped = [...sefaria.slice(0, 12), sefaria[14], sefaria[13], ...sefaria.slice(15)]
      console.log("GOT HERE!")
      return {
        sefaria: swapped,
        hb
      }
    }
  }
}