/*!
 * lampress
 * Copyright(c) 2016 RFTP Technologies Ltd
 * Copyright(c) 2016 Emmanuel Merali
 * Copyright(c) 2016 Dmytro Pashchenko
 * MIT Licensed
 */

var http = require('http');

function eventHandler(application, listeningCallback) {
  this.application = application;
  this.serverReady = false;
  this.socketPathSuffix = 0;
  this.server = this.createServer(application, listeningCallback);
};

eventHandler.prototype.createServer = function(application, listeningCallback) {
  var self = this;
  var server = http.createServer(application);
  server.on('listening', function() {
    self.serverReady = true;
    if (listeningCallback) {
      listeningCallback(self.getSocketPath());
    }
  }).on('close', function() {
    self.serverReady = false;
  }).on('error', function(error) {
    if (error.code === 'EADDRINUSE') {
      console.warn(`EADDRINUSE ${self.getSocketPath()} incrementing socketPathSuffix.`);
      ++self.socketPathSuffix;
      self.server.close(function() {
        self.startServer();
      });
    }
  });
  return server;
};

eventHandler.prototype.returnResponseFromLambda = function(response, context, callback) {
  var chunks = '';
  response.setEncoding('utf8');
  response.on('data', function(chunk) {
    chunks+= chunk.toString('utf8');
  }).on('end', function() {
    var statusCode = response.statusCode;
    var headers = response.headers;
    Object.keys(headers).forEach(function(h) {
      if (Array.isArray(headers[h])) {
        headers[h] = headers[h].join(',');
      }
    });
    var body = '';
      try {
        body = JSON.parse(chunks);
      }
      catch (error) {
        body = chunks;
      }
    var successResponse = {statusCode, headers, body};

    callback(null, successResponse);
  })
}

eventHandler.prototype.connectionError = function(error, context, callback) {
  var errorResponse = {
    statusCode: 502,
    body: '',
    headers: {}
  }

  callback(errorResponse);
}

eventHandler.prototype.forwardRequestToLambda = function(event, context, callback) {
  var headers = event.headers || {};
  var requestOptions = {
    method: event.httpMethod || event.method || 'GET',
    path: event.path,
    headers: headers,
    socketPath: this.getSocketPath()
  };
  var self = this;
  var request = http.request(requestOptions, function(response) {
    self.returnResponseFromLambda(response, context, callback);
  });

  if (event.body) {
    request.write(JSON.stringify(event.body));
  }

  request.on('error', function(error) {
    self.connectionError(error, context, callback);
  }).end();
}

eventHandler.prototype.internalServerError = function(error, context, callback) {
    var errorResponse = {
        statusCode: 500,
        body: '',
        headers: {}
    }

    callback(errorResponse);
}

eventHandler.prototype.getSocketPath = function() {
    return `/tmp/rooftop${this.socketPathSuffix}.sock`
}

eventHandler.prototype.startServer = function() {
    return this.server.listen(this.getSocketPath());
}

eventHandler.prototype.handleEvent = function(event, context, callback) {
  try {
    if (this.serverReady) {
      this.forwardRequestToLambda(event, context, callback);
    }
    else {
      var self = this;
      this.startServer();
      this.server.on('listening', function() {
        try {
          self.forwardRequestToLambda(event, context, callback);
        }
        catch (error) {
          self.internalServerError(error, context, callback);
        }
      });
    }
  }
  catch (error) {
    this.internalServerError(error, context, callback);
  }
};

var lampress = function(application, listeningCallback) {
  var handler = new eventHandler(application, listeningCallback);
  return function(event, context, callback) {
    context.callbackWaitsForEmptyEventLoop = false;
    global.Context = context;
    handler.handleEvent(event, context, callback);
  };
};

module.exports = lampress;
