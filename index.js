/*!
 * lampress
 * Copyright(c) 2016 RFTP Technologies Ltd
 * Copyright(c) 2016 Emmanuel Merali
 * Copyright(c) 2016 Dmytro Pashchenko
 * MIT Licensed
 */

var http = require('http');

function eventRequest(options) {
  this.options = options;
  this.result = '';
};

eventRequest.prototype.send = function(body, callback) {
  var self = this;
  var data = undefined;
  var isString = true;
  if (body) {
    if (typeof body ==='string') {
      data = body;
    }
    else {
      isString = false;
      data = JSON.stringify(body);
    }
    this.options.headers['Content-Length'] = Buffer.byteLength(data);
  }
  var socketRequest = http.request(this.options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      self.result+= chunk.toString('utf8');
    });
    res.on('end', function() {
      var result = isString ? self.result : JSON.parse(self.result);
      callback(null, result);
    });
  });
  socketRequest.on('error', function(err) {
    callback(error);
  });
  if (data) {
    socketRequest.write(data);
  }
  socketRequest.end();
};

function eventHandler(sockPath, server) {
  this.sockPath = sockPath;
  this.server = server;
  this.serverReady = false;
};

eventHandler.prototype.handle = function(event, context, callback) {
  var self = this;
  this.event = event;
  this.context = context;
  this.callback = callback;
  if (this.serverReady) {
    this.sendRequest();
  }
  else {
    this.server.on('listening', function() {
      self.sendRequest();
    });
  }
};

eventHandler.prototype.sendRequest = function() {
  var reqopts = {
    method: this.event.method,
    path: this.event.path,
    headers: this.event.headers,
    socketPath: this.sockPath
  }
  var request = new eventRequest(reqopts);
  request.send(this.event.body, this.callback);
};

var lampress = function(sockPath, server) {
  var handler = new eventHandler(sockPath, server);
  server.on('listening', function() {
    handler.serverReady = true;
  });
  return function(event, context, callback) {
    context.callbackWaitsForEmptyEventLoop = false;
    handler.handle(event, context, callback);
  };
};

module.exports = lampress;
