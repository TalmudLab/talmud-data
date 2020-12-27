const request = require('request');

function get(uri) {
  return new Promise(function(resolve, reject) {
    request(uri, (error, response, body) => {
      if (error) {
        reject(error);
      }
      if (body) {
        resolve(body);
      }
    })
  })
}

module.exports = { get }
