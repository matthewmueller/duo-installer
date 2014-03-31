/**
 * Module dependencies
 */

var debug = require('debug')('duo-installer');
var path = require('path');
var join = path.join;
var normalize = path.normalize;
var Package = require('duo-package');
var parallel = require('co-parallel');
var reject = require('co-reject');
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
 *
 * @param {String} cwd (optional)
 * @return {Installer}
 * @api public
 */

function Installer(cwd) {
  if (!(this instanceof Installer)) return new Installer(cwd);
  this.cwd = cwd || process.cwd();
  this.depdir = 'components';
  this._directory = join(this.cwd, 'components');
  this._manifest = 'component.json';
  this.file = join(this.cwd, this._manifest);
  this.local = this.json(this.file);
  this._concurrency = 10;
  this._development = false;
  this._mappings = {};
}

/**
 * Authenticate with github
 *
 * @param {String} user
 * @param {String} token
 * @return {Installer}
 * @api public
 */

Installer.prototype.auth = function(user, token) {
  Package.user = user;
  Package.token = token;
  return this;
};

/**
 * Set a directory to write packages to
 *
 * @param {String} dir
 * @return {Installer}
 * @api public
 */

Installer.prototype.directory = function(dir) {
  this.depdir = normalize(dir);
  this._directory = join(this.cwd, dir);
  return this;
};

/**
 * Set the manifest to read from.
 *
 * @param {String} manifest
 * @return {Installer}
 * @api public
 */

Installer.prototype.manifest = function(manifest) {
  this._manifest = manifest;
  this.file = join(this.cwd, this._manifest);
  this.local = this.json(this.file);
  return this;
};

/**
 * Add the concurrency
 *
 * @param {Number} n
 * @return {Installer}
 * @api public
 */

Installer.prototype.concurrency = function(n) {
  this._concurrency = n;
  return this;
}

/**
 * Install development packages
 *
 * @param {Boolean} dev
 * @return {Installer}
 * @api public
 */

Installer.prototype.development = function(dev) {
  this._development = undefined == dev ? true : dev;
  return this;
};


/**
 * Install the packages
 *
 * @return {Package}
 * @api public
 */

Installer.prototype.install = function *() {
  var pkgs = yield this.dependencies(this.local, '.');

  // debug "fetching"
  pkgs.map(this.debug('fetching: %s', 'slug'));

  // fetch the `pkg`'s content
  yield this.parallel(pkgs.map(fetch));

  // debug "fetched"
  pkgs.map(this.debug('fetched: %s', 'slug'));

  // write the mappings
  yield fs.writeFile(join(this._directory, 'mapping.json'), JSON.stringify(this._mappings, true, 2));

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
  var directory = this._directory;
  var out = out || {};
  var pkgs = [];
  var gens;

  // create packages from deps
  for (var dep in deps) {
    var pkg = new Package(dep, deps[dep]);
    pkg.directory(directory);
    pkgs.push(pkg);
  }

  // debug "resolving"
  pkgs.map(this.debug('resolving: %s', 'slug'));

  // resolve the versions of all `deps`
  yield this.parallel(pkgs.map(version));

  // debug "resolved"
  pkgs.map(this.debug('resolved to: %s', 'slug'));

  // set the mappings
  this._mappings[parent] = pkgs.map(slug);

  // reject `pkgs` we already installed
  pkgs = yield reject(pkgs, exists);

  // filter out `pkgs` we already resolved
  pkgs = pkgs.filter(resolved);

  // read the manifests of `pkgs`
  var manifests = yield this.parallel(pkgs.map(read));

  // recurse in parallel
  yield this.parallel(pkgs.map(recurse));

  // return an array of packages to fetch
  return values(out);

  // get the versions
  function version(pkg) {
    return pkg.resolve();
  }

  // fetch the slug
  function slug(pkg) {
    return self.resolve(pkg.slug());
  }

  function exists(pkg) {
    var slug = pkg.slug();
    var path = join(directory, slug);
    return fs.exists(path);
  }

  // filter and cache
  function resolved(pkg) {
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
 * Resolve the "main" entry file
 *
 * @param {String} slug
 * @return {String}
 * @api private
 */

Installer.prototype.resolve = function(slug) {
  var manifest = join(this._directory, slug, this._manifest);
  var json = this.json(manifest);
  var main = json.main || 'index.js';
  return join(this.depdir, slug, main);
};

/**
 * Parallelize an array of generators
 * with `concurrency`.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

Installer.prototype.parallel = function(arr) {
  return parallel(arr, this._concurrency);
}

/**
 * Fetch JSON
 *
 * @param {String} path
 * @return {Object}
 * @api private
 */

Installer.prototype.json = function(path) {
  try {
    return require(path)
  } catch(e) {
    return {};
  }
};

/**
 * Debug over map
 *
 * @param {String} str
 * @param {String} val
 * @return {Function}
 * @api private
 */

Installer.prototype.debug = function(str, val) {
  return function (pkg) {
    debug(str, pkg[val]());
  };
}
