//
// Copyright 2015-2016 Doug Hoyte
//
// This project is licensed under the 2-clause BSD license.
//

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

          process.stdout.write(stringify(output) + "\n");
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

    process.stdout.write(stringify(output) + "\n");
  } else if (msg['cmd'] === 'destroy') {
    delete object_map[msg['obj']];
  } else {
    process.stderr.write("unknown command\n");
  }
});








/*
Isaac Schlueter's json-stringify-safe from: https://github.com/isaacs/json-stringify-safe

Copyright (c) Isaac Z. Schlueter and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

function stringify(obj, replacer, spaces, cycleReplacer) {
  return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces)
}

function serializer(replacer, cycleReplacer) {
  var stack = [], keys = []

  if (cycleReplacer == null) cycleReplacer = function(key, value) {
    if (stack[0] === value) return "[Circular ~]"
    return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]"
  }

  return function(key, value) {
    if (stack.length > 0) {
      var thisPos = stack.indexOf(this)
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this)
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key)
      if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value)
    }
    else stack.push(value)

    return replacer == null ? value : replacer.call(this, key, value)
  }
}

/*
end of json-stringify-safe code
*/
