[![Valence Logo](https://hoytech.github.io/valence/logo.svg)](https://github.com/hoytech/valence)

## Description

`valence.js` is an interface for controlling github's [electron](https://github.com/atom/electron) GUI toolkit from another process. It is inspired by the [Thrust](https://github.com/breach/thrust) project.

Essentially, electron is a node.js process connected to a chromium process. The idea is that you write node.js javascript code to control a chromium process in order to build applications that look and feel like native applications.

Valence is a protocol for communicating between this node.js process and another controller process, and `valence.js` is the node.js component of the implementation. `valence.js` runs in the electron main process as depicted in this diagram:

    |------------|    stdio |--------------| IPC |----------------|
    |  Your app  |--------->| electron     |---->| electron       |
    |            |<---------| main process |<----| render process |
    |------------|          |--------------|     |----------------|
     perl/whatever             valence.js            chromium

`valence.js` is compatible with electron versions 0.25.1 through 1.0.1 (and probably later).


## Rationale

Why have a separate controller process at all? Why not just write the controller logic in javascript and run it in the electron main process?

First of all, the obvious reason is that not everybody wants to write substantial controller logic in javascript. Different languages have different strengths and libraries that may not be available in javascript/node.js. For example, when communicating with SQL databases it's hard to beat perl's [DBI](https://metacpan.org/pod/DBI) module (see [AnyEvent::DBI](https://metacpan.org/pod/AnyEvent::DBI) or [AnyEvent::Task](https://metacpan.org/pod/AnyEvent::Task) for how to use DBI in an async program).

Secondly, sometimes we already have significant existing programs written in another language that we would like to add a GUI front-end to. Rather than re-write such apps in javascript, `valence.js` provides a "glue" option for other environments to use electron.

Finally, even if your app is written in javascript, in order to use electron directly, your app needs to support the exact version of `node` that electron is currently compiled with. This can especially be an issue with native modules that depend on older `node` APIs. With `valence.js` you can use any `node` environment that is applicable to your application -- well, once we have a javascript driver that is :).


## Drivers

### Perl

The reference implementation of the app-side of the valence protocol is written in perl 5.

It can be installed with the following cpan minus command (use `--sudo` if you with to install it for all users on your machine):

    $ cpanm Valence --sudo

After it is installed, see the [Valence](https://metacpan.org/pod/Valence) documentation for how to use it. To work on the code itself, please fork it on [github](https://github.com/hoytech/Valence-p5).



## Protocol

`valence.js` is an electron app and you can run it as you would any other:

    /path/to/electron /path/to/valence/app/

After this, the app will wait until it receives messages on standard input, and will subsequently emit messages over its standard output. All of your app's communication with `valence.js` is done over electron's stdio pipes.

All messages (both input and output) are minified JSON, followed by a new-line. This means there is exactly one message per line.

Every method has a `cmd` parameter which indicates the "command" to be invoked by the message. The other parameters depend on which command was sent.

### Commands

#### call

APP -> VALENCE

Indicates that valence should call a method on a particular object.

Parameters:

- `obj`: The object id (see `save` below) corresponding to the object that the method should be called on. Optional. If omitted, assumed to be `node.js`'s `module` object.

- `method`: The name of the method to be invoked. Required.

- `save`: The object id to assign to whatever is returned from the method call. Typically this is a counter that is maintained by the app which is incremented for every method call. Optional. If omitted, the return result is discarded.

- `args`: An array of arguments that should be passed to the method. Required (but can be empty).

- `args_cb`: An array of arrays. Each array represents a callback insertion that should be applied to `args` above. The first element in each sub-array is the offset in args where a callback should be inserted, and the second element is the callback id (see the `cb` command). Optional.

#### destroy

APP -> VALENCE

Indicates that the app is finished with an object and valence can discard its reference to it.

Parameters:

- `obj`: The object id of the object to be destroyed. This should have been passed in via a previous `save` parameter. Required.

#### attr

APP -> VALENCE

Used to lookup an attribute from an object and save it in a new object.

Parameters:

- `obj`: The object id of which to lookup an attribute from. Required.

- `attr`: The name of the attribute. Required.

- `save`: The object id to assign to the result. Optional (but pointless without).

#### get

APP -> VALENCE

Retrieves a value stored in an object id by having it passed to a callback.

Parameters:

- `obj`: The object id of the object to retrieve. Required.

- `cb`: The callback id (see the `cb` command) to invoke with the result. Required.

#### cb

VALENCE -> APP

Sent by `valence.js` when it wishes to invoke a callback in your application.

Parameters:

- `cb`: The callback id to be invoked. This was passed in from a `call` or `get` command. Required.

- `args`: An array of arguments to be passed to the callback. Required (but may be empty).


### Examples

Here is the detailed description of a few selected messages.

Note that the JSON in these examples has been "prettified" and in the actual valence protocol they **must** be minified and one-per-line.

When experimenting, if you are using the perl module you can set the `VALENCE_DEBUG` environment variable to sniff the traffic between a perl app and `valence.js` (see the [Valence](https://metacpan.org/pod/Valence) docs).

#### Example 1

This example is of an app calling a method which contains a callback. It is roughly equivalent to executing this code:

    get_object(3).on('closed', function() {
        notify_callback(4);
    });

Here is what the message might look like:

    {
       "args" : [
          "closed",
          null
       ],
       "args_cb" : [
          [
             1,
             4
          ]
       ],
       "cmd" : "call",
       "method" : "on",
       "obj" : "3"
    }

The `obj` above is `3` which presumably was the object resulting from the creation of a [BrowserWindow](https://github.com/atom/electron/blob/master/docs/api/browser-window.md) object. We are attaching a callback to listen for `closed` events. The callback id is `4`, and its location in the args array is `1`. Note that the callback has been stubbed out with a `null` value and will be replaced by an actual javascript function by `valence.js`, and how there is no `save` parameter because we aren't interested in the returned result of the `on` method.

#### Example 2

This is what `valence.js` might send when the `closed` event was triggered:

    {
       "args" : [
                  {}
                ],
       "cb" : 4,
       "cmd" : "cb"
    }

The callback id is `4` (see the previous example). There is an empty hash in the `args` list. This corresponds to the javascript event, but has been converted into an empty hash because the `node.js` `JSON.stringify()` method could not serialize this value.


## TODO

- Currently the `args_cb` values can only reference the first level of the arguments and cannot replace a callback inside a nested structure like an object or array. Eventually the protocol should support location specifiers such as `[1][3]['field']`

- It needs to spec out behaviour for what happens when exceptions are thrown.

- The protocol should expose a way to eval raw javascript in the main process (you can already do it in the render process with `WebContents.executeJavaScript()`).

- The special `new` method can currently only support 1 parameter because of a limitation in javascript.

- `valence.js` currently doesn't know when a callback it has installed has been garbage collected. If it did then it could send a "callback destroy" command to the app. This may be possible with the npm [weak](https://www.npmjs.com/package/weak) module.


## See Also

The [Valence perl module](https://metacpan.org/pod/Valence)

Some examples that use Valence: [DB-Browser](https://github.com/hoytech/db-browser), [HackRF-RCCar](https://github.com/hoytech/Radio-HackRF-RCCar)

[Presentation for Perl Mongers](https://www.youtube.com/watch?v=u3S2vhN0S1M&t=2m23s)



## Author

Doug Hoyte, doug@hcsw.org

## COPYRIGHT & LICENSE

Copyright 2015-2016 Doug Hoyte.

This project is licensed under the 2-clause BSD license.

Electron itself is Copyright (c) 2014-2016 GitHub Inc. and is licensed under the MIT license.
