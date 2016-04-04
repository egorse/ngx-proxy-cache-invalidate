var http = require('http');
var server = http.createServer(handler);
var data = {
        counter: 0
    };

function handler(req, res) {
    data.counter++;
    res.statusCode = 200;
    res.end(JSON.stringify(data));
}

// The listening port shall be supplied ```node rest-server.js 9002```
server.listen(process.argv[2]);
