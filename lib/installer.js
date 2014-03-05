/**
 * Module dependencies
 */

var path = require('path');
var join = path.join;
var normalize = path.normalize;
var Package = require('gh-package');
var parallel = require('co-parallel');
var fs = require('co-fs');

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
  this.depdir = 'components';
  this.dir = join(this.cwd, 'components');
  this._manifest = 'component.json';
  this.file = join(this.cwd, this._manifest);
  this.local = this.json(this.file);
  this._concurrency = 10;
  this._development = false;
  this._mappings = {};
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
  this.depdir = normalize(dir);
  this.dir = join(this.cwd, dir);
  return this;
};

/**
 * manifest
 */

Installer.prototype.manifest = function(manifest) {
  this._manifest = manifest;
  this.file = join(this.cwd, this._manifest);
  this.local = this.json(this.file);
  return this;
};

/**
 * Concurrency
 */

Installer.prototype.concurrency = function(n) {
  this._concurrency = n;
  return this;
}

/**
 * development
 */

Installer.prototype.development = function() {
  this._development = true;
  return this;
};


/**
 * install
 */

Installer.prototype.install = function *() {
  var pkgs = yield this.dependencies(this.local, '.');

  // fetch the `pkg`'s content
  yield this.parallel(pkgs.map(fetch));

  // write the mappings
  yield fs.writeFile(join(this.dir, 'mapping.json'), JSON.stringify(this._mappings, true, 2), 'utf8');

  return this;

  // fetch the package
  function fetch(pkg) {
    return pkg.fetch();
  }
};

/**
 * Get all the dependencies in parallel
 *
 * @param {Object} json
 * @param {Array} out (private)
 * @return {Array}
 */

Installer.prototype.dependencies = function *(json, parent, out) {
  var self = this;
  var deps = json.dependencies || {};
  var out = out || {};
  var pkgs = [];
  var gens;

  // create packages from deps
  for (var dep in deps) {
    var pkg = new Package(dep, deps[dep]);
    pkg.directory(this.dir);
    pkgs.push(pkg);
  }

  // resolve the versions of all `deps`
  yield this.parallel(pkgs.map(version));

  // set the mappings
  this._mappings[parent] = pkgs.map(slug);

  // filter out pkgs we already read
  pkgs = pkgs.filter(cached);

  // read the manifests of `deps` and recurse
  var manifests = yield this.parallel(pkgs.map(read));

  // recurse in parallel
  yield this.parallel(pkgs.map(recurse));

  return values(out);

  // get the versions
  function version(pkg) {
    return pkg.resolve();
  }

  // fetch the slug
  function slug(pkg) {
    return self.resolve(pkg.slug());
  }

  // filter and cache
  function cached(pkg) {
    var cont = !out[pkg.slug()];
    out[pkg.slug()] = pkg;
    return cont;
  }

  // read the manifest
  function read(pkg) {
    return pkg.read(self._manifest);
  }

  // recurse
  function recurse(pkg, i) {
    var manifest = manifests[i];
    var json = JSON.parse(manifest);
    var gens =  self.dependencies(json, self.resolve(pkg.slug()), out);
    return gens;
  }

  // get the values of an object
  function values(obj) {
    var ret = [];
    for (var key in obj) ret.push(obj[key]);
    return ret;
  }
};

/**
 * Resolve the main
 */

Installer.prototype.resolve = function(slug) {
  var manifest = join(this.dir, slug, this._manifest);
  var json = this.json(manifest);
  var main = json.main || 'index.js';
  return join(this.depdir, slug, main);
};

/**
 * parallelize an array of generators
 */

Installer.prototype.parallel = function(arr) {
  return parallel(arr, this._concurrency);
}

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

/**
 * Add a manifest
 */

Installer.manifest = function(file, mappings) {

};
