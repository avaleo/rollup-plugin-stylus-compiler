'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var rollupPluginutils = require('rollup-pluginutils');
var compiler = _interopDefault(require('stylus'));
var path = _interopDefault(require('path'));

var name = 'rollup-plugin-stylus-compiler';
var debug = require('debug')(name);

var index = function(options) {
  if ( options === void 0 ) options = {};

  // set default stylus file extensions
  if (!options.include) { options.include = ['**/*.styl', '**/*.stylus']; }

  var filter = rollupPluginutils.createFilter(options.include, options.exclude);

  // use to cache the compiled content
  // structure: {[compiledId]: [compiledContent]}
  var compiledCache = {};

  return {
    name: name,
    /**
     * Rollup default to defer to the next plugin `resolveId` function (return 
     * null or undefined). Because of the compiled id (importee) is created by 
     * this plugin and is not originally exists. So for compiled id (importee), 
     * for avoid transmit it to the next plugin to resolve it again, here need 
     * to return the compiled id itself. That means all next plugins `resolveId` 
     * function will not call any more for the compiled id.
     */
    resolveId: function resolveId(importee, importer) {
      debug('resolveId importee=%s, importer=%s', importee, importer);
      if (compiledCache[importee]) { return importee }
    },
    /**
     * Rollup default to load content from file system (return null or undefined).
     * Because of the compiled id is created by this plugin and is not really 
     * exists in the file system. So for compiled id, here need to return the c
     * ompiled content directly (The compiled content is created and cached by 
     * the `transform` function). That means all next plugins `load` function 
     * will not call any more for the compiled id.
     */
    load: function load(id) {
      debug('load id=%s', id);
      if (compiledCache[id]) { return compiledCache[id] }
    },
    transform: function transform(code, id) {
      debug('transform id=%s, code=%s', id, code);
      if (!filter(id)) { return }
      return new Promise(function(resolve, reject) {
				var stylus = compiler(code, options.compiler);
				var relativePath = path.relative(process.cwd(), id);
				stylus.set('filename', relativePath);
				stylus.render(function(err, css) {
          if (err) { reject(err); }
          else {
            // cache the compiled content
            // use `.css` extention so next plugin can deal it as pure css
            var compiledId = id + '.css';

            compiledCache[compiledId] = css;

            resolve({
              // make next css plugin work
              code: ("import " + (JSON.stringify(compiledId))),
              map: { mappings: '' }
            });
          }
        });
      })
    }
  }
};

module.exports = index;
