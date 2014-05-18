
/**
 * Module Dependencies
 */

var co = require('co');
var assert = require('assert');
var Installer = require('../');

assert(process.env.user, 'no process.env.user');
assert(process.env.token, 'no process.env.token');

var installer = Installer(__dirname)
  .auth(process.env.user, process.env.token)
  .development('true' == process.env.DEV)
  .on('install', log('install'))
  .on('installed', log('installed'))
  .directory('components');

installer.install = co(installer.install)

installer.install(function(err) {
  if (err) throw err;
  console.log('all done!');
});

/**
 * Log
 */

function log(type){
  return function(pkg){
    console.log('%s %s', type, pkg.repo + '@' + pkg.ref);
  };
}
