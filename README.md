[![Valence Logo](https://hoytech.github.io/valence/logo.svg)](https://github.com/hoytech/valence)

## Description

`valence.js` is an interface for controlling github's [electron](https://github.com/atom/electron) GUI toolkit from another process. It is inspired by the [Thrust](https://github.com/breach/thrust) project.

Essentially, electron is a node.js process connected to a chromium process. The idea is that you write node.js javascript code to control a chromium process in order to build "native" applications.

Valence is a protocol for communicating between this node.js process and another controller process, and `valence.js` is the node.js component of the implementation that runs in the electron main process:

    |------------|    stdio |--------------| IPC |----------------|
    |  Your app  |--------->| electron     |---->| electron       |
    |            |<---------| main process |<----| render process |
    |------------|          |--------------|     |----------------|
     perl/whatever             valence.js            chromium


## Rationale

Why have a separate controller process at all? Why not just write the controller logic in javascript and run it in the electron main process?

First of all, the obvious reason is that not everybody wishes to write substantial controller logic in javascript. Different languages have different strengths and libraries that may not be available in javascript/node.js. For example, when communicating with SQL databases it's hard to beat perl's [DBI](https://metacpan.org/pod/DBI) module (see [AnyEvent::DBI](https://metacpan.org/pod/AnyEvent::DBI) or [AnyEvent::Task](https://metacpan.org/pod/AnyEvent::Task) for how to use DBI in an async program).

Secondly, sometimes we already have significant existing programs written in another language that we would like to add a GUI front-end to. Rather than re-write such apps in javascript, `valence.js` provides a "glue" option for other environments to use electron.

Finally, even if your app is written in javascript, in order to use electron directly, your app needs to support the exact version of `io.js` that electron is currently compiled with. This can especially be an issue with native modules that depend on older `node.js` ABIs. With `valence.js` you can use any node.js/io.js environment that is applicable to your application -- well, once we have a javascript driver that is :).


## Drivers

### Perl

The reference implementation of the app-side of the valence protocol is written in perl 5.

It can be installed with the following cpan minus command (use `--sudo` if you with to install globally):

    $ cpanm Valence --sudo

After it is installed, see the [Valence](https://metacpan.org/pod/Valence) documentation for how to use it. To work on the code itself, please fork it on [github](https://github.com/hoytech/Valence-p5).



## Protocol

TODO: Document this



## Author

Doug Hoyte, doug@hcsw.org

## COPYRIGHT & LICENSE

Copyright 2015 Doug Hoyte.

This project is licensed under the 2-clause BSD license.

Electron itself is Copyright (c) 2014 GitHub Inc. and is licensed under the MIT license.
