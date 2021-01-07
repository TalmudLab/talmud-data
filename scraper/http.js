import request from "request";

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

export { get };
