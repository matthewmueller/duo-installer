
# duo installer

  install dependencies from github. built for [duo](http://github.com/duojs/duo), but can be used on it's own.

## Example

```js
var co = require('co');
var assert = require('assert');
var Installer = require('../');

assert(process.env.user, 'no process.env.user');
assert(process.env.token, 'no process.env.token');

var installer = Installer(__dirname)
  .auth(process.env.user, process.env.token)
  .directory('components')

// wrap so we make it consumeable outside of a generator
installer.install = co(installer.install)

installer.install(function(err) {
  if (err) throw err;
  console.log('all done!');
});
```

## License

(The MIT License)

Copyright (c) 2014 matthew mueller &lt;mattmuelle@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
