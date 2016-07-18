# lampress

Quickly and easily run express applications in AWS Lambda.

## Installation

```sh
$ npm install lampress
```

## API

```js
exports.handler = lampress(port, server);
```

## Examples

### Express/Connect top-level generic

This example demonstrates running a simple express application with a small
set of routes.

```js
var express = require('express');
var bodyParser = require('body-parser');
var lampress = require('./lampress');
var port = '/tmp/local';

var app = express();
 
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.text()); // for parsing plain/text
// Set up express routes
app.get('/', function (req, res) {
  res.send("Hello world!");
});
app.post('/', function (req, res) {
  res.send(req.body);
});
app.put('/', function (req, res) {
  res.send(req.body);
});
app.delete('/', function (req, res) {
  res.send("Ok, deleted");
});

var server = app.listen(port, function() {
  console.log("Server has started");
}); 

exports.handler = lampress(port, server);
```

## License

[MIT](LICENSE)
