/**
 * Module Dependencies
 */

var co = require('co');
var assert = require('assert');
var Installer = require('./');

assert(process.env.user, 'no process.env.user');
assert(process.env.token, 'no process.env.token');

var installer = Installer(__dirname + '/example-app')
  .auth(process.env.user, process.env.token)
  .manifest('component.json')
  .directory('./components')

co(installer.install).call(installer, function(err) {
  if (err) throw err;
  console.log(err);
});
