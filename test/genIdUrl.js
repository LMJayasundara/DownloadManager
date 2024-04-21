const crypto = require('crypto');

// async function generateHashFromURL(url) {
//   // Convert the URL to a Uint8Array
//   const encoder = new TextEncoder();
//   const data = encoder.encode(url);

//   // Hash the data with SHA-256
//   const hashBuffer = await crypto.subtle.digest('SHA-256', data);

//   // Convert the buffer to a hexadecimal string
//   const hashArray = Array.from(new Uint8Array(hashBuffer));
//   const hashHex = hashArray.map(b => b.toString(32).padStart(2, '0')).join('');

//   return hashHex;
// }

///////////////////////////////////////////////////////////////////////////////////////////////////

// async function generateHashFromURL(url, length = 16) {
//   const encoder = new TextEncoder();
//   const data = encoder.encode(url);
//   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
//   const hashArray = Array.from(new Uint8Array(hashBuffer));
//   const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
//   return hashHex.substring(0, length);
// }
// // Example usage:
// generateHashFromURL('https://www.example.com').
// then(hash => console.log(hash));

function simpleHash(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Example usage:
console.log(simpleHash('https://www.example.com'));