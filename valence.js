"use strict";

var readline = require('readline');


var object_map = {};


var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', function(line) {
  var msg = JSON.parse(line);

  if (msg['cmd'] === 'call') {
    // Acquire object

    var obj;

    if (msg['obj'] === undefined) {
      obj = module;
    } else {
      obj = object_map[msg['obj']];
    }

    // Manipulate arguments

    if (msg['args_cb']) {
      msg['args_cb'].map(function(spec) {
        var cb_id = spec[1];

        msg['args'][spec[0]] = (function() {
          var args_array = [];

          for (var i=0; i<arguments.length; i++) {
            args_array.push(arguments[i]);
          }

          var output = {
            cmd: 'cb',
            cb: cb_id,
            args: args_array
          };

          process.stdout.write(JSON.stringify(output) + "\n");
        });
      });
    }

    // Execute call

    var result;

    if (msg['method'] === 'new') {
      // FIXME: how to get this to work with variable number of args?
      result = new obj(msg['args'][0]);
    } else {
      result = obj[msg['method']].apply(obj, msg['args'] || []);
    }

    // Save result

    if (msg['save']) {
      object_map[msg['save']] = result;
    }
  } else if (msg['cmd'] === 'attr') {
    var obj = object_map[msg['obj']];

    var result = obj[msg['attr']];

    if (msg['save']) {
      object_map[msg['save']] = result;
    }
  } else if (msg['cmd'] === 'get') {
    var output = {
      cmd: 'cb',
      cb: msg['cb'],
      args: [ object_map[msg['obj']] ],
    };

    process.stdout.write(JSON.stringify(output) + "\n");
  } else if (msg['cmd'] === 'destroy') {
    delete object_map[msg['obj']];
  } else {
    process.stderr.write("unknown command\n");
  }
});
