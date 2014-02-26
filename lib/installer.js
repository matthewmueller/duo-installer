/**
 * Module dependencies
 */

var path = require('path');
var join = path.join;
var Package = require('gh-package');
var parallel = require('co-parallel');

/**
 * Manifests
 */

var manifests = {};

/**
 * Export `Installer`
 */

module.exports = Installer;

/**
 * Initialize `Installer`
 */

function Installer(cwd) {
  if (!(this instanceof Installer)) return new Installer(cwd);
  this.cwd = cwd || process.cwd();
  this.dir = join(this.cwd, 'components');
  this.file = 'component.json';
  this.local = this.json(join(this.cwd, this.file));
  this.concurrency = 10;
}

/**
 * auth
 */

Installer.prototype.auth = function(user, token) {
  Package.user = user;
  Package.token = token;
  return this;
};

/**
 * directory
 */

Installer.prototype.directory = function(dir) {
  this.dir = join(this.cwd, dir);
  return this;
};

/**
 * manifest
 */

Installer.prototype.manifest = function(file) {
  this.file = file;
  this.local = this.json(join(this.cwd, this.file));
  return this;
};


/**
 * install
 */

Installer.prototype.install = function *() {
  var pkgs = yield this.dependencies(this.local);
  var gens = pkgs.map(fetch);

  function fetch(pkg) {
    return pkg.fetch();
  }

  return yield parallel(gens, this.concurrency);
};

/**
 * Get all the dependencies
 */

Installer.prototype.dependencies = function *(json, out) {
  var self = this;
  var deps = json.dependencies || {};
  var manifest = this.file;
  var out = out || [];
  var gens;

  // read the manifests in parallel
  gens = Object.keys(deps).map(read);
  var jsons = yield parallel(gens, this.concurrency);

  // get the dependencies of those manifests in parallel
  gens = jsons.map(recurse);
  yield parallel(gens, this.concurrency);

  // read the manifest
  function read(dep) {
    var ver = deps[dep];
    var pkg = Package(dep, ver).directory(self.dir);
    if (!~out.indexOf(pkg)) out.push(pkg);
    return pkg.read(manifest);
  }

  // recurse
  function recurse(json) {
    json = JSON.parse(json);
    return self.dependencies(json, out);
  }

  return out;
};

/**
 * json
 */

Installer.prototype.json = function(json) {
  try {
    return require(json)
  } catch(e) {
    return {};
  }
};
