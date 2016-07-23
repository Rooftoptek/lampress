/*!
 * lampress
 * Copyright(c) 2016 RFTP Technologies Ltd
 * Copyright(c) 2016 Emmanuel Merali
 * Copyright(c) 2016 Dmytro Pashchenko
 * MIT Licensed
 */

var http = require('http');
var XHR = require('xmlhttprequest-socket').XMLHttpRequest;

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
  var self = this;
  var handled = false;
  var request = new XHR();
  request.onreadystatechange = function() {
    var isJson;
    if (request.readyState === request.HEADERS_RECEIVED && !handled) {
      var contentType = request.getResponseHeader('Content-Type');
      isJson = contentType && contentType.indexOf('application/json') === 0;      
    }
    if (request.readyState !== request.DONE || handled) {
      return;
    }
    handled = true;
    if (request.status === 0) {
        self.callback('Unable to connect to the specified socket');      
    }
    else {
      var response;
      try {
        response = isJson ? JSON.parse(request.responseText) : request.responseText;
      } 
      catch (error) {
        self.callback(error.toString());
      }
      if (request.status >= 200 && request.status < 300) {
      self.callback(null, response);
    }
      else {
        self.callback(response);
      }
    }
    }    
  request.openOnSocket(this.event.method, this.event.path, this.sockPath, true);
  for (var h in this.event.headers) {
    request.setRequestHeader(h, this.event.headers[h]);
  }
  var data;
  if (this.event.body) {
    if (typeof this.event.body ==='string') {
      data = this.event.body;
    }
    else {
      data = JSON.stringify(this.event.body);
    }
  }
  request.send(data);
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
