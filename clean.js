const fs = require('fs');
let content = fs.readFileSync('gradcerach.html', 'utf8');
let body = content.substring(content.indexOf('<body>'));
// strip base64
body = body.replace(/data:image\/[a-zA-Z]*;base64,[a-zA-Z0-9+/=]+/g, '[IMAGE]');
console.log(body);
