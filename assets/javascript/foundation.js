'use strict';

!function ($) {

  "use strict";

  var FOUNDATION_VERSION = '6.3.0';

  // Global Foundation object
  // This is attached to the window, or used as a module for AMD/Browserify
  var Foundation = {
    version: FOUNDATION_VERSION,

    /**
     * Stores initialized plugins.
     */
    _plugins: {},

    /**
     * Stores generated unique ids for plugin instances
     */
    _uuids: [],

    /**
     * Returns a boolean for RTL support
     */
    rtl: function () {
      return $('html').attr('dir') === 'rtl';
    },
    /**
     * Defines a Foundation plugin, adding it to the `Foundation` namespace and the list of plugins to initialize when reflowing.
     * @param {Object} plugin - The constructor of the plugin.
     */
    plugin: function (plugin, name) {
      // Object key to use when adding to global Foundation object
      // Examples: Foundation.Reveal, Foundation.OffCanvas
      var className = name || functionName(plugin);
      // Object key to use when storing the plugin, also used to create the identifying data attribute for the plugin
      // Examples: data-reveal, data-off-canvas
      var attrName = hyphenate(className);

      // Add to the Foundation object and the plugins list (for reflowing)
      this._plugins[attrName] = this[className] = plugin;
    },
    /**
     * @function
     * Populates the _uuids array with pointers to each individual plugin instance.
     * Adds the `zfPlugin` data-attribute to programmatically created plugins to allow use of $(selector).foundation(method) calls.
     * Also fires the initialization event for each plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @param {String} name - the name of the plugin, passed as a camelCased string.
     * @fires Plugin#init
     */
    registerPlugin: function (plugin, name) {
      var pluginName = name ? hyphenate(name) : functionName(plugin.constructor).toLowerCase();
      plugin.uuid = this.GetYoDigits(6, pluginName);

      if (!plugin.$element.attr('data-' + pluginName)) {
        plugin.$element.attr('data-' + pluginName, plugin.uuid);
      }
      if (!plugin.$element.data('zfPlugin')) {
        plugin.$element.data('zfPlugin', plugin);
      }
      /**
       * Fires when the plugin has initialized.
       * @event Plugin#init
       */
      plugin.$element.trigger('init.zf.' + pluginName);

      this._uuids.push(plugin.uuid);

      return;
    },
    /**
     * @function
     * Removes the plugins uuid from the _uuids array.
     * Removes the zfPlugin data attribute, as well as the data-plugin-name attribute.
     * Also fires the destroyed event for the plugin, consolidating repetitive code.
     * @param {Object} plugin - an instance of a plugin, usually `this` in context.
     * @fires Plugin#destroyed
     */
    unregisterPlugin: function (plugin) {
      var pluginName = hyphenate(functionName(plugin.$element.data('zfPlugin').constructor));

      this._uuids.splice(this._uuids.indexOf(plugin.uuid), 1);
      plugin.$element.removeAttr('data-' + pluginName).removeData('zfPlugin')
      /**
       * Fires when the plugin has been destroyed.
       * @event Plugin#destroyed
       */
      .trigger('destroyed.zf.' + pluginName);
      for (var prop in plugin) {
        plugin[prop] = null; //clean up script to prep for garbage collection.
      }
      return;
    },

    /**
     * @function
     * Causes one or more active plugins to re-initialize, resetting event listeners, recalculating positions, etc.
     * @param {String} plugins - optional string of an individual plugin key, attained by calling `$(element).data('pluginName')`, or string of a plugin class i.e. `'dropdown'`
     * @default If no argument is passed, reflow all currently active plugins.
     */
    reInit: function (plugins) {
      var isJQ = plugins instanceof $;
      try {
        if (isJQ) {
          plugins.each(function () {
            $(this).data('zfPlugin')._init();
          });
        } else {
          var type = typeof plugins,
              _this = this,
              fns = {
            'object': function (plgs) {
              plgs.forEach(function (p) {
                p = hyphenate(p);
                $('[data-' + p + ']').foundation('_init');
              });
            },
            'string': function () {
              plugins = hyphenate(plugins);
              $('[data-' + plugins + ']').foundation('_init');
            },
            'undefined': function () {
              this['object'](Object.keys(_this._plugins));
            }
          };
          fns[type](plugins);
        }
      } catch (err) {
        console.error(err);
      } finally {
        return plugins;
      }
    },

    /**
     * returns a random base-36 uid with namespacing
     * @function
     * @param {Number} length - number of random base-36 digits desired. Increase for more random strings.
     * @param {String} namespace - name of plugin to be incorporated in uid, optional.
     * @default {String} '' - if no plugin name is provided, nothing is appended to the uid.
     * @returns {String} - unique id
     */
    GetYoDigits: function (length, namespace) {
      length = length || 6;
      return Math.round(Math.pow(36, length + 1) - Math.random() * Math.pow(36, length)).toString(36).slice(1) + (namespace ? '-' + namespace : '');
    },
    /**
     * Initialize plugins on any elements within `elem` (and `elem` itself) that aren't already initialized.
     * @param {Object} elem - jQuery object containing the element to check inside. Also checks the element itself, unless it's the `document` object.
     * @param {String|Array} plugins - A list of plugins to initialize. Leave this out to initialize everything.
     */
    reflow: function (elem, plugins) {

      // If plugins is undefined, just grab everything
      if (typeof plugins === 'undefined') {
        plugins = Object.keys(this._plugins);
      }
      // If plugins is a string, convert it to an array with one item
      else if (typeof plugins === 'string') {
          plugins = [plugins];
        }

      var _this = this;

      // Iterate through each plugin
      $.each(plugins, function (i, name) {
        // Get the current plugin
        var plugin = _this._plugins[name];

        // Localize the search to all elements inside elem, as well as elem itself, unless elem === document
        var $elem = $(elem).find('[data-' + name + ']').addBack('[data-' + name + ']');

        // For each plugin found, initialize it
        $elem.each(function () {
          var $el = $(this),
              opts = {};
          // Don't double-dip on plugins
          if ($el.data('zfPlugin')) {
            console.warn("Tried to initialize " + name + " on an element that already has a Foundation plugin.");
            return;
          }

          if ($el.attr('data-options')) {
            var thing = $el.attr('data-options').split(';').forEach(function (e, i) {
              var opt = e.split(':').map(function (el) {
                return el.trim();
              });
              if (opt[0]) opts[opt[0]] = parseValue(opt[1]);
            });
          }
          try {
            $el.data('zfPlugin', new plugin($(this), opts));
          } catch (er) {
            console.error(er);
          } finally {
            return;
          }
        });
      });
    },
    getFnName: functionName,
    transitionend: function ($elem) {
      var transitions = {
        'transition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd',
        'MozTransition': 'transitionend',
        'OTransition': 'otransitionend'
      };
      var elem = document.createElement('div'),
          end;

      for (var t in transitions) {
        if (typeof elem.style[t] !== 'undefined') {
          end = transitions[t];
        }
      }
      if (end) {
        return end;
      } else {
        end = setTimeout(function () {
          $elem.triggerHandler('transitionend', [$elem]);
        }, 1);
        return 'transitionend';
      }
    }
  };

  Foundation.util = {
    /**
     * Function for applying a debounce effect to a function call.
     * @function
     * @param {Function} func - Function to be called at end of timeout.
     * @param {Number} delay - Time in ms to delay the call of `func`.
     * @returns function
     */
    throttle: function (func, delay) {
      var timer = null;

      return function () {
        var context = this,
            args = arguments;

        if (timer === null) {
          timer = setTimeout(function () {
            func.apply(context, args);
            timer = null;
          }, delay);
        }
      };
    }
  };

  // TODO: consider not making this a jQuery function
  // TODO: need way to reflow vs. re-initialize
  /**
   * The Foundation jQuery method.
   * @param {String|Array} method - An action to perform on the current jQuery object.
   */
  var foundation = function (method) {
    var type = typeof method,
        $meta = $('meta.foundation-mq'),
        $noJS = $('.no-js');

    if (!$meta.length) {
      $('<meta class="foundation-mq">').appendTo(document.head);
    }
    if ($noJS.length) {
      $noJS.removeClass('no-js');
    }

    if (type === 'undefined') {
      //needs to initialize the Foundation object, or an individual plugin.
      Foundation.MediaQuery._init();
      Foundation.reflow(this);
    } else if (type === 'string') {
      //an individual method to invoke on a plugin or group of plugins
      var args = Array.prototype.slice.call(arguments, 1); //collect all the arguments, if necessary
      var plugClass = this.data('zfPlugin'); //determine the class of plugin

      if (plugClass !== undefined && plugClass[method] !== undefined) {
        //make sure both the class and method exist
        if (this.length === 1) {
          //if there's only one, call it directly.
          plugClass[method].apply(plugClass, args);
        } else {
          this.each(function (i, el) {
            //otherwise loop through the jQuery collection and invoke the method on each
            plugClass[method].apply($(el).data('zfPlugin'), args);
          });
        }
      } else {
        //error for no class or no method
        throw new ReferenceError("We're sorry, '" + method + "' is not an available method for " + (plugClass ? functionName(plugClass) : 'this element') + '.');
      }
    } else {
      //error for invalid argument type
      throw new TypeError('We\'re sorry, ' + type + ' is not a valid parameter. You must use a string representing the method you wish to invoke.');
    }
    return this;
  };

  window.Foundation = Foundation;
  $.fn.foundation = foundation;

  // Polyfill for requestAnimationFrame
  (function () {
    if (!Date.now || !window.Date.now) window.Date.now = Date.now = function () {
      return new Date().getTime();
    };

    var vendors = ['webkit', 'moz'];
    for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
      var vp = vendors[i];
      window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
    }
    if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
      var lastTime = 0;
      window.requestAnimationFrame = function (callback) {
        var now = Date.now();
        var nextTime = Math.max(lastTime + 16, now);
        return setTimeout(function () {
          callback(lastTime = nextTime);
        }, nextTime - now);
      };
      window.cancelAnimationFrame = clearTimeout;
    }
    /**
     * Polyfill for performance.now, required by rAF
     */
    if (!window.performance || !window.performance.now) {
      window.performance = {
        start: Date.now(),
        now: function () {
          return Date.now() - this.start;
        }
      };
    }
  })();
  if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
      if (typeof this !== 'function') {
        // closest thing possible to the ECMAScript 5
        // internal IsCallable function
        throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
      }

      var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
        return fToBind.apply(this instanceof fNOP ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
      };

      if (this.prototype) {
        // native functions don't have a prototype
        fNOP.prototype = this.prototype;
      }
      fBound.prototype = new fNOP();

      return fBound;
    };
  }
  // Polyfill to get the name of a function in IE9
  function functionName(fn) {
    if (Function.prototype.name === undefined) {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = funcNameRegex.exec(fn.toString());
      return results && results.length > 1 ? results[1].trim() : "";
    } else if (fn.prototype === undefined) {
      return fn.constructor.name;
    } else {
      return fn.prototype.constructor.name;
    }
  }
  function parseValue(str) {
    if ('true' === str) return true;else if ('false' === str) return false;else if (!isNaN(str * 1)) return parseFloat(str);
    return str;
  }
  // Convert PascalCase to kebab-case
  // Thank you: http://stackoverflow.com/a/8955580
  function hyphenate(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
}(jQuery);
;'use strict';

!function ($) {

  Foundation.Box = {
    ImNotTouchingYou: ImNotTouchingYou,
    GetDimensions: GetDimensions,
    GetOffsets: GetOffsets
  };

  /**
   * Compares the dimensions of an element to a container and determines collision events with container.
   * @function
   * @param {jQuery} element - jQuery object to test for collisions.
   * @param {jQuery} parent - jQuery object to use as bounding container.
   * @param {Boolean} lrOnly - set to true to check left and right values only.
   * @param {Boolean} tbOnly - set to true to check top and bottom values only.
   * @default if no parent object passed, detects collisions with `window`.
   * @returns {Boolean} - true if collision free, false if a collision in any direction.
   */
  function ImNotTouchingYou(element, parent, lrOnly, tbOnly) {
    var eleDims = GetDimensions(element),
        top,
        bottom,
        left,
        right;

    if (parent) {
      var parDims = GetDimensions(parent);

      bottom = eleDims.offset.top + eleDims.height <= parDims.height + parDims.offset.top;
      top = eleDims.offset.top >= parDims.offset.top;
      left = eleDims.offset.left >= parDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= parDims.width + parDims.offset.left;
    } else {
      bottom = eleDims.offset.top + eleDims.height <= eleDims.windowDims.height + eleDims.windowDims.offset.top;
      top = eleDims.offset.top >= eleDims.windowDims.offset.top;
      left = eleDims.offset.left >= eleDims.windowDims.offset.left;
      right = eleDims.offset.left + eleDims.width <= eleDims.windowDims.width;
    }

    var allDirs = [bottom, top, left, right];

    if (lrOnly) {
      return left === right === true;
    }

    if (tbOnly) {
      return top === bottom === true;
    }

    return allDirs.indexOf(false) === -1;
  };

  /**
   * Uses native methods to return an object of dimension values.
   * @function
   * @param {jQuery || HTML} element - jQuery object or DOM element for which to get the dimensions. Can be any element other that document or window.
   * @returns {Object} - nested object of integer pixel values
   * TODO - if element is window, return only those values.
   */
  function GetDimensions(elem, test) {
    elem = elem.length ? elem[0] : elem;

    if (elem === window || elem === document) {
      throw new Error("I'm sorry, Dave. I'm afraid I can't do that.");
    }

    var rect = elem.getBoundingClientRect(),
        parRect = elem.parentNode.getBoundingClientRect(),
        winRect = document.body.getBoundingClientRect(),
        winY = window.pageYOffset,
        winX = window.pageXOffset;

    return {
      width: rect.width,
      height: rect.height,
      offset: {
        top: rect.top + winY,
        left: rect.left + winX
      },
      parentDims: {
        width: parRect.width,
        height: parRect.height,
        offset: {
          top: parRect.top + winY,
          left: parRect.left + winX
        }
      },
      windowDims: {
        width: winRect.width,
        height: winRect.height,
        offset: {
          top: winY,
          left: winX
        }
      }
    };
  }

  /**
   * Returns an object of top and left integer pixel values for dynamically rendered elements,
   * such as: Tooltip, Reveal, and Dropdown
   * @function
   * @param {jQuery} element - jQuery object for the element being positioned.
   * @param {jQuery} anchor - jQuery object for the element's anchor point.
   * @param {String} position - a string relating to the desired position of the element, relative to it's anchor
   * @param {Number} vOffset - integer pixel value of desired vertical separation between anchor and element.
   * @param {Number} hOffset - integer pixel value of desired horizontal separation between anchor and element.
   * @param {Boolean} isOverflow - if a collision event is detected, sets to true to default the element to full width - any desired offset.
   * TODO alter/rewrite to work with `em` values as well/instead of pixels
   */
  function GetOffsets(element, anchor, position, vOffset, hOffset, isOverflow) {
    var $eleDims = GetDimensions(element),
        $anchorDims = anchor ? GetDimensions(anchor) : null;

    switch (position) {
      case 'top':
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top
        };
        break;
      case 'right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset,
          top: $anchorDims.offset.top
        };
        break;
      case 'center top':
        return {
          left: $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top - ($eleDims.height + vOffset)
        };
        break;
      case 'center bottom':
        return {
          left: isOverflow ? hOffset : $anchorDims.offset.left + $anchorDims.width / 2 - $eleDims.width / 2,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'center left':
        return {
          left: $anchorDims.offset.left - ($eleDims.width + hOffset),
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center right':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset + 1,
          top: $anchorDims.offset.top + $anchorDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'center':
        return {
          left: $eleDims.windowDims.offset.left + $eleDims.windowDims.width / 2 - $eleDims.width / 2,
          top: $eleDims.windowDims.offset.top + $eleDims.windowDims.height / 2 - $eleDims.height / 2
        };
        break;
      case 'reveal':
        return {
          left: ($eleDims.windowDims.width - $eleDims.width) / 2,
          top: $eleDims.windowDims.offset.top + vOffset
        };
      case 'reveal full':
        return {
          left: $eleDims.windowDims.offset.left,
          top: $eleDims.windowDims.offset.top
        };
        break;
      case 'left bottom':
        return {
          left: $anchorDims.offset.left,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      case 'right bottom':
        return {
          left: $anchorDims.offset.left + $anchorDims.width + hOffset - $eleDims.width,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
        break;
      default:
        return {
          left: Foundation.rtl() ? $anchorDims.offset.left - $eleDims.width + $anchorDims.width : $anchorDims.offset.left + hOffset,
          top: $anchorDims.offset.top + $anchorDims.height + vOffset
        };
    }
  }
}(jQuery);
;/*******************************************
 *                                         *
 * This util was created by Marius Olbertz *
 * Please thank Marius on GitHub /owlbertz *
 * or the web http://www.mariusolbertz.de/ *
 *                                         *
 ******************************************/

'use strict';

!function ($) {

  var keyCodes = {
    9: 'TAB',
    13: 'ENTER',
    27: 'ESCAPE',
    32: 'SPACE',
    37: 'ARROW_LEFT',
    38: 'ARROW_UP',
    39: 'ARROW_RIGHT',
    40: 'ARROW_DOWN'
  };

  var commands = {};

  var Keyboard = {
    keys: getKeyCodes(keyCodes),

    /**
     * Parses the (keyboard) event and returns a String that represents its key
     * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
     * @param {Event} event - the event generated by the event handler
     * @return String key - String that represents the key pressed
     */
    parseKey: function (event) {
      var key = keyCodes[event.which || event.keyCode] || String.fromCharCode(event.which).toUpperCase();

      // Remove un-printable characters, e.g. for `fromCharCode` calls for CTRL only events
      key = key.replace(/\W+/, '');

      if (event.shiftKey) key = 'SHIFT_' + key;
      if (event.ctrlKey) key = 'CTRL_' + key;
      if (event.altKey) key = 'ALT_' + key;

      // Remove trailing underscore, in case only modifiers were used (e.g. only `CTRL_ALT`)
      key = key.replace(/_$/, '');

      return key;
    },


    /**
     * Handles the given (keyboard) event
     * @param {Event} event - the event generated by the event handler
     * @param {String} component - Foundation component's name, e.g. Slider or Reveal
     * @param {Objects} functions - collection of functions that are to be executed
     */
    handleKey: function (event, component, functions) {
      var commandList = commands[component],
          keyCode = this.parseKey(event),
          cmds,
          command,
          fn;

      if (!commandList) return console.warn('Component not defined!');

      if (typeof commandList.ltr === 'undefined') {
        // this component does not differentiate between ltr and rtl
        cmds = commandList; // use plain list
      } else {
        // merge ltr and rtl: if document is rtl, rtl overwrites ltr and vice versa
        if (Foundation.rtl()) cmds = $.extend({}, commandList.ltr, commandList.rtl);else cmds = $.extend({}, commandList.rtl, commandList.ltr);
      }
      command = cmds[keyCode];

      fn = functions[command];
      if (fn && typeof fn === 'function') {
        // execute function  if exists
        var returnValue = fn.apply();
        if (functions.handled || typeof functions.handled === 'function') {
          // execute function when event was handled
          functions.handled(returnValue);
        }
      } else {
        if (functions.unhandled || typeof functions.unhandled === 'function') {
          // execute function when event was not handled
          functions.unhandled();
        }
      }
    },


    /**
     * Finds all focusable elements within the given `$element`
     * @param {jQuery} $element - jQuery object to search within
     * @return {jQuery} $focusable - all focusable elements within `$element`
     */
    findFocusable: function ($element) {
      if (!$element) {
        return false;
      }
      return $element.find('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]').filter(function () {
        if (!$(this).is(':visible') || $(this).attr('tabindex') < 0) {
          return false;
        } //only have visible elements and those that have a tabindex greater or equal 0
        return true;
      });
    },


    /**
     * Returns the component name name
     * @param {Object} component - Foundation component, e.g. Slider or Reveal
     * @return String componentName
     */

    register: function (componentName, cmds) {
      commands[componentName] = cmds;
    },


    /**
     * Traps the focus in the given element.
     * @param  {jQuery} $element  jQuery object to trap the foucs into.
     */
    trapFocus: function ($element) {
      var $focusable = Foundation.Keyboard.findFocusable($element),
          $firstFocusable = $focusable.eq(0),
          $lastFocusable = $focusable.eq(-1);

      $element.on('keydown.zf.trapfocus', function (event) {
        if (event.target === $lastFocusable[0] && Foundation.Keyboard.parseKey(event) === 'TAB') {
          event.preventDefault();
          $firstFocusable.focus();
        } else if (event.target === $firstFocusable[0] && Foundation.Keyboard.parseKey(event) === 'SHIFT_TAB') {
          event.preventDefault();
          $lastFocusable.focus();
        }
      });
    },

    /**
     * Releases the trapped focus from the given element.
     * @param  {jQuery} $element  jQuery object to release the focus for.
     */
    releaseFocus: function ($element) {
      $element.off('keydown.zf.trapfocus');
    }
  };

  /*
   * Constants for easier comparing.
   * Can be used like Foundation.parseKey(event) === Foundation.keys.SPACE
   */
  function getKeyCodes(kcs) {
    var k = {};
    for (var kc in kcs) {
      k[kcs[kc]] = kcs[kc];
    }return k;
  }

  Foundation.Keyboard = Keyboard;
}(jQuery);
;'use strict';

!function ($) {

  // Default set of media queries
  var defaultQueries = {
    'default': 'only screen',
    landscape: 'only screen and (orientation: landscape)',
    portrait: 'only screen and (orientation: portrait)',
    retina: 'only screen and (-webkit-min-device-pixel-ratio: 2),' + 'only screen and (min--moz-device-pixel-ratio: 2),' + 'only screen and (-o-min-device-pixel-ratio: 2/1),' + 'only screen and (min-device-pixel-ratio: 2),' + 'only screen and (min-resolution: 192dpi),' + 'only screen and (min-resolution: 2dppx)'
  };

  var MediaQuery = {
    queries: [],

    current: '',

    /**
     * Initializes the media query helper, by extracting the breakpoint list from the CSS and activating the breakpoint watcher.
     * @function
     * @private
     */
    _init: function () {
      var self = this;
      var extractedStyles = $('.foundation-mq').css('font-family');
      var namedQueries;

      namedQueries = parseStyleToObject(extractedStyles);

      for (var key in namedQueries) {
        if (namedQueries.hasOwnProperty(key)) {
          self.queries.push({
            name: key,
            value: 'only screen and (min-width: ' + namedQueries[key] + ')'
          });
        }
      }

      this.current = this._getCurrentSize();

      this._watcher();
    },


    /**
     * Checks if the screen is at least as wide as a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it's smaller.
     */
    atLeast: function (size) {
      var query = this.get(size);

      if (query) {
        return window.matchMedia(query).matches;
      }

      return false;
    },


    /**
     * Checks if the screen matches to a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to check, either 'small only' or 'small'. Omitting 'only' falls back to using atLeast() method.
     * @returns {Boolean} `true` if the breakpoint matches, `false` if it does not.
     */
    is: function (size) {
      size = size.trim().split(' ');
      if (size.length > 1 && size[1] === 'only') {
        if (size[0] === this._getCurrentSize()) return true;
      } else {
        return this.atLeast(size[0]);
      }
      return false;
    },


    /**
     * Gets the media query of a breakpoint.
     * @function
     * @param {String} size - Name of the breakpoint to get.
     * @returns {String|null} - The media query of the breakpoint, or `null` if the breakpoint doesn't exist.
     */
    get: function (size) {
      for (var i in this.queries) {
        if (this.queries.hasOwnProperty(i)) {
          var query = this.queries[i];
          if (size === query.name) return query.value;
        }
      }

      return null;
    },


    /**
     * Gets the current breakpoint name by testing every breakpoint and returning the last one to match (the biggest one).
     * @function
     * @private
     * @returns {String} Name of the current breakpoint.
     */
    _getCurrentSize: function () {
      var matched;

      for (var i = 0; i < this.queries.length; i++) {
        var query = this.queries[i];

        if (window.matchMedia(query.value).matches) {
          matched = query;
        }
      }

      if (typeof matched === 'object') {
        return matched.name;
      } else {
        return matched;
      }
    },


    /**
     * Activates the breakpoint watcher, which fires an event on the window whenever the breakpoint changes.
     * @function
     * @private
     */
    _watcher: function () {
      var _this = this;

      $(window).on('resize.zf.mediaquery', function () {
        var newSize = _this._getCurrentSize(),
            currentSize = _this.current;

        if (newSize !== currentSize) {
          // Change the current media query
          _this.current = newSize;

          // Broadcast the media query change on the window
          $(window).trigger('changed.zf.mediaquery', [newSize, currentSize]);
        }
      });
    }
  };

  Foundation.MediaQuery = MediaQuery;

  // matchMedia() polyfill - Test a CSS media type/query in JS.
  // Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas, David Knight. Dual MIT/BSD license
  window.matchMedia || (window.matchMedia = function () {
    'use strict';

    // For browsers that support matchMedium api such as IE 9 and webkit

    var styleMedia = window.styleMedia || window.media;

    // For those that don't support matchMedium
    if (!styleMedia) {
      var style = document.createElement('style'),
          script = document.getElementsByTagName('script')[0],
          info = null;

      style.type = 'text/css';
      style.id = 'matchmediajs-test';

      script && script.parentNode && script.parentNode.insertBefore(style, script);

      // 'style.currentStyle' is used by IE <= 8 and 'window.getComputedStyle' for all other browsers
      info = 'getComputedStyle' in window && window.getComputedStyle(style, null) || style.currentStyle;

      styleMedia = {
        matchMedium: function (media) {
          var text = '@media ' + media + '{ #matchmediajs-test { width: 1px; } }';

          // 'style.styleSheet' is used by IE <= 8 and 'style.textContent' for all other browsers
          if (style.styleSheet) {
            style.styleSheet.cssText = text;
          } else {
            style.textContent = text;
          }

          // Test if media query is true or false
          return info.width === '1px';
        }
      };
    }

    return function (media) {
      return {
        matches: styleMedia.matchMedium(media || 'all'),
        media: media || 'all'
      };
    };
  }());

  // Thank you: https://github.com/sindresorhus/query-string
  function parseStyleToObject(str) {
    var styleObject = {};

    if (typeof str !== 'string') {
      return styleObject;
    }

    str = str.trim().slice(1, -1); // browsers re-quote string style values

    if (!str) {
      return styleObject;
    }

    styleObject = str.split('&').reduce(function (ret, param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = parts[0];
      var val = parts[1];
      key = decodeURIComponent(key);

      // missing `=` should be `null`:
      // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
      val = val === undefined ? null : decodeURIComponent(val);

      if (!ret.hasOwnProperty(key)) {
        ret[key] = val;
      } else if (Array.isArray(ret[key])) {
        ret[key].push(val);
      } else {
        ret[key] = [ret[key], val];
      }
      return ret;
    }, {});

    return styleObject;
  }

  Foundation.MediaQuery = MediaQuery;
}(jQuery);
;'use strict';

!function ($) {

  /**
   * Motion module.
   * @module foundation.motion
   */

  var initClasses = ['mui-enter', 'mui-leave'];
  var activeClasses = ['mui-enter-active', 'mui-leave-active'];

  var Motion = {
    animateIn: function (element, animation, cb) {
      animate(true, element, animation, cb);
    },

    animateOut: function (element, animation, cb) {
      animate(false, element, animation, cb);
    }
  };

  function Move(duration, elem, fn) {
    var anim,
        prog,
        start = null;
    // console.log('called');

    if (duration === 0) {
      fn.apply(elem);
      elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      return;
    }

    function move(ts) {
      if (!start) start = ts;
      // console.log(start, ts);
      prog = ts - start;
      fn.apply(elem);

      if (prog < duration) {
        anim = window.requestAnimationFrame(move, elem);
      } else {
        window.cancelAnimationFrame(anim);
        elem.trigger('finished.zf.animate', [elem]).triggerHandler('finished.zf.animate', [elem]);
      }
    }
    anim = window.requestAnimationFrame(move);
  }

  /**
   * Animates an element in or out using a CSS transition class.
   * @function
   * @private
   * @param {Boolean} isIn - Defines if the animation is in or out.
   * @param {Object} element - jQuery or HTML object to animate.
   * @param {String} animation - CSS class to use.
   * @param {Function} cb - Callback to run when animation is finished.
   */
  function animate(isIn, element, animation, cb) {
    element = $(element).eq(0);

    if (!element.length) return;

    var initClass = isIn ? initClasses[0] : initClasses[1];
    var activeClass = isIn ? activeClasses[0] : activeClasses[1];

    // Set up the animation
    reset();

    element.addClass(animation).css('transition', 'none');

    requestAnimationFrame(function () {
      element.addClass(initClass);
      if (isIn) element.show();
    });

    // Start the animation
    requestAnimationFrame(function () {
      element[0].offsetWidth;
      element.css('transition', '').addClass(activeClass);
    });

    // Clean up the animation when it finishes
    element.one(Foundation.transitionend(element), finish);

    // Hides the element (for out animations), resets the element, and runs a callback
    function finish() {
      if (!isIn) element.hide();
      reset();
      if (cb) cb.apply(element);
    }

    // Resets transitions and removes motion-specific classes
    function reset() {
      element[0].style.transitionDuration = 0;
      element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
    }
  }

  Foundation.Move = Move;
  Foundation.Motion = Motion;
}(jQuery);
;'use strict';

!function ($) {

  var Nest = {
    Feather: function (menu) {
      var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'zf';

      menu.attr('role', 'menubar');

      var items = menu.find('li').attr({ 'role': 'menuitem' }),
          subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      items.each(function () {
        var $item = $(this),
            $sub = $item.children('ul');

        if ($sub.length) {
          $item.addClass(hasSubClass).attr({
            'aria-haspopup': true,
            'aria-label': $item.children('a:first').text()
          });
          // Note:  Drilldowns behave differently in how they hide, and so need
          // additional attributes.  We should look if this possibly over-generalized
          // utility (Nest) is appropriate when we rework menus in 6.4
          if (type === 'drilldown') {
            $item.attr({ 'aria-expanded': false });
          }

          $sub.addClass('submenu ' + subMenuClass).attr({
            'data-submenu': '',
            'role': 'menu'
          });
          if (type === 'drilldown') {
            $sub.attr({ 'aria-hidden': true });
          }
        }

        if ($item.parent('[data-submenu]').length) {
          $item.addClass('is-submenu-item ' + subItemClass);
        }
      });

      return;
    },
    Burn: function (menu, type) {
      var //items = menu.find('li'),
      subMenuClass = 'is-' + type + '-submenu',
          subItemClass = subMenuClass + '-item',
          hasSubClass = 'is-' + type + '-submenu-parent';

      menu.find('>li, .menu, .menu > li').removeClass(subMenuClass + ' ' + subItemClass + ' ' + hasSubClass + ' is-submenu-item submenu is-active').removeAttr('data-submenu').css('display', '');

      // console.log(      menu.find('.' + subMenuClass + ', .' + subItemClass + ', .has-submenu, .is-submenu-item, .submenu, [data-submenu]')
      //           .removeClass(subMenuClass + ' ' + subItemClass + ' has-submenu is-submenu-item submenu')
      //           .removeAttr('data-submenu'));
      // items.each(function(){
      //   var $item = $(this),
      //       $sub = $item.children('ul');
      //   if($item.parent('[data-submenu]').length){
      //     $item.removeClass('is-submenu-item ' + subItemClass);
      //   }
      //   if($sub.length){
      //     $item.removeClass('has-submenu');
      //     $sub.removeClass('submenu ' + subMenuClass).removeAttr('data-submenu');
      //   }
      // });
    }
  };

  Foundation.Nest = Nest;
}(jQuery);
;'use strict';

!function ($) {

  function Timer(elem, options, cb) {
    var _this = this,
        duration = options.duration,
        //options is an object for easily adding features later.
    nameSpace = Object.keys(elem.data())[0] || 'timer',
        remain = -1,
        start,
        timer;

    this.isPaused = false;

    this.restart = function () {
      remain = -1;
      clearTimeout(timer);
      this.start();
    };

    this.start = function () {
      this.isPaused = false;
      // if(!elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      remain = remain <= 0 ? duration : remain;
      elem.data('paused', false);
      start = Date.now();
      timer = setTimeout(function () {
        if (options.infinite) {
          _this.restart(); //rerun the timer.
        }
        if (cb && typeof cb === 'function') {
          cb();
        }
      }, remain);
      elem.trigger('timerstart.zf.' + nameSpace);
    };

    this.pause = function () {
      this.isPaused = true;
      //if(elem.data('paused')){ return false; }//maybe implement this sanity check if used for other things.
      clearTimeout(timer);
      elem.data('paused', true);
      var end = Date.now();
      remain = remain - (end - start);
      elem.trigger('timerpaused.zf.' + nameSpace);
    };
  }

  /**
   * Runs a callback function when images are fully loaded.
   * @param {Object} images - Image(s) to check if loaded.
   * @param {Func} callback - Function to execute when image is fully loaded.
   */
  function onImagesLoaded(images, callback) {
    var self = this,
        unloaded = images.length;

    if (unloaded === 0) {
      callback();
    }

    images.each(function () {
      // Check if image is loaded
      if (this.complete || this.readyState === 4 || this.readyState === 'complete') {
        singleImageLoaded();
      }
      // Force load the image
      else {
          // fix for IE. See https://css-tricks.com/snippets/jquery/fixing-load-in-ie-for-cached-images/
          var src = $(this).attr('src');
          $(this).attr('src', src + '?' + new Date().getTime());
          $(this).one('load', function () {
            singleImageLoaded();
          });
        }
    });

    function singleImageLoaded() {
      unloaded--;
      if (unloaded === 0) {
        callback();
      }
    }
  }

  Foundation.Timer = Timer;
  Foundation.onImagesLoaded = onImagesLoaded;
}(jQuery);
;'use strict';

//**************************************************
//**Work inspired by multiple jquery swipe plugins**
//**Done by Yohai Ararat ***************************
//**************************************************
(function ($) {

	$.spotSwipe = {
		version: '1.0.0',
		enabled: 'ontouchstart' in document.documentElement,
		preventDefault: false,
		moveThreshold: 75,
		timeThreshold: 200
	};

	var startPosX,
	    startPosY,
	    startTime,
	    elapsedTime,
	    isMoving = false;

	function onTouchEnd() {
		//  alert(this);
		this.removeEventListener('touchmove', onTouchMove);
		this.removeEventListener('touchend', onTouchEnd);
		isMoving = false;
	}

	function onTouchMove(e) {
		if ($.spotSwipe.preventDefault) {
			e.preventDefault();
		}
		if (isMoving) {
			var x = e.touches[0].pageX;
			var y = e.touches[0].pageY;
			var dx = startPosX - x;
			var dy = startPosY - y;
			var dir;
			elapsedTime = new Date().getTime() - startTime;
			if (Math.abs(dx) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
				dir = dx > 0 ? 'left' : 'right';
			}
			// else if(Math.abs(dy) >= $.spotSwipe.moveThreshold && elapsedTime <= $.spotSwipe.timeThreshold) {
			//   dir = dy > 0 ? 'down' : 'up';
			// }
			if (dir) {
				e.preventDefault();
				onTouchEnd.call(this);
				$(this).trigger('swipe', dir).trigger('swipe' + dir);
			}
		}
	}

	function onTouchStart(e) {
		if (e.touches.length == 1) {
			startPosX = e.touches[0].pageX;
			startPosY = e.touches[0].pageY;
			isMoving = true;
			startTime = new Date().getTime();
			this.addEventListener('touchmove', onTouchMove, false);
			this.addEventListener('touchend', onTouchEnd, false);
		}
	}

	function init() {
		this.addEventListener && this.addEventListener('touchstart', onTouchStart, false);
	}

	function teardown() {
		this.removeEventListener('touchstart', onTouchStart);
	}

	$.event.special.swipe = { setup: init };

	$.each(['left', 'up', 'down', 'right'], function () {
		$.event.special['swipe' + this] = { setup: function () {
				$(this).on('swipe', $.noop);
			} };
	});
})(jQuery);
/****************************************************
 * Method for adding psuedo drag events to elements *
 ***************************************************/
!function ($) {
	$.fn.addTouch = function () {
		this.each(function (i, el) {
			$(el).bind('touchstart touchmove touchend touchcancel', function () {
				//we pass the original event object because the jQuery event
				//object is normalized to w3c specs and does not provide the TouchList
				handleTouch(event);
			});
		});

		var handleTouch = function (event) {
			var touches = event.changedTouches,
			    first = touches[0],
			    eventTypes = {
				touchstart: 'mousedown',
				touchmove: 'mousemove',
				touchend: 'mouseup'
			},
			    type = eventTypes[event.type],
			    simulatedEvent;

			if ('MouseEvent' in window && typeof window.MouseEvent === 'function') {
				simulatedEvent = new window.MouseEvent(type, {
					'bubbles': true,
					'cancelable': true,
					'screenX': first.screenX,
					'screenY': first.screenY,
					'clientX': first.clientX,
					'clientY': first.clientY
				});
			} else {
				simulatedEvent = document.createEvent('MouseEvent');
				simulatedEvent.initMouseEvent(type, true, true, window, 1, first.screenX, first.screenY, first.clientX, first.clientY, false, false, false, false, 0 /*left*/, null);
			}
			first.target.dispatchEvent(simulatedEvent);
		};
	};
}(jQuery);

//**********************************
//**From the jQuery Mobile Library**
//**need to recreate functionality**
//**and try to improve if possible**
//**********************************

/* Removing the jQuery function ****
************************************

(function( $, window, undefined ) {

	var $document = $( document ),
		// supportTouch = $.mobile.support.touch,
		touchStartEvent = 'touchstart'//supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = 'touchend'//supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = 'touchmove'//supportTouch ? "touchmove" : "mousemove";

	// setup new event shortcuts
	$.each( ( "touchstart touchmove touchend " +
		"swipe swipeleft swiperight" ).split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	function triggerCustomEvent( obj, eventType, event, bubble ) {
		var originalType = event.type;
		event.type = eventType;
		if ( bubble ) {
			$.event.trigger( event, undefined, obj );
		} else {
			$.event.dispatch.call( obj, event );
		}
		event.type = originalType;
	}

	// also handles taphold

	// Also handles swipeleft, swiperight
	$.event.special.swipe = {

		// More than this horizontal displacement, and we will suppress scrolling.
		scrollSupressionThreshold: 30,

		// More time than this, and it isn't a swipe.
		durationThreshold: 1000,

		// Swipe horizontal displacement must be more than this.
		horizontalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		// Swipe vertical displacement must be less than this.
		verticalDistanceThreshold: window.devicePixelRatio >= 2 ? 15 : 30,

		getLocation: function ( event ) {
			var winPageX = window.pageXOffset,
				winPageY = window.pageYOffset,
				x = event.clientX,
				y = event.clientY;

			if ( event.pageY === 0 && Math.floor( y ) > Math.floor( event.pageY ) ||
				event.pageX === 0 && Math.floor( x ) > Math.floor( event.pageX ) ) {

				// iOS4 clientX/clientY have the value that should have been
				// in pageX/pageY. While pageX/page/ have the value 0
				x = x - winPageX;
				y = y - winPageY;
			} else if ( y < ( event.pageY - winPageY) || x < ( event.pageX - winPageX ) ) {

				// Some Android browsers have totally bogus values for clientX/Y
				// when scrolling/zooming a page. Detectable since clientX/clientY
				// should never be smaller than pageX/pageY minus page scroll
				x = event.pageX - winPageX;
				y = event.pageY - winPageY;
			}

			return {
				x: x,
				y: y
			};
		},

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event,
				location = $.event.special.swipe.getLocation( data );
			return {
						time: ( new Date() ).getTime(),
						coords: [ location.x, location.y ]
					};
		},

		handleSwipe: function( start, stop, thisObject, origTarget ) {
			if ( stop.time - start.time < $.event.special.swipe.durationThreshold &&
				Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.swipe.verticalDistanceThreshold ) {
				var direction = start.coords[0] > stop.coords[ 0 ] ? "swipeleft" : "swiperight";

				triggerCustomEvent( thisObject, "swipe", $.Event( "swipe", { target: origTarget, swipestart: start, swipestop: stop }), true );
				triggerCustomEvent( thisObject, direction,$.Event( direction, { target: origTarget, swipestart: start, swipestop: stop } ), true );
				return true;
			}
			return false;

		},

		// This serves as a flag to ensure that at most one swipe event event is
		// in work at any given time
		eventInProgress: false,

		setup: function() {
			var events,
				thisObject = this,
				$this = $( thisObject ),
				context = {};

			// Retrieve the events data for this element and add the swipe context
			events = $.data( this, "mobile-events" );
			if ( !events ) {
				events = { length: 0 };
				$.data( this, "mobile-events", events );
			}
			events.length++;
			events.swipe = context;

			context.start = function( event ) {

				// Bail if we're already working on a swipe event
				if ( $.event.special.swipe.eventInProgress ) {
					return;
				}
				$.event.special.swipe.eventInProgress = true;

				var stop,
					start = $.event.special.swipe.start( event ),
					origTarget = event.target,
					emitted = false;

				context.move = function( event ) {
					if ( !start || event.isDefaultPrevented() ) {
						return;
					}

					stop = $.event.special.swipe.stop( event );
					if ( !emitted ) {
						emitted = $.event.special.swipe.handleSwipe( start, stop, thisObject, origTarget );
						if ( emitted ) {

							// Reset the context to make way for the next swipe event
							$.event.special.swipe.eventInProgress = false;
						}
					}
					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.swipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				};

				context.stop = function() {
						emitted = true;

						// Reset the context to make way for the next swipe event
						$.event.special.swipe.eventInProgress = false;
						$document.off( touchMoveEvent, context.move );
						context.move = null;
				};

				$document.on( touchMoveEvent, context.move )
					.one( touchStopEvent, context.stop );
			};
			$this.on( touchStartEvent, context.start );
		},

		teardown: function() {
			var events, context;

			events = $.data( this, "mobile-events" );
			if ( events ) {
				context = events.swipe;
				delete events.swipe;
				events.length--;
				if ( events.length === 0 ) {
					$.removeData( this, "mobile-events" );
				}
			}

			if ( context ) {
				if ( context.start ) {
					$( this ).off( touchStartEvent, context.start );
				}
				if ( context.move ) {
					$document.off( touchMoveEvent, context.move );
				}
				if ( context.stop ) {
					$document.off( touchStopEvent, context.stop );
				}
			}
		}
	};
	$.each({
		swipeleft: "swipe.left",
		swiperight: "swipe.right"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			},
			teardown: function() {
				$( this ).unbind( sourceEvent );
			}
		};
	});
})( jQuery, this );
*/
;'use strict';

!function ($) {

  var MutationObserver = function () {
    var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
    for (var i = 0; i < prefixes.length; i++) {
      if (prefixes[i] + 'MutationObserver' in window) {
        return window[prefixes[i] + 'MutationObserver'];
      }
    }
    return false;
  }();

  var triggers = function (el, type) {
    el.data(type).split(' ').forEach(function (id) {
      $('#' + id)[type === 'close' ? 'trigger' : 'triggerHandler'](type + '.zf.trigger', [el]);
    });
  };
  // Elements with [data-open] will reveal a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-open]', function () {
    triggers($(this), 'open');
  });

  // Elements with [data-close] will close a plugin that supports it when clicked.
  // If used without a value on [data-close], the event will bubble, allowing it to close a parent component.
  $(document).on('click.zf.trigger', '[data-close]', function () {
    var id = $(this).data('close');
    if (id) {
      triggers($(this), 'close');
    } else {
      $(this).trigger('close.zf.trigger');
    }
  });

  // Elements with [data-toggle] will toggle a plugin that supports it when clicked.
  $(document).on('click.zf.trigger', '[data-toggle]', function () {
    var id = $(this).data('toggle');
    if (id) {
      triggers($(this), 'toggle');
    } else {
      $(this).trigger('toggle.zf.trigger');
    }
  });

  // Elements with [data-closable] will respond to close.zf.trigger events.
  $(document).on('close.zf.trigger', '[data-closable]', function (e) {
    e.stopPropagation();
    var animation = $(this).data('closable');

    if (animation !== '') {
      Foundation.Motion.animateOut($(this), animation, function () {
        $(this).trigger('closed.zf');
      });
    } else {
      $(this).fadeOut().trigger('closed.zf');
    }
  });

  $(document).on('focus.zf.trigger blur.zf.trigger', '[data-toggle-focus]', function () {
    var id = $(this).data('toggle-focus');
    $('#' + id).triggerHandler('toggle.zf.trigger', [$(this)]);
  });

  /**
  * Fires once after all other scripts have loaded
  * @function
  * @private
  */
  $(window).on('load', function () {
    checkListeners();
  });

  function checkListeners() {
    eventsListener();
    resizeListener();
    scrollListener();
    mutateListener();
    closemeListener();
  }

  //******** only fires this function once on load, if there's something to watch ********
  function closemeListener(pluginName) {
    var yetiBoxes = $('[data-yeti-box]'),
        plugNames = ['dropdown', 'tooltip', 'reveal'];

    if (pluginName) {
      if (typeof pluginName === 'string') {
        plugNames.push(pluginName);
      } else if (typeof pluginName === 'object' && typeof pluginName[0] === 'string') {
        plugNames.concat(pluginName);
      } else {
        console.error('Plugin names must be strings');
      }
    }
    if (yetiBoxes.length) {
      var listeners = plugNames.map(function (name) {
        return 'closeme.zf.' + name;
      }).join(' ');

      $(window).off(listeners).on(listeners, function (e, pluginId) {
        var plugin = e.namespace.split('.')[0];
        var plugins = $('[data-' + plugin + ']').not('[data-yeti-box="' + pluginId + '"]');

        plugins.each(function () {
          var _this = $(this);

          _this.triggerHandler('close.zf.trigger', [_this]);
        });
      });
    }
  }

  function resizeListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-resize]');
    if ($nodes.length) {
      $(window).off('resize.zf.trigger').on('resize.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('resizeme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a resize event
          $nodes.attr('data-events', "resize");
        }, debounce || 10); //default time to emit resize event
      });
    }
  }

  function scrollListener(debounce) {
    var timer = void 0,
        $nodes = $('[data-scroll]');
    if ($nodes.length) {
      $(window).off('scroll.zf.trigger').on('scroll.zf.trigger', function (e) {
        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(function () {

          if (!MutationObserver) {
            //fallback for IE 9
            $nodes.each(function () {
              $(this).triggerHandler('scrollme.zf.trigger');
            });
          }
          //trigger all listening elements and signal a scroll event
          $nodes.attr('data-events', "scroll");
        }, debounce || 10); //default time to emit scroll event
      });
    }
  }

  function mutateListener(debounce) {
    var $nodes = $('[data-mutate]');
    if ($nodes.length && MutationObserver) {
      //trigger all listening elements and signal a mutate event
      //no IE 9 or 10
      $nodes.each(function () {
        $(this).triggerHandler('mutateme.zf.trigger');
      });
    }
  }

  function eventsListener() {
    if (!MutationObserver) {
      return false;
    }
    var nodes = document.querySelectorAll('[data-resize], [data-scroll], [data-mutate]');

    //element callback
    var listeningElementsMutation = function (mutationRecordsList) {
      var $target = $(mutationRecordsList[0].target);

      //trigger the event handler for the element depending on type
      switch (mutationRecordsList[0].type) {

        case "attributes":
          if ($target.attr("data-events") === "scroll" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('scrollme.zf.trigger', [$target, window.pageYOffset]);
          }
          if ($target.attr("data-events") === "resize" && mutationRecordsList[0].attributeName === "data-events") {
            $target.triggerHandler('resizeme.zf.trigger', [$target]);
          }
          if (mutationRecordsList[0].attributeName === "style") {
            $target.closest("[data-mutate]").attr("data-events", "mutate");
            $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          }
          break;

        case "childList":
          $target.closest("[data-mutate]").attr("data-events", "mutate");
          $target.closest("[data-mutate]").triggerHandler('mutateme.zf.trigger', [$target.closest("[data-mutate]")]);
          break;

        default:
          return false;
        //nothing
      }
    };

    if (nodes.length) {
      //for each element that needs to listen for resizing, scrolling, or mutation add a single observer
      for (var i = 0; i <= nodes.length - 1; i++) {
        var elementObserver = new MutationObserver(listeningElementsMutation);
        elementObserver.observe(nodes[i], { attributes: true, childList: true, characterData: false, subtree: true, attributeFilter: ["data-events", "style"] });
      }
    }
  }

  // ------------------------------------

  // [PH]
  // Foundation.CheckWatchers = checkWatchers;
  Foundation.IHearYou = checkListeners;
  // Foundation.ISeeYou = scrollListener;
  // Foundation.IFeelYou = closemeListener;
}(jQuery);

// function domMutationObserver(debounce) {
//   // !!! This is coming soon and needs more work; not active  !!! //
//   var timer,
//   nodes = document.querySelectorAll('[data-mutate]');
//   //
//   if (nodes.length) {
//     // var MutationObserver = (function () {
//     //   var prefixes = ['WebKit', 'Moz', 'O', 'Ms', ''];
//     //   for (var i=0; i < prefixes.length; i++) {
//     //     if (prefixes[i] + 'MutationObserver' in window) {
//     //       return window[prefixes[i] + 'MutationObserver'];
//     //     }
//     //   }
//     //   return false;
//     // }());
//
//
//     //for the body, we need to listen for all changes effecting the style and class attributes
//     var bodyObserver = new MutationObserver(bodyMutation);
//     bodyObserver.observe(document.body, { attributes: true, childList: true, characterData: false, subtree:true, attributeFilter:["style", "class"]});
//
//
//     //body callback
//     function bodyMutation(mutate) {
//       //trigger all listening elements and signal a mutation event
//       if (timer) { clearTimeout(timer); }
//
//       timer = setTimeout(function() {
//         bodyObserver.disconnect();
//         $('[data-mutate]').attr('data-events',"mutate");
//       }, debounce || 150);
//     }
//   }
// }
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Abide module.
   * @module foundation.abide
   */

  var Abide = function () {
    /**
     * Creates a new instance of Abide.
     * @class
     * @fires Abide#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Abide(element) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      _classCallCheck(this, Abide);

      this.$element = element;
      this.options = $.extend({}, Abide.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Abide');
    }

    /**
     * Initializes the Abide plugin and calls functions to get Abide functioning on load.
     * @private
     */


    _createClass(Abide, [{
      key: '_init',
      value: function _init() {
        this.$inputs = this.$element.find('input, textarea, select');

        this._events();
      }

      /**
       * Initializes events for Abide.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        this.$element.off('.abide').on('reset.zf.abide', function () {
          _this2.resetForm();
        }).on('submit.zf.abide', function () {
          return _this2.validateForm();
        });

        if (this.options.validateOn === 'fieldChange') {
          this.$inputs.off('change.zf.abide').on('change.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }

        if (this.options.liveValidate) {
          this.$inputs.off('input.zf.abide').on('input.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }

        if (this.options.validateOnBlur) {
          this.$inputs.off('blur.zf.abide').on('blur.zf.abide', function (e) {
            _this2.validateInput($(e.target));
          });
        }
      }

      /**
       * Calls necessary functions to update Abide upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        this._init();
      }

      /**
       * Checks whether or not a form element has the required attribute and if it's checked or not
       * @param {Object} element - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'requiredCheck',
      value: function requiredCheck($el) {
        if (!$el.attr('required')) return true;

        var isGood = true;

        switch ($el[0].type) {
          case 'checkbox':
            isGood = $el[0].checked;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            var opt = $el.find('option:selected');
            if (!opt.length || !opt.val()) isGood = false;
            break;

          default:
            if (!$el.val() || !$el.val().length) isGood = false;
        }

        return isGood;
      }

      /**
       * Based on $el, get the first element with selector in this order:
       * 1. The element's direct sibling('s).
       * 3. The element's parent's children.
       *
       * This allows for multiple form errors per input, though if none are found, no form errors will be shown.
       *
       * @param {Object} $el - jQuery object to use as reference to find the form error selector.
       * @returns {Object} jQuery object with the selector.
       */

    }, {
      key: 'findFormError',
      value: function findFormError($el) {
        var $error = $el.siblings(this.options.formErrorSelector);

        if (!$error.length) {
          $error = $el.parent().find(this.options.formErrorSelector);
        }

        return $error;
      }

      /**
       * Get the first element in this order:
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findLabel',
      value: function findLabel($el) {
        var id = $el[0].id;
        var $label = this.$element.find('label[for="' + id + '"]');

        if (!$label.length) {
          return $el.closest('label');
        }

        return $label;
      }

      /**
       * Get the set of labels associated with a set of radio els in this order
       * 2. The <label> with the attribute `[for="someInputId"]`
       * 3. The `.closest()` <label>
       *
       * @param {Object} $el - jQuery object to check for required attribute
       * @returns {Boolean} Boolean value depends on whether or not attribute is checked or empty
       */

    }, {
      key: 'findRadioLabels',
      value: function findRadioLabels($els) {
        var _this3 = this;

        var labels = $els.map(function (i, el) {
          var id = el.id;
          var $label = _this3.$element.find('label[for="' + id + '"]');

          if (!$label.length) {
            $label = $(el).closest('label');
          }
          return $label[0];
        });

        return $(labels);
      }

      /**
       * Adds the CSS error class as specified by the Abide settings to the label, input, and the form
       * @param {Object} $el - jQuery object to add the class to
       */

    }, {
      key: 'addErrorClasses',
      value: function addErrorClasses($el) {
        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.addClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.addClass(this.options.formErrorClass);
        }

        $el.addClass(this.options.inputErrorClass).attr('data-invalid', '');
      }

      /**
       * Remove CSS error classes etc from an entire radio button group
       * @param {String} groupName - A string that specifies the name of a radio button group
       *
       */

    }, {
      key: 'removeRadioErrorClasses',
      value: function removeRadioErrorClasses(groupName) {
        var $els = this.$element.find(':radio[name="' + groupName + '"]');
        var $labels = this.findRadioLabels($els);
        var $formErrors = this.findFormError($els);

        if ($labels.length) {
          $labels.removeClass(this.options.labelErrorClass);
        }

        if ($formErrors.length) {
          $formErrors.removeClass(this.options.formErrorClass);
        }

        $els.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Removes CSS error class as specified by the Abide settings from the label, input, and the form
       * @param {Object} $el - jQuery object to remove the class from
       */

    }, {
      key: 'removeErrorClasses',
      value: function removeErrorClasses($el) {
        // radios need to clear all of the els
        if ($el[0].type == 'radio') {
          return this.removeRadioErrorClasses($el.attr('name'));
        }

        var $label = this.findLabel($el);
        var $formError = this.findFormError($el);

        if ($label.length) {
          $label.removeClass(this.options.labelErrorClass);
        }

        if ($formError.length) {
          $formError.removeClass(this.options.formErrorClass);
        }

        $el.removeClass(this.options.inputErrorClass).removeAttr('data-invalid');
      }

      /**
       * Goes through a form to find inputs and proceeds to validate them in ways specific to their type
       * @fires Abide#invalid
       * @fires Abide#valid
       * @param {Object} element - jQuery object to validate, should be an HTML input
       * @returns {Boolean} goodToGo - If the input is valid or not.
       */

    }, {
      key: 'validateInput',
      value: function validateInput($el) {
        var _this4 = this;

        var clearRequire = this.requiredCheck($el),
            validated = false,
            customValidator = true,
            validator = $el.attr('data-validator'),
            equalTo = true;

        // don't validate ignored inputs or hidden inputs
        if ($el.is('[data-abide-ignore]') || $el.is('[type="hidden"]')) {
          return true;
        }

        switch ($el[0].type) {
          case 'radio':
            validated = this.validateRadio($el.attr('name'));
            break;

          case 'checkbox':
            validated = clearRequire;
            break;

          case 'select':
          case 'select-one':
          case 'select-multiple':
            validated = clearRequire;
            break;

          default:
            validated = this.validateText($el);
        }

        if (validator) {
          customValidator = this.matchValidation($el, validator, $el.attr('required'));
        }

        if ($el.attr('data-equalto')) {
          equalTo = this.options.validators.equalTo($el);
        }

        var goodToGo = [clearRequire, validated, customValidator, equalTo].indexOf(false) === -1;
        var message = (goodToGo ? 'valid' : 'invalid') + '.zf.abide';

        if (goodToGo) {
          // Re-validate inputs that depend on this one with equalto
          var dependentElements = this.$element.find('[data-equalto="' + $el.attr('id') + '"]');
          if (dependentElements.length) {
            (function () {
              var _this = _this4;
              dependentElements.each(function () {
                if ($(this).val()) {
                  _this.validateInput($(this));
                }
              });
            })();
          }
        }

        this[goodToGo ? 'removeErrorClasses' : 'addErrorClasses']($el);

        /**
         * Fires when the input is done checking for validation. Event trigger is either `valid.zf.abide` or `invalid.zf.abide`
         * Trigger includes the DOM element of the input.
         * @event Abide#valid
         * @event Abide#invalid
         */
        $el.trigger(message, [$el]);

        return goodToGo;
      }

      /**
       * Goes through a form and if there are any invalid inputs, it will display the form error element
       * @returns {Boolean} noError - true if no errors were detected...
       * @fires Abide#formvalid
       * @fires Abide#forminvalid
       */

    }, {
      key: 'validateForm',
      value: function validateForm() {
        var acc = [];
        var _this = this;

        this.$inputs.each(function () {
          acc.push(_this.validateInput($(this)));
        });

        var noError = acc.indexOf(false) === -1;

        this.$element.find('[data-abide-error]').css('display', noError ? 'none' : 'block');

        /**
         * Fires when the form is finished validating. Event trigger is either `formvalid.zf.abide` or `forminvalid.zf.abide`.
         * Trigger includes the element of the form.
         * @event Abide#formvalid
         * @event Abide#forminvalid
         */
        this.$element.trigger((noError ? 'formvalid' : 'forminvalid') + '.zf.abide', [this.$element]);

        return noError;
      }

      /**
       * Determines whether or a not a text input is valid based on the pattern specified in the attribute. If no matching pattern is found, returns true.
       * @param {Object} $el - jQuery object to validate, should be a text input HTML element
       * @param {String} pattern - string value of one of the RegEx patterns in Abide.options.patterns
       * @returns {Boolean} Boolean value depends on whether or not the input value matches the pattern specified
       */

    }, {
      key: 'validateText',
      value: function validateText($el, pattern) {
        // A pattern can be passed to this function, or it will be infered from the input's "pattern" attribute, or it's "type" attribute
        pattern = pattern || $el.attr('pattern') || $el.attr('type');
        var inputText = $el.val();
        var valid = false;

        if (inputText.length) {
          // If the pattern attribute on the element is in Abide's list of patterns, then test that regexp
          if (this.options.patterns.hasOwnProperty(pattern)) {
            valid = this.options.patterns[pattern].test(inputText);
          }
          // If the pattern name isn't also the type attribute of the field, then test it as a regexp
          else if (pattern !== $el.attr('type')) {
              valid = new RegExp(pattern).test(inputText);
            } else {
              valid = true;
            }
        }
        // An empty field is valid if it's not required
        else if (!$el.prop('required')) {
            valid = true;
          }

        return valid;
      }

      /**
       * Determines whether or a not a radio input is valid based on whether or not it is required and selected. Although the function targets a single `<input>`, it validates by checking the `required` and `checked` properties of all radio buttons in its group.
       * @param {String} groupName - A string that specifies the name of a radio button group
       * @returns {Boolean} Boolean value depends on whether or not at least one radio input has been selected (if it's required)
       */

    }, {
      key: 'validateRadio',
      value: function validateRadio(groupName) {
        // If at least one radio in the group has the `required` attribute, the group is considered required
        // Per W3C spec, all radio buttons in a group should have `required`, but we're being nice
        var $group = this.$element.find(':radio[name="' + groupName + '"]');
        var valid = false,
            required = false;

        // For the group to be required, at least one radio needs to be required
        $group.each(function (i, e) {
          if ($(e).attr('required')) {
            required = true;
          }
        });
        if (!required) valid = true;

        if (!valid) {
          // For the group to be valid, at least one radio needs to be checked
          $group.each(function (i, e) {
            if ($(e).prop('checked')) {
              valid = true;
            }
          });
        };

        return valid;
      }

      /**
       * Determines if a selected input passes a custom validation function. Multiple validations can be used, if passed to the element with `data-validator="foo bar baz"` in a space separated listed.
       * @param {Object} $el - jQuery input element.
       * @param {String} validators - a string of function names matching functions in the Abide.options.validators object.
       * @param {Boolean} required - self explanatory?
       * @returns {Boolean} - true if validations passed.
       */

    }, {
      key: 'matchValidation',
      value: function matchValidation($el, validators, required) {
        var _this5 = this;

        required = required ? true : false;

        var clear = validators.split(' ').map(function (v) {
          return _this5.options.validators[v]($el, required, $el.parent());
        });
        return clear.indexOf(false) === -1;
      }

      /**
       * Resets form inputs and styles
       * @fires Abide#formreset
       */

    }, {
      key: 'resetForm',
      value: function resetForm() {
        var $form = this.$element,
            opts = this.options;

        $('.' + opts.labelErrorClass, $form).not('small').removeClass(opts.labelErrorClass);
        $('.' + opts.inputErrorClass, $form).not('small').removeClass(opts.inputErrorClass);
        $(opts.formErrorSelector + '.' + opts.formErrorClass).removeClass(opts.formErrorClass);
        $form.find('[data-abide-error]').css('display', 'none');
        $(':input', $form).not(':button, :submit, :reset, :hidden, :radio, :checkbox, [data-abide-ignore]').val('').removeAttr('data-invalid');
        $(':input:radio', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        $(':input:checkbox', $form).not('[data-abide-ignore]').prop('checked', false).removeAttr('data-invalid');
        /**
         * Fires when the form has been reset.
         * @event Abide#formreset
         */
        $form.trigger('formreset.zf.abide', [$form]);
      }

      /**
       * Destroys an instance of Abide.
       * Removes error styles and classes from elements, without resetting their values.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        var _this = this;
        this.$element.off('.abide').find('[data-abide-error]').css('display', 'none');

        this.$inputs.off('.abide').each(function () {
          _this.removeErrorClasses($(this));
        });

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Abide;
  }();

  /**
   * Default settings for plugin
   */


  Abide.defaults = {
    /**
     * The default event to validate inputs. Checkboxes and radios validate immediately.
     * Remove or change this value for manual validation.
     * @option
     * @example 'fieldChange'
     */
    validateOn: 'fieldChange',

    /**
     * Class to be applied to input labels on failed validation.
     * @option
     * @example 'is-invalid-label'
     */
    labelErrorClass: 'is-invalid-label',

    /**
     * Class to be applied to inputs on failed validation.
     * @option
     * @example 'is-invalid-input'
     */
    inputErrorClass: 'is-invalid-input',

    /**
     * Class selector to use to target Form Errors for show/hide.
     * @option
     * @example '.form-error'
     */
    formErrorSelector: '.form-error',

    /**
     * Class added to Form Errors on failed validation.
     * @option
     * @example 'is-visible'
     */
    formErrorClass: 'is-visible',

    /**
     * Set to true to validate text inputs on any value change.
     * @option
     * @example false
     */
    liveValidate: false,

    /**
     * Set to true to validate inputs on blur.
     * @option
     * @example false
     */
    validateOnBlur: false,

    patterns: {
      alpha: /^[a-zA-Z]+$/,
      alpha_numeric: /^[a-zA-Z0-9]+$/,
      integer: /^[-+]?\d+$/,
      number: /^[-+]?\d*(?:[\.\,]\d+)?$/,

      // amex, visa, diners
      card: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/,
      cvv: /^([0-9]){3,4}$/,

      // http://www.whatwg.org/specs/web-apps/current-work/multipage/states-of-the-type-attribute.html#valid-e-mail-address
      email: /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,

      url: /^(https?|ftp|file|ssh):\/\/(((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-zA-Z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-zA-Z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/,
      // abc.de
      domain: /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,8}$/,

      datetime: /^([0-2][0-9]{3})\-([0-1][0-9])\-([0-3][0-9])T([0-5][0-9])\:([0-5][0-9])\:([0-5][0-9])(Z|([\-\+]([0-1][0-9])\:00))$/,
      // YYYY-MM-DD
      date: /(?:19|20)[0-9]{2}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1[0-9]|2[0-9])|(?:(?!02)(?:0[1-9]|1[0-2])-(?:30))|(?:(?:0[13578]|1[02])-31))$/,
      // HH:MM:SS
      time: /^(0[0-9]|1[0-9]|2[0-3])(:[0-5][0-9]){2}$/,
      dateISO: /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
      // MM/DD/YYYY
      month_day_year: /^(0[1-9]|1[012])[- \/.](0[1-9]|[12][0-9]|3[01])[- \/.]\d{4}$/,
      // DD/MM/YYYY
      day_month_year: /^(0[1-9]|[12][0-9]|3[01])[- \/.](0[1-9]|1[012])[- \/.]\d{4}$/,

      // #FFF or #FFFFFF
      color: /^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/
    },

    /**
     * Optional validation functions to be used. `equalTo` being the only default included function.
     * Functions should return only a boolean if the input is valid or not. Functions are given the following arguments:
     * el : The jQuery element to validate.
     * required : Boolean value of the required attribute be present or not.
     * parent : The direct parent of the input.
     * @option
     */
    validators: {
      equalTo: function (el, required, parent) {
        return $('#' + el.attr('data-equalto')).val() === el.val();
      }
    }
  };

  // Window exports
  Foundation.plugin(Abide, 'Abide');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Accordion module.
   * @module foundation.accordion
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   */

  var Accordion = function () {
    /**
     * Creates a new instance of an accordion.
     * @class
     * @fires Accordion#init
     * @param {jQuery} element - jQuery object to make into an accordion.
     * @param {Object} options - a plain object with settings to override the default options.
     */
    function Accordion(element, options) {
      _classCallCheck(this, Accordion);

      this.$element = element;
      this.options = $.extend({}, Accordion.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Accordion');
      Foundation.Keyboard.register('Accordion', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_DOWN': 'next',
        'ARROW_UP': 'previous'
      });
    }

    /**
     * Initializes the accordion by animating the preset active pane(s).
     * @private
     */


    _createClass(Accordion, [{
      key: '_init',
      value: function _init() {
        this.$element.attr('role', 'tablist');
        this.$tabs = this.$element.children('[data-accordion-item]');

        this.$tabs.each(function (idx, el) {
          var $el = $(el),
              $content = $el.children('[data-tab-content]'),
              id = $content[0].id || Foundation.GetYoDigits(6, 'accordion'),
              linkId = el.id || id + '-label';

          $el.find('a:first').attr({
            'aria-controls': id,
            'role': 'tab',
            'id': linkId,
            'aria-expanded': false,
            'aria-selected': false
          });

          $content.attr({ 'role': 'tabpanel', 'aria-labelledby': linkId, 'aria-hidden': true, 'id': id });
        });
        var $initActive = this.$element.find('.is-active').children('[data-tab-content]');
        if ($initActive.length) {
          this.down($initActive, true);
        }
        this._events();
      }

      /**
       * Adds event handlers for items within the accordion.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$tabs.each(function () {
          var $elem = $(this);
          var $tabContent = $elem.children('[data-tab-content]');
          if ($tabContent.length) {
            $elem.children('a').off('click.zf.accordion keydown.zf.accordion').on('click.zf.accordion', function (e) {
              e.preventDefault();
              _this.toggle($tabContent);
            }).on('keydown.zf.accordion', function (e) {
              Foundation.Keyboard.handleKey(e, 'Accordion', {
                toggle: function () {
                  _this.toggle($tabContent);
                },
                next: function () {
                  var $a = $elem.next().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                previous: function () {
                  var $a = $elem.prev().find('a').focus();
                  if (!_this.options.multiExpand) {
                    $a.trigger('click.zf.accordion');
                  }
                },
                handled: function () {
                  e.preventDefault();
                  e.stopPropagation();
                }
              });
            });
          }
        });
      }

      /**
       * Toggles the selected content pane's open/close state.
       * @param {jQuery} $target - jQuery object of the pane to toggle (`.accordion-content`).
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if ($target.parent().hasClass('is-active')) {
          this.up($target);
        } else {
          this.down($target);
        }
      }

      /**
       * Opens the accordion tab defined by `$target`.
       * @param {jQuery} $target - Accordion pane to open (`.accordion-content`).
       * @param {Boolean} firstTime - flag to determine if reflow should happen.
       * @fires Accordion#down
       * @function
       */

    }, {
      key: 'down',
      value: function down($target, firstTime) {
        var _this2 = this;

        $target.attr('aria-hidden', false).parent('[data-tab-content]').addBack().parent().addClass('is-active');

        if (!this.options.multiExpand && !firstTime) {
          var $currentActive = this.$element.children('.is-active').children('[data-tab-content]');
          if ($currentActive.length) {
            this.up($currentActive.not($target));
          }
        }

        $target.slideDown(this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done opening.
           * @event Accordion#down
           */
          _this2.$element.trigger('down.zf.accordion', [$target]);
        });

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': true,
          'aria-selected': true
        });
      }

      /**
       * Closes the tab defined by `$target`.
       * @param {jQuery} $target - Accordion tab to close (`.accordion-content`).
       * @fires Accordion#up
       * @function
       */

    }, {
      key: 'up',
      value: function up($target) {
        var $aunts = $target.parent().siblings(),
            _this = this;

        if (!this.options.allowAllClosed && !$aunts.hasClass('is-active') || !$target.parent().hasClass('is-active')) {
          return;
        }

        // Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the tab is done collapsing up.
           * @event Accordion#up
           */
          _this.$element.trigger('up.zf.accordion', [$target]);
        });
        // });

        $target.attr('aria-hidden', true).parent().removeClass('is-active');

        $('#' + $target.attr('aria-labelledby')).attr({
          'aria-expanded': false,
          'aria-selected': false
        });
      }

      /**
       * Destroys an instance of an accordion.
       * @fires Accordion#destroyed
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-tab-content]').stop(true).slideUp(0).css('display', '');
        this.$element.find('a').off('.zf.accordion');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Accordion;
  }();

  Accordion.defaults = {
    /**
     * Amount of time to animate the opening of an accordion pane.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the accordion to have multiple open panes.
     * @option
     * @example false
     */
    multiExpand: false,
    /**
     * Allow the accordion to close all panes.
     * @option
     * @example false
     */
    allowAllClosed: false
  };

  // Window exports
  Foundation.plugin(Accordion, 'Accordion');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * AccordionMenu module.
   * @module foundation.accordionMenu
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var AccordionMenu = function () {
    /**
     * Creates a new instance of an accordion menu.
     * @class
     * @fires AccordionMenu#init
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function AccordionMenu(element, options) {
      _classCallCheck(this, AccordionMenu);

      this.$element = element;
      this.options = $.extend({}, AccordionMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'accordion');

      this._init();

      Foundation.registerPlugin(this, 'AccordionMenu');
      Foundation.Keyboard.register('AccordionMenu', {
        'ENTER': 'toggle',
        'SPACE': 'toggle',
        'ARROW_RIGHT': 'open',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'close',
        'ESCAPE': 'closeAll'
      });
    }

    /**
     * Initializes the accordion menu by hiding all nested menus.
     * @private
     */


    _createClass(AccordionMenu, [{
      key: '_init',
      value: function _init() {
        this.$element.find('[data-submenu]').not('.is-active').slideUp(0); //.find('a').css('padding-left', '1rem');
        this.$element.attr({
          'role': 'menu',
          'aria-multiselectable': this.options.multiOpen
        });

        this.$menuLinks = this.$element.find('.is-accordion-submenu-parent');
        this.$menuLinks.each(function () {
          var linkId = this.id || Foundation.GetYoDigits(6, 'acc-menu-link'),
              $elem = $(this),
              $sub = $elem.children('[data-submenu]'),
              subId = $sub[0].id || Foundation.GetYoDigits(6, 'acc-menu'),
              isActive = $sub.hasClass('is-active');
          $elem.attr({
            'aria-controls': subId,
            'aria-expanded': isActive,
            'role': 'menuitem',
            'id': linkId
          });
          $sub.attr({
            'aria-labelledby': linkId,
            'aria-hidden': !isActive,
            'role': 'menu',
            'id': subId
          });
        });
        var initPanes = this.$element.find('.is-active');
        if (initPanes.length) {
          var _this = this;
          initPanes.each(function () {
            _this.down($(this));
          });
        }
        this._events();
      }

      /**
       * Adds event handlers for items within the menu.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this.$element.find('li').each(function () {
          var $submenu = $(this).children('[data-submenu]');

          if ($submenu.length) {
            $(this).children('a').off('click.zf.accordionMenu').on('click.zf.accordionMenu', function (e) {
              e.preventDefault();

              _this.toggle($submenu);
            });
          }
        }).on('keydown.zf.accordionmenu', function (e) {
          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement,
              $target = $element.children('[data-submenu]');

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1)).find('a').first();
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1)).find('a').first();

              if ($(this).children('[data-submenu]:visible').length) {
                // has open sub menu
                $nextElement = $element.find('li:first-child').find('a').first();
              }
              if ($(this).is(':first-child')) {
                // is first element of sub menu
                $prevElement = $element.parents('li').first().find('a').first();
              } else if ($prevElement.parents('li').first().children('[data-submenu]:visible').length) {
                // if previous element has open sub menu
                $prevElement = $prevElement.parents('li').find('li:last-child').find('a').first();
              }
              if ($(this).is(':last-child')) {
                // is last element of sub menu
                $nextElement = $element.parents('li').first().next('li').find('a').first();
              }

              return;
            }
          });

          Foundation.Keyboard.handleKey(e, 'AccordionMenu', {
            open: function () {
              if ($target.is(':hidden')) {
                _this.down($target);
                $target.find('li').first().find('a').first().focus();
              }
            },
            close: function () {
              if ($target.length && !$target.is(':hidden')) {
                // close active sub of this item
                _this.up($target);
              } else if ($element.parent('[data-submenu]').length) {
                // close currently open sub
                _this.up($element.parent('[data-submenu]'));
                $element.parents('li').first().find('a').first().focus();
              }
            },
            up: function () {
              $prevElement.focus();
              return true;
            },
            down: function () {
              $nextElement.focus();
              return true;
            },
            toggle: function () {
              if ($element.children('[data-submenu]').length) {
                _this.toggle($element.children('[data-submenu]'));
              }
            },
            closeAll: function () {
              _this.hideAll();
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); //.attr('tabindex', 0);
      }

      /**
       * Closes all panes of the menu.
       * @function
       */

    }, {
      key: 'hideAll',
      value: function hideAll() {
        this.up(this.$element.find('[data-submenu]'));
      }

      /**
       * Opens all panes of the menu.
       * @function
       */

    }, {
      key: 'showAll',
      value: function showAll() {
        this.down(this.$element.find('[data-submenu]'));
      }

      /**
       * Toggles the open/close state of a submenu.
       * @function
       * @param {jQuery} $target - the submenu to toggle
       */

    }, {
      key: 'toggle',
      value: function toggle($target) {
        if (!$target.is(':animated')) {
          if (!$target.is(':hidden')) {
            this.up($target);
          } else {
            this.down($target);
          }
        }
      }

      /**
       * Opens the sub-menu defined by `$target`.
       * @param {jQuery} $target - Sub-menu to open.
       * @fires AccordionMenu#down
       */

    }, {
      key: 'down',
      value: function down($target) {
        var _this = this;

        if (!this.options.multiOpen) {
          this.up(this.$element.find('.is-active').not($target.parentsUntil(this.$element).add($target)));
        }

        $target.addClass('is-active').attr({ 'aria-hidden': false }).parent('.is-accordion-submenu-parent').attr({ 'aria-expanded': true });

        //Foundation.Move(this.options.slideSpeed, $target, function() {
        $target.slideDown(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done opening.
           * @event AccordionMenu#down
           */
          _this.$element.trigger('down.zf.accordionMenu', [$target]);
        });
        //});
      }

      /**
       * Closes the sub-menu defined by `$target`. All sub-menus inside the target will be closed as well.
       * @param {jQuery} $target - Sub-menu to close.
       * @fires AccordionMenu#up
       */

    }, {
      key: 'up',
      value: function up($target) {
        var _this = this;
        //Foundation.Move(this.options.slideSpeed, $target, function(){
        $target.slideUp(_this.options.slideSpeed, function () {
          /**
           * Fires when the menu is done collapsing up.
           * @event AccordionMenu#up
           */
          _this.$element.trigger('up.zf.accordionMenu', [$target]);
        });
        //});

        var $menus = $target.find('[data-submenu]').slideUp(0).addBack().attr('aria-hidden', true);

        $menus.parent('.is-accordion-submenu-parent').attr('aria-expanded', false);
      }

      /**
       * Destroys an instance of accordion menu.
       * @fires AccordionMenu#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('[data-submenu]').slideDown(0).css('display', '');
        this.$element.find('a').off('click.zf.accordionMenu');

        Foundation.Nest.Burn(this.$element, 'accordion');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return AccordionMenu;
  }();

  AccordionMenu.defaults = {
    /**
     * Amount of time to animate the opening of a submenu in ms.
     * @option
     * @example 250
     */
    slideSpeed: 250,
    /**
     * Allow the menu to have multiple open panes.
     * @option
     * @example true
     */
    multiOpen: true
  };

  // Window exports
  Foundation.plugin(AccordionMenu, 'AccordionMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Drilldown module.
   * @module foundation.drilldown
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.nest
   */

  var Drilldown = function () {
    /**
     * Creates a new instance of a drilldown menu.
     * @class
     * @param {jQuery} element - jQuery object to make into an accordion menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Drilldown(element, options) {
      _classCallCheck(this, Drilldown);

      this.$element = element;
      this.options = $.extend({}, Drilldown.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'drilldown');

      this._init();

      Foundation.registerPlugin(this, 'Drilldown');
      Foundation.Keyboard.register('Drilldown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close',
        'TAB': 'down',
        'SHIFT_TAB': 'up'
      });
    }

    /**
     * Initializes the drilldown by creating jQuery collections of elements
     * @private
     */


    _createClass(Drilldown, [{
      key: '_init',
      value: function _init() {
        this.$submenuAnchors = this.$element.find('li.is-drilldown-submenu-parent').children('a');
        this.$submenus = this.$submenuAnchors.parent('li').children('[data-submenu]');
        this.$menuItems = this.$element.find('li').not('.js-drilldown-back').attr('role', 'menuitem').find('a');
        this.$element.attr('data-mutate', this.$element.attr('data-drilldown') || Foundation.GetYoDigits(6, 'drilldown'));

        this._prepareMenu();
        this._registerEvents();

        this._keyboardEvents();
      }

      /**
       * prepares drilldown menu by setting attributes to links and elements
       * sets a min height to prevent content jumping
       * wraps the element if not already wrapped
       * @private
       * @function
       */

    }, {
      key: '_prepareMenu',
      value: function _prepareMenu() {
        var _this = this;
        // if(!this.options.holdOpen){
        //   this._menuLinkEvents();
        // }
        this.$submenuAnchors.each(function () {
          var $link = $(this);
          var $sub = $link.parent();
          if (_this.options.parentLink) {
            $link.clone().prependTo($sub.children('[data-submenu]')).wrap('<li class="is-submenu-parent-item is-submenu-item is-drilldown-submenu-item" role="menu-item"></li>');
          }
          $link.data('savedHref', $link.attr('href')).removeAttr('href').attr('tabindex', 0);
          $link.children('[data-submenu]').attr({
            'aria-hidden': true,
            'tabindex': 0,
            'role': 'menu'
          });
          _this._events($link);
        });
        this.$submenus.each(function () {
          var $menu = $(this),
              $back = $menu.find('.js-drilldown-back');
          if (!$back.length) {
            switch (_this.options.backButtonPosition) {
              case "bottom":
                $menu.append(_this.options.backButton);
                break;
              case "top":
                $menu.prepend(_this.options.backButton);
                break;
              default:
                console.error("Unsupported backButtonPosition value '" + _this.options.backButtonPosition + "'");
            }
          }
          _this._back($menu);
        });

        if (!this.options.autoHeight) {
          this.$submenus.addClass('drilldown-submenu-cover-previous');
        }

        if (!this.$element.parent().hasClass('is-drilldown')) {
          this.$wrapper = $(this.options.wrapper).addClass('is-drilldown');
          if (this.options.animateHeight) this.$wrapper.addClass('animate-height');
          this.$wrapper = this.$element.wrap(this.$wrapper).parent().css(this._getMaxDims());
        }
      }
    }, {
      key: '_resize',
      value: function _resize() {
        this.$wrapper.css({ 'max-width': 'none', 'min-height': 'none' });
        // _getMaxDims has side effects (boo) but calling it should update all other necessary heights & widths
        this.$wrapper.css(this._getMaxDims());
      }

      /**
       * Adds event handlers to elements in the menu.
       * @function
       * @private
       * @param {jQuery} $elem - the current menu item to add handlers to.
       */

    }, {
      key: '_events',
      value: function _events($elem) {
        var _this = this;

        $elem.off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          if ($(e.target).parentsUntil('ul', 'li').hasClass('is-drilldown-submenu-parent')) {
            e.stopImmediatePropagation();
            e.preventDefault();
          }

          // if(e.target !== e.currentTarget.firstElementChild){
          //   return false;
          // }
          _this._show($elem.parent('li'));

          if (_this.options.closeOnClick) {
            var $body = $('body');
            $body.off('.zf.drilldown').on('click.zf.drilldown', function (e) {
              if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target)) {
                return;
              }
              e.preventDefault();
              _this._hideAll();
              $body.off('.zf.drilldown');
            });
          }
        });
        this.$element.on('mutateme.zf.trigger', this._resize.bind(this));
      }

      /**
       * Adds event handlers to the menu element.
       * @function
       * @private
       */

    }, {
      key: '_registerEvents',
      value: function _registerEvents() {
        if (this.options.scrollTop) {
          this._bindHandler = this._scrollTop.bind(this);
          this.$element.on('open.zf.drilldown hide.zf.drilldown closed.zf.drilldown', this._bindHandler);
        }
      }

      /**
       * Scroll to Top of Element or data-scroll-top-element
       * @function
       * @fires Drilldown#scrollme
       */

    }, {
      key: '_scrollTop',
      value: function _scrollTop() {
        var _this = this;
        var $scrollTopElement = _this.options.scrollTopElement != '' ? $(_this.options.scrollTopElement) : _this.$element,
            scrollPos = parseInt($scrollTopElement.offset().top + _this.options.scrollTopOffset);
        $('html, body').stop(true).animate({ scrollTop: scrollPos }, _this.options.animationDuration, _this.options.animationEasing, function () {
          /**
            * Fires after the menu has scrolled
            * @event Drilldown#scrollme
            */
          if (this === $('html')[0]) _this.$element.trigger('scrollme.zf.drilldown');
        });
      }

      /**
       * Adds keydown event listener to `li`'s in the menu.
       * @private
       */

    }, {
      key: '_keyboardEvents',
      value: function _keyboardEvents() {
        var _this = this;

        this.$menuItems.add(this.$element.find('.js-drilldown-back > a, .is-submenu-parent-item > a')).on('keydown.zf.drilldown', function (e) {
          var $element = $(this),
              $elements = $element.parent('li').parent('ul').children('li').children('a'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(Math.max(0, i - 1));
              $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              return;
            }
          });

          Foundation.Keyboard.handleKey(e, 'Drilldown', {
            next: function () {
              if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
                return true;
              }
            },
            previous: function () {
              _this._hide($element.parent('li').parent('ul'));
              $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                setTimeout(function () {
                  $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                }, 1);
              });
              return true;
            },
            up: function () {
              $prevElement.focus();
              return true;
            },
            down: function () {
              $nextElement.focus();
              return true;
            },
            close: function () {
              _this._back();
              //_this.$menuItems.first().focus(); // focus to first element
            },
            open: function () {
              if (!$element.is(_this.$menuItems)) {
                // not menu item means back button
                _this._hide($element.parent('li').parent('ul'));
                $element.parent('li').parent('ul').one(Foundation.transitionend($element), function () {
                  setTimeout(function () {
                    $element.parent('li').parent('ul').parent('li').children('a').first().focus();
                  }, 1);
                });
                return true;
              } else if ($element.is(_this.$submenuAnchors)) {
                _this._show($element.parent('li'));
                $element.parent('li').one(Foundation.transitionend($element), function () {
                  $element.parent('li').find('ul li a').filter(_this.$menuItems).first().focus();
                });
                return true;
              }
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
              e.stopImmediatePropagation();
            }
          });
        }); // end keyboardAccess
      }

      /**
       * Closes all open elements, and returns to root menu.
       * @function
       * @fires Drilldown#closed
       */

    }, {
      key: '_hideAll',
      value: function _hideAll() {
        var $elem = this.$element.find('.is-drilldown-submenu.is-active').addClass('is-closing');
        if (this.options.autoHeight) this.$wrapper.css({ height: $elem.parent().closest('ul').data('calcHeight') });
        $elem.one(Foundation.transitionend($elem), function (e) {
          $elem.removeClass('is-active is-closing');
        });
        /**
         * Fires when the menu is fully closed.
         * @event Drilldown#closed
         */
        this.$element.trigger('closed.zf.drilldown');
      }

      /**
       * Adds event listener for each `back` button, and closes open menus.
       * @function
       * @fires Drilldown#back
       * @param {jQuery} $elem - the current sub-menu to add `back` event.
       */

    }, {
      key: '_back',
      value: function _back($elem) {
        var _this = this;
        $elem.off('click.zf.drilldown');
        $elem.children('.js-drilldown-back').on('click.zf.drilldown', function (e) {
          e.stopImmediatePropagation();
          // console.log('mouseup on back');
          _this._hide($elem);

          // If there is a parent submenu, call show
          var parentSubMenu = $elem.parent('li').parent('ul').parent('li');
          if (parentSubMenu.length) {
            _this._show(parentSubMenu);
          }
        });
      }

      /**
       * Adds event listener to menu items w/o submenus to close open menus on click.
       * @function
       * @private
       */

    }, {
      key: '_menuLinkEvents',
      value: function _menuLinkEvents() {
        var _this = this;
        this.$menuItems.not('.is-drilldown-submenu-parent').off('click.zf.drilldown').on('click.zf.drilldown', function (e) {
          // e.stopImmediatePropagation();
          setTimeout(function () {
            _this._hideAll();
          }, 0);
        });
      }

      /**
       * Opens a submenu.
       * @function
       * @fires Drilldown#open
       * @param {jQuery} $elem - the current element with a submenu to open, i.e. the `li` tag.
       */

    }, {
      key: '_show',
      value: function _show($elem) {
        if (this.options.autoHeight) this.$wrapper.css({ height: $elem.children('[data-submenu]').data('calcHeight') });
        $elem.attr('aria-expanded', true);
        $elem.children('[data-submenu]').addClass('is-active').attr('aria-hidden', false);
        /**
         * Fires when the submenu has opened.
         * @event Drilldown#open
         */
        this.$element.trigger('open.zf.drilldown', [$elem]);
      }
    }, {
      key: '_hide',


      /**
       * Hides a submenu
       * @function
       * @fires Drilldown#hide
       * @param {jQuery} $elem - the current sub-menu to hide, i.e. the `ul` tag.
       */
      value: function _hide($elem) {
        if (this.options.autoHeight) this.$wrapper.css({ height: $elem.parent().closest('ul').data('calcHeight') });
        var _this = this;
        $elem.parent('li').attr('aria-expanded', false);
        $elem.attr('aria-hidden', true).addClass('is-closing');
        $elem.addClass('is-closing').one(Foundation.transitionend($elem), function () {
          $elem.removeClass('is-active is-closing');
          $elem.blur();
        });
        /**
         * Fires when the submenu has closed.
         * @event Drilldown#hide
         */
        $elem.trigger('hide.zf.drilldown', [$elem]);
      }

      /**
       * Iterates through the nested menus to calculate the min-height, and max-width for the menu.
       * Prevents content jumping.
       * @function
       * @private
       */

    }, {
      key: '_getMaxDims',
      value: function _getMaxDims() {
        var maxHeight = 0,
            result = {},
            _this = this;
        this.$submenus.add(this.$element).each(function () {
          var numOfElems = $(this).children('li').length;
          var height = Foundation.Box.GetDimensions(this).height;
          maxHeight = height > maxHeight ? height : maxHeight;
          if (_this.options.autoHeight) {
            $(this).data('calcHeight', height);
            if (!$(this).hasClass('is-drilldown-submenu')) result['height'] = height;
          }
        });

        if (!this.options.autoHeight) result['min-height'] = maxHeight + 'px';

        result['max-width'] = this.$element[0].getBoundingClientRect().width + 'px';

        return result;
      }

      /**
       * Destroys the Drilldown Menu
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        if (this.options.scrollTop) this.$element.off('.zf.drilldown', this._bindHandler);
        this._hideAll();
        this.$element.off('mutateme.zf.trigger');
        Foundation.Nest.Burn(this.$element, 'drilldown');
        this.$element.unwrap().find('.js-drilldown-back, .is-submenu-parent-item').remove().end().find('.is-active, .is-closing, .is-drilldown-submenu').removeClass('is-active is-closing is-drilldown-submenu').end().find('[data-submenu]').removeAttr('aria-hidden tabindex role');
        this.$submenuAnchors.each(function () {
          $(this).off('.zf.drilldown');
        });

        this.$submenus.removeClass('drilldown-submenu-cover-previous');

        this.$element.find('a').each(function () {
          var $link = $(this);
          $link.removeAttr('tabindex');
          if ($link.data('savedHref')) {
            $link.attr('href', $link.data('savedHref')).removeData('savedHref');
          } else {
            return;
          }
        });
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Drilldown;
  }();

  Drilldown.defaults = {
    /**
     * Markup used for JS generated back button. Prepended  or appended (see backButtonPosition) to submenu lists and deleted on `destroy` method, 'js-drilldown-back' class required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\li><\a>Back<\/a><\/li>'
     */
    backButton: '<li class="js-drilldown-back"><a tabindex="0">Back</a></li>',
    /**
     * Position the back button either at the top or bottom of drilldown submenus.
     * @option
     * @example bottom
     */
    backButtonPosition: 'top',
    /**
     * Markup used to wrap drilldown menu. Use a class name for independent styling; the JS applied class: `is-drilldown` is required. Remove the backslash (`\`) if copy and pasting.
     * @option
     * @example '<\div class="is-drilldown"><\/div>'
     */
    wrapper: '<div></div>',
    /**
     * Adds the parent link to the submenu.
     * @option
     * @example false
     */
    parentLink: false,
    /**
     * Allow the menu to return to root list on body click.
     * @option
     * @example false
     */
    closeOnClick: false,
    /**
     * Allow the menu to auto adjust height.
     * @option
     * @example false
     */
    autoHeight: false,
    /**
     * Animate the auto adjust height.
     * @option
     * @example false
     */
    animateHeight: false,
    /**
     * Scroll to the top of the menu after opening a submenu or navigating back using the menu back button
     * @option
     * @example false
     */
    scrollTop: false,
    /**
     * String jquery selector (for example 'body') of element to take offset().top from, if empty string the drilldown menu offset().top is taken
     * @option
     * @example ''
     */
    scrollTopElement: '',
    /**
     * ScrollTop offset
     * @option
     * @example 100
     */
    scrollTopOffset: 0,
    /**
     * Scroll animation duration
     * @option
     * @example 500
     */
    animationDuration: 500,
    /**
     * Scroll animation easing
     * @option
     * @example 'swing'
     */
    animationEasing: 'swing'
    // holdOpen: false
  };

  // Window exports
  Foundation.plugin(Drilldown, 'Drilldown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Dropdown module.
   * @module foundation.dropdown
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   */

  var Dropdown = function () {
    /**
     * Creates a new instance of a dropdown.
     * @class
     * @param {jQuery} element - jQuery object to make into a dropdown.
     *        Object should be of the dropdown panel, rather than its anchor.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Dropdown(element, options) {
      _classCallCheck(this, Dropdown);

      this.$element = element;
      this.options = $.extend({}, Dropdown.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Dropdown');
      Foundation.Keyboard.register('Dropdown', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin by setting/checking options and attributes, adding helper variables, and saving the anchor.
     * @function
     * @private
     */


    _createClass(Dropdown, [{
      key: '_init',
      value: function _init() {
        var $id = this.$element.attr('id');

        this.$anchor = $('[data-toggle="' + $id + '"]').length ? $('[data-toggle="' + $id + '"]') : $('[data-open="' + $id + '"]');
        this.$anchor.attr({
          'aria-controls': $id,
          'data-is-focus': false,
          'data-yeti-box': $id,
          'aria-haspopup': true,
          'aria-expanded': false

        });

        if (this.options.parentClass) {
          this.$parent = this.$element.parents('.' + this.options.parentClass);
        } else {
          this.$parent = null;
        }
        this.options.positionClass = this.getPositionClass();
        this.counter = 4;
        this.usedPositions = [];
        this.$element.attr({
          'aria-hidden': 'true',
          'data-yeti-box': $id,
          'data-resize': $id,
          'aria-labelledby': this.$anchor[0].id || Foundation.GetYoDigits(6, 'dd-anchor')
        });
        this._events();
      }

      /**
       * Helper function to determine current orientation of dropdown pane.
       * @function
       * @returns {String} position - string value of a position class.
       */

    }, {
      key: 'getPositionClass',
      value: function getPositionClass() {
        var verticalPosition = this.$element[0].className.match(/(top|left|right|bottom)/g);
        verticalPosition = verticalPosition ? verticalPosition[0] : '';
        var horizontalPosition = /float-(\S+)/.exec(this.$anchor[0].className);
        horizontalPosition = horizontalPosition ? horizontalPosition[1] : '';
        var position = horizontalPosition ? horizontalPosition + ' ' + verticalPosition : verticalPosition;

        return position;
      }

      /**
       * Adjusts the dropdown panes orientation by adding/removing positioning classes.
       * @function
       * @private
       * @param {String} position - position class to remove.
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');
        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.$element.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.$element.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.$element.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.$element.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.$element.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.$element.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.$element.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * Sets the position and orientation of the dropdown pane, checks for collisions.
       * Recursively calls itself if a collision is detected, with a new position class.
       * @function
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        if (this.$anchor.attr('aria-expanded') === 'false') {
          return false;
        }
        var position = this.getPositionClass(),
            $eleDims = Foundation.Box.GetDimensions(this.$element),
            $anchorDims = Foundation.Box.GetDimensions(this.$anchor),
            _this = this,
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset;

        if ($eleDims.width >= $eleDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.$element, this.$parent)) {
          var newWidth = $eleDims.windowDims.width,
              parentHOffset = 0;
          if (this.$parent) {
            var $parentDims = Foundation.Box.GetDimensions(this.$parent),
                parentHOffset = $parentDims.offset.left;
            if ($parentDims.width < newWidth) {
              newWidth = $parentDims.width;
            }
          }

          this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, 'center bottom', this.options.vOffset, this.options.hOffset + parentHOffset, true)).css({
            'width': newWidth - this.options.hOffset * 2,
            'height': 'auto'
          });
          this.classChanged = true;
          return false;
        }

        this.$element.offset(Foundation.Box.GetOffsets(this.$element, this.$anchor, position, this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.$element, this.$parent, true) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * Adds event listeners to the element utilizing the triggers utility library.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': this._setPosition.bind(this)
        });

        if (this.options.hover) {
          this.$anchor.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
            var bodyData = $('body').data();
            if (typeof bodyData.whatinput === 'undefined' || bodyData.whatinput === 'mouse') {
              clearTimeout(_this.timeout);
              _this.timeout = setTimeout(function () {
                _this.open();
                _this.$anchor.data('hover', true);
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.dropdown', function () {
            clearTimeout(_this.timeout);
            _this.timeout = setTimeout(function () {
              _this.close();
              _this.$anchor.data('hover', false);
            }, _this.options.hoverDelay);
          });
          if (this.options.hoverPane) {
            this.$element.off('mouseenter.zf.dropdown mouseleave.zf.dropdown').on('mouseenter.zf.dropdown', function () {
              clearTimeout(_this.timeout);
            }).on('mouseleave.zf.dropdown', function () {
              clearTimeout(_this.timeout);
              _this.timeout = setTimeout(function () {
                _this.close();
                _this.$anchor.data('hover', false);
              }, _this.options.hoverDelay);
            });
          }
        }
        this.$anchor.add(this.$element).on('keydown.zf.dropdown', function (e) {

          var $target = $(this),
              visibleFocusableElements = Foundation.Keyboard.findFocusable(_this.$element);

          Foundation.Keyboard.handleKey(e, 'Dropdown', {
            open: function () {
              if ($target.is(_this.$anchor)) {
                _this.open();
                _this.$element.attr('tabindex', -1).focus();
                e.preventDefault();
              }
            },
            close: function () {
              _this.close();
              _this.$anchor.focus();
            }
          });
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body).not(this.$element),
            _this = this;
        $body.off('click.zf.dropdown').on('click.zf.dropdown', function (e) {
          if (_this.$anchor.is(e.target) || _this.$anchor.find(e.target).length) {
            return;
          }
          if (_this.$element.find(e.target).length) {
            return;
          }
          _this.close();
          $body.off('click.zf.dropdown');
        });
      }

      /**
       * Opens the dropdown pane, and fires a bubbling event to close other dropdowns.
       * @function
       * @fires Dropdown#closeme
       * @fires Dropdown#show
       */

    }, {
      key: 'open',
      value: function open() {
        // var _this = this;
        /**
         * Fires to close other open dropdowns
         * @event Dropdown#closeme
         */
        this.$element.trigger('closeme.zf.dropdown', this.$element.attr('id'));
        this.$anchor.addClass('hover').attr({ 'aria-expanded': true });
        // this.$element/*.show()*/;
        this._setPosition();
        this.$element.addClass('is-open').attr({ 'aria-hidden': false });

        if (this.options.autoFocus) {
          var $focusable = Foundation.Keyboard.findFocusable(this.$element);
          if ($focusable.length) {
            $focusable.eq(0).focus();
          }
        }

        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }

        if (this.options.trapFocus) {
          Foundation.Keyboard.trapFocus(this.$element);
        }

        /**
         * Fires once the dropdown is visible.
         * @event Dropdown#show
         */
        this.$element.trigger('show.zf.dropdown', [this.$element]);
      }

      /**
       * Closes the open dropdown pane.
       * @function
       * @fires Dropdown#hide
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.$element.hasClass('is-open')) {
          return false;
        }
        this.$element.removeClass('is-open').attr({ 'aria-hidden': true });

        this.$anchor.removeClass('hover').attr('aria-expanded', false);

        if (this.classChanged) {
          var curPositionClass = this.getPositionClass();
          if (curPositionClass) {
            this.$element.removeClass(curPositionClass);
          }
          this.$element.addClass(this.options.positionClass)
          /*.hide()*/.css({ height: '', width: '' });
          this.classChanged = false;
          this.counter = 4;
          this.usedPositions.length = 0;
        }
        this.$element.trigger('hide.zf.dropdown', [this.$element]);

        if (this.options.trapFocus) {
          Foundation.Keyboard.releaseFocus(this.$element);
        }
      }

      /**
       * Toggles the dropdown pane's visibility.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.$element.hasClass('is-open')) {
          if (this.$anchor.data('hover')) return;
          this.close();
        } else {
          this.open();
        }
      }

      /**
       * Destroys the dropdown.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger').hide();
        this.$anchor.off('.zf.dropdown');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Dropdown;
  }();

  Dropdown.defaults = {
    /**
     * Class that designates bounding container of Dropdown (Default: window)
     * @option
     * @example 'dropdown-parent'
     */
    parentClass: null,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 250
     */
    hoverDelay: 250,
    /**
     * Allow submenus to open on hover events
     * @option
     * @example false
     */
    hover: false,
    /**
     * Don't close dropdown when hovering over dropdown pane
     * @option
     * @example true
     */
    hoverPane: false,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    vOffset: 1,
    /**
     * Number of pixels between the dropdown pane and the triggering element on open.
     * @option
     * @example 1
     */
    hOffset: 1,
    /**
     * Class applied to adjust open position. JS will test and fill this in.
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Allow the plugin to trap focus to the dropdown pane if opened with keyboard commands.
     * @option
     * @example false
     */
    trapFocus: false,
    /**
     * Allow the plugin to set focus to the first focusable element within the pane, regardless of method of opening.
     * @option
     * @example true
     */
    autoFocus: false,
    /**
     * Allows a click on the body to close the dropdown.
     * @option
     * @example false
     */
    closeOnClick: false
  };

  // Window exports
  Foundation.plugin(Dropdown, 'Dropdown');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * DropdownMenu module.
   * @module foundation.dropdown-menu
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.nest
   */

  var DropdownMenu = function () {
    /**
     * Creates a new instance of DropdownMenu.
     * @class
     * @fires DropdownMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function DropdownMenu(element, options) {
      _classCallCheck(this, DropdownMenu);

      this.$element = element;
      this.options = $.extend({}, DropdownMenu.defaults, this.$element.data(), options);

      Foundation.Nest.Feather(this.$element, 'dropdown');
      this._init();

      Foundation.registerPlugin(this, 'DropdownMenu');
      Foundation.Keyboard.register('DropdownMenu', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'up',
        'ARROW_DOWN': 'down',
        'ARROW_LEFT': 'previous',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the plugin, and calls _prepareMenu
     * @private
     * @function
     */


    _createClass(DropdownMenu, [{
      key: '_init',
      value: function _init() {
        var subs = this.$element.find('li.is-dropdown-submenu-parent');
        this.$element.children('.is-dropdown-submenu-parent').children('.is-dropdown-submenu').addClass('first-sub');

        this.$menuItems = this.$element.find('[role="menuitem"]');
        this.$tabs = this.$element.children('[role="menuitem"]');
        this.$tabs.find('ul.is-dropdown-submenu').addClass(this.options.verticalClass);

        if (this.$element.hasClass(this.options.rightClass) || this.options.alignment === 'right' || Foundation.rtl() || this.$element.parents('.top-bar-right').is('*')) {
          this.options.alignment = 'right';
          subs.addClass('opens-left');
        } else {
          subs.addClass('opens-right');
        }
        this.changed = false;
        this._events();
      }
    }, {
      key: '_isVertical',
      value: function _isVertical() {
        return this.$tabs.css('display') === 'block';
      }

      /**
       * Adds event listeners to elements within the menu
       * @private
       * @function
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this,
            hasTouch = 'ontouchstart' in window || typeof window.ontouchstart !== 'undefined',
            parClass = 'is-dropdown-submenu-parent';

        // used for onClick and in the keyboard handlers
        var handleClickFn = function (e) {
          var $elem = $(e.target).parentsUntil('ul', '.' + parClass),
              hasSub = $elem.hasClass(parClass),
              hasClicked = $elem.attr('data-is-click') === 'true',
              $sub = $elem.children('.is-dropdown-submenu');

          if (hasSub) {
            if (hasClicked) {
              if (!_this.options.closeOnClick || !_this.options.clickOpen && !hasTouch || _this.options.forceFollow && hasTouch) {
                return;
              } else {
                e.stopImmediatePropagation();
                e.preventDefault();
                _this._hide($elem);
              }
            } else {
              e.preventDefault();
              e.stopImmediatePropagation();
              _this._show($sub);
              $elem.add($elem.parentsUntil(_this.$element, '.' + parClass)).attr('data-is-click', true);
            }
          }
        };

        if (this.options.clickOpen || hasTouch) {
          this.$menuItems.on('click.zf.dropdownmenu touchstart.zf.dropdownmenu', handleClickFn);
        }

        // Handle Leaf element Clicks
        if (_this.options.closeOnClickInside) {
          this.$menuItems.on('click.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);
            if (!hasSub) {
              _this._hide();
            }
          });
        }

        if (!this.options.disableHover) {
          this.$menuItems.on('mouseenter.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);

            if (hasSub) {
              clearTimeout($elem.data('_delay'));
              $elem.data('_delay', setTimeout(function () {
                _this._show($elem.children('.is-dropdown-submenu'));
              }, _this.options.hoverDelay));
            }
          }).on('mouseleave.zf.dropdownmenu', function (e) {
            var $elem = $(this),
                hasSub = $elem.hasClass(parClass);
            if (hasSub && _this.options.autoclose) {
              if ($elem.attr('data-is-click') === 'true' && _this.options.clickOpen) {
                return false;
              }

              clearTimeout($elem.data('_delay'));
              $elem.data('_delay', setTimeout(function () {
                _this._hide($elem);
              }, _this.options.closingTime));
            }
          });
        }
        this.$menuItems.on('keydown.zf.dropdownmenu', function (e) {
          var $element = $(e.target).parentsUntil('ul', '[role="menuitem"]'),
              isTab = _this.$tabs.index($element) > -1,
              $elements = isTab ? _this.$tabs : $element.siblings('li').add($element),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              $prevElement = $elements.eq(i - 1);
              $nextElement = $elements.eq(i + 1);
              return;
            }
          });

          var nextSibling = function () {
            if (!$element.is(':last-child')) {
              $nextElement.children('a:first').focus();
              e.preventDefault();
            }
          },
              prevSibling = function () {
            $prevElement.children('a:first').focus();
            e.preventDefault();
          },
              openSub = function () {
            var $sub = $element.children('ul.is-dropdown-submenu');
            if ($sub.length) {
              _this._show($sub);
              $element.find('li > a:first').focus();
              e.preventDefault();
            } else {
              return;
            }
          },
              closeSub = function () {
            //if ($element.is(':first-child')) {
            var close = $element.parent('ul').parent('li');
            close.children('a:first').focus();
            _this._hide(close);
            e.preventDefault();
            //}
          };
          var functions = {
            open: openSub,
            close: function () {
              _this._hide(_this.$element);
              _this.$menuItems.find('a:first').focus(); // focus to first element
              e.preventDefault();
            },
            handled: function () {
              e.stopImmediatePropagation();
            }
          };

          if (isTab) {
            if (_this._isVertical()) {
              // vertical menu
              if (Foundation.rtl()) {
                // right aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: closeSub,
                  previous: openSub
                });
              } else {
                // left aligned
                $.extend(functions, {
                  down: nextSibling,
                  up: prevSibling,
                  next: openSub,
                  previous: closeSub
                });
              }
            } else {
              // horizontal menu
              if (Foundation.rtl()) {
                // right aligned
                $.extend(functions, {
                  next: prevSibling,
                  previous: nextSibling,
                  down: openSub,
                  up: closeSub
                });
              } else {
                // left aligned
                $.extend(functions, {
                  next: nextSibling,
                  previous: prevSibling,
                  down: openSub,
                  up: closeSub
                });
              }
            }
          } else {
            // not tabs -> one sub
            if (Foundation.rtl()) {
              // right aligned
              $.extend(functions, {
                next: closeSub,
                previous: openSub,
                down: nextSibling,
                up: prevSibling
              });
            } else {
              // left aligned
              $.extend(functions, {
                next: openSub,
                previous: closeSub,
                down: nextSibling,
                up: prevSibling
              });
            }
          }
          Foundation.Keyboard.handleKey(e, 'DropdownMenu', functions);
        });
      }

      /**
       * Adds an event handler to the body to close any dropdowns on a click.
       * @function
       * @private
       */

    }, {
      key: '_addBodyHandler',
      value: function _addBodyHandler() {
        var $body = $(document.body),
            _this = this;
        $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu').on('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu', function (e) {
          var $link = _this.$element.find(e.target);
          if ($link.length) {
            return;
          }

          _this._hide();
          $body.off('mouseup.zf.dropdownmenu touchend.zf.dropdownmenu');
        });
      }

      /**
       * Opens a dropdown pane, and checks for collisions first.
       * @param {jQuery} $sub - ul element that is a submenu to show
       * @function
       * @private
       * @fires DropdownMenu#show
       */

    }, {
      key: '_show',
      value: function _show($sub) {
        var idx = this.$tabs.index(this.$tabs.filter(function (i, el) {
          return $(el).find($sub).length > 0;
        }));
        var $sibs = $sub.parent('li.is-dropdown-submenu-parent').siblings('li.is-dropdown-submenu-parent');
        this._hide($sibs, idx);
        $sub.css('visibility', 'hidden').addClass('js-dropdown-active').parent('li.is-dropdown-submenu-parent').addClass('is-active');
        var clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
        if (!clear) {
          var oldClass = this.options.alignment === 'left' ? '-right' : '-left',
              $parentLi = $sub.parent('.is-dropdown-submenu-parent');
          $parentLi.removeClass('opens' + oldClass).addClass('opens-' + this.options.alignment);
          clear = Foundation.Box.ImNotTouchingYou($sub, null, true);
          if (!clear) {
            $parentLi.removeClass('opens-' + this.options.alignment).addClass('opens-inner');
          }
          this.changed = true;
        }
        $sub.css('visibility', '');
        if (this.options.closeOnClick) {
          this._addBodyHandler();
        }
        /**
         * Fires when the new dropdown pane is visible.
         * @event DropdownMenu#show
         */
        this.$element.trigger('show.zf.dropdownmenu', [$sub]);
      }

      /**
       * Hides a single, currently open dropdown pane, if passed a parameter, otherwise, hides everything.
       * @function
       * @param {jQuery} $elem - element with a submenu to hide
       * @param {Number} idx - index of the $tabs collection to hide
       * @private
       */

    }, {
      key: '_hide',
      value: function _hide($elem, idx) {
        var $toClose;
        if ($elem && $elem.length) {
          $toClose = $elem;
        } else if (idx !== undefined) {
          $toClose = this.$tabs.not(function (i, el) {
            return i === idx;
          });
        } else {
          $toClose = this.$element;
        }
        var somethingToClose = $toClose.hasClass('is-active') || $toClose.find('.is-active').length > 0;

        if (somethingToClose) {
          $toClose.find('li.is-active').add($toClose).attr({
            'data-is-click': false
          }).removeClass('is-active');

          $toClose.find('ul.js-dropdown-active').removeClass('js-dropdown-active');

          if (this.changed || $toClose.find('opens-inner').length) {
            var oldClass = this.options.alignment === 'left' ? 'right' : 'left';
            $toClose.find('li.is-dropdown-submenu-parent').add($toClose).removeClass('opens-inner opens-' + this.options.alignment).addClass('opens-' + oldClass);
            this.changed = false;
          }
          /**
           * Fires when the open menus are closed.
           * @event DropdownMenu#hide
           */
          this.$element.trigger('hide.zf.dropdownmenu', [$toClose]);
        }
      }

      /**
       * Destroys the plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$menuItems.off('.zf.dropdownmenu').removeAttr('data-is-click').removeClass('is-right-arrow is-left-arrow is-down-arrow opens-right opens-left opens-inner');
        $(document.body).off('.zf.dropdownmenu');
        Foundation.Nest.Burn(this.$element, 'dropdown');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return DropdownMenu;
  }();

  /**
   * Default settings for plugin
   */


  DropdownMenu.defaults = {
    /**
     * Disallows hover events from opening submenus
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Allow a submenu to automatically close on a mouseleave event, if not clicked open.
     * @option
     * @example true
     */
    autoclose: true,
    /**
     * Amount of time to delay opening a submenu on hover event.
     * @option
     * @example 50
     */
    hoverDelay: 50,
    /**
     * Allow a submenu to open/remain open on parent click event. Allows cursor to move away from menu.
     * @option
     * @example true
     */
    clickOpen: false,
    /**
     * Amount of time to delay closing a submenu on a mouseleave event.
     * @option
     * @example 500
     */

    closingTime: 500,
    /**
     * Position of the menu relative to what direction the submenus should open. Handled by JS.
     * @option
     * @example 'left'
     */
    alignment: 'left',
    /**
     * Allow clicks on the body to close any open submenus.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Allow clicks on leaf anchor links to close any open submenus.
     * @option
     * @example true
     */
    closeOnClickInside: true,
    /**
     * Class applied to vertical oriented menus, Foundation default is `vertical`. Update this if using your own class.
     * @option
     * @example 'vertical'
     */
    verticalClass: 'vertical',
    /**
     * Class applied to right-side oriented menus, Foundation default is `align-right`. Update this if using your own class.
     * @option
     * @example 'align-right'
     */
    rightClass: 'align-right',
    /**
     * Boolean to force overide the clicking of links to perform default action, on second touch event for mobile.
     * @option
     * @example false
     */
    forceFollow: true
  };

  // Window exports
  Foundation.plugin(DropdownMenu, 'DropdownMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Equalizer module.
   * @module foundation.equalizer
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader if equalizer contains images
   */

  var Equalizer = function () {
    /**
     * Creates a new instance of Equalizer.
     * @class
     * @fires Equalizer#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Equalizer(element, options) {
      _classCallCheck(this, Equalizer);

      this.$element = element;
      this.options = $.extend({}, Equalizer.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Equalizer');
    }

    /**
     * Initializes the Equalizer plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Equalizer, [{
      key: '_init',
      value: function _init() {
        var eqId = this.$element.attr('data-equalizer') || '';
        var $watched = this.$element.find('[data-equalizer-watch="' + eqId + '"]');

        this.$watched = $watched.length ? $watched : this.$element.find('[data-equalizer-watch]');
        this.$element.attr('data-resize', eqId || Foundation.GetYoDigits(6, 'eq'));
        this.$element.attr('data-mutate', eqId || Foundation.GetYoDigits(6, 'eq'));

        this.hasNested = this.$element.find('[data-equalizer]').length > 0;
        this.isNested = this.$element.parentsUntil(document.body, '[data-equalizer]').length > 0;
        this.isOn = false;
        this._bindHandler = {
          onResizeMeBound: this._onResizeMe.bind(this),
          onPostEqualizedBound: this._onPostEqualized.bind(this)
        };

        var imgs = this.$element.find('img');
        var tooSmall;
        if (this.options.equalizeOn) {
          tooSmall = this._checkMQ();
          $(window).on('changed.zf.mediaquery', this._checkMQ.bind(this));
        } else {
          this._events();
        }
        if (tooSmall !== undefined && tooSmall === false || tooSmall === undefined) {
          if (imgs.length) {
            Foundation.onImagesLoaded(imgs, this._reflow.bind(this));
          } else {
            this._reflow();
          }
        }
      }

      /**
       * Removes event listeners if the breakpoint is too small.
       * @private
       */

    }, {
      key: '_pauseEvents',
      value: function _pauseEvents() {
        this.isOn = false;
        this.$element.off({
          '.zf.equalizer': this._bindHandler.onPostEqualizedBound,
          'resizeme.zf.trigger': this._bindHandler.onResizeMeBound,
          'mutateme.zf.trigger': this._bindHandler.onResizeMeBound
        });
      }

      /**
       * function to handle $elements resizeme.zf.trigger, with bound this on _bindHandler.onResizeMeBound
       * @private
       */

    }, {
      key: '_onResizeMe',
      value: function _onResizeMe(e) {
        this._reflow();
      }

      /**
       * function to handle $elements postequalized.zf.equalizer, with bound this on _bindHandler.onPostEqualizedBound
       * @private
       */

    }, {
      key: '_onPostEqualized',
      value: function _onPostEqualized(e) {
        if (e.target !== this.$element[0]) {
          this._reflow();
        }
      }

      /**
       * Initializes events for Equalizer.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        this._pauseEvents();
        if (this.hasNested) {
          this.$element.on('postequalized.zf.equalizer', this._bindHandler.onPostEqualizedBound);
        } else {
          this.$element.on('resizeme.zf.trigger', this._bindHandler.onResizeMeBound);
          this.$element.on('mutateme.zf.trigger', this._bindHandler.onResizeMeBound);
        }
        this.isOn = true;
      }

      /**
       * Checks the current breakpoint to the minimum required size.
       * @private
       */

    }, {
      key: '_checkMQ',
      value: function _checkMQ() {
        var tooSmall = !Foundation.MediaQuery.is(this.options.equalizeOn);
        if (tooSmall) {
          if (this.isOn) {
            this._pauseEvents();
            this.$watched.css('height', 'auto');
          }
        } else {
          if (!this.isOn) {
            this._events();
          }
        }
        return tooSmall;
      }

      /**
       * A noop version for the plugin
       * @private
       */

    }, {
      key: '_killswitch',
      value: function _killswitch() {
        return;
      }

      /**
       * Calls necessary functions to update Equalizer upon DOM change
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        if (!this.options.equalizeOnStack) {
          if (this._isStacked()) {
            this.$watched.css('height', 'auto');
            return false;
          }
        }
        if (this.options.equalizeByRow) {
          this.getHeightsByRow(this.applyHeightByRow.bind(this));
        } else {
          this.getHeights(this.applyHeight.bind(this));
        }
      }

      /**
       * Manually determines if the first 2 elements are *NOT* stacked.
       * @private
       */

    }, {
      key: '_isStacked',
      value: function _isStacked() {
        if (!this.$watched[0] || !this.$watched[1]) {
          return true;
        }
        return this.$watched[0].getBoundingClientRect().top !== this.$watched[1].getBoundingClientRect().top;
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} heights - An array of heights of children within Equalizer container
       */

    }, {
      key: 'getHeights',
      value: function getHeights(cb) {
        var heights = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          heights.push(this.$watched[i].offsetHeight);
        }
        cb(heights);
      }

      /**
       * Finds the outer heights of children contained within an Equalizer parent and returns them in an array
       * @param {Function} cb - A non-optional callback to return the heights array to.
       * @returns {Array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       */

    }, {
      key: 'getHeightsByRow',
      value: function getHeightsByRow(cb) {
        var lastElTopOffset = this.$watched.length ? this.$watched.first().offset().top : 0,
            groups = [],
            group = 0;
        //group by Row
        groups[group] = [];
        for (var i = 0, len = this.$watched.length; i < len; i++) {
          this.$watched[i].style.height = 'auto';
          //maybe could use this.$watched[i].offsetTop
          var elOffsetTop = $(this.$watched[i]).offset().top;
          if (elOffsetTop != lastElTopOffset) {
            group++;
            groups[group] = [];
            lastElTopOffset = elOffsetTop;
          }
          groups[group].push([this.$watched[i], this.$watched[i].offsetHeight]);
        }

        for (var j = 0, ln = groups.length; j < ln; j++) {
          var heights = $(groups[j]).map(function () {
            return this[1];
          }).get();
          var max = Math.max.apply(null, heights);
          groups[j].push(max);
        }
        cb(groups);
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest
       * @param {array} heights - An array of heights of children within Equalizer container
       * @fires Equalizer#preequalized
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeight',
      value: function applyHeight(heights) {
        var max = Math.max.apply(null, heights);
        /**
         * Fires before the heights are applied
         * @event Equalizer#preequalized
         */
        this.$element.trigger('preequalized.zf.equalizer');

        this.$watched.css('height', max);

        /**
         * Fires when the heights have been applied
         * @event Equalizer#postequalized
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Changes the CSS height property of each child in an Equalizer parent to match the tallest by row
       * @param {array} groups - An array of heights of children within Equalizer container grouped by row with element,height and max as last child
       * @fires Equalizer#preequalized
       * @fires Equalizer#preequalizedrow
       * @fires Equalizer#postequalizedrow
       * @fires Equalizer#postequalized
       */

    }, {
      key: 'applyHeightByRow',
      value: function applyHeightByRow(groups) {
        /**
         * Fires before the heights are applied
         */
        this.$element.trigger('preequalized.zf.equalizer');
        for (var i = 0, len = groups.length; i < len; i++) {
          var groupsILength = groups[i].length,
              max = groups[i][groupsILength - 1];
          if (groupsILength <= 2) {
            $(groups[i][0][0]).css({ 'height': 'auto' });
            continue;
          }
          /**
            * Fires before the heights per row are applied
            * @event Equalizer#preequalizedrow
            */
          this.$element.trigger('preequalizedrow.zf.equalizer');
          for (var j = 0, lenJ = groupsILength - 1; j < lenJ; j++) {
            $(groups[i][j][0]).css({ 'height': max });
          }
          /**
            * Fires when the heights per row have been applied
            * @event Equalizer#postequalizedrow
            */
          this.$element.trigger('postequalizedrow.zf.equalizer');
        }
        /**
         * Fires when the heights have been applied
         */
        this.$element.trigger('postequalized.zf.equalizer');
      }

      /**
       * Destroys an instance of Equalizer.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._pauseEvents();
        this.$watched.css('height', 'auto');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Equalizer;
  }();

  /**
   * Default settings for plugin
   */


  Equalizer.defaults = {
    /**
     * Enable height equalization when stacked on smaller screens.
     * @option
     * @example true
     */
    equalizeOnStack: false,
    /**
     * Enable height equalization row by row.
     * @option
     * @example false
     */
    equalizeByRow: false,
    /**
     * String representing the minimum breakpoint size the plugin should equalize heights on.
     * @option
     * @example 'medium'
     */
    equalizeOn: ''
  };

  // Window exports
  Foundation.plugin(Equalizer, 'Equalizer');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Interchange module.
   * @module foundation.interchange
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.timerAndImageLoader
   */

  var Interchange = function () {
    /**
     * Creates a new instance of Interchange.
     * @class
     * @fires Interchange#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Interchange(element, options) {
      _classCallCheck(this, Interchange);

      this.$element = element;
      this.options = $.extend({}, Interchange.defaults, options);
      this.rules = [];
      this.currentPath = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Interchange');
    }

    /**
     * Initializes the Interchange plugin and calls functions to get interchange functioning on load.
     * @function
     * @private
     */


    _createClass(Interchange, [{
      key: '_init',
      value: function _init() {
        this._addBreakpoints();
        this._generateRules();
        this._reflow();
      }

      /**
       * Initializes events for Interchange.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        $(window).on('resize.zf.interchange', Foundation.util.throttle(function () {
          _this2._reflow();
        }, 50));
      }

      /**
       * Calls necessary functions to update Interchange upon DOM change
       * @function
       * @private
       */

    }, {
      key: '_reflow',
      value: function _reflow() {
        var match;

        // Iterate through each rule, but only save the last match
        for (var i in this.rules) {
          if (this.rules.hasOwnProperty(i)) {
            var rule = this.rules[i];
            if (window.matchMedia(rule.query).matches) {
              match = rule;
            }
          }
        }

        if (match) {
          this.replace(match.path);
        }
      }

      /**
       * Gets the Foundation breakpoints and adds them to the Interchange.SPECIAL_QUERIES object.
       * @function
       * @private
       */

    }, {
      key: '_addBreakpoints',
      value: function _addBreakpoints() {
        for (var i in Foundation.MediaQuery.queries) {
          if (Foundation.MediaQuery.queries.hasOwnProperty(i)) {
            var query = Foundation.MediaQuery.queries[i];
            Interchange.SPECIAL_QUERIES[query.name] = query.value;
          }
        }
      }

      /**
       * Checks the Interchange element for the provided media query + content pairings
       * @function
       * @private
       * @param {Object} element - jQuery object that is an Interchange instance
       * @returns {Array} scenarios - Array of objects that have 'mq' and 'path' keys with corresponding keys
       */

    }, {
      key: '_generateRules',
      value: function _generateRules(element) {
        var rulesList = [];
        var rules;

        if (this.options.rules) {
          rules = this.options.rules;
        } else {
          rules = this.$element.data('interchange').match(/\[.*?\]/g);
        }

        for (var i in rules) {
          if (rules.hasOwnProperty(i)) {
            var rule = rules[i].slice(1, -1).split(', ');
            var path = rule.slice(0, -1).join('');
            var query = rule[rule.length - 1];

            if (Interchange.SPECIAL_QUERIES[query]) {
              query = Interchange.SPECIAL_QUERIES[query];
            }

            rulesList.push({
              path: path,
              query: query
            });
          }
        }

        this.rules = rulesList;
      }

      /**
       * Update the `src` property of an image, or change the HTML of a container, to the specified path.
       * @function
       * @param {String} path - Path to the image or HTML partial.
       * @fires Interchange#replaced
       */

    }, {
      key: 'replace',
      value: function replace(path) {
        if (this.currentPath === path) return;

        var _this = this,
            trigger = 'replaced.zf.interchange';

        // Replacing images
        if (this.$element[0].nodeName === 'IMG') {
          this.$element.attr('src', path).on('load', function () {
            _this.currentPath = path;
          }).trigger(trigger);
        }
        // Replacing background images
        else if (path.match(/\.(gif|jpg|jpeg|png|svg|tiff)([?#].*)?/i)) {
            this.$element.css({ 'background-image': 'url(' + path + ')' }).trigger(trigger);
          }
          // Replacing HTML
          else {
              $.get(path, function (response) {
                _this.$element.html(response).trigger(trigger);
                $(response).foundation();
                _this.currentPath = path;
              });
            }

        /**
         * Fires when content in an Interchange element is done being loaded.
         * @event Interchange#replaced
         */
        // this.$element.trigger('replaced.zf.interchange');
      }

      /**
       * Destroys an instance of interchange.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        //TODO this.
      }
    }]);

    return Interchange;
  }();

  /**
   * Default settings for plugin
   */


  Interchange.defaults = {
    /**
     * Rules to be applied to Interchange elements. Set with the `data-interchange` array notation.
     * @option
     */
    rules: null
  };

  Interchange.SPECIAL_QUERIES = {
    'landscape': 'screen and (orientation: landscape)',
    'portrait': 'screen and (orientation: portrait)',
    'retina': 'only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min--moz-device-pixel-ratio: 2), only screen and (-o-min-device-pixel-ratio: 2/1), only screen and (min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi), only screen and (min-resolution: 2dppx)'
  };

  // Window exports
  Foundation.plugin(Interchange, 'Interchange');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Magellan module.
   * @module foundation.magellan
   */

  var Magellan = function () {
    /**
     * Creates a new instance of Magellan.
     * @class
     * @fires Magellan#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Magellan(element, options) {
      _classCallCheck(this, Magellan);

      this.$element = element;
      this.options = $.extend({}, Magellan.defaults, this.$element.data(), options);

      this._init();
      this.calcPoints();

      Foundation.registerPlugin(this, 'Magellan');
    }

    /**
     * Initializes the Magellan plugin and calls functions to get equalizer functioning on load.
     * @private
     */


    _createClass(Magellan, [{
      key: '_init',
      value: function _init() {
        var id = this.$element[0].id || Foundation.GetYoDigits(6, 'magellan');
        var _this = this;
        this.$targets = $('[data-magellan-target]');
        this.$links = this.$element.find('a');
        this.$element.attr({
          'data-resize': id,
          'data-scroll': id,
          'id': id
        });
        this.$active = $();
        this.scrollPos = parseInt(window.pageYOffset, 10);

        this._events();
      }

      /**
       * Calculates an array of pixel values that are the demarcation lines between locations on the page.
       * Can be invoked if new elements are added or the size of a location changes.
       * @function
       */

    }, {
      key: 'calcPoints',
      value: function calcPoints() {
        var _this = this,
            body = document.body,
            html = document.documentElement;

        this.points = [];
        this.winHeight = Math.round(Math.max(window.innerHeight, html.clientHeight));
        this.docHeight = Math.round(Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight));

        this.$targets.each(function () {
          var $tar = $(this),
              pt = Math.round($tar.offset().top - _this.options.threshold);
          $tar.targetPoint = pt;
          _this.points.push(pt);
        });
      }

      /**
       * Initializes events for Magellan.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this,
            $body = $('html, body'),
            opts = {
          duration: _this.options.animationDuration,
          easing: _this.options.animationEasing
        };
        $(window).one('load', function () {
          if (_this.options.deepLinking) {
            if (location.hash) {
              _this.scrollToLoc(location.hash);
            }
          }
          _this.calcPoints();
          _this._updateActive();
        });

        this.$element.on({
          'resizeme.zf.trigger': this.reflow.bind(this),
          'scrollme.zf.trigger': this._updateActive.bind(this)
        }).on('click.zf.magellan', 'a[href^="#"]', function (e) {
          e.preventDefault();
          var arrival = this.getAttribute('href');
          _this.scrollToLoc(arrival);
        });
        $(window).on('popstate', function (e) {
          if (_this.options.deepLinking) {
            _this.scrollToLoc(window.location.hash);
          }
        });
      }

      /**
       * Function to scroll to a given location on the page.
       * @param {String} loc - a properly formatted jQuery id selector. Example: '#foo'
       * @function
       */

    }, {
      key: 'scrollToLoc',
      value: function scrollToLoc(loc) {
        // Do nothing if target does not exist to prevent errors
        if (!$(loc).length) {
          return false;
        }
        this._inTransition = true;
        var _this = this,
            scrollPos = Math.round($(loc).offset().top - this.options.threshold / 2 - this.options.barOffset);

        $('html, body').stop(true).animate({ scrollTop: scrollPos }, this.options.animationDuration, this.options.animationEasing, function () {
          _this._inTransition = false;_this._updateActive();
        });
      }

      /**
       * Calls necessary functions to update Magellan upon DOM change
       * @function
       */

    }, {
      key: 'reflow',
      value: function reflow() {
        this.calcPoints();
        this._updateActive();
      }

      /**
       * Updates the visibility of an active location link, and updates the url hash for the page, if deepLinking enabled.
       * @private
       * @function
       * @fires Magellan#update
       */

    }, {
      key: '_updateActive',
      value: function _updateActive() /*evt, elem, scrollPos*/{
        if (this._inTransition) {
          return;
        }
        var winPos = /*scrollPos ||*/parseInt(window.pageYOffset, 10),
            curIdx;

        if (winPos + this.winHeight === this.docHeight) {
          curIdx = this.points.length - 1;
        } else if (winPos < this.points[0]) {
          curIdx = undefined;
        } else {
          var isDown = this.scrollPos < winPos,
              _this = this,
              curVisible = this.points.filter(function (p, i) {
            return isDown ? p - _this.options.barOffset <= winPos : p - _this.options.barOffset - _this.options.threshold <= winPos;
          });
          curIdx = curVisible.length ? curVisible.length - 1 : 0;
        }

        this.$active.removeClass(this.options.activeClass);
        this.$active = this.$links.filter('[href="#' + this.$targets.eq(curIdx).data('magellan-target') + '"]').addClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = "";
          if (curIdx != undefined) {
            hash = this.$active[0].getAttribute('href');
          }
          if (hash !== window.location.hash) {
            if (window.history.pushState) {
              window.history.pushState(null, null, hash);
            } else {
              window.location.hash = hash;
            }
          }
        }

        this.scrollPos = winPos;
        /**
         * Fires when magellan is finished updating to the new active element.
         * @event Magellan#update
         */
        this.$element.trigger('update.zf.magellan', [this.$active]);
      }

      /**
       * Destroys an instance of Magellan and resets the url of the window.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.trigger .zf.magellan').find('.' + this.options.activeClass).removeClass(this.options.activeClass);

        if (this.options.deepLinking) {
          var hash = this.$active[0].getAttribute('href');
          window.location.hash.replace(hash, '');
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Magellan;
  }();

  /**
   * Default settings for plugin
   */


  Magellan.defaults = {
    /**
     * Amount of time, in ms, the animated scrolling should take between locations.
     * @option
     * @example 500
     */
    animationDuration: 500,
    /**
     * Animation style to use when scrolling between locations.
     * @option
     * @example 'ease-in-out'
     */
    animationEasing: 'linear',
    /**
     * Number of pixels to use as a marker for location changes.
     * @option
     * @example 50
     */
    threshold: 50,
    /**
     * Class applied to the active locations link on the magellan container.
     * @option
     * @example 'active'
     */
    activeClass: 'active',
    /**
     * Allows the script to manipulate the url of the current page, and if supported, alter the history.
     * @option
     * @example true
     */
    deepLinking: false,
    /**
     * Number of pixels to offset the scroll of the page on item click if using a sticky nav bar.
     * @option
     * @example 25
     */
    barOffset: 0
  };

  // Window exports
  Foundation.plugin(Magellan, 'Magellan');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * OffCanvas module.
   * @module foundation.offcanvas
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   * @requires foundation.util.motion
   */

  var OffCanvas = function () {
    /**
     * Creates a new instance of an off-canvas wrapper.
     * @class
     * @fires OffCanvas#init
     * @param {Object} element - jQuery object to initialize.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function OffCanvas(element, options) {
      _classCallCheck(this, OffCanvas);

      this.$element = element;
      this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
      this.$lastTrigger = $();
      this.$triggers = $();

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'OffCanvas');
      Foundation.Keyboard.register('OffCanvas', {
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
     * @function
     * @private
     */


    _createClass(OffCanvas, [{
      key: '_init',
      value: function _init() {
        var id = this.$element.attr('id');

        this.$element.attr('aria-hidden', 'true');

        this.$element.addClass('is-transition-' + this.options.transition);

        // Find triggers that affect this element and add aria-expanded to them
        this.$triggers = $(document).find('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-expanded', 'false').attr('aria-controls', id);

        // Add an overlay over the content if necessary
        if (this.options.contentOverlay === true) {
          var overlay = document.createElement('div');
          var overlayPosition = $(this.$element).css("position") === 'fixed' ? 'is-overlay-fixed' : 'is-overlay-absolute';
          overlay.setAttribute('class', 'js-off-canvas-overlay ' + overlayPosition);
          this.$overlay = $(overlay);
          if (overlayPosition === 'is-overlay-fixed') {
            $('body').append(this.$overlay);
          } else {
            this.$element.siblings('[data-off-canvas-content]').append(this.$overlay);
          }
        }

        this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

        if (this.options.isRevealed === true) {
          this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
          this._setMQChecker();
        }
        if (!this.options.transitionTime === true) {
          this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas]')[0]).transitionDuration) * 1000;
        }
      }

      /**
       * Adds event handlers to the off-canvas wrapper and the exit overlay.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('.zf.trigger .zf.offcanvas').on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': this.close.bind(this),
          'toggle.zf.trigger': this.toggle.bind(this),
          'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
        });

        if (this.options.closeOnClick === true) {
          var $target = this.options.contentOverlay ? this.$overlay : $('[data-off-canvas-content]');
          $target.on({ 'click.zf.offcanvas': this.close.bind(this) });
        }
      }

      /**
       * Applies event listener for elements that will reveal at certain breakpoints.
       * @private
       */

    }, {
      key: '_setMQChecker',
      value: function _setMQChecker() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          } else {
            _this.reveal(false);
          }
        }).one('load.zf.offcanvas', function () {
          if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
            _this.reveal(true);
          }
        });
      }

      /**
       * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
       * @param {Boolean} isRevealed - true if element should be revealed.
       * @function
       */

    }, {
      key: 'reveal',
      value: function reveal(isRevealed) {
        var $closer = this.$element.find('[data-close]');
        if (isRevealed) {
          this.close();
          this.isRevealed = true;
          this.$element.attr('aria-hidden', 'false');
          this.$element.off('open.zf.trigger toggle.zf.trigger');
          if ($closer.length) {
            $closer.hide();
          }
        } else {
          this.isRevealed = false;
          this.$element.attr('aria-hidden', 'true');
          this.$element.on({
            'open.zf.trigger': this.open.bind(this),
            'toggle.zf.trigger': this.toggle.bind(this)
          });
          if ($closer.length) {
            $closer.show();
          }
        }
      }

      /**
       * Stops scrolling of the body when offcanvas is open on mobile Safari and other troublesome browsers.
       * @private
       */

    }, {
      key: '_stopScrolling',
      value: function _stopScrolling(event) {
        return false;
      }

      /**
       * Opens the off-canvas menu.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       * @fires OffCanvas#opened
       */

    }, {
      key: 'open',
      value: function open(event, trigger) {
        if (this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }
        var _this = this;

        if (trigger) {
          this.$lastTrigger = trigger;
        }

        if (this.options.forceTo === 'top') {
          window.scrollTo(0, 0);
        } else if (this.options.forceTo === 'bottom') {
          window.scrollTo(0, document.body.scrollHeight);
        }

        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#opened
         */
        _this.$element.addClass('is-open');

        this.$triggers.attr('aria-expanded', 'true');
        this.$element.attr('aria-hidden', 'false').trigger('opened.zf.offcanvas');

        // If `contentScroll` is set to false, add class and disable scrolling on touch devices.
        if (this.options.contentScroll === false) {
          $('body').addClass('is-off-canvas-open').on('touchmove', this._stopScrolling);
        }

        if (this.options.contentOverlay === true) {
          this.$overlay.addClass('is-visible');
        }

        if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
          this.$overlay.addClass('is-closable');
        }

        if (this.options.autoFocus === true) {
          this.$element.one(Foundation.transitionend(this.$element), function () {
            _this.$element.find('a, button').eq(0).focus();
          });
        }

        if (this.options.trapFocus === true) {
          this.$element.siblings('[data-off-canvas-content]').attr('tabindex', '-1');
          Foundation.Keyboard.trapFocus(this.$element);
        }
      }

      /**
       * Closes the off-canvas menu.
       * @function
       * @param {Function} cb - optional cb to fire after closure.
       * @fires OffCanvas#closed
       */

    }, {
      key: 'close',
      value: function close(cb) {
        if (!this.$element.hasClass('is-open') || this.isRevealed) {
          return;
        }

        var _this = this;

        _this.$element.removeClass('is-open');

        this.$element.attr('aria-hidden', 'true')
        /**
         * Fires when the off-canvas menu opens.
         * @event OffCanvas#closed
         */
        .trigger('closed.zf.offcanvas');

        // If `contentScroll` is set to false, remove class and re-enable scrolling on touch devices.
        if (this.options.contentScroll === false) {
          $('body').removeClass('is-off-canvas-open').off('touchmove', this._stopScrolling);
        }

        if (this.options.contentOverlay === true) {
          this.$overlay.removeClass('is-visible');
        }

        if (this.options.closeOnClick === true && this.options.contentOverlay === true) {
          this.$overlay.removeClass('is-closable');
        }

        this.$triggers.attr('aria-expanded', 'false');

        if (this.options.trapFocus === true) {
          this.$element.siblings('[data-off-canvas-content]').removeAttr('tabindex');
          Foundation.Keyboard.releaseFocus(this.$element);
        }
      }

      /**
       * Toggles the off-canvas menu open or closed.
       * @function
       * @param {Object} event - Event object passed from listener.
       * @param {jQuery} trigger - element that triggered the off-canvas to open.
       */

    }, {
      key: 'toggle',
      value: function toggle(event, trigger) {
        if (this.$element.hasClass('is-open')) {
          this.close(event, trigger);
        } else {
          this.open(event, trigger);
        }
      }

      /**
       * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
       * @function
       * @private
       */

    }, {
      key: '_handleKeyboard',
      value: function _handleKeyboard(e) {
        var _this2 = this;

        Foundation.Keyboard.handleKey(e, 'OffCanvas', {
          close: function () {
            _this2.close();
            _this2.$lastTrigger.focus();
            return true;
          },
          handled: function () {
            e.stopPropagation();
            e.preventDefault();
          }
        });
      }

      /**
       * Destroys the offcanvas plugin.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.close();
        this.$element.off('.zf.trigger .zf.offcanvas');
        this.$overlay.off('.zf.offcanvas');

        Foundation.unregisterPlugin(this);
      }
    }]);

    return OffCanvas;
  }();

  OffCanvas.defaults = {
    /**
     * Allow the user to click outside of the menu to close it.
     * @option
     * @example true
     */
    closeOnClick: true,

    /**
     * Adds an overlay on top of `[data-off-canvas-content]`.
     * @option
     * @example true
     */
    contentOverlay: true,

    /**
     * Enable/disable scrolling of the main content when an off canvas panel is open.
     * @option
     * @example true
     */
    contentScroll: true,

    /**
     * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
     * @option
     * @example 500
     */
    transitionTime: 0,

    /**
     * Type of transition for the offcanvas menu. Options are 'push', 'detached' or 'slide'.
     * @option
     * @example push
     */
    transition: 'push',

    /**
     * Force the page to scroll to top or bottom on open.
     * @option
     * @example top
     */
    forceTo: null,

    /**
     * Allow the offcanvas to remain open for certain breakpoints.
     * @option
     * @example false
     */
    isRevealed: false,

    /**
     * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
     * @option
     * @example reveal-for-large
     */
    revealOn: null,

    /**
     * Force focus to the offcanvas on open. If true, will focus the opening trigger on close.
     * @option
     * @example true
     */
    autoFocus: true,

    /**
     * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
     * @option
     * TODO improve the regex testing for this.
     * @example reveal-for-large
     */
    revealClass: 'reveal-for-',

    /**
     * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
     * @option
     * @example true
     */
    trapFocus: false
  };

  // Window exports
  Foundation.plugin(OffCanvas, 'OffCanvas');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Orbit module.
   * @module foundation.orbit
   * @requires foundation.util.keyboard
   * @requires foundation.util.motion
   * @requires foundation.util.timerAndImageLoader
   * @requires foundation.util.touch
   */

  var Orbit = function () {
    /**
    * Creates a new instance of an orbit carousel.
    * @class
    * @param {jQuery} element - jQuery object to make into an Orbit Carousel.
    * @param {Object} options - Overrides to the default plugin settings.
    */
    function Orbit(element, options) {
      _classCallCheck(this, Orbit);

      this.$element = element;
      this.options = $.extend({}, Orbit.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Orbit');
      Foundation.Keyboard.register('Orbit', {
        'ltr': {
          'ARROW_RIGHT': 'next',
          'ARROW_LEFT': 'previous'
        },
        'rtl': {
          'ARROW_LEFT': 'next',
          'ARROW_RIGHT': 'previous'
        }
      });
    }

    /**
    * Initializes the plugin by creating jQuery collections, setting attributes, and starting the animation.
    * @function
    * @private
    */


    _createClass(Orbit, [{
      key: '_init',
      value: function _init() {
        // @TODO: consider discussion on PR #9278 about DOM pollution by changeSlide
        this._reset();

        this.$wrapper = this.$element.find('.' + this.options.containerClass);
        this.$slides = this.$element.find('.' + this.options.slideClass);

        var $images = this.$element.find('img'),
            initActive = this.$slides.filter('.is-active'),
            id = this.$element[0].id || Foundation.GetYoDigits(6, 'orbit');

        this.$element.attr({
          'data-resize': id,
          'id': id
        });

        if (!initActive.length) {
          this.$slides.eq(0).addClass('is-active');
        }

        if (!this.options.useMUI) {
          this.$slides.addClass('no-motionui');
        }

        if ($images.length) {
          Foundation.onImagesLoaded($images, this._prepareForOrbit.bind(this));
        } else {
          this._prepareForOrbit(); //hehe
        }

        if (this.options.bullets) {
          this._loadBullets();
        }

        this._events();

        if (this.options.autoPlay && this.$slides.length > 1) {
          this.geoSync();
        }

        if (this.options.accessible) {
          // allow wrapper to be focusable to enable arrow navigation
          this.$wrapper.attr('tabindex', 0);
        }
      }

      /**
      * Creates a jQuery collection of bullets, if they are being used.
      * @function
      * @private
      */

    }, {
      key: '_loadBullets',
      value: function _loadBullets() {
        this.$bullets = this.$element.find('.' + this.options.boxOfBullets).find('button');
      }

      /**
      * Sets a `timer` object on the orbit, and starts the counter for the next slide.
      * @function
      */

    }, {
      key: 'geoSync',
      value: function geoSync() {
        var _this = this;
        this.timer = new Foundation.Timer(this.$element, {
          duration: this.options.timerDelay,
          infinite: false
        }, function () {
          _this.changeSlide(true);
        });
        this.timer.start();
      }

      /**
      * Sets wrapper and slide heights for the orbit.
      * @function
      * @private
      */

    }, {
      key: '_prepareForOrbit',
      value: function _prepareForOrbit() {
        var _this = this;
        this._setWrapperHeight();
      }

      /**
      * Calulates the height of each slide in the collection, and uses the tallest one for the wrapper height.
      * @function
      * @private
      * @param {Function} cb - a callback function to fire when complete.
      */

    }, {
      key: '_setWrapperHeight',
      value: function _setWrapperHeight(cb) {
        //rewrite this to `for` loop
        var max = 0,
            temp,
            counter = 0,
            _this = this;

        this.$slides.each(function () {
          temp = this.getBoundingClientRect().height;
          $(this).attr('data-slide', counter);

          if (_this.$slides.filter('.is-active')[0] !== _this.$slides.eq(counter)[0]) {
            //if not the active slide, set css position and display property
            $(this).css({ 'position': 'relative', 'display': 'none' });
          }
          max = temp > max ? temp : max;
          counter++;
        });

        if (counter === this.$slides.length) {
          this.$wrapper.css({ 'height': max }); //only change the wrapper height property once.
          if (cb) {
            cb(max);
          } //fire callback with max height dimension.
        }
      }

      /**
      * Sets the max-height of each slide.
      * @function
      * @private
      */

    }, {
      key: '_setSlideHeight',
      value: function _setSlideHeight(height) {
        this.$slides.each(function () {
          $(this).css('max-height', height);
        });
      }

      /**
      * Adds event listeners to basically everything within the element.
      * @function
      * @private
      */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        //***************************************
        //**Now using custom event - thanks to:**
        //**      Yohai Ararat of Toronto      **
        //***************************************
        //
        this.$element.off('.resizeme.zf.trigger').on({
          'resizeme.zf.trigger': this._prepareForOrbit.bind(this)
        });
        if (this.$slides.length > 1) {

          if (this.options.swipe) {
            this.$slides.off('swipeleft.zf.orbit swiperight.zf.orbit').on('swipeleft.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(true);
            }).on('swiperight.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide(false);
            });
          }
          //***************************************

          if (this.options.autoPlay) {
            this.$slides.on('click.zf.orbit', function () {
              _this.$element.data('clickedOn', _this.$element.data('clickedOn') ? false : true);
              _this.timer[_this.$element.data('clickedOn') ? 'pause' : 'start']();
            });

            if (this.options.pauseOnHover) {
              this.$element.on('mouseenter.zf.orbit', function () {
                _this.timer.pause();
              }).on('mouseleave.zf.orbit', function () {
                if (!_this.$element.data('clickedOn')) {
                  _this.timer.start();
                }
              });
            }
          }

          if (this.options.navButtons) {
            var $controls = this.$element.find('.' + this.options.nextClass + ', .' + this.options.prevClass);
            $controls.attr('tabindex', 0)
            //also need to handle enter/return and spacebar key presses
            .on('click.zf.orbit touchend.zf.orbit', function (e) {
              e.preventDefault();
              _this.changeSlide($(this).hasClass(_this.options.nextClass));
            });
          }

          if (this.options.bullets) {
            this.$bullets.on('click.zf.orbit touchend.zf.orbit', function () {
              if (/is-active/g.test(this.className)) {
                return false;
              } //if this is active, kick out of function.
              var idx = $(this).data('slide'),
                  ltr = idx > _this.$slides.filter('.is-active').data('slide'),
                  $slide = _this.$slides.eq(idx);

              _this.changeSlide(ltr, $slide, idx);
            });
          }

          if (this.options.accessible) {
            this.$wrapper.add(this.$bullets).on('keydown.zf.orbit', function (e) {
              // handle keyboard event with keyboard util
              Foundation.Keyboard.handleKey(e, 'Orbit', {
                next: function () {
                  _this.changeSlide(true);
                },
                previous: function () {
                  _this.changeSlide(false);
                },
                handled: function () {
                  // if bullet is focused, make sure focus moves
                  if ($(e.target).is(_this.$bullets)) {
                    _this.$bullets.filter('.is-active').focus();
                  }
                }
              });
            });
          }
        }
      }

      /**
       * Resets Orbit so it can be reinitialized
       */

    }, {
      key: '_reset',
      value: function _reset() {
        // Don't do anything if there are no slides (first run)
        if (typeof this.$slides == 'undefined') {
          return;
        }

        if (this.$slides.length > 1) {
          // Remove old events
          this.$element.off('.zf.orbit').find('*').off('.zf.orbit');

          // Restart timer if autoPlay is enabled
          if (this.options.autoPlay) {
            this.timer.restart();
          }

          // Reset all sliddes
          this.$slides.each(function (el) {
            $(el).removeClass('is-active is-active is-in').removeAttr('aria-live').hide();
          });

          // Show the first slide
          this.$slides.first().addClass('is-active').show();

          // Triggers when the slide has finished animating
          this.$element.trigger('slidechange.zf.orbit', [this.$slides.first()]);

          // Select first bullet if bullets are present
          if (this.options.bullets) {
            this._updateBullets(0);
          }
        }
      }

      /**
      * Changes the current slide to a new one.
      * @function
      * @param {Boolean} isLTR - flag if the slide should move left to right.
      * @param {jQuery} chosenSlide - the jQuery element of the slide to show next, if one is selected.
      * @param {Number} idx - the index of the new slide in its collection, if one chosen.
      * @fires Orbit#slidechange
      */

    }, {
      key: 'changeSlide',
      value: function changeSlide(isLTR, chosenSlide, idx) {
        if (!this.$slides) {
          return;
        } // Don't freak out if we're in the middle of cleanup
        var $curSlide = this.$slides.filter('.is-active').eq(0);

        if (/mui/g.test($curSlide[0].className)) {
          return false;
        } //if the slide is currently animating, kick out of the function

        var $firstSlide = this.$slides.first(),
            $lastSlide = this.$slides.last(),
            dirIn = isLTR ? 'Right' : 'Left',
            dirOut = isLTR ? 'Left' : 'Right',
            _this = this,
            $newSlide;

        if (!chosenSlide) {
          //most of the time, this will be auto played or clicked from the navButtons.
          $newSlide = isLTR ? //if wrapping enabled, check to see if there is a `next` or `prev` sibling, if not, select the first or last slide to fill in. if wrapping not enabled, attempt to select `next` or `prev`, if there's nothing there, the function will kick out on next step. CRAZY NESTED TERNARIES!!!!!
          this.options.infiniteWrap ? $curSlide.next('.' + this.options.slideClass).length ? $curSlide.next('.' + this.options.slideClass) : $firstSlide : $curSlide.next('.' + this.options.slideClass) : //pick next slide if moving left to right
          this.options.infiniteWrap ? $curSlide.prev('.' + this.options.slideClass).length ? $curSlide.prev('.' + this.options.slideClass) : $lastSlide : $curSlide.prev('.' + this.options.slideClass); //pick prev slide if moving right to left
        } else {
          $newSlide = chosenSlide;
        }

        if ($newSlide.length) {
          /**
          * Triggers before the next slide starts animating in and only if a next slide has been found.
          * @event Orbit#beforeslidechange
          */
          this.$element.trigger('beforeslidechange.zf.orbit', [$curSlide, $newSlide]);

          if (this.options.bullets) {
            idx = idx || this.$slides.index($newSlide); //grab index to update bullets
            this._updateBullets(idx);
          }

          if (this.options.useMUI && !this.$element.is(':hidden')) {
            Foundation.Motion.animateIn($newSlide.addClass('is-active').css({ 'position': 'absolute', 'top': 0 }), this.options['animInFrom' + dirIn], function () {
              $newSlide.css({ 'position': 'relative', 'display': 'block' }).attr('aria-live', 'polite');
            });

            Foundation.Motion.animateOut($curSlide.removeClass('is-active'), this.options['animOutTo' + dirOut], function () {
              $curSlide.removeAttr('aria-live');
              if (_this.options.autoPlay && !_this.timer.isPaused) {
                _this.timer.restart();
              }
              //do stuff?
            });
          } else {
            $curSlide.removeClass('is-active is-in').removeAttr('aria-live').hide();
            $newSlide.addClass('is-active is-in').attr('aria-live', 'polite').show();
            if (this.options.autoPlay && !this.timer.isPaused) {
              this.timer.restart();
            }
          }
          /**
          * Triggers when the slide has finished animating in.
          * @event Orbit#slidechange
          */
          this.$element.trigger('slidechange.zf.orbit', [$newSlide]);
        }
      }

      /**
      * Updates the active state of the bullets, if displayed.
      * @function
      * @private
      * @param {Number} idx - the index of the current slide.
      */

    }, {
      key: '_updateBullets',
      value: function _updateBullets(idx) {
        var $oldBullet = this.$element.find('.' + this.options.boxOfBullets).find('.is-active').removeClass('is-active').blur(),
            span = $oldBullet.find('span:last').detach(),
            $newBullet = this.$bullets.eq(idx).addClass('is-active').append(span);
      }

      /**
      * Destroys the carousel and hides the element.
      * @function
      */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.orbit').find('*').off('.zf.orbit').end().hide();
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Orbit;
  }();

  Orbit.defaults = {
    /**
    * Tells the JS to look for and loadBullets.
    * @option
    * @example true
    */
    bullets: true,
    /**
    * Tells the JS to apply event listeners to nav buttons
    * @option
    * @example true
    */
    navButtons: true,
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-right'
    */
    animInFromRight: 'slide-in-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-right'
    */
    animOutToRight: 'slide-out-right',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-in-left'
    *
    */
    animInFromLeft: 'slide-in-left',
    /**
    * motion-ui animation class to apply
    * @option
    * @example 'slide-out-left'
    */
    animOutToLeft: 'slide-out-left',
    /**
    * Allows Orbit to automatically animate on page load.
    * @option
    * @example true
    */
    autoPlay: true,
    /**
    * Amount of time, in ms, between slide transitions
    * @option
    * @example 5000
    */
    timerDelay: 5000,
    /**
    * Allows Orbit to infinitely loop through the slides
    * @option
    * @example true
    */
    infiniteWrap: true,
    /**
    * Allows the Orbit slides to bind to swipe events for mobile, requires an additional util library
    * @option
    * @example true
    */
    swipe: true,
    /**
    * Allows the timing function to pause animation on hover.
    * @option
    * @example true
    */
    pauseOnHover: true,
    /**
    * Allows Orbit to bind keyboard events to the slider, to animate frames with arrow keys
    * @option
    * @example true
    */
    accessible: true,
    /**
    * Class applied to the container of Orbit
    * @option
    * @example 'orbit-container'
    */
    containerClass: 'orbit-container',
    /**
    * Class applied to individual slides.
    * @option
    * @example 'orbit-slide'
    */
    slideClass: 'orbit-slide',
    /**
    * Class applied to the bullet container. You're welcome.
    * @option
    * @example 'orbit-bullets'
    */
    boxOfBullets: 'orbit-bullets',
    /**
    * Class applied to the `next` navigation button.
    * @option
    * @example 'orbit-next'
    */
    nextClass: 'orbit-next',
    /**
    * Class applied to the `previous` navigation button.
    * @option
    * @example 'orbit-previous'
    */
    prevClass: 'orbit-previous',
    /**
    * Boolean to flag the js to use motion ui classes or not. Default to true for backwards compatability.
    * @option
    * @example true
    */
    useMUI: true
  };

  // Window exports
  Foundation.plugin(Orbit, 'Orbit');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveMenu module.
   * @module foundation.responsiveMenu
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.accordionMenu
   * @requires foundation.util.drilldown
   * @requires foundation.util.dropdown-menu
   */

  var ResponsiveMenu = function () {
    /**
     * Creates a new instance of a responsive menu.
     * @class
     * @fires ResponsiveMenu#init
     * @param {jQuery} element - jQuery object to make into a dropdown menu.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveMenu(element, options) {
      _classCallCheck(this, ResponsiveMenu);

      this.$element = $(element);
      this.rules = this.$element.data('responsive-menu');
      this.currentMq = null;
      this.currentPlugin = null;

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveMenu');
    }

    /**
     * Initializes the Menu by parsing the classes from the 'data-ResponsiveMenu' attribute on the element.
     * @function
     * @private
     */


    _createClass(ResponsiveMenu, [{
      key: '_init',
      value: function _init() {
        // The first time an Interchange plugin is initialized, this.rules is converted from a string of "classes" to an object of rules
        if (typeof this.rules === 'string') {
          var rulesTree = {};

          // Parse rules from "classes" pulled from data attribute
          var rules = this.rules.split(' ');

          // Iterate through every rule found
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i].split('-');
            var ruleSize = rule.length > 1 ? rule[0] : 'small';
            var rulePlugin = rule.length > 1 ? rule[1] : rule[0];

            if (MenuPlugins[rulePlugin] !== null) {
              rulesTree[ruleSize] = MenuPlugins[rulePlugin];
            }
          }

          this.rules = rulesTree;
        }

        if (!$.isEmptyObject(this.rules)) {
          this._checkMediaQueries();
        }
        // Add data-mutate since children may need it.
        this.$element.attr('data-mutate', this.$element.attr('data-mutate') || Foundation.GetYoDigits(6, 'responsive-menu'));
      }

      /**
       * Initializes events for the Menu.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        $(window).on('changed.zf.mediaquery', function () {
          _this._checkMediaQueries();
        });
        // $(window).on('resize.zf.ResponsiveMenu', function() {
        //   _this._checkMediaQueries();
        // });
      }

      /**
       * Checks the current screen width against available media queries. If the media query has changed, and the plugin needed has changed, the plugins will swap out.
       * @function
       * @private
       */

    }, {
      key: '_checkMediaQueries',
      value: function _checkMediaQueries() {
        var matchedMq,
            _this = this;
        // Iterate through each rule and find the last matching rule
        $.each(this.rules, function (key) {
          if (Foundation.MediaQuery.atLeast(key)) {
            matchedMq = key;
          }
        });

        // No match? No dice
        if (!matchedMq) return;

        // Plugin already initialized? We good
        if (this.currentPlugin instanceof this.rules[matchedMq].plugin) return;

        // Remove existing plugin-specific CSS classes
        $.each(MenuPlugins, function (key, value) {
          _this.$element.removeClass(value.cssClass);
        });

        // Add the CSS class for the new plugin
        this.$element.addClass(this.rules[matchedMq].cssClass);

        // Create an instance of the new plugin
        if (this.currentPlugin) this.currentPlugin.destroy();
        this.currentPlugin = new this.rules[matchedMq].plugin(this.$element, {});
      }

      /**
       * Destroys the instance of the current plugin on this element, as well as the window resize handler that switches the plugins out.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.currentPlugin.destroy();
        $(window).off('.zf.ResponsiveMenu');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveMenu;
  }();

  ResponsiveMenu.defaults = {};

  // The plugin matches the plugin classes with these plugin instances.
  var MenuPlugins = {
    dropdown: {
      cssClass: 'dropdown',
      plugin: Foundation._plugins['dropdown-menu'] || null
    },
    drilldown: {
      cssClass: 'drilldown',
      plugin: Foundation._plugins['drilldown'] || null
    },
    accordion: {
      cssClass: 'accordion-menu',
      plugin: Foundation._plugins['accordion-menu'] || null
    }
  };

  // Window exports
  Foundation.plugin(ResponsiveMenu, 'ResponsiveMenu');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * ResponsiveToggle module.
   * @module foundation.responsiveToggle
   * @requires foundation.util.mediaQuery
   */

  var ResponsiveToggle = function () {
    /**
     * Creates a new instance of Tab Bar.
     * @class
     * @fires ResponsiveToggle#init
     * @param {jQuery} element - jQuery object to attach tab bar functionality to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function ResponsiveToggle(element, options) {
      _classCallCheck(this, ResponsiveToggle);

      this.$element = $(element);
      this.options = $.extend({}, ResponsiveToggle.defaults, this.$element.data(), options);

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'ResponsiveToggle');
    }

    /**
     * Initializes the tab bar by finding the target element, toggling element, and running update().
     * @function
     * @private
     */


    _createClass(ResponsiveToggle, [{
      key: '_init',
      value: function _init() {
        var targetID = this.$element.data('responsive-toggle');
        if (!targetID) {
          console.error('Your tab bar needs an ID of a Menu as the value of data-tab-bar.');
        }

        this.$targetMenu = $('#' + targetID);
        this.$toggler = this.$element.find('[data-toggle]');
        this.options = $.extend({}, this.options, this.$targetMenu.data());

        // If they were set, parse the animation classes
        if (this.options.animate) {
          var input = this.options.animate.split(' ');

          this.animationIn = input[0];
          this.animationOut = input[1] || null;
        }

        this._update();
      }

      /**
       * Adds necessary event handlers for the tab bar to work.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;

        this._updateMqHandler = this._update.bind(this);

        $(window).on('changed.zf.mediaquery', this._updateMqHandler);

        this.$toggler.on('click.zf.responsiveToggle', this.toggleMenu.bind(this));
      }

      /**
       * Checks the current media query to determine if the tab bar should be visible or hidden.
       * @function
       * @private
       */

    }, {
      key: '_update',
      value: function _update() {
        // Mobile
        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          this.$element.show();
          this.$targetMenu.hide();
        }

        // Desktop
        else {
            this.$element.hide();
            this.$targetMenu.show();
          }
      }

      /**
       * Toggles the element attached to the tab bar. The toggle only happens if the screen is small enough to allow it.
       * @function
       * @fires ResponsiveToggle#toggled
       */

    }, {
      key: 'toggleMenu',
      value: function toggleMenu() {
        var _this2 = this;

        if (!Foundation.MediaQuery.atLeast(this.options.hideFor)) {
          if (this.options.animate) {
            if (this.$targetMenu.is(':hidden')) {
              Foundation.Motion.animateIn(this.$targetMenu, this.animationIn, function () {
                /**
                 * Fires when the element attached to the tab bar toggles.
                 * @event ResponsiveToggle#toggled
                 */
                _this2.$element.trigger('toggled.zf.responsiveToggle');
                _this2.$targetMenu.find('[data-mutate]').triggerHandler('mutateme.zf.trigger');
              });
            } else {
              Foundation.Motion.animateOut(this.$targetMenu, this.animationOut, function () {
                /**
                 * Fires when the element attached to the tab bar toggles.
                 * @event ResponsiveToggle#toggled
                 */
                _this2.$element.trigger('toggled.zf.responsiveToggle');
              });
            }
          } else {
            this.$targetMenu.toggle(0);
            this.$targetMenu.find('[data-mutate]').trigger('mutateme.zf.trigger');

            /**
             * Fires when the element attached to the tab bar toggles.
             * @event ResponsiveToggle#toggled
             */
            this.$element.trigger('toggled.zf.responsiveToggle');
          }
        }
      }
    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.responsiveToggle');
        this.$toggler.off('.zf.responsiveToggle');

        $(window).off('changed.zf.mediaquery', this._updateMqHandler);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return ResponsiveToggle;
  }();

  ResponsiveToggle.defaults = {
    /**
     * The breakpoint after which the menu is always shown, and the tab bar is hidden.
     * @option
     * @example 'medium'
     */
    hideFor: 'medium',

    /**
     * To decide if the toggle should be animated or not.
     * @option
     * @example false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(ResponsiveToggle, 'ResponsiveToggle');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Reveal module.
   * @module foundation.reveal
   * @requires foundation.util.keyboard
   * @requires foundation.util.box
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.motion if using animations
   */

  var Reveal = function () {
    /**
     * Creates a new instance of Reveal.
     * @class
     * @param {jQuery} element - jQuery object to use for the modal.
     * @param {Object} options - optional parameters.
     */
    function Reveal(element, options) {
      _classCallCheck(this, Reveal);

      this.$element = element;
      this.options = $.extend({}, Reveal.defaults, this.$element.data(), options);
      this._init();

      Foundation.registerPlugin(this, 'Reveal');
      Foundation.Keyboard.register('Reveal', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ESCAPE': 'close'
      });
    }

    /**
     * Initializes the modal by adding the overlay and close buttons, (if selected).
     * @private
     */


    _createClass(Reveal, [{
      key: '_init',
      value: function _init() {
        this.id = this.$element.attr('id');
        this.isActive = false;
        this.cached = { mq: Foundation.MediaQuery.current };
        this.isMobile = mobileSniff();

        this.$anchor = $('[data-open="' + this.id + '"]').length ? $('[data-open="' + this.id + '"]') : $('[data-toggle="' + this.id + '"]');
        this.$anchor.attr({
          'aria-controls': this.id,
          'aria-haspopup': true,
          'tabindex': 0
        });

        if (this.options.fullScreen || this.$element.hasClass('full')) {
          this.options.fullScreen = true;
          this.options.overlay = false;
        }
        if (this.options.overlay && !this.$overlay) {
          this.$overlay = this._makeOverlay(this.id);
        }

        this.$element.attr({
          'role': 'dialog',
          'aria-hidden': true,
          'data-yeti-box': this.id,
          'data-resize': this.id
        });

        if (this.$overlay) {
          this.$element.detach().appendTo(this.$overlay);
        } else {
          this.$element.detach().appendTo($(this.options.appendTo));
          this.$element.addClass('without-overlay');
        }
        this._events();
        if (this.options.deepLink && window.location.hash === '#' + this.id) {
          $(window).one('load.zf.reveal', this.open.bind(this));
        }
      }

      /**
       * Creates an overlay div to display behind the modal.
       * @private
       */

    }, {
      key: '_makeOverlay',
      value: function _makeOverlay() {
        return $('<div></div>').addClass('reveal-overlay').appendTo(this.options.appendTo);
      }

      /**
       * Updates position of modal
       * TODO:  Figure out if we actually need to cache these values or if it doesn't matter
       * @private
       */

    }, {
      key: '_updatePosition',
      value: function _updatePosition() {
        var width = this.$element.outerWidth();
        var outerWidth = $(window).width();
        var height = this.$element.outerHeight();
        var outerHeight = $(window).height();
        var left, top;
        if (this.options.hOffset === 'auto') {
          left = parseInt((outerWidth - width) / 2, 10);
        } else {
          left = parseInt(this.options.hOffset, 10);
        }
        if (this.options.vOffset === 'auto') {
          if (height > outerHeight) {
            top = parseInt(Math.min(100, outerHeight / 10), 10);
          } else {
            top = parseInt((outerHeight - height) / 4, 10);
          }
        } else {
          top = parseInt(this.options.vOffset, 10);
        }
        this.$element.css({ top: top + 'px' });
        // only worry about left if we don't have an overlay or we havea  horizontal offset,
        // otherwise we're perfectly in the middle
        if (!this.$overlay || this.options.hOffset !== 'auto') {
          this.$element.css({ left: left + 'px' });
          this.$element.css({ margin: '0px' });
        }
      }

      /**
       * Adds event handlers for the modal.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this2 = this;

        var _this = this;

        this.$element.on({
          'open.zf.trigger': this.open.bind(this),
          'close.zf.trigger': function (event, $element) {
            if (event.target === _this.$element[0] || $(event.target).parents('[data-closable]')[0] === $element) {
              // only close reveal when it's explicitly called
              return _this2.close.apply(_this2);
            }
          },
          'toggle.zf.trigger': this.toggle.bind(this),
          'resizeme.zf.trigger': function () {
            _this._updatePosition();
          }
        });

        if (this.$anchor.length) {
          this.$anchor.on('keydown.zf.reveal', function (e) {
            if (e.which === 13 || e.which === 32) {
              e.stopPropagation();
              e.preventDefault();
              _this.open();
            }
          });
        }

        if (this.options.closeOnClick && this.options.overlay) {
          this.$overlay.off('.zf.reveal').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
              return;
            }
            _this.close();
          });
        }
        if (this.options.deepLink) {
          $(window).on('popstate.zf.reveal:' + this.id, this._handleState.bind(this));
        }
      }

      /**
       * Handles modal methods on back/forward button clicks or any other event that triggers popstate.
       * @private
       */

    }, {
      key: '_handleState',
      value: function _handleState(e) {
        if (window.location.hash === '#' + this.id && !this.isActive) {
          this.open();
        } else {
          this.close();
        }
      }

      /**
       * Opens the modal controlled by `this.$anchor`, and closes all others by default.
       * @function
       * @fires Reveal#closeme
       * @fires Reveal#open
       */

    }, {
      key: 'open',
      value: function open() {
        var _this3 = this;

        if (this.options.deepLink) {
          var hash = '#' + this.id;

          if (window.history.pushState) {
            window.history.pushState(null, null, hash);
          } else {
            window.location.hash = hash;
          }
        }

        this.isActive = true;

        // Make elements invisible, but remove display: none so we can get size and positioning
        this.$element.css({ 'visibility': 'hidden' }).show().scrollTop(0);
        if (this.options.overlay) {
          this.$overlay.css({ 'visibility': 'hidden' }).show();
        }

        this._updatePosition();

        this.$element.hide().css({ 'visibility': '' });

        if (this.$overlay) {
          this.$overlay.css({ 'visibility': '' }).hide();
          if (this.$element.hasClass('fast')) {
            this.$overlay.addClass('fast');
          } else if (this.$element.hasClass('slow')) {
            this.$overlay.addClass('slow');
          }
        }

        if (!this.options.multipleOpened) {
          /**
           * Fires immediately before the modal opens.
           * Closes any other modals that are currently open
           * @event Reveal#closeme
           */
          this.$element.trigger('closeme.zf.reveal', this.id);
        }

        var _this = this;

        function addRevealOpenClasses() {
          if (_this.isMobile) {
            if (!_this.originalScrollPos) {
              _this.originalScrollPos = window.pageYOffset;
            }
            $('html, body').addClass('is-reveal-open');
          } else {
            $('body').addClass('is-reveal-open');
          }
        }
        // Motion UI method of reveal
        if (this.options.animationIn) {
          (function () {
            var afterAnimation = function () {
              _this.$element.attr({
                'aria-hidden': false,
                'tabindex': -1
              }).focus();
              addRevealOpenClasses();
              Foundation.Keyboard.trapFocus(_this.$element);
            };

            if (_this3.options.overlay) {
              Foundation.Motion.animateIn(_this3.$overlay, 'fade-in');
            }
            Foundation.Motion.animateIn(_this3.$element, _this3.options.animationIn, function () {
              if (_this3.$element) {
                // protect against object having been removed
                _this3.focusableElements = Foundation.Keyboard.findFocusable(_this3.$element);
                afterAnimation();
              }
            });
          })();
        }
        // jQuery method of reveal
        else {
            if (this.options.overlay) {
              this.$overlay.show(0);
            }
            this.$element.show(this.options.showDelay);
          }

        // handle accessibility
        this.$element.attr({
          'aria-hidden': false,
          'tabindex': -1
        }).focus();
        Foundation.Keyboard.trapFocus(this.$element);

        /**
         * Fires when the modal has successfully opened.
         * @event Reveal#open
         */
        this.$element.trigger('open.zf.reveal');

        addRevealOpenClasses();

        setTimeout(function () {
          _this3._extraHandlers();
        }, 0);
      }

      /**
       * Adds extra event handlers for the body and window if necessary.
       * @private
       */

    }, {
      key: '_extraHandlers',
      value: function _extraHandlers() {
        var _this = this;
        if (!this.$element) {
          return;
        } // If we're in the middle of cleanup, don't freak out
        this.focusableElements = Foundation.Keyboard.findFocusable(this.$element);

        if (!this.options.overlay && this.options.closeOnClick && !this.options.fullScreen) {
          $('body').on('click.zf.reveal', function (e) {
            if (e.target === _this.$element[0] || $.contains(_this.$element[0], e.target) || !$.contains(document, e.target)) {
              return;
            }
            _this.close();
          });
        }

        if (this.options.closeOnEsc) {
          $(window).on('keydown.zf.reveal', function (e) {
            Foundation.Keyboard.handleKey(e, 'Reveal', {
              close: function () {
                if (_this.options.closeOnEsc) {
                  _this.close();
                  _this.$anchor.focus();
                }
              }
            });
          });
        }

        // lock focus within modal while tabbing
        this.$element.on('keydown.zf.reveal', function (e) {
          var $target = $(this);
          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Reveal', {
            open: function () {
              if (_this.$element.find(':focus').is(_this.$element.find('[data-close]'))) {
                setTimeout(function () {
                  // set focus back to anchor if close button has been activated
                  _this.$anchor.focus();
                }, 1);
              } else if ($target.is(_this.focusableElements)) {
                // dont't trigger if acual element has focus (i.e. inputs, links, ...)
                _this.open();
              }
            },
            close: function () {
              if (_this.options.closeOnEsc) {
                _this.close();
                _this.$anchor.focus();
              }
            },
            handled: function (preventDefault) {
              if (preventDefault) {
                e.preventDefault();
              }
            }
          });
        });
      }

      /**
       * Closes the modal.
       * @function
       * @fires Reveal#closed
       */

    }, {
      key: 'close',
      value: function close() {
        if (!this.isActive || !this.$element.is(':visible')) {
          return false;
        }
        var _this = this;

        // Motion UI method of hiding
        if (this.options.animationOut) {
          if (this.options.overlay) {
            Foundation.Motion.animateOut(this.$overlay, 'fade-out', finishUp);
          } else {
            finishUp();
          }

          Foundation.Motion.animateOut(this.$element, this.options.animationOut);
        }
        // jQuery method of hiding
        else {
            if (this.options.overlay) {
              this.$overlay.hide(0, finishUp);
            } else {
              finishUp();
            }

            this.$element.hide(this.options.hideDelay);
          }

        // Conditionals to remove extra event listeners added on open
        if (this.options.closeOnEsc) {
          $(window).off('keydown.zf.reveal');
        }

        if (!this.options.overlay && this.options.closeOnClick) {
          $('body').off('click.zf.reveal');
        }

        this.$element.off('keydown.zf.reveal');

        function finishUp() {
          if (_this.isMobile) {
            $('html, body').removeClass('is-reveal-open');
            if (_this.originalScrollPos) {
              $('body').scrollTop(_this.originalScrollPos);
              _this.originalScrollPos = null;
            }
          } else {
            $('body').removeClass('is-reveal-open');
          }

          Foundation.Keyboard.releaseFocus(_this.$element);

          _this.$element.attr('aria-hidden', true);

          /**
          * Fires when the modal is done closing.
          * @event Reveal#closed
          */
          _this.$element.trigger('closed.zf.reveal');
        }

        /**
        * Resets the modal content
        * This prevents a running video to keep going in the background
        */
        if (this.options.resetOnClose) {
          this.$element.html(this.$element.html());
        }

        this.isActive = false;
        if (_this.options.deepLink) {
          if (window.history.replaceState) {
            window.history.replaceState('', document.title, window.location.href.replace('#' + this.id, ''));
          } else {
            window.location.hash = '';
          }
        }
      }

      /**
       * Toggles the open/closed state of a modal.
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.close();
        } else {
          this.open();
        }
      }
    }, {
      key: 'destroy',


      /**
       * Destroys an instance of a modal.
       * @function
       */
      value: function destroy() {
        if (this.options.overlay) {
          this.$element.appendTo($(this.options.appendTo)); // move $element outside of $overlay to prevent error unregisterPlugin()
          this.$overlay.hide().off().remove();
        }
        this.$element.hide().off();
        this.$anchor.off('.zf');
        $(window).off('.zf.reveal:' + this.id);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Reveal;
  }();

  Reveal.defaults = {
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-in-left'
     */
    animationIn: '',
    /**
     * Motion-UI class to use for animated elements. If none used, defaults to simple show/hide.
     * @option
     * @example 'slide-out-right'
     */
    animationOut: '',
    /**
     * Time, in ms, to delay the opening of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    showDelay: 0,
    /**
     * Time, in ms, to delay the closing of a modal after a click if no animation used.
     * @option
     * @example 10
     */
    hideDelay: 0,
    /**
     * Allows a click on the body/overlay to close the modal.
     * @option
     * @example true
     */
    closeOnClick: true,
    /**
     * Allows the modal to close if the user presses the `ESCAPE` key.
     * @option
     * @example true
     */
    closeOnEsc: true,
    /**
     * If true, allows multiple modals to be displayed at once.
     * @option
     * @example false
     */
    multipleOpened: false,
    /**
     * Distance, in pixels, the modal should push down from the top of the screen.
     * @option
     * @example auto
     */
    vOffset: 'auto',
    /**
     * Distance, in pixels, the modal should push in from the side of the screen.
     * @option
     * @example auto
     */
    hOffset: 'auto',
    /**
     * Allows the modal to be fullscreen, completely blocking out the rest of the view. JS checks for this as well.
     * @option
     * @example false
     */
    fullScreen: false,
    /**
     * Percentage of screen height the modal should push up from the bottom of the view.
     * @option
     * @example 10
     */
    btmOffsetPct: 10,
    /**
     * Allows the modal to generate an overlay div, which will cover the view when modal opens.
     * @option
     * @example true
     */
    overlay: true,
    /**
     * Allows the modal to remove and reinject markup on close. Should be true if using video elements w/o using provider's api, otherwise, videos will continue to play in the background.
     * @option
     * @example false
     */
    resetOnClose: false,
    /**
     * Allows the modal to alter the url on open/close, and allows the use of the `back` button to close modals. ALSO, allows a modal to auto-maniacally open on page load IF the hash === the modal's user-set id.
     * @option
     * @example false
     */
    deepLink: false,
    /**
    * Allows the modal to append to custom div.
    * @option
    * @example false
    */
    appendTo: "body"

  };

  // Window exports
  Foundation.plugin(Reveal, 'Reveal');

  function iPhoneSniff() {
    return (/iP(ad|hone|od).*OS/.test(window.navigator.userAgent)
    );
  }

  function androidSniff() {
    return (/Android/.test(window.navigator.userAgent)
    );
  }

  function mobileSniff() {
    return iPhoneSniff() || androidSniff();
  }
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Slider module.
   * @module foundation.slider
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   * @requires foundation.util.keyboard
   * @requires foundation.util.touch
   */

  var Slider = function () {
    /**
     * Creates a new instance of a slider control.
     * @class
     * @param {jQuery} element - jQuery object to make into a slider control.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Slider(element, options) {
      _classCallCheck(this, Slider);

      this.$element = element;
      this.options = $.extend({}, Slider.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Slider');
      Foundation.Keyboard.register('Slider', {
        'ltr': {
          'ARROW_RIGHT': 'increase',
          'ARROW_UP': 'increase',
          'ARROW_DOWN': 'decrease',
          'ARROW_LEFT': 'decrease',
          'SHIFT_ARROW_RIGHT': 'increase_fast',
          'SHIFT_ARROW_UP': 'increase_fast',
          'SHIFT_ARROW_DOWN': 'decrease_fast',
          'SHIFT_ARROW_LEFT': 'decrease_fast'
        },
        'rtl': {
          'ARROW_LEFT': 'increase',
          'ARROW_RIGHT': 'decrease',
          'SHIFT_ARROW_LEFT': 'increase_fast',
          'SHIFT_ARROW_RIGHT': 'decrease_fast'
        }
      });
    }

    /**
     * Initilizes the plugin by reading/setting attributes, creating collections and setting the initial position of the handle(s).
     * @function
     * @private
     */


    _createClass(Slider, [{
      key: '_init',
      value: function _init() {
        this.inputs = this.$element.find('input');
        this.handles = this.$element.find('[data-slider-handle]');

        this.$handle = this.handles.eq(0);
        this.$input = this.inputs.length ? this.inputs.eq(0) : $('#' + this.$handle.attr('aria-controls'));
        this.$fill = this.$element.find('[data-slider-fill]').css(this.options.vertical ? 'height' : 'width', 0);

        var isDbl = false,
            _this = this;
        if (this.options.disabled || this.$element.hasClass(this.options.disabledClass)) {
          this.options.disabled = true;
          this.$element.addClass(this.options.disabledClass);
        }
        if (!this.inputs.length) {
          this.inputs = $().add(this.$input);
          this.options.binding = true;
        }

        this._setInitAttr(0);

        if (this.handles[1]) {
          this.options.doubleSided = true;
          this.$handle2 = this.handles.eq(1);
          this.$input2 = this.inputs.length > 1 ? this.inputs.eq(1) : $('#' + this.$handle2.attr('aria-controls'));

          if (!this.inputs[1]) {
            this.inputs = this.inputs.add(this.$input2);
          }
          isDbl = true;

          // this.$handle.triggerHandler('click.zf.slider');
          this._setInitAttr(1);
        }

        // Set handle positions
        this.setHandles();

        this._events();
      }
    }, {
      key: 'setHandles',
      value: function setHandles() {
        var _this2 = this;

        if (this.handles[1]) {
          this._setHandlePos(this.$handle, this.inputs.eq(0).val(), true, function () {
            _this2._setHandlePos(_this2.$handle2, _this2.inputs.eq(1).val(), true);
          });
        } else {
          this._setHandlePos(this.$handle, this.inputs.eq(0).val(), true);
        }
      }
    }, {
      key: '_reflow',
      value: function _reflow() {
        this.setHandles();
      }
      /**
      * @function
      * @private
      * @param {Number} value - floating point (the value) to be transformed using to a relative position on the slider (the inverse of _value)
      */

    }, {
      key: '_pctOfBar',
      value: function _pctOfBar(value) {
        var pctOfBar = percent(value - this.options.start, this.options.end - this.options.start);

        switch (this.options.positionValueFunction) {
          case "pow":
            pctOfBar = this._logTransform(pctOfBar);
            break;
          case "log":
            pctOfBar = this._powTransform(pctOfBar);
            break;
        }

        return pctOfBar.toFixed(2);
      }

      /**
      * @function
      * @private
      * @param {Number} pctOfBar - floating point, the relative position of the slider (typically between 0-1) to be transformed to a value
      */

    }, {
      key: '_value',
      value: function _value(pctOfBar) {
        switch (this.options.positionValueFunction) {
          case "pow":
            pctOfBar = this._powTransform(pctOfBar);
            break;
          case "log":
            pctOfBar = this._logTransform(pctOfBar);
            break;
        }
        var value = (this.options.end - this.options.start) * pctOfBar + this.options.start;

        return value;
      }

      /**
      * @function
      * @private
      * @param {Number} value - floating point (typically between 0-1) to be transformed using the log function
      */

    }, {
      key: '_logTransform',
      value: function _logTransform(value) {
        return baseLog(this.options.nonLinearBase, value * (this.options.nonLinearBase - 1) + 1);
      }

      /**
      * @function
      * @private
      * @param {Number} value - floating point (typically between 0-1) to be transformed using the power function
      */

    }, {
      key: '_powTransform',
      value: function _powTransform(value) {
        return (Math.pow(this.options.nonLinearBase, value) - 1) / (this.options.nonLinearBase - 1);
      }

      /**
       * Sets the position of the selected handle and fill bar.
       * @function
       * @private
       * @param {jQuery} $hndl - the selected handle to move.
       * @param {Number} location - floating point between the start and end values of the slider bar.
       * @param {Function} cb - callback function to fire on completion.
       * @fires Slider#moved
       * @fires Slider#changed
       */

    }, {
      key: '_setHandlePos',
      value: function _setHandlePos($hndl, location, noInvert, cb) {
        // don't move if the slider has been disabled since its initialization
        if (this.$element.hasClass(this.options.disabledClass)) {
          return;
        }
        //might need to alter that slightly for bars that will have odd number selections.
        location = parseFloat(location); //on input change events, convert string to number...grumble.

        // prevent slider from running out of bounds, if value exceeds the limits set through options, override the value to min/max
        if (location < this.options.start) {
          location = this.options.start;
        } else if (location > this.options.end) {
          location = this.options.end;
        }

        var isDbl = this.options.doubleSided;

        if (isDbl) {
          //this block is to prevent 2 handles from crossing eachother. Could/should be improved.
          if (this.handles.index($hndl) === 0) {
            var h2Val = parseFloat(this.$handle2.attr('aria-valuenow'));
            location = location >= h2Val ? h2Val - this.options.step : location;
          } else {
            var h1Val = parseFloat(this.$handle.attr('aria-valuenow'));
            location = location <= h1Val ? h1Val + this.options.step : location;
          }
        }

        //this is for single-handled vertical sliders, it adjusts the value to account for the slider being "upside-down"
        //for click and drag events, it's weird due to the scale(-1, 1) css property
        if (this.options.vertical && !noInvert) {
          location = this.options.end - location;
        }

        var _this = this,
            vert = this.options.vertical,
            hOrW = vert ? 'height' : 'width',
            lOrT = vert ? 'top' : 'left',
            handleDim = $hndl[0].getBoundingClientRect()[hOrW],
            elemDim = this.$element[0].getBoundingClientRect()[hOrW],

        //percentage of bar min/max value based on click or drag point
        pctOfBar = this._pctOfBar(location),

        //number of actual pixels to shift the handle, based on the percentage obtained above
        pxToMove = (elemDim - handleDim) * pctOfBar,

        //percentage of bar to shift the handle
        movement = (percent(pxToMove, elemDim) * 100).toFixed(this.options.decimal);
        //fixing the decimal value for the location number, is passed to other methods as a fixed floating-point value
        location = parseFloat(location.toFixed(this.options.decimal));
        // declare empty object for css adjustments, only used with 2 handled-sliders
        var css = {};

        this._setValues($hndl, location);

        // TODO update to calculate based on values set to respective inputs??
        if (isDbl) {
          var isLeftHndl = this.handles.index($hndl) === 0,

          //empty variable, will be used for min-height/width for fill bar
          dim,

          //percentage w/h of the handle compared to the slider bar
          handlePct = ~~(percent(handleDim, elemDim) * 100);
          //if left handle, the math is slightly different than if it's the right handle, and the left/top property needs to be changed for the fill bar
          if (isLeftHndl) {
            //left or top percentage value to apply to the fill bar.
            css[lOrT] = movement + '%';
            //calculate the new min-height/width for the fill bar.
            dim = parseFloat(this.$handle2[0].style[lOrT]) - movement + handlePct;
            //this callback is necessary to prevent errors and allow the proper placement and initialization of a 2-handled slider
            //plus, it means we don't care if 'dim' isNaN on init, it won't be in the future.
            if (cb && typeof cb === 'function') {
              cb();
            } //this is only needed for the initialization of 2 handled sliders
          } else {
            //just caching the value of the left/bottom handle's left/top property
            var handlePos = parseFloat(this.$handle[0].style[lOrT]);
            //calculate the new min-height/width for the fill bar. Use isNaN to prevent false positives for numbers <= 0
            //based on the percentage of movement of the handle being manipulated, less the opposing handle's left/top position, plus the percentage w/h of the handle itself
            dim = movement - (isNaN(handlePos) ? (this.options.initialStart - this.options.start) / ((this.options.end - this.options.start) / 100) : handlePos) + handlePct;
          }
          // assign the min-height/width to our css object
          css['min-' + hOrW] = dim + '%';
        }

        this.$element.one('finished.zf.animate', function () {
          /**
           * Fires when the handle is done moving.
           * @event Slider#moved
           */
          _this.$element.trigger('moved.zf.slider', [$hndl]);
        });

        //because we don't know exactly how the handle will be moved, check the amount of time it should take to move.
        var moveTime = this.$element.data('dragging') ? 1000 / 60 : this.options.moveTime;

        Foundation.Move(moveTime, $hndl, function () {
          // adjusting the left/top property of the handle, based on the percentage calculated above
          // if movement isNaN, that is because the slider is hidden and we cannot determine handle width,
          // fall back to next best guess.
          if (isNaN(movement)) {
            $hndl.css(lOrT, pctOfBar * 100 + '%');
          } else {
            $hndl.css(lOrT, movement + '%');
          }

          if (!_this.options.doubleSided) {
            //if single-handled, a simple method to expand the fill bar
            _this.$fill.css(hOrW, pctOfBar * 100 + '%');
          } else {
            //otherwise, use the css object we created above
            _this.$fill.css(css);
          }
        });

        /**
         * Fires when the value has not been change for a given time.
         * @event Slider#changed
         */
        clearTimeout(_this.timeout);
        _this.timeout = setTimeout(function () {
          _this.$element.trigger('changed.zf.slider', [$hndl]);
        }, _this.options.changedDelay);
      }

      /**
       * Sets the initial attribute for the slider element.
       * @function
       * @private
       * @param {Number} idx - index of the current handle/input to use.
       */

    }, {
      key: '_setInitAttr',
      value: function _setInitAttr(idx) {
        var initVal = idx === 0 ? this.options.initialStart : this.options.initialEnd;
        var id = this.inputs.eq(idx).attr('id') || Foundation.GetYoDigits(6, 'slider');
        this.inputs.eq(idx).attr({
          'id': id,
          'max': this.options.end,
          'min': this.options.start,
          'step': this.options.step
        });
        this.inputs.eq(idx).val(initVal);
        this.handles.eq(idx).attr({
          'role': 'slider',
          'aria-controls': id,
          'aria-valuemax': this.options.end,
          'aria-valuemin': this.options.start,
          'aria-valuenow': initVal,
          'aria-orientation': this.options.vertical ? 'vertical' : 'horizontal',
          'tabindex': 0
        });
      }

      /**
       * Sets the input and `aria-valuenow` values for the slider element.
       * @function
       * @private
       * @param {jQuery} $handle - the currently selected handle.
       * @param {Number} val - floating point of the new value.
       */

    }, {
      key: '_setValues',
      value: function _setValues($handle, val) {
        var idx = this.options.doubleSided ? this.handles.index($handle) : 0;
        this.inputs.eq(idx).val(val);
        $handle.attr('aria-valuenow', val);
      }

      /**
       * Handles events on the slider element.
       * Calculates the new location of the current handle.
       * If there are two handles and the bar was clicked, it determines which handle to move.
       * @function
       * @private
       * @param {Object} e - the `event` object passed from the listener.
       * @param {jQuery} $handle - the current handle to calculate for, if selected.
       * @param {Number} val - floating point number for the new value of the slider.
       * TODO clean this up, there's a lot of repeated code between this and the _setHandlePos fn.
       */

    }, {
      key: '_handleEvent',
      value: function _handleEvent(e, $handle, val) {
        var value, hasVal;
        if (!val) {
          //click or drag events
          e.preventDefault();
          var _this = this,
              vertical = this.options.vertical,
              param = vertical ? 'height' : 'width',
              direction = vertical ? 'top' : 'left',
              eventOffset = vertical ? e.pageY : e.pageX,
              halfOfHandle = this.$handle[0].getBoundingClientRect()[param] / 2,
              barDim = this.$element[0].getBoundingClientRect()[param],
              windowScroll = vertical ? $(window).scrollTop() : $(window).scrollLeft();

          var elemOffset = this.$element.offset()[direction];

          // touch events emulated by the touch util give position relative to screen, add window.scroll to event coordinates...
          // best way to guess this is simulated is if clientY == pageY
          if (e.clientY === e.pageY) {
            eventOffset = eventOffset + windowScroll;
          }
          var eventFromBar = eventOffset - elemOffset;
          var barXY;
          if (eventFromBar < 0) {
            barXY = 0;
          } else if (eventFromBar > barDim) {
            barXY = barDim;
          } else {
            barXY = eventFromBar;
          }
          var offsetPct = percent(barXY, barDim);

          value = this._value(offsetPct);

          // turn everything around for RTL, yay math!
          if (Foundation.rtl() && !this.options.vertical) {
            value = this.options.end - value;
          }

          value = _this._adjustValue(null, value);
          //boolean flag for the setHandlePos fn, specifically for vertical sliders
          hasVal = false;

          if (!$handle) {
            //figure out which handle it is, pass it to the next function.
            var firstHndlPos = absPosition(this.$handle, direction, barXY, param),
                secndHndlPos = absPosition(this.$handle2, direction, barXY, param);
            $handle = firstHndlPos <= secndHndlPos ? this.$handle : this.$handle2;
          }
        } else {
          //change event on input
          value = this._adjustValue(null, val);
          hasVal = true;
        }

        this._setHandlePos($handle, value, hasVal);
      }

      /**
       * Adjustes value for handle in regard to step value. returns adjusted value
       * @function
       * @private
       * @param {jQuery} $handle - the selected handle.
       * @param {Number} value - value to adjust. used if $handle is falsy
       */

    }, {
      key: '_adjustValue',
      value: function _adjustValue($handle, value) {
        var val,
            step = this.options.step,
            div = parseFloat(step / 2),
            left,
            prev_val,
            next_val;
        if (!!$handle) {
          val = parseFloat($handle.attr('aria-valuenow'));
        } else {
          val = value;
        }
        left = val % step;
        prev_val = val - left;
        next_val = prev_val + step;
        if (left === 0) {
          return val;
        }
        val = val >= prev_val + div ? next_val : prev_val;
        return val;
      }

      /**
       * Adds event listeners to the slider elements.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this._eventsForHandle(this.$handle);
        if (this.handles[1]) {
          this._eventsForHandle(this.$handle2);
        }
      }

      /**
       * Adds event listeners a particular handle
       * @function
       * @private
       * @param {jQuery} $handle - the current handle to apply listeners to.
       */

    }, {
      key: '_eventsForHandle',
      value: function _eventsForHandle($handle) {
        var _this = this,
            curHandle,
            timer;

        this.inputs.off('change.zf.slider').on('change.zf.slider', function (e) {
          var idx = _this.inputs.index($(this));
          _this._handleEvent(e, _this.handles.eq(idx), $(this).val());
        });

        if (this.options.clickSelect) {
          this.$element.off('click.zf.slider').on('click.zf.slider', function (e) {
            if (_this.$element.data('dragging')) {
              return false;
            }

            if (!$(e.target).is('[data-slider-handle]')) {
              if (_this.options.doubleSided) {
                _this._handleEvent(e);
              } else {
                _this._handleEvent(e, _this.$handle);
              }
            }
          });
        }

        if (this.options.draggable) {
          this.handles.addTouch();

          var $body = $('body');
          $handle.off('mousedown.zf.slider').on('mousedown.zf.slider', function (e) {
            $handle.addClass('is-dragging');
            _this.$fill.addClass('is-dragging'); //
            _this.$element.data('dragging', true);

            curHandle = $(e.currentTarget);

            $body.on('mousemove.zf.slider', function (e) {
              e.preventDefault();
              _this._handleEvent(e, curHandle);
            }).on('mouseup.zf.slider', function (e) {
              _this._handleEvent(e, curHandle);

              $handle.removeClass('is-dragging');
              _this.$fill.removeClass('is-dragging');
              _this.$element.data('dragging', false);

              $body.off('mousemove.zf.slider mouseup.zf.slider');
            });
          })
          // prevent events triggered by touch
          .on('selectstart.zf.slider touchmove.zf.slider', function (e) {
            e.preventDefault();
          });
        }

        $handle.off('keydown.zf.slider').on('keydown.zf.slider', function (e) {
          var _$handle = $(this),
              idx = _this.options.doubleSided ? _this.handles.index(_$handle) : 0,
              oldValue = parseFloat(_this.inputs.eq(idx).val()),
              newValue;

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Slider', {
            decrease: function () {
              newValue = oldValue - _this.options.step;
            },
            increase: function () {
              newValue = oldValue + _this.options.step;
            },
            decrease_fast: function () {
              newValue = oldValue - _this.options.step * 10;
            },
            increase_fast: function () {
              newValue = oldValue + _this.options.step * 10;
            },
            handled: function () {
              // only set handle pos when event was handled specially
              e.preventDefault();
              _this._setHandlePos(_$handle, newValue, true);
            }
          });
          /*if (newValue) { // if pressed key has special function, update value
            e.preventDefault();
            _this._setHandlePos(_$handle, newValue);
          }*/
        });
      }

      /**
       * Destroys the slider plugin.
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.handles.off('.zf.slider');
        this.inputs.off('.zf.slider');
        this.$element.off('.zf.slider');

        clearTimeout(this.timeout);

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Slider;
  }();

  Slider.defaults = {
    /**
     * Minimum value for the slider scale.
     * @option
     * @example 0
     */
    start: 0,
    /**
     * Maximum value for the slider scale.
     * @option
     * @example 100
     */
    end: 100,
    /**
     * Minimum value change per change event.
     * @option
     * @example 1
     */
    step: 1,
    /**
     * Value at which the handle/input *(left handle/first input)* should be set to on initialization.
     * @option
     * @example 0
     */
    initialStart: 0,
    /**
     * Value at which the right handle/second input should be set to on initialization.
     * @option
     * @example 100
     */
    initialEnd: 100,
    /**
     * Allows the input to be located outside the container and visible. Set to by the JS
     * @option
     * @example false
     */
    binding: false,
    /**
     * Allows the user to click/tap on the slider bar to select a value.
     * @option
     * @example true
     */
    clickSelect: true,
    /**
     * Set to true and use the `vertical` class to change alignment to vertical.
     * @option
     * @example false
     */
    vertical: false,
    /**
     * Allows the user to drag the slider handle(s) to select a value.
     * @option
     * @example true
     */
    draggable: true,
    /**
     * Disables the slider and prevents event listeners from being applied. Double checked by JS with `disabledClass`.
     * @option
     * @example false
     */
    disabled: false,
    /**
     * Allows the use of two handles. Double checked by the JS. Changes some logic handling.
     * @option
     * @example false
     */
    doubleSided: false,
    /**
     * Potential future feature.
     */
    // steps: 100,
    /**
     * Number of decimal places the plugin should go to for floating point precision.
     * @option
     * @example 2
     */
    decimal: 2,
    /**
     * Time delay for dragged elements.
     */
    // dragDelay: 0,
    /**
     * Time, in ms, to animate the movement of a slider handle if user clicks/taps on the bar. Needs to be manually set if updating the transition time in the Sass settings.
     * @option
     * @example 200
     */
    moveTime: 200, //update this if changing the transition time in the sass
    /**
     * Class applied to disabled sliders.
     * @option
     * @example 'disabled'
     */
    disabledClass: 'disabled',
    /**
     * Will invert the default layout for a vertical<span data-tooltip title="who would do this???"> </span>slider.
     * @option
     * @example false
     */
    invertVertical: false,
    /**
     * Milliseconds before the `changed.zf-slider` event is triggered after value change.
     * @option
     * @example 500
     */
    changedDelay: 500,
    /**
    * Basevalue for non-linear sliders
    * @option
    * @example 5
    */
    nonLinearBase: 5,
    /**
    * Basevalue for non-linear sliders, possible values are: 'linear', 'pow' & 'log'. Pow and Log use the nonLinearBase setting.
    * @option
    * @example 'linear'
    */
    positionValueFunction: 'linear'
  };

  function percent(frac, num) {
    return frac / num;
  }
  function absPosition($handle, dir, clickPos, param) {
    return Math.abs($handle.position()[dir] + $handle[param]() / 2 - clickPos);
  }
  function baseLog(base, value) {
    return Math.log(value) / Math.log(base);
  }

  // Window exports
  Foundation.plugin(Slider, 'Slider');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Sticky module.
   * @module foundation.sticky
   * @requires foundation.util.triggers
   * @requires foundation.util.mediaQuery
   */

  var Sticky = function () {
    /**
     * Creates a new instance of a sticky thing.
     * @class
     * @param {jQuery} element - jQuery object to make sticky.
     * @param {Object} options - options object passed when creating the element programmatically.
     */
    function Sticky(element, options) {
      _classCallCheck(this, Sticky);

      this.$element = element;
      this.options = $.extend({}, Sticky.defaults, this.$element.data(), options);

      this._init();

      Foundation.registerPlugin(this, 'Sticky');
    }

    /**
     * Initializes the sticky element by adding classes, getting/setting dimensions, breakpoints and attributes
     * @function
     * @private
     */


    _createClass(Sticky, [{
      key: '_init',
      value: function _init() {
        var $parent = this.$element.parent('[data-sticky-container]'),
            id = this.$element[0].id || Foundation.GetYoDigits(6, 'sticky'),
            _this = this;

        if (!$parent.length) {
          this.wasWrapped = true;
        }
        this.$container = $parent.length ? $parent : $(this.options.container).wrapInner(this.$element);
        this.$container.addClass(this.options.containerClass);

        this.$element.addClass(this.options.stickyClass).attr({ 'data-resize': id });

        this.scrollCount = this.options.checkEvery;
        this.isStuck = false;
        $(window).one('load.zf.sticky', function () {
          //We calculate the container height to have correct values for anchor points offset calculation.
          _this.containerHeight = _this.$element.css("display") == "none" ? 0 : _this.$element[0].getBoundingClientRect().height;
          _this.$container.css('height', _this.containerHeight);
          _this.elemHeight = _this.containerHeight;
          if (_this.options.anchor !== '') {
            _this.$anchor = $('#' + _this.options.anchor);
          } else {
            _this._parsePoints();
          }

          _this._setSizes(function () {
            var scroll = window.pageYOffset;
            _this._calc(false, scroll);
            //Unstick the element will ensure that proper classes are set.
            if (!_this.isStuck) {
              _this._removeSticky(scroll >= _this.topPoint ? false : true);
            }
          });
          _this._events(id.split('-').reverse().join('-'));
        });
      }

      /**
       * If using multiple elements as anchors, calculates the top and bottom pixel values the sticky thing should stick and unstick on.
       * @function
       * @private
       */

    }, {
      key: '_parsePoints',
      value: function _parsePoints() {
        var top = this.options.topAnchor == "" ? 1 : this.options.topAnchor,
            btm = this.options.btmAnchor == "" ? document.documentElement.scrollHeight : this.options.btmAnchor,
            pts = [top, btm],
            breaks = {};
        for (var i = 0, len = pts.length; i < len && pts[i]; i++) {
          var pt;
          if (typeof pts[i] === 'number') {
            pt = pts[i];
          } else {
            var place = pts[i].split(':'),
                anchor = $('#' + place[0]);

            pt = anchor.offset().top;
            if (place[1] && place[1].toLowerCase() === 'bottom') {
              pt += anchor[0].getBoundingClientRect().height;
            }
          }
          breaks[i] = pt;
        }

        this.points = breaks;
        return;
      }

      /**
       * Adds event handlers for the scrolling element.
       * @private
       * @param {String} id - psuedo-random id for unique scroll event listener.
       */

    }, {
      key: '_events',
      value: function _events(id) {
        var _this = this,
            scrollListener = this.scrollListener = 'scroll.zf.' + id;
        if (this.isOn) {
          return;
        }
        if (this.canStick) {
          this.isOn = true;
          $(window).off(scrollListener).on(scrollListener, function (e) {
            if (_this.scrollCount === 0) {
              _this.scrollCount = _this.options.checkEvery;
              _this._setSizes(function () {
                _this._calc(false, window.pageYOffset);
              });
            } else {
              _this.scrollCount--;
              _this._calc(false, window.pageYOffset);
            }
          });
        }

        this.$element.off('resizeme.zf.trigger').on('resizeme.zf.trigger', function (e, el) {
          _this._setSizes(function () {
            _this._calc(false);
            if (_this.canStick) {
              if (!_this.isOn) {
                _this._events(id);
              }
            } else if (_this.isOn) {
              _this._pauseListeners(scrollListener);
            }
          });
        });
      }

      /**
       * Removes event handlers for scroll and change events on anchor.
       * @fires Sticky#pause
       * @param {String} scrollListener - unique, namespaced scroll listener attached to `window`
       */

    }, {
      key: '_pauseListeners',
      value: function _pauseListeners(scrollListener) {
        this.isOn = false;
        $(window).off(scrollListener);

        /**
         * Fires when the plugin is paused due to resize event shrinking the view.
         * @event Sticky#pause
         * @private
         */
        this.$element.trigger('pause.zf.sticky');
      }

      /**
       * Called on every `scroll` event and on `_init`
       * fires functions based on booleans and cached values
       * @param {Boolean} checkSizes - true if plugin should recalculate sizes and breakpoints.
       * @param {Number} scroll - current scroll position passed from scroll event cb function. If not passed, defaults to `window.pageYOffset`.
       */

    }, {
      key: '_calc',
      value: function _calc(checkSizes, scroll) {
        if (checkSizes) {
          this._setSizes();
        }

        if (!this.canStick) {
          if (this.isStuck) {
            this._removeSticky(true);
          }
          return false;
        }

        if (!scroll) {
          scroll = window.pageYOffset;
        }

        if (scroll >= this.topPoint) {
          if (scroll <= this.bottomPoint) {
            if (!this.isStuck) {
              this._setSticky();
            }
          } else {
            if (this.isStuck) {
              this._removeSticky(false);
            }
          }
        } else {
          if (this.isStuck) {
            this._removeSticky(true);
          }
        }
      }

      /**
       * Causes the $element to become stuck.
       * Adds `position: fixed;`, and helper classes.
       * @fires Sticky#stuckto
       * @function
       * @private
       */

    }, {
      key: '_setSticky',
      value: function _setSticky() {
        var _this = this,
            stickTo = this.options.stickTo,
            mrgn = stickTo === 'top' ? 'marginTop' : 'marginBottom',
            notStuckTo = stickTo === 'top' ? 'bottom' : 'top',
            css = {};

        css[mrgn] = this.options[mrgn] + 'em';
        css[stickTo] = 0;
        css[notStuckTo] = 'auto';
        this.isStuck = true;
        this.$element.removeClass('is-anchored is-at-' + notStuckTo).addClass('is-stuck is-at-' + stickTo).css(css)
        /**
         * Fires when the $element has become `position: fixed;`
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.stuckto:top`
         * @event Sticky#stuckto
         */
        .trigger('sticky.zf.stuckto:' + stickTo);
        this.$element.on("transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd", function () {
          _this._setSizes();
        });
      }

      /**
       * Causes the $element to become unstuck.
       * Removes `position: fixed;`, and helper classes.
       * Adds other helper classes.
       * @param {Boolean} isTop - tells the function if the $element should anchor to the top or bottom of its $anchor element.
       * @fires Sticky#unstuckfrom
       * @private
       */

    }, {
      key: '_removeSticky',
      value: function _removeSticky(isTop) {
        var stickTo = this.options.stickTo,
            stickToTop = stickTo === 'top',
            css = {},
            anchorPt = (this.points ? this.points[1] - this.points[0] : this.anchorHeight) - this.elemHeight,
            mrgn = stickToTop ? 'marginTop' : 'marginBottom',
            notStuckTo = stickToTop ? 'bottom' : 'top',
            topOrBottom = isTop ? 'top' : 'bottom';

        css[mrgn] = 0;

        css['bottom'] = 'auto';
        if (isTop) {
          css['top'] = 0;
        } else {
          css['top'] = anchorPt;
        }

        this.isStuck = false;
        this.$element.removeClass('is-stuck is-at-' + stickTo).addClass('is-anchored is-at-' + topOrBottom).css(css)
        /**
         * Fires when the $element has become anchored.
         * Namespaced to `top` or `bottom`, e.g. `sticky.zf.unstuckfrom:bottom`
         * @event Sticky#unstuckfrom
         */
        .trigger('sticky.zf.unstuckfrom:' + topOrBottom);
      }

      /**
       * Sets the $element and $container sizes for plugin.
       * Calls `_setBreakPoints`.
       * @param {Function} cb - optional callback function to fire on completion of `_setBreakPoints`.
       * @private
       */

    }, {
      key: '_setSizes',
      value: function _setSizes(cb) {
        this.canStick = Foundation.MediaQuery.is(this.options.stickyOn);
        if (!this.canStick) {
          if (cb && typeof cb === 'function') {
            cb();
          }
        }
        var _this = this,
            newElemWidth = this.$container[0].getBoundingClientRect().width,
            comp = window.getComputedStyle(this.$container[0]),
            pdngl = parseInt(comp['padding-left'], 10),
            pdngr = parseInt(comp['padding-right'], 10);

        if (this.$anchor && this.$anchor.length) {
          this.anchorHeight = this.$anchor[0].getBoundingClientRect().height;
        } else {
          this._parsePoints();
        }

        this.$element.css({
          'max-width': newElemWidth - pdngl - pdngr + 'px'
        });

        var newContainerHeight = this.$element[0].getBoundingClientRect().height || this.containerHeight;
        if (this.$element.css("display") == "none") {
          newContainerHeight = 0;
        }
        this.containerHeight = newContainerHeight;
        this.$container.css({
          height: newContainerHeight
        });
        this.elemHeight = newContainerHeight;

        if (!this.isStuck) {
          if (this.$element.hasClass('is-at-bottom')) {
            var anchorPt = (this.points ? this.points[1] - this.$container.offset().top : this.anchorHeight) - this.elemHeight;
            this.$element.css('top', anchorPt);
          }
        }

        this._setBreakPoints(newContainerHeight, function () {
          if (cb && typeof cb === 'function') {
            cb();
          }
        });
      }

      /**
       * Sets the upper and lower breakpoints for the element to become sticky/unsticky.
       * @param {Number} elemHeight - px value for sticky.$element height, calculated by `_setSizes`.
       * @param {Function} cb - optional callback function to be called on completion.
       * @private
       */

    }, {
      key: '_setBreakPoints',
      value: function _setBreakPoints(elemHeight, cb) {
        if (!this.canStick) {
          if (cb && typeof cb === 'function') {
            cb();
          } else {
            return false;
          }
        }
        var mTop = emCalc(this.options.marginTop),
            mBtm = emCalc(this.options.marginBottom),
            topPoint = this.points ? this.points[0] : this.$anchor.offset().top,
            bottomPoint = this.points ? this.points[1] : topPoint + this.anchorHeight,

        // topPoint = this.$anchor.offset().top || this.points[0],
        // bottomPoint = topPoint + this.anchorHeight || this.points[1],
        winHeight = window.innerHeight;

        if (this.options.stickTo === 'top') {
          topPoint -= mTop;
          bottomPoint -= elemHeight + mTop;
        } else if (this.options.stickTo === 'bottom') {
          topPoint -= winHeight - (elemHeight + mBtm);
          bottomPoint -= winHeight - mBtm;
        } else {
          //this would be the stickTo: both option... tricky
        }

        this.topPoint = topPoint;
        this.bottomPoint = bottomPoint;

        if (cb && typeof cb === 'function') {
          cb();
        }
      }

      /**
       * Destroys the current sticky element.
       * Resets the element to the top position first.
       * Removes event listeners, JS-added css properties and classes, and unwraps the $element if the JS added the $container.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this._removeSticky(true);

        this.$element.removeClass(this.options.stickyClass + ' is-anchored is-at-top').css({
          height: '',
          top: '',
          bottom: '',
          'max-width': ''
        }).off('resizeme.zf.trigger');
        if (this.$anchor && this.$anchor.length) {
          this.$anchor.off('change.zf.sticky');
        }
        $(window).off(this.scrollListener);

        if (this.wasWrapped) {
          this.$element.unwrap();
        } else {
          this.$container.removeClass(this.options.containerClass).css({
            height: ''
          });
        }
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Sticky;
  }();

  Sticky.defaults = {
    /**
     * Customizable container template. Add your own classes for styling and sizing.
     * @option
     * @example '&lt;div data-sticky-container class="small-6 columns"&gt;&lt;/div&gt;'
     */
    container: '<div data-sticky-container></div>',
    /**
     * Location in the view the element sticks to.
     * @option
     * @example 'top'
     */
    stickTo: 'top',
    /**
     * If anchored to a single element, the id of that element.
     * @option
     * @example 'exampleId'
     */
    anchor: '',
    /**
     * If using more than one element as anchor points, the id of the top anchor.
     * @option
     * @example 'exampleId:top'
     */
    topAnchor: '',
    /**
     * If using more than one element as anchor points, the id of the bottom anchor.
     * @option
     * @example 'exampleId:bottom'
     */
    btmAnchor: '',
    /**
     * Margin, in `em`'s to apply to the top of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginTop: 1,
    /**
     * Margin, in `em`'s to apply to the bottom of the element when it becomes sticky.
     * @option
     * @example 1
     */
    marginBottom: 1,
    /**
     * Breakpoint string that is the minimum screen size an element should become sticky.
     * @option
     * @example 'medium'
     */
    stickyOn: 'medium',
    /**
     * Class applied to sticky element, and removed on destruction. Foundation defaults to `sticky`.
     * @option
     * @example 'sticky'
     */
    stickyClass: 'sticky',
    /**
     * Class applied to sticky container. Foundation defaults to `sticky-container`.
     * @option
     * @example 'sticky-container'
     */
    containerClass: 'sticky-container',
    /**
     * Number of scroll events between the plugin's recalculating sticky points. Setting it to `0` will cause it to recalc every scroll event, setting it to `-1` will prevent recalc on scroll.
     * @option
     * @example 50
     */
    checkEvery: -1
  };

  /**
   * Helper function to calculate em values
   * @param Number {em} - number of em's to calculate into pixels
   */
  function emCalc(em) {
    return parseInt(window.getComputedStyle(document.body, null).fontSize, 10) * em;
  }

  // Window exports
  Foundation.plugin(Sticky, 'Sticky');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tabs module.
   * @module foundation.tabs
   * @requires foundation.util.keyboard
   * @requires foundation.util.timerAndImageLoader if tabs contain images
   */

  var Tabs = function () {
    /**
     * Creates a new instance of tabs.
     * @class
     * @fires Tabs#init
     * @param {jQuery} element - jQuery object to make into tabs.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Tabs(element, options) {
      _classCallCheck(this, Tabs);

      this.$element = element;
      this.options = $.extend({}, Tabs.defaults, this.$element.data(), options);

      this._init();
      Foundation.registerPlugin(this, 'Tabs');
      Foundation.Keyboard.register('Tabs', {
        'ENTER': 'open',
        'SPACE': 'open',
        'ARROW_RIGHT': 'next',
        'ARROW_UP': 'previous',
        'ARROW_DOWN': 'next',
        'ARROW_LEFT': 'previous'
        // 'TAB': 'next',
        // 'SHIFT_TAB': 'previous'
      });
    }

    /**
     * Initializes the tabs by showing and focusing (if autoFocus=true) the preset active tab.
     * @private
     */


    _createClass(Tabs, [{
      key: '_init',
      value: function _init() {
        var _this = this;

        this.$element.attr({ 'role': 'tablist' });
        this.$tabTitles = this.$element.find('.' + this.options.linkClass);
        this.$tabContent = $('[data-tabs-content="' + this.$element[0].id + '"]');

        this.$tabTitles.each(function () {
          var $elem = $(this),
              $link = $elem.find('a'),
              isActive = $elem.hasClass('' + _this.options.linkActiveClass),
              hash = $link[0].hash.slice(1),
              linkId = $link[0].id ? $link[0].id : hash + '-label',
              $tabContent = $('#' + hash);

          $elem.attr({ 'role': 'presentation' });

          $link.attr({
            'role': 'tab',
            'aria-controls': hash,
            'aria-selected': isActive,
            'id': linkId
          });

          $tabContent.attr({
            'role': 'tabpanel',
            'aria-hidden': !isActive,
            'aria-labelledby': linkId
          });

          if (isActive && _this.options.autoFocus) {
            $(window).load(function () {
              $('html, body').animate({ scrollTop: $elem.offset().top }, _this.options.deepLinkSmudgeDelay, function () {
                $link.focus();
              });
            });
          }

          //use browser to open a tab, if it exists in this tabset
          if (_this.options.deepLink) {
            var anchor = window.location.hash;
            //need a hash and a relevant anchor in this tabset
            if (anchor.length) {
              var $link = $elem.find('[href="' + anchor + '"]');
              if ($link.length) {
                _this.selectTab($(anchor));

                //roll up a little to show the titles
                if (_this.options.deepLinkSmudge) {
                  $(window).load(function () {
                    var offset = $elem.offset();
                    $('html, body').animate({ scrollTop: offset.top }, _this.options.deepLinkSmudgeDelay);
                  });
                }

                /**
                  * Fires when the zplugin has deeplinked at pageload
                  * @event Tabs#deeplink
                  */
                $elem.trigger('deeplink.zf.tabs', [$link, $(anchor)]);
              }
            }
          }
        });

        if (this.options.matchHeight) {
          var $images = this.$tabContent.find('img');

          if ($images.length) {
            Foundation.onImagesLoaded($images, this._setHeight.bind(this));
          } else {
            this._setHeight();
          }
        }

        this._events();
      }

      /**
       * Adds event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this._addKeyHandler();
        this._addClickHandler();
        this._setHeightMqHandler = null;

        if (this.options.matchHeight) {
          this._setHeightMqHandler = this._setHeight.bind(this);

          $(window).on('changed.zf.mediaquery', this._setHeightMqHandler);
        }
      }

      /**
       * Adds click handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addClickHandler',
      value: function _addClickHandler() {
        var _this = this;

        this.$element.off('click.zf.tabs').on('click.zf.tabs', '.' + this.options.linkClass, function (e) {
          e.preventDefault();
          e.stopPropagation();
          _this._handleTabChange($(this));
        });
      }

      /**
       * Adds keyboard event handlers for items within the tabs.
       * @private
       */

    }, {
      key: '_addKeyHandler',
      value: function _addKeyHandler() {
        var _this = this;

        this.$tabTitles.off('keydown.zf.tabs').on('keydown.zf.tabs', function (e) {
          if (e.which === 9) return;

          var $element = $(this),
              $elements = $element.parent('ul').children('li'),
              $prevElement,
              $nextElement;

          $elements.each(function (i) {
            if ($(this).is($element)) {
              if (_this.options.wrapOnKeys) {
                $prevElement = i === 0 ? $elements.last() : $elements.eq(i - 1);
                $nextElement = i === $elements.length - 1 ? $elements.first() : $elements.eq(i + 1);
              } else {
                $prevElement = $elements.eq(Math.max(0, i - 1));
                $nextElement = $elements.eq(Math.min(i + 1, $elements.length - 1));
              }
              return;
            }
          });

          // handle keyboard event with keyboard util
          Foundation.Keyboard.handleKey(e, 'Tabs', {
            open: function () {
              $element.find('[role="tab"]').focus();
              _this._handleTabChange($element);
            },
            previous: function () {
              $prevElement.find('[role="tab"]').focus();
              _this._handleTabChange($prevElement);
            },
            next: function () {
              $nextElement.find('[role="tab"]').focus();
              _this._handleTabChange($nextElement);
            },
            handled: function () {
              e.stopPropagation();
              e.preventDefault();
            }
          });
        });
      }

      /**
       * Opens the tab `$targetContent` defined by `$target`. Collapses active tab.
       * @param {jQuery} $target - Tab to open.
       * @fires Tabs#change
       * @function
       */

    }, {
      key: '_handleTabChange',
      value: function _handleTabChange($target) {

        /**
         * Check for active class on target. Collapse if exists.
         */
        if ($target.hasClass('' + this.options.linkActiveClass)) {
          if (this.options.activeCollapse) {
            this._collapseTab($target);

            /**
             * Fires when the zplugin has successfully collapsed tabs.
             * @event Tabs#collapse
             */
            this.$element.trigger('collapse.zf.tabs', [$target]);
          }
          return;
        }

        var $oldTab = this.$element.find('.' + this.options.linkClass + '.' + this.options.linkActiveClass),
            $tabLink = $target.find('[role="tab"]'),
            hash = $tabLink[0].hash,
            $targetContent = this.$tabContent.find(hash);

        //close old tab
        this._collapseTab($oldTab);

        //open new tab
        this._openTab($target);

        //either replace or update browser history
        if (this.options.deepLink) {
          var anchor = $target.find('a').attr('href');

          if (this.options.updateHistory) {
            history.pushState({}, '', anchor);
          } else {
            history.replaceState({}, '', anchor);
          }
        }

        /**
         * Fires when the plugin has successfully changed tabs.
         * @event Tabs#change
         */
        this.$element.trigger('change.zf.tabs', [$target, $targetContent]);

        //fire to children a mutation event
        $targetContent.find("[data-mutate]").trigger("mutateme.zf.trigger");
      }

      /**
       * Opens the tab `$targetContent` defined by `$target`.
       * @param {jQuery} $target - Tab to Open.
       * @function
       */

    }, {
      key: '_openTab',
      value: function _openTab($target) {
        var $tabLink = $target.find('[role="tab"]'),
            hash = $tabLink[0].hash,
            $targetContent = this.$tabContent.find(hash);

        $target.addClass('' + this.options.linkActiveClass);

        $tabLink.attr({ 'aria-selected': 'true' });

        $targetContent.addClass('' + this.options.panelActiveClass).attr({ 'aria-hidden': 'false' });
      }

      /**
       * Collapses `$targetContent` defined by `$target`.
       * @param {jQuery} $target - Tab to Open.
       * @function
       */

    }, {
      key: '_collapseTab',
      value: function _collapseTab($target) {
        var $target_anchor = $target.removeClass('' + this.options.linkActiveClass).find('[role="tab"]').attr({ 'aria-selected': 'false' });

        $('#' + $target_anchor.attr('aria-controls')).removeClass('' + this.options.panelActiveClass).attr({ 'aria-hidden': 'true' });
      }

      /**
       * Public method for selecting a content pane to display.
       * @param {jQuery | String} elem - jQuery object or string of the id of the pane to display.
       * @function
       */

    }, {
      key: 'selectTab',
      value: function selectTab(elem) {
        var idStr;

        if (typeof elem === 'object') {
          idStr = elem[0].id;
        } else {
          idStr = elem;
        }

        if (idStr.indexOf('#') < 0) {
          idStr = '#' + idStr;
        }

        var $target = this.$tabTitles.find('[href="' + idStr + '"]').parent('.' + this.options.linkClass);

        this._handleTabChange($target);
      }
    }, {
      key: '_setHeight',

      /**
       * Sets the height of each panel to the height of the tallest panel.
       * If enabled in options, gets called on media query change.
       * If loading content via external source, can be called directly or with _reflow.
       * @function
       * @private
       */
      value: function _setHeight() {
        var max = 0;
        this.$tabContent.find('.' + this.options.panelClass).css('height', '').each(function () {
          var panel = $(this),
              isActive = panel.hasClass('' + this.options.panelActiveClass);

          if (!isActive) {
            panel.css({ 'visibility': 'hidden', 'display': 'block' });
          }

          var temp = this.getBoundingClientRect().height;

          if (!isActive) {
            panel.css({
              'visibility': '',
              'display': ''
            });
          }

          max = temp > max ? temp : max;
        }).css('height', max + 'px');
      }

      /**
       * Destroys an instance of an tabs.
       * @fires Tabs#destroyed
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.find('.' + this.options.linkClass).off('.zf.tabs').hide().end().find('.' + this.options.panelClass).hide();

        if (this.options.matchHeight) {
          if (this._setHeightMqHandler != null) {
            $(window).off('changed.zf.mediaquery', this._setHeightMqHandler);
          }
        }

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tabs;
  }();

  Tabs.defaults = {
    /**
     * Allows the window to scroll to content of pane specified by hash anchor
     * @option
     * @example false
     */
    deepLink: false,

    /**
     * Adjust the deep link scroll to make sure the top of the tab panel is visible
     * @option
     * @example false
     */
    deepLinkSmudge: false,

    /**
     * Animation time (ms) for the deep link adjustment
     * @option
     * @example 300
     */
    deepLinkSmudgeDelay: 300,

    /**
     * Update the browser history with the open tab
     * @option
     * @example false
     */
    updateHistory: false,

    /**
     * Allows the window to scroll to content of active pane on load if set to true.
     * Not recommended if more than one tab panel per page.
     * @option
     * @example false
     */
    autoFocus: false,

    /**
     * Allows keyboard input to 'wrap' around the tab links.
     * @option
     * @example true
     */
    wrapOnKeys: true,

    /**
     * Allows the tab content panes to match heights if set to true.
     * @option
     * @example false
     */
    matchHeight: false,

    /**
     * Allows active tabs to collapse when clicked.
     * @option
     * @example false
     */
    activeCollapse: false,

    /**
     * Class applied to `li`'s in tab link list.
     * @option
     * @example 'tabs-title'
     */
    linkClass: 'tabs-title',

    /**
     * Class applied to the active `li` in tab link list.
     * @option
     * @example 'is-active'
     */
    linkActiveClass: 'is-active',

    /**
     * Class applied to the content containers.
     * @option
     * @example 'tabs-panel'
     */
    panelClass: 'tabs-panel',

    /**
     * Class applied to the active content container.
     * @option
     * @example 'is-active'
     */
    panelActiveClass: 'is-active'
  };

  // Window exports
  Foundation.plugin(Tabs, 'Tabs');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Toggler module.
   * @module foundation.toggler
   * @requires foundation.util.motion
   * @requires foundation.util.triggers
   */

  var Toggler = function () {
    /**
     * Creates a new instance of Toggler.
     * @class
     * @fires Toggler#init
     * @param {Object} element - jQuery object to add the trigger to.
     * @param {Object} options - Overrides to the default plugin settings.
     */
    function Toggler(element, options) {
      _classCallCheck(this, Toggler);

      this.$element = element;
      this.options = $.extend({}, Toggler.defaults, element.data(), options);
      this.className = '';

      this._init();
      this._events();

      Foundation.registerPlugin(this, 'Toggler');
    }

    /**
     * Initializes the Toggler plugin by parsing the toggle class from data-toggler, or animation classes from data-animate.
     * @function
     * @private
     */


    _createClass(Toggler, [{
      key: '_init',
      value: function _init() {
        var input;
        // Parse animation classes if they were set
        if (this.options.animate) {
          input = this.options.animate.split(' ');

          this.animationIn = input[0];
          this.animationOut = input[1] || null;
        }
        // Otherwise, parse toggle class
        else {
            input = this.$element.data('toggler');
            // Allow for a . at the beginning of the string
            this.className = input[0] === '.' ? input.slice(1) : input;
          }

        // Add ARIA attributes to triggers
        var id = this.$element[0].id;
        $('[data-open="' + id + '"], [data-close="' + id + '"], [data-toggle="' + id + '"]').attr('aria-controls', id);
        // If the target is hidden, add aria-hidden
        this.$element.attr('aria-expanded', this.$element.is(':hidden') ? false : true);
      }

      /**
       * Initializes events for the toggle trigger.
       * @function
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        this.$element.off('toggle.zf.trigger').on('toggle.zf.trigger', this.toggle.bind(this));
      }

      /**
       * Toggles the target class on the target element. An event is fired from the original trigger depending on if the resultant state was "on" or "off".
       * @function
       * @fires Toggler#on
       * @fires Toggler#off
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        this[this.options.animate ? '_toggleAnimate' : '_toggleClass']();
      }
    }, {
      key: '_toggleClass',
      value: function _toggleClass() {
        this.$element.toggleClass(this.className);

        var isOn = this.$element.hasClass(this.className);
        if (isOn) {
          /**
           * Fires if the target element has the class after a toggle.
           * @event Toggler#on
           */
          this.$element.trigger('on.zf.toggler');
        } else {
          /**
           * Fires if the target element does not have the class after a toggle.
           * @event Toggler#off
           */
          this.$element.trigger('off.zf.toggler');
        }

        this._updateARIA(isOn);
        this.$element.find('[data-mutate]').trigger('mutateme.zf.trigger');
      }
    }, {
      key: '_toggleAnimate',
      value: function _toggleAnimate() {
        var _this = this;

        if (this.$element.is(':hidden')) {
          Foundation.Motion.animateIn(this.$element, this.animationIn, function () {
            _this._updateARIA(true);
            this.trigger('on.zf.toggler');
            this.find('[data-mutate]').trigger('mutateme.zf.trigger');
          });
        } else {
          Foundation.Motion.animateOut(this.$element, this.animationOut, function () {
            _this._updateARIA(false);
            this.trigger('off.zf.toggler');
            this.find('[data-mutate]').trigger('mutateme.zf.trigger');
          });
        }
      }
    }, {
      key: '_updateARIA',
      value: function _updateARIA(isOn) {
        this.$element.attr('aria-expanded', isOn ? true : false);
      }

      /**
       * Destroys the instance of Toggler on the element.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.off('.zf.toggler');
        Foundation.unregisterPlugin(this);
      }
    }]);

    return Toggler;
  }();

  Toggler.defaults = {
    /**
     * Tells the plugin if the element should animated when toggled.
     * @option
     * @example false
     */
    animate: false
  };

  // Window exports
  Foundation.plugin(Toggler, 'Toggler');
}(jQuery);
;'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

!function ($) {

  /**
   * Tooltip module.
   * @module foundation.tooltip
   * @requires foundation.util.box
   * @requires foundation.util.mediaQuery
   * @requires foundation.util.triggers
   */

  var Tooltip = function () {
    /**
     * Creates a new instance of a Tooltip.
     * @class
     * @fires Tooltip#init
     * @param {jQuery} element - jQuery object to attach a tooltip to.
     * @param {Object} options - object to extend the default configuration.
     */
    function Tooltip(element, options) {
      _classCallCheck(this, Tooltip);

      this.$element = element;
      this.options = $.extend({}, Tooltip.defaults, this.$element.data(), options);

      this.isActive = false;
      this.isClick = false;
      this._init();

      Foundation.registerPlugin(this, 'Tooltip');
    }

    /**
     * Initializes the tooltip by setting the creating the tip element, adding it's text, setting private variables and setting attributes on the anchor.
     * @private
     */


    _createClass(Tooltip, [{
      key: '_init',
      value: function _init() {
        var elemId = this.$element.attr('aria-describedby') || Foundation.GetYoDigits(6, 'tooltip');

        this.options.positionClass = this.options.positionClass || this._getPositionClass(this.$element);
        this.options.tipText = this.options.tipText || this.$element.attr('title');
        this.template = this.options.template ? $(this.options.template) : this._buildTemplate(elemId);

        if (this.options.allowHtml) {
          this.template.appendTo(document.body).html(this.options.tipText).hide();
        } else {
          this.template.appendTo(document.body).text(this.options.tipText).hide();
        }

        this.$element.attr({
          'title': '',
          'aria-describedby': elemId,
          'data-yeti-box': elemId,
          'data-toggle': elemId,
          'data-resize': elemId
        }).addClass(this.options.triggerClass);

        //helper variables to track movement on collisions
        this.usedPositions = [];
        this.counter = 4;
        this.classChanged = false;

        this._events();
      }

      /**
       * Grabs the current positioning class, if present, and returns the value or an empty string.
       * @private
       */

    }, {
      key: '_getPositionClass',
      value: function _getPositionClass(element) {
        if (!element) {
          return '';
        }
        // var position = element.attr('class').match(/top|left|right/g);
        var position = element[0].className.match(/\b(top|left|right)\b/g);
        position = position ? position[0] : '';
        return position;
      }
    }, {
      key: '_buildTemplate',

      /**
       * builds the tooltip element, adds attributes, and returns the template.
       * @private
       */
      value: function _buildTemplate(id) {
        var templateClasses = (this.options.tooltipClass + ' ' + this.options.positionClass + ' ' + this.options.templateClasses).trim();
        var $template = $('<div></div>').addClass(templateClasses).attr({
          'role': 'tooltip',
          'aria-hidden': true,
          'data-is-active': false,
          'data-is-focus': false,
          'id': id
        });
        return $template;
      }

      /**
       * Function that gets called if a collision event is detected.
       * @param {String} position - positioning class to try
       * @private
       */

    }, {
      key: '_reposition',
      value: function _reposition(position) {
        this.usedPositions.push(position ? position : 'bottom');

        //default, try switching to opposite side
        if (!position && this.usedPositions.indexOf('top') < 0) {
          this.template.addClass('top');
        } else if (position === 'top' && this.usedPositions.indexOf('bottom') < 0) {
          this.template.removeClass(position);
        } else if (position === 'left' && this.usedPositions.indexOf('right') < 0) {
          this.template.removeClass(position).addClass('right');
        } else if (position === 'right' && this.usedPositions.indexOf('left') < 0) {
          this.template.removeClass(position).addClass('left');
        }

        //if default change didn't work, try bottom or left first
        else if (!position && this.usedPositions.indexOf('top') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.addClass('left');
          } else if (position === 'top' && this.usedPositions.indexOf('bottom') > -1 && this.usedPositions.indexOf('left') < 0) {
            this.template.removeClass(position).addClass('left');
          } else if (position === 'left' && this.usedPositions.indexOf('right') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          } else if (position === 'right' && this.usedPositions.indexOf('left') > -1 && this.usedPositions.indexOf('bottom') < 0) {
            this.template.removeClass(position);
          }
          //if nothing cleared, set to bottom
          else {
              this.template.removeClass(position);
            }
        this.classChanged = true;
        this.counter--;
      }

      /**
       * sets the position class of an element and recursively calls itself until there are no more possible positions to attempt, or the tooltip element is no longer colliding.
       * if the tooltip is larger than the screen width, default to full width - any user selected margin
       * @private
       */

    }, {
      key: '_setPosition',
      value: function _setPosition() {
        var position = this._getPositionClass(this.template),
            $tipDims = Foundation.Box.GetDimensions(this.template),
            $anchorDims = Foundation.Box.GetDimensions(this.$element),
            direction = position === 'left' ? 'left' : position === 'right' ? 'left' : 'top',
            param = direction === 'top' ? 'height' : 'width',
            offset = param === 'height' ? this.options.vOffset : this.options.hOffset,
            _this = this;

        if ($tipDims.width >= $tipDims.windowDims.width || !this.counter && !Foundation.Box.ImNotTouchingYou(this.template)) {
          this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            // this.$element.offset(Foundation.GetOffsets(this.template, this.$element, 'center bottom', this.options.vOffset, this.options.hOffset, true)).css({
            'width': $anchorDims.windowDims.width - this.options.hOffset * 2,
            'height': 'auto'
          });
          return false;
        }

        this.template.offset(Foundation.Box.GetOffsets(this.template, this.$element, 'center ' + (position || 'bottom'), this.options.vOffset, this.options.hOffset));

        while (!Foundation.Box.ImNotTouchingYou(this.template) && this.counter) {
          this._reposition(position);
          this._setPosition();
        }
      }

      /**
       * reveals the tooltip, and fires an event to close any other open tooltips on the page
       * @fires Tooltip#closeme
       * @fires Tooltip#show
       * @function
       */

    }, {
      key: 'show',
      value: function show() {
        if (this.options.showOn !== 'all' && !Foundation.MediaQuery.is(this.options.showOn)) {
          // console.error('The screen is too small to display this tooltip');
          return false;
        }

        var _this = this;
        this.template.css('visibility', 'hidden').show();
        this._setPosition();

        /**
         * Fires to close all other open tooltips on the page
         * @event Closeme#tooltip
         */
        this.$element.trigger('closeme.zf.tooltip', this.template.attr('id'));

        this.template.attr({
          'data-is-active': true,
          'aria-hidden': false
        });
        _this.isActive = true;
        // console.log(this.template);
        this.template.stop().hide().css('visibility', '').fadeIn(this.options.fadeInDuration, function () {
          //maybe do stuff?
        });
        /**
         * Fires when the tooltip is shown
         * @event Tooltip#show
         */
        this.$element.trigger('show.zf.tooltip');
      }

      /**
       * Hides the current tooltip, and resets the positioning class if it was changed due to collision
       * @fires Tooltip#hide
       * @function
       */

    }, {
      key: 'hide',
      value: function hide() {
        // console.log('hiding', this.$element.data('yeti-box'));
        var _this = this;
        this.template.stop().attr({
          'aria-hidden': true,
          'data-is-active': false
        }).fadeOut(this.options.fadeOutDuration, function () {
          _this.isActive = false;
          _this.isClick = false;
          if (_this.classChanged) {
            _this.template.removeClass(_this._getPositionClass(_this.template)).addClass(_this.options.positionClass);

            _this.usedPositions = [];
            _this.counter = 4;
            _this.classChanged = false;
          }
        });
        /**
         * fires when the tooltip is hidden
         * @event Tooltip#hide
         */
        this.$element.trigger('hide.zf.tooltip');
      }

      /**
       * adds event listeners for the tooltip and its anchor
       * TODO combine some of the listeners like focus and mouseenter, etc.
       * @private
       */

    }, {
      key: '_events',
      value: function _events() {
        var _this = this;
        var $template = this.template;
        var isFocus = false;

        if (!this.options.disableHover) {

          this.$element.on('mouseenter.zf.tooltip', function (e) {
            if (!_this.isActive) {
              _this.timeout = setTimeout(function () {
                _this.show();
              }, _this.options.hoverDelay);
            }
          }).on('mouseleave.zf.tooltip', function (e) {
            clearTimeout(_this.timeout);
            if (!isFocus || _this.isClick && !_this.options.clickOpen) {
              _this.hide();
            }
          });
        }

        if (this.options.clickOpen) {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            if (_this.isClick) {
              //_this.hide();
              // _this.isClick = false;
            } else {
              _this.isClick = true;
              if ((_this.options.disableHover || !_this.$element.attr('tabindex')) && !_this.isActive) {
                _this.show();
              }
            }
          });
        } else {
          this.$element.on('mousedown.zf.tooltip', function (e) {
            e.stopImmediatePropagation();
            _this.isClick = true;
          });
        }

        if (!this.options.disableForTouch) {
          this.$element.on('tap.zf.tooltip touchend.zf.tooltip', function (e) {
            _this.isActive ? _this.hide() : _this.show();
          });
        }

        this.$element.on({
          // 'toggle.zf.trigger': this.toggle.bind(this),
          // 'close.zf.trigger': this.hide.bind(this)
          'close.zf.trigger': this.hide.bind(this)
        });

        this.$element.on('focus.zf.tooltip', function (e) {
          isFocus = true;
          if (_this.isClick) {
            // If we're not showing open on clicks, we need to pretend a click-launched focus isn't
            // a real focus, otherwise on hover and come back we get bad behavior
            if (!_this.options.clickOpen) {
              isFocus = false;
            }
            return false;
          } else {
            _this.show();
          }
        }).on('focusout.zf.tooltip', function (e) {
          isFocus = false;
          _this.isClick = false;
          _this.hide();
        }).on('resizeme.zf.trigger', function () {
          if (_this.isActive) {
            _this._setPosition();
          }
        });
      }

      /**
       * adds a toggle method, in addition to the static show() & hide() functions
       * @function
       */

    }, {
      key: 'toggle',
      value: function toggle() {
        if (this.isActive) {
          this.hide();
        } else {
          this.show();
        }
      }

      /**
       * Destroys an instance of tooltip, removes template element from the view.
       * @function
       */

    }, {
      key: 'destroy',
      value: function destroy() {
        this.$element.attr('title', this.template.text()).off('.zf.trigger .zf.tooltip').removeClass('has-tip top right left').removeAttr('aria-describedby aria-haspopup data-disable-hover data-resize data-toggle data-tooltip data-yeti-box');

        this.template.remove();

        Foundation.unregisterPlugin(this);
      }
    }]);

    return Tooltip;
  }();

  Tooltip.defaults = {
    disableForTouch: false,
    /**
     * Time, in ms, before a tooltip should open on hover.
     * @option
     * @example 200
     */
    hoverDelay: 200,
    /**
     * Time, in ms, a tooltip should take to fade into view.
     * @option
     * @example 150
     */
    fadeInDuration: 150,
    /**
     * Time, in ms, a tooltip should take to fade out of view.
     * @option
     * @example 150
     */
    fadeOutDuration: 150,
    /**
     * Disables hover events from opening the tooltip if set to true
     * @option
     * @example false
     */
    disableHover: false,
    /**
     * Optional addtional classes to apply to the tooltip template on init.
     * @option
     * @example 'my-cool-tip-class'
     */
    templateClasses: '',
    /**
     * Non-optional class added to tooltip templates. Foundation default is 'tooltip'.
     * @option
     * @example 'tooltip'
     */
    tooltipClass: 'tooltip',
    /**
     * Class applied to the tooltip anchor element.
     * @option
     * @example 'has-tip'
     */
    triggerClass: 'has-tip',
    /**
     * Minimum breakpoint size at which to open the tooltip.
     * @option
     * @example 'small'
     */
    showOn: 'small',
    /**
     * Custom template to be used to generate markup for tooltip.
     * @option
     * @example '&lt;div class="tooltip"&gt;&lt;/div&gt;'
     */
    template: '',
    /**
     * Text displayed in the tooltip template on open.
     * @option
     * @example 'Some cool space fact here.'
     */
    tipText: '',
    touchCloseText: 'Tap to close.',
    /**
     * Allows the tooltip to remain open if triggered with a click or touch event.
     * @option
     * @example true
     */
    clickOpen: true,
    /**
     * Additional positioning classes, set by the JS
     * @option
     * @example 'top'
     */
    positionClass: '',
    /**
     * Distance, in pixels, the template should push away from the anchor on the Y axis.
     * @option
     * @example 10
     */
    vOffset: 10,
    /**
     * Distance, in pixels, the template should push away from the anchor on the X axis, if aligned to a side.
     * @option
     * @example 12
     */
    hOffset: 12,
    /**
    * Allow HTML in tooltip. Warning: If you are loading user-generated content into tooltips,
    * allowing HTML may open yourself up to XSS attacks.
    * @option
    * @example false
    */
    allowHtml: false
  };

  /**
   * TODO utilize resize event trigger
   */

  // Window exports
  Foundation.plugin(Tooltip, 'Tooltip');
}(jQuery);
;'use strict';

// Polyfill for requestAnimationFrame

(function () {
  if (!Date.now) Date.now = function () {
    return new Date().getTime();
  };

  var vendors = ['webkit', 'moz'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; ++i) {
    var vp = vendors[i];
    window.requestAnimationFrame = window[vp + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'];
  }
  if (/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent) || !window.requestAnimationFrame || !window.cancelAnimationFrame) {
    var lastTime = 0;
    window.requestAnimationFrame = function (callback) {
      var now = Date.now();
      var nextTime = Math.max(lastTime + 16, now);
      return setTimeout(function () {
        callback(lastTime = nextTime);
      }, nextTime - now);
    };
    window.cancelAnimationFrame = clearTimeout;
  }
})();

var initClasses = ['mui-enter', 'mui-leave'];
var activeClasses = ['mui-enter-active', 'mui-leave-active'];

// Find the right "transitionend" event for this browser
var endEvent = function () {
  var transitions = {
    'transition': 'transitionend',
    'WebkitTransition': 'webkitTransitionEnd',
    'MozTransition': 'transitionend',
    'OTransition': 'otransitionend'
  };
  var elem = window.document.createElement('div');

  for (var t in transitions) {
    if (typeof elem.style[t] !== 'undefined') {
      return transitions[t];
    }
  }

  return null;
}();

function animate(isIn, element, animation, cb) {
  element = $(element).eq(0);

  if (!element.length) return;

  if (endEvent === null) {
    isIn ? element.show() : element.hide();
    cb();
    return;
  }

  var initClass = isIn ? initClasses[0] : initClasses[1];
  var activeClass = isIn ? activeClasses[0] : activeClasses[1];

  // Set up the animation
  reset();
  element.addClass(animation);
  element.css('transition', 'none');
  requestAnimationFrame(function () {
    element.addClass(initClass);
    if (isIn) element.show();
  });

  // Start the animation
  requestAnimationFrame(function () {
    element[0].offsetWidth;
    element.css('transition', '');
    element.addClass(activeClass);
  });

  // Clean up the animation when it finishes
  element.one('transitionend', finish);

  // Hides the element (for out animations), resets the element, and runs a callback
  function finish() {
    if (!isIn) element.hide();
    reset();
    if (cb) cb.apply(element);
  }

  // Resets transitions and removes motion-specific classes
  function reset() {
    element[0].style.transitionDuration = 0;
    element.removeClass(initClass + ' ' + activeClass + ' ' + animation);
  }
}

var MotionUI = {
  animateIn: function (element, animation, cb) {
    animate(true, element, animation, cb);
  },

  animateOut: function (element, animation, cb) {
    animate(false, element, animation, cb);
  }
};
;"use strict";

jQuery(document).foundation();
;'use strict';

// Joyride demo
$('#start-jr').on('click', function () {
  $(document).foundation('joyride', 'start');
});
;"use strict";
;'use strict';

$(document).ready(function () {
    var videos = $('iframe[src*="vimeo.com"], iframe[src*="youtube.com"]');

    videos.each(function () {
        var el = $(this);
        el.wrap('<div class="responsive-embed widescreen"/>');
    });
});
;'use strict';

$('a[href*="#"]:not([href="#"])').click(function () {
  if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
    var target = $(this.hash);
    target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
    if (target.length) {
      $('html, body').animate({
        scrollTop: target.offset().top
      }, 1000);
      return false;
    }
  }
});
;'use strict';

$(window).bind(' load resize orientationChange ', function () {
  var footer = $("#footer-container");
  var pos = footer.position();
  var height = $(window).height();
  height = height - pos.top;
  height = height - footer.height() - 1;

  function stickyFooter() {
    footer.css({
      'margin-top': height + 'px'
    });
  }

  if (height > 0) {
    stickyFooter();
  }
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZvdW5kYXRpb24uY29yZS5qcyIsImZvdW5kYXRpb24udXRpbC5ib3guanMiLCJmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmQuanMiLCJmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeS5qcyIsImZvdW5kYXRpb24udXRpbC5tb3Rpb24uanMiLCJmb3VuZGF0aW9uLnV0aWwubmVzdC5qcyIsImZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyLmpzIiwiZm91bmRhdGlvbi51dGlsLnRvdWNoLmpzIiwiZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzLmpzIiwiZm91bmRhdGlvbi5hYmlkZS5qcyIsImZvdW5kYXRpb24uYWNjb3JkaW9uLmpzIiwiZm91bmRhdGlvbi5hY2NvcmRpb25NZW51LmpzIiwiZm91bmRhdGlvbi5kcmlsbGRvd24uanMiLCJmb3VuZGF0aW9uLmRyb3Bkb3duLmpzIiwiZm91bmRhdGlvbi5kcm9wZG93bk1lbnUuanMiLCJmb3VuZGF0aW9uLmVxdWFsaXplci5qcyIsImZvdW5kYXRpb24uaW50ZXJjaGFuZ2UuanMiLCJmb3VuZGF0aW9uLm1hZ2VsbGFuLmpzIiwiZm91bmRhdGlvbi5vZmZjYW52YXMuanMiLCJmb3VuZGF0aW9uLm9yYml0LmpzIiwiZm91bmRhdGlvbi5yZXNwb25zaXZlTWVudS5qcyIsImZvdW5kYXRpb24ucmVzcG9uc2l2ZVRvZ2dsZS5qcyIsImZvdW5kYXRpb24ucmV2ZWFsLmpzIiwiZm91bmRhdGlvbi5zbGlkZXIuanMiLCJmb3VuZGF0aW9uLnN0aWNreS5qcyIsImZvdW5kYXRpb24udGFicy5qcyIsImZvdW5kYXRpb24udG9nZ2xlci5qcyIsImZvdW5kYXRpb24udG9vbHRpcC5qcyIsIm1vdGlvbi11aS5qcyIsImluaXQtZm91bmRhdGlvbi5qcyIsImpveXJpZGUtZGVtby5qcyIsIm9mZkNhbnZhcy5qcyIsInJlc3BvbnNpdmUtdmlkZW8uanMiLCJzbW9vdGgtc2Nyb2xsLmpzIiwic3RpY2t5Zm9vdGVyLmpzIl0sIm5hbWVzIjpbIiQiLCJGT1VOREFUSU9OX1ZFUlNJT04iLCJGb3VuZGF0aW9uIiwidmVyc2lvbiIsIl9wbHVnaW5zIiwiX3V1aWRzIiwicnRsIiwiYXR0ciIsInBsdWdpbiIsIm5hbWUiLCJjbGFzc05hbWUiLCJmdW5jdGlvbk5hbWUiLCJhdHRyTmFtZSIsImh5cGhlbmF0ZSIsInJlZ2lzdGVyUGx1Z2luIiwicGx1Z2luTmFtZSIsImNvbnN0cnVjdG9yIiwidG9Mb3dlckNhc2UiLCJ1dWlkIiwiR2V0WW9EaWdpdHMiLCIkZWxlbWVudCIsImRhdGEiLCJ0cmlnZ2VyIiwicHVzaCIsInVucmVnaXN0ZXJQbHVnaW4iLCJzcGxpY2UiLCJpbmRleE9mIiwicmVtb3ZlQXR0ciIsInJlbW92ZURhdGEiLCJwcm9wIiwicmVJbml0IiwicGx1Z2lucyIsImlzSlEiLCJlYWNoIiwiX2luaXQiLCJ0eXBlIiwiX3RoaXMiLCJmbnMiLCJwbGdzIiwiZm9yRWFjaCIsInAiLCJmb3VuZGF0aW9uIiwiT2JqZWN0Iiwia2V5cyIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsImxlbmd0aCIsIm5hbWVzcGFjZSIsIk1hdGgiLCJyb3VuZCIsInBvdyIsInJhbmRvbSIsInRvU3RyaW5nIiwic2xpY2UiLCJyZWZsb3ciLCJlbGVtIiwiaSIsIiRlbGVtIiwiZmluZCIsImFkZEJhY2siLCIkZWwiLCJvcHRzIiwid2FybiIsInRoaW5nIiwic3BsaXQiLCJlIiwib3B0IiwibWFwIiwiZWwiLCJ0cmltIiwicGFyc2VWYWx1ZSIsImVyIiwiZ2V0Rm5OYW1lIiwidHJhbnNpdGlvbmVuZCIsInRyYW5zaXRpb25zIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwiZW5kIiwidCIsInN0eWxlIiwic2V0VGltZW91dCIsInRyaWdnZXJIYW5kbGVyIiwidXRpbCIsInRocm90dGxlIiwiZnVuYyIsImRlbGF5IiwidGltZXIiLCJjb250ZXh0IiwiYXJncyIsImFyZ3VtZW50cyIsImFwcGx5IiwibWV0aG9kIiwiJG1ldGEiLCIkbm9KUyIsImFwcGVuZFRvIiwiaGVhZCIsInJlbW92ZUNsYXNzIiwiTWVkaWFRdWVyeSIsIkFycmF5IiwicHJvdG90eXBlIiwiY2FsbCIsInBsdWdDbGFzcyIsInVuZGVmaW5lZCIsIlJlZmVyZW5jZUVycm9yIiwiVHlwZUVycm9yIiwid2luZG93IiwiZm4iLCJEYXRlIiwibm93IiwiZ2V0VGltZSIsInZlbmRvcnMiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJ2cCIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwidGVzdCIsIm5hdmlnYXRvciIsInVzZXJBZ2VudCIsImxhc3RUaW1lIiwiY2FsbGJhY2siLCJuZXh0VGltZSIsIm1heCIsImNsZWFyVGltZW91dCIsInBlcmZvcm1hbmNlIiwic3RhcnQiLCJGdW5jdGlvbiIsImJpbmQiLCJvVGhpcyIsImFBcmdzIiwiZlRvQmluZCIsImZOT1AiLCJmQm91bmQiLCJjb25jYXQiLCJmdW5jTmFtZVJlZ2V4IiwicmVzdWx0cyIsImV4ZWMiLCJzdHIiLCJpc05hTiIsInBhcnNlRmxvYXQiLCJyZXBsYWNlIiwialF1ZXJ5IiwiQm94IiwiSW1Ob3RUb3VjaGluZ1lvdSIsIkdldERpbWVuc2lvbnMiLCJHZXRPZmZzZXRzIiwiZWxlbWVudCIsInBhcmVudCIsImxyT25seSIsInRiT25seSIsImVsZURpbXMiLCJ0b3AiLCJib3R0b20iLCJsZWZ0IiwicmlnaHQiLCJwYXJEaW1zIiwib2Zmc2V0IiwiaGVpZ2h0Iiwid2lkdGgiLCJ3aW5kb3dEaW1zIiwiYWxsRGlycyIsIkVycm9yIiwicmVjdCIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsInBhclJlY3QiLCJwYXJlbnROb2RlIiwid2luUmVjdCIsImJvZHkiLCJ3aW5ZIiwicGFnZVlPZmZzZXQiLCJ3aW5YIiwicGFnZVhPZmZzZXQiLCJwYXJlbnREaW1zIiwiYW5jaG9yIiwicG9zaXRpb24iLCJ2T2Zmc2V0IiwiaE9mZnNldCIsImlzT3ZlcmZsb3ciLCIkZWxlRGltcyIsIiRhbmNob3JEaW1zIiwia2V5Q29kZXMiLCJjb21tYW5kcyIsIktleWJvYXJkIiwiZ2V0S2V5Q29kZXMiLCJwYXJzZUtleSIsImV2ZW50Iiwia2V5Iiwid2hpY2giLCJrZXlDb2RlIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9VcHBlckNhc2UiLCJzaGlmdEtleSIsImN0cmxLZXkiLCJhbHRLZXkiLCJoYW5kbGVLZXkiLCJjb21wb25lbnQiLCJmdW5jdGlvbnMiLCJjb21tYW5kTGlzdCIsImNtZHMiLCJjb21tYW5kIiwibHRyIiwiZXh0ZW5kIiwicmV0dXJuVmFsdWUiLCJoYW5kbGVkIiwidW5oYW5kbGVkIiwiZmluZEZvY3VzYWJsZSIsImZpbHRlciIsImlzIiwicmVnaXN0ZXIiLCJjb21wb25lbnROYW1lIiwidHJhcEZvY3VzIiwiJGZvY3VzYWJsZSIsIiRmaXJzdEZvY3VzYWJsZSIsImVxIiwiJGxhc3RGb2N1c2FibGUiLCJvbiIsInRhcmdldCIsInByZXZlbnREZWZhdWx0IiwiZm9jdXMiLCJyZWxlYXNlRm9jdXMiLCJvZmYiLCJrY3MiLCJrIiwia2MiLCJkZWZhdWx0UXVlcmllcyIsImxhbmRzY2FwZSIsInBvcnRyYWl0IiwicmV0aW5hIiwicXVlcmllcyIsImN1cnJlbnQiLCJzZWxmIiwiZXh0cmFjdGVkU3R5bGVzIiwiY3NzIiwibmFtZWRRdWVyaWVzIiwicGFyc2VTdHlsZVRvT2JqZWN0IiwiaGFzT3duUHJvcGVydHkiLCJ2YWx1ZSIsIl9nZXRDdXJyZW50U2l6ZSIsIl93YXRjaGVyIiwiYXRMZWFzdCIsInNpemUiLCJxdWVyeSIsImdldCIsIm1hdGNoTWVkaWEiLCJtYXRjaGVzIiwibWF0Y2hlZCIsIm5ld1NpemUiLCJjdXJyZW50U2l6ZSIsInN0eWxlTWVkaWEiLCJtZWRpYSIsInNjcmlwdCIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwiaW5mbyIsImlkIiwiaW5zZXJ0QmVmb3JlIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImN1cnJlbnRTdHlsZSIsIm1hdGNoTWVkaXVtIiwidGV4dCIsInN0eWxlU2hlZXQiLCJjc3NUZXh0IiwidGV4dENvbnRlbnQiLCJzdHlsZU9iamVjdCIsInJlZHVjZSIsInJldCIsInBhcmFtIiwicGFydHMiLCJ2YWwiLCJkZWNvZGVVUklDb21wb25lbnQiLCJpc0FycmF5IiwiaW5pdENsYXNzZXMiLCJhY3RpdmVDbGFzc2VzIiwiTW90aW9uIiwiYW5pbWF0ZUluIiwiYW5pbWF0aW9uIiwiY2IiLCJhbmltYXRlIiwiYW5pbWF0ZU91dCIsIk1vdmUiLCJkdXJhdGlvbiIsImFuaW0iLCJwcm9nIiwibW92ZSIsInRzIiwiaXNJbiIsImluaXRDbGFzcyIsImFjdGl2ZUNsYXNzIiwicmVzZXQiLCJhZGRDbGFzcyIsInNob3ciLCJvZmZzZXRXaWR0aCIsIm9uZSIsImZpbmlzaCIsImhpZGUiLCJ0cmFuc2l0aW9uRHVyYXRpb24iLCJOZXN0IiwiRmVhdGhlciIsIm1lbnUiLCJpdGVtcyIsInN1Yk1lbnVDbGFzcyIsInN1Ykl0ZW1DbGFzcyIsImhhc1N1YkNsYXNzIiwiJGl0ZW0iLCIkc3ViIiwiY2hpbGRyZW4iLCJCdXJuIiwiVGltZXIiLCJvcHRpb25zIiwibmFtZVNwYWNlIiwicmVtYWluIiwiaXNQYXVzZWQiLCJyZXN0YXJ0IiwiaW5maW5pdGUiLCJwYXVzZSIsIm9uSW1hZ2VzTG9hZGVkIiwiaW1hZ2VzIiwidW5sb2FkZWQiLCJjb21wbGV0ZSIsInJlYWR5U3RhdGUiLCJzaW5nbGVJbWFnZUxvYWRlZCIsInNyYyIsInNwb3RTd2lwZSIsImVuYWJsZWQiLCJkb2N1bWVudEVsZW1lbnQiLCJtb3ZlVGhyZXNob2xkIiwidGltZVRocmVzaG9sZCIsInN0YXJ0UG9zWCIsInN0YXJ0UG9zWSIsInN0YXJ0VGltZSIsImVsYXBzZWRUaW1lIiwiaXNNb3ZpbmciLCJvblRvdWNoRW5kIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIm9uVG91Y2hNb3ZlIiwieCIsInRvdWNoZXMiLCJwYWdlWCIsInkiLCJwYWdlWSIsImR4IiwiZHkiLCJkaXIiLCJhYnMiLCJvblRvdWNoU3RhcnQiLCJhZGRFdmVudExpc3RlbmVyIiwiaW5pdCIsInRlYXJkb3duIiwic3BlY2lhbCIsInN3aXBlIiwic2V0dXAiLCJub29wIiwiYWRkVG91Y2giLCJoYW5kbGVUb3VjaCIsImNoYW5nZWRUb3VjaGVzIiwiZmlyc3QiLCJldmVudFR5cGVzIiwidG91Y2hzdGFydCIsInRvdWNobW92ZSIsInRvdWNoZW5kIiwic2ltdWxhdGVkRXZlbnQiLCJNb3VzZUV2ZW50Iiwic2NyZWVuWCIsInNjcmVlblkiLCJjbGllbnRYIiwiY2xpZW50WSIsImNyZWF0ZUV2ZW50IiwiaW5pdE1vdXNlRXZlbnQiLCJkaXNwYXRjaEV2ZW50IiwiTXV0YXRpb25PYnNlcnZlciIsInByZWZpeGVzIiwidHJpZ2dlcnMiLCJzdG9wUHJvcGFnYXRpb24iLCJmYWRlT3V0IiwiY2hlY2tMaXN0ZW5lcnMiLCJldmVudHNMaXN0ZW5lciIsInJlc2l6ZUxpc3RlbmVyIiwic2Nyb2xsTGlzdGVuZXIiLCJtdXRhdGVMaXN0ZW5lciIsImNsb3NlbWVMaXN0ZW5lciIsInlldGlCb3hlcyIsInBsdWdOYW1lcyIsImxpc3RlbmVycyIsImpvaW4iLCJwbHVnaW5JZCIsIm5vdCIsImRlYm91bmNlIiwiJG5vZGVzIiwibm9kZXMiLCJxdWVyeVNlbGVjdG9yQWxsIiwibGlzdGVuaW5nRWxlbWVudHNNdXRhdGlvbiIsIm11dGF0aW9uUmVjb3Jkc0xpc3QiLCIkdGFyZ2V0IiwiYXR0cmlidXRlTmFtZSIsImNsb3Nlc3QiLCJlbGVtZW50T2JzZXJ2ZXIiLCJvYnNlcnZlIiwiYXR0cmlidXRlcyIsImNoaWxkTGlzdCIsImNoYXJhY3RlckRhdGEiLCJzdWJ0cmVlIiwiYXR0cmlidXRlRmlsdGVyIiwiSUhlYXJZb3UiLCJBYmlkZSIsImRlZmF1bHRzIiwiJGlucHV0cyIsIl9ldmVudHMiLCJyZXNldEZvcm0iLCJ2YWxpZGF0ZUZvcm0iLCJ2YWxpZGF0ZU9uIiwidmFsaWRhdGVJbnB1dCIsImxpdmVWYWxpZGF0ZSIsInZhbGlkYXRlT25CbHVyIiwiaXNHb29kIiwiY2hlY2tlZCIsIiRlcnJvciIsInNpYmxpbmdzIiwiZm9ybUVycm9yU2VsZWN0b3IiLCIkbGFiZWwiLCIkZWxzIiwibGFiZWxzIiwiZmluZExhYmVsIiwiJGZvcm1FcnJvciIsImZpbmRGb3JtRXJyb3IiLCJsYWJlbEVycm9yQ2xhc3MiLCJmb3JtRXJyb3JDbGFzcyIsImlucHV0RXJyb3JDbGFzcyIsImdyb3VwTmFtZSIsIiRsYWJlbHMiLCJmaW5kUmFkaW9MYWJlbHMiLCIkZm9ybUVycm9ycyIsInJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzIiwiY2xlYXJSZXF1aXJlIiwicmVxdWlyZWRDaGVjayIsInZhbGlkYXRlZCIsImN1c3RvbVZhbGlkYXRvciIsInZhbGlkYXRvciIsImVxdWFsVG8iLCJ2YWxpZGF0ZVJhZGlvIiwidmFsaWRhdGVUZXh0IiwibWF0Y2hWYWxpZGF0aW9uIiwidmFsaWRhdG9ycyIsImdvb2RUb0dvIiwibWVzc2FnZSIsImRlcGVuZGVudEVsZW1lbnRzIiwiYWNjIiwibm9FcnJvciIsInBhdHRlcm4iLCJpbnB1dFRleHQiLCJ2YWxpZCIsInBhdHRlcm5zIiwiUmVnRXhwIiwiJGdyb3VwIiwicmVxdWlyZWQiLCJjbGVhciIsInYiLCIkZm9ybSIsInJlbW92ZUVycm9yQ2xhc3NlcyIsImFscGhhIiwiYWxwaGFfbnVtZXJpYyIsImludGVnZXIiLCJudW1iZXIiLCJjYXJkIiwiY3Z2IiwiZW1haWwiLCJ1cmwiLCJkb21haW4iLCJkYXRldGltZSIsImRhdGUiLCJ0aW1lIiwiZGF0ZUlTTyIsIm1vbnRoX2RheV95ZWFyIiwiZGF5X21vbnRoX3llYXIiLCJjb2xvciIsIkFjY29yZGlvbiIsIiR0YWJzIiwiaWR4IiwiJGNvbnRlbnQiLCJsaW5rSWQiLCIkaW5pdEFjdGl2ZSIsImRvd24iLCIkdGFiQ29udGVudCIsInRvZ2dsZSIsIm5leHQiLCIkYSIsIm11bHRpRXhwYW5kIiwicHJldmlvdXMiLCJwcmV2IiwiaGFzQ2xhc3MiLCJ1cCIsImZpcnN0VGltZSIsIiRjdXJyZW50QWN0aXZlIiwic2xpZGVEb3duIiwic2xpZGVTcGVlZCIsIiRhdW50cyIsImFsbG93QWxsQ2xvc2VkIiwic2xpZGVVcCIsInN0b3AiLCJBY2NvcmRpb25NZW51IiwibXVsdGlPcGVuIiwiJG1lbnVMaW5rcyIsInN1YklkIiwiaXNBY3RpdmUiLCJpbml0UGFuZXMiLCIkc3VibWVudSIsIiRlbGVtZW50cyIsIiRwcmV2RWxlbWVudCIsIiRuZXh0RWxlbWVudCIsIm1pbiIsInBhcmVudHMiLCJvcGVuIiwiY2xvc2UiLCJjbG9zZUFsbCIsImhpZGVBbGwiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJwYXJlbnRzVW50aWwiLCJhZGQiLCIkbWVudXMiLCJEcmlsbGRvd24iLCIkc3VibWVudUFuY2hvcnMiLCIkc3VibWVudXMiLCIkbWVudUl0ZW1zIiwiX3ByZXBhcmVNZW51IiwiX3JlZ2lzdGVyRXZlbnRzIiwiX2tleWJvYXJkRXZlbnRzIiwiJGxpbmsiLCJwYXJlbnRMaW5rIiwiY2xvbmUiLCJwcmVwZW5kVG8iLCJ3cmFwIiwiJG1lbnUiLCIkYmFjayIsImJhY2tCdXR0b25Qb3NpdGlvbiIsImFwcGVuZCIsImJhY2tCdXR0b24iLCJwcmVwZW5kIiwiX2JhY2siLCJhdXRvSGVpZ2h0IiwiJHdyYXBwZXIiLCJ3cmFwcGVyIiwiYW5pbWF0ZUhlaWdodCIsIl9nZXRNYXhEaW1zIiwiX3Nob3ciLCJjbG9zZU9uQ2xpY2siLCIkYm9keSIsImNvbnRhaW5zIiwiX2hpZGVBbGwiLCJfcmVzaXplIiwic2Nyb2xsVG9wIiwiX2JpbmRIYW5kbGVyIiwiX3Njcm9sbFRvcCIsIiRzY3JvbGxUb3BFbGVtZW50Iiwic2Nyb2xsVG9wRWxlbWVudCIsInNjcm9sbFBvcyIsInBhcnNlSW50Iiwic2Nyb2xsVG9wT2Zmc2V0IiwiYW5pbWF0aW9uRHVyYXRpb24iLCJhbmltYXRpb25FYXNpbmciLCJfaGlkZSIsInBhcmVudFN1Yk1lbnUiLCJibHVyIiwibWF4SGVpZ2h0IiwicmVzdWx0IiwibnVtT2ZFbGVtcyIsInVud3JhcCIsInJlbW92ZSIsIkRyb3Bkb3duIiwiJGlkIiwiJGFuY2hvciIsInBhcmVudENsYXNzIiwiJHBhcmVudCIsInBvc2l0aW9uQ2xhc3MiLCJnZXRQb3NpdGlvbkNsYXNzIiwiY291bnRlciIsInVzZWRQb3NpdGlvbnMiLCJ2ZXJ0aWNhbFBvc2l0aW9uIiwibWF0Y2giLCJob3Jpem9udGFsUG9zaXRpb24iLCJjbGFzc0NoYW5nZWQiLCJkaXJlY3Rpb24iLCJuZXdXaWR0aCIsInBhcmVudEhPZmZzZXQiLCIkcGFyZW50RGltcyIsIl9yZXBvc2l0aW9uIiwiX3NldFBvc2l0aW9uIiwiaG92ZXIiLCJib2R5RGF0YSIsIndoYXRpbnB1dCIsInRpbWVvdXQiLCJob3ZlckRlbGF5IiwiaG92ZXJQYW5lIiwidmlzaWJsZUZvY3VzYWJsZUVsZW1lbnRzIiwiYXV0b0ZvY3VzIiwiX2FkZEJvZHlIYW5kbGVyIiwiY3VyUG9zaXRpb25DbGFzcyIsIkRyb3Bkb3duTWVudSIsInN1YnMiLCJ2ZXJ0aWNhbENsYXNzIiwicmlnaHRDbGFzcyIsImFsaWdubWVudCIsImNoYW5nZWQiLCJoYXNUb3VjaCIsIm9udG91Y2hzdGFydCIsInBhckNsYXNzIiwiaGFuZGxlQ2xpY2tGbiIsImhhc1N1YiIsImhhc0NsaWNrZWQiLCJjbGlja09wZW4iLCJmb3JjZUZvbGxvdyIsImNsb3NlT25DbGlja0luc2lkZSIsImRpc2FibGVIb3ZlciIsImF1dG9jbG9zZSIsImNsb3NpbmdUaW1lIiwiaXNUYWIiLCJpbmRleCIsIm5leHRTaWJsaW5nIiwicHJldlNpYmxpbmciLCJvcGVuU3ViIiwiY2xvc2VTdWIiLCJfaXNWZXJ0aWNhbCIsIiRzaWJzIiwib2xkQ2xhc3MiLCIkcGFyZW50TGkiLCIkdG9DbG9zZSIsInNvbWV0aGluZ1RvQ2xvc2UiLCJFcXVhbGl6ZXIiLCJlcUlkIiwiJHdhdGNoZWQiLCJoYXNOZXN0ZWQiLCJpc05lc3RlZCIsImlzT24iLCJvblJlc2l6ZU1lQm91bmQiLCJfb25SZXNpemVNZSIsIm9uUG9zdEVxdWFsaXplZEJvdW5kIiwiX29uUG9zdEVxdWFsaXplZCIsImltZ3MiLCJ0b29TbWFsbCIsImVxdWFsaXplT24iLCJfY2hlY2tNUSIsIl9yZWZsb3ciLCJfcGF1c2VFdmVudHMiLCJlcXVhbGl6ZU9uU3RhY2siLCJfaXNTdGFja2VkIiwiZXF1YWxpemVCeVJvdyIsImdldEhlaWdodHNCeVJvdyIsImFwcGx5SGVpZ2h0QnlSb3ciLCJnZXRIZWlnaHRzIiwiYXBwbHlIZWlnaHQiLCJoZWlnaHRzIiwibGVuIiwib2Zmc2V0SGVpZ2h0IiwibGFzdEVsVG9wT2Zmc2V0IiwiZ3JvdXBzIiwiZ3JvdXAiLCJlbE9mZnNldFRvcCIsImoiLCJsbiIsImdyb3Vwc0lMZW5ndGgiLCJsZW5KIiwiSW50ZXJjaGFuZ2UiLCJydWxlcyIsImN1cnJlbnRQYXRoIiwiX2FkZEJyZWFrcG9pbnRzIiwiX2dlbmVyYXRlUnVsZXMiLCJydWxlIiwicGF0aCIsIlNQRUNJQUxfUVVFUklFUyIsInJ1bGVzTGlzdCIsIm5vZGVOYW1lIiwicmVzcG9uc2UiLCJodG1sIiwiTWFnZWxsYW4iLCJjYWxjUG9pbnRzIiwiJHRhcmdldHMiLCIkbGlua3MiLCIkYWN0aXZlIiwicG9pbnRzIiwid2luSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJjbGllbnRIZWlnaHQiLCJkb2NIZWlnaHQiLCJzY3JvbGxIZWlnaHQiLCIkdGFyIiwicHQiLCJ0aHJlc2hvbGQiLCJ0YXJnZXRQb2ludCIsImVhc2luZyIsImRlZXBMaW5raW5nIiwibG9jYXRpb24iLCJoYXNoIiwic2Nyb2xsVG9Mb2MiLCJfdXBkYXRlQWN0aXZlIiwiYXJyaXZhbCIsImdldEF0dHJpYnV0ZSIsImxvYyIsIl9pblRyYW5zaXRpb24iLCJiYXJPZmZzZXQiLCJ3aW5Qb3MiLCJjdXJJZHgiLCJpc0Rvd24iLCJjdXJWaXNpYmxlIiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsIk9mZkNhbnZhcyIsIiRsYXN0VHJpZ2dlciIsIiR0cmlnZ2VycyIsInRyYW5zaXRpb24iLCJjb250ZW50T3ZlcmxheSIsIm92ZXJsYXkiLCJvdmVybGF5UG9zaXRpb24iLCJzZXRBdHRyaWJ1dGUiLCIkb3ZlcmxheSIsImlzUmV2ZWFsZWQiLCJyZXZlYWxDbGFzcyIsInJldmVhbE9uIiwiX3NldE1RQ2hlY2tlciIsInRyYW5zaXRpb25UaW1lIiwiX2hhbmRsZUtleWJvYXJkIiwicmV2ZWFsIiwiJGNsb3NlciIsImZvcmNlVG8iLCJzY3JvbGxUbyIsImNvbnRlbnRTY3JvbGwiLCJfc3RvcFNjcm9sbGluZyIsIk9yYml0IiwiX3Jlc2V0IiwiY29udGFpbmVyQ2xhc3MiLCIkc2xpZGVzIiwic2xpZGVDbGFzcyIsIiRpbWFnZXMiLCJpbml0QWN0aXZlIiwidXNlTVVJIiwiX3ByZXBhcmVGb3JPcmJpdCIsImJ1bGxldHMiLCJfbG9hZEJ1bGxldHMiLCJhdXRvUGxheSIsImdlb1N5bmMiLCJhY2Nlc3NpYmxlIiwiJGJ1bGxldHMiLCJib3hPZkJ1bGxldHMiLCJ0aW1lckRlbGF5IiwiY2hhbmdlU2xpZGUiLCJfc2V0V3JhcHBlckhlaWdodCIsInRlbXAiLCJwYXVzZU9uSG92ZXIiLCJuYXZCdXR0b25zIiwiJGNvbnRyb2xzIiwibmV4dENsYXNzIiwicHJldkNsYXNzIiwiJHNsaWRlIiwiX3VwZGF0ZUJ1bGxldHMiLCJpc0xUUiIsImNob3NlblNsaWRlIiwiJGN1clNsaWRlIiwiJGZpcnN0U2xpZGUiLCIkbGFzdFNsaWRlIiwibGFzdCIsImRpckluIiwiZGlyT3V0IiwiJG5ld1NsaWRlIiwiaW5maW5pdGVXcmFwIiwiJG9sZEJ1bGxldCIsInNwYW4iLCJkZXRhY2giLCIkbmV3QnVsbGV0IiwiYW5pbUluRnJvbVJpZ2h0IiwiYW5pbU91dFRvUmlnaHQiLCJhbmltSW5Gcm9tTGVmdCIsImFuaW1PdXRUb0xlZnQiLCJSZXNwb25zaXZlTWVudSIsImN1cnJlbnRNcSIsImN1cnJlbnRQbHVnaW4iLCJydWxlc1RyZWUiLCJydWxlU2l6ZSIsInJ1bGVQbHVnaW4iLCJNZW51UGx1Z2lucyIsImlzRW1wdHlPYmplY3QiLCJfY2hlY2tNZWRpYVF1ZXJpZXMiLCJtYXRjaGVkTXEiLCJjc3NDbGFzcyIsImRlc3Ryb3kiLCJkcm9wZG93biIsImRyaWxsZG93biIsImFjY29yZGlvbiIsIlJlc3BvbnNpdmVUb2dnbGUiLCJ0YXJnZXRJRCIsIiR0YXJnZXRNZW51IiwiJHRvZ2dsZXIiLCJpbnB1dCIsImFuaW1hdGlvbkluIiwiYW5pbWF0aW9uT3V0IiwiX3VwZGF0ZSIsIl91cGRhdGVNcUhhbmRsZXIiLCJ0b2dnbGVNZW51IiwiaGlkZUZvciIsIlJldmVhbCIsImNhY2hlZCIsIm1xIiwiaXNNb2JpbGUiLCJtb2JpbGVTbmlmZiIsImZ1bGxTY3JlZW4iLCJfbWFrZU92ZXJsYXkiLCJkZWVwTGluayIsIm91dGVyV2lkdGgiLCJvdXRlckhlaWdodCIsIm1hcmdpbiIsIl91cGRhdGVQb3NpdGlvbiIsIl9oYW5kbGVTdGF0ZSIsIm11bHRpcGxlT3BlbmVkIiwiYWRkUmV2ZWFsT3BlbkNsYXNzZXMiLCJvcmlnaW5hbFNjcm9sbFBvcyIsImFmdGVyQW5pbWF0aW9uIiwiZm9jdXNhYmxlRWxlbWVudHMiLCJzaG93RGVsYXkiLCJfZXh0cmFIYW5kbGVycyIsImNsb3NlT25Fc2MiLCJmaW5pc2hVcCIsImhpZGVEZWxheSIsInJlc2V0T25DbG9zZSIsInJlcGxhY2VTdGF0ZSIsInRpdGxlIiwiaHJlZiIsImJ0bU9mZnNldFBjdCIsImlQaG9uZVNuaWZmIiwiYW5kcm9pZFNuaWZmIiwiU2xpZGVyIiwiaW5wdXRzIiwiaGFuZGxlcyIsIiRoYW5kbGUiLCIkaW5wdXQiLCIkZmlsbCIsInZlcnRpY2FsIiwiaXNEYmwiLCJkaXNhYmxlZCIsImRpc2FibGVkQ2xhc3MiLCJiaW5kaW5nIiwiX3NldEluaXRBdHRyIiwiZG91YmxlU2lkZWQiLCIkaGFuZGxlMiIsIiRpbnB1dDIiLCJzZXRIYW5kbGVzIiwiX3NldEhhbmRsZVBvcyIsInBjdE9mQmFyIiwicGVyY2VudCIsInBvc2l0aW9uVmFsdWVGdW5jdGlvbiIsIl9sb2dUcmFuc2Zvcm0iLCJfcG93VHJhbnNmb3JtIiwidG9GaXhlZCIsImJhc2VMb2ciLCJub25MaW5lYXJCYXNlIiwiJGhuZGwiLCJub0ludmVydCIsImgyVmFsIiwic3RlcCIsImgxVmFsIiwidmVydCIsImhPclciLCJsT3JUIiwiaGFuZGxlRGltIiwiZWxlbURpbSIsIl9wY3RPZkJhciIsInB4VG9Nb3ZlIiwibW92ZW1lbnQiLCJkZWNpbWFsIiwiX3NldFZhbHVlcyIsImlzTGVmdEhuZGwiLCJkaW0iLCJoYW5kbGVQY3QiLCJoYW5kbGVQb3MiLCJpbml0aWFsU3RhcnQiLCJtb3ZlVGltZSIsImNoYW5nZWREZWxheSIsImluaXRWYWwiLCJpbml0aWFsRW5kIiwiaGFzVmFsIiwiZXZlbnRPZmZzZXQiLCJoYWxmT2ZIYW5kbGUiLCJiYXJEaW0iLCJ3aW5kb3dTY3JvbGwiLCJzY3JvbGxMZWZ0IiwiZWxlbU9mZnNldCIsImV2ZW50RnJvbUJhciIsImJhclhZIiwib2Zmc2V0UGN0IiwiX3ZhbHVlIiwiX2FkanVzdFZhbHVlIiwiZmlyc3RIbmRsUG9zIiwiYWJzUG9zaXRpb24iLCJzZWNuZEhuZGxQb3MiLCJkaXYiLCJwcmV2X3ZhbCIsIm5leHRfdmFsIiwiX2V2ZW50c0ZvckhhbmRsZSIsImN1ckhhbmRsZSIsIl9oYW5kbGVFdmVudCIsImNsaWNrU2VsZWN0IiwiZHJhZ2dhYmxlIiwiY3VycmVudFRhcmdldCIsIl8kaGFuZGxlIiwib2xkVmFsdWUiLCJuZXdWYWx1ZSIsImRlY3JlYXNlIiwiaW5jcmVhc2UiLCJkZWNyZWFzZV9mYXN0IiwiaW5jcmVhc2VfZmFzdCIsImludmVydFZlcnRpY2FsIiwiZnJhYyIsIm51bSIsImNsaWNrUG9zIiwiYmFzZSIsImxvZyIsIlN0aWNreSIsIndhc1dyYXBwZWQiLCIkY29udGFpbmVyIiwiY29udGFpbmVyIiwid3JhcElubmVyIiwic3RpY2t5Q2xhc3MiLCJzY3JvbGxDb3VudCIsImNoZWNrRXZlcnkiLCJpc1N0dWNrIiwiY29udGFpbmVySGVpZ2h0IiwiZWxlbUhlaWdodCIsIl9wYXJzZVBvaW50cyIsIl9zZXRTaXplcyIsInNjcm9sbCIsIl9jYWxjIiwiX3JlbW92ZVN0aWNreSIsInRvcFBvaW50IiwicmV2ZXJzZSIsInRvcEFuY2hvciIsImJ0bSIsImJ0bUFuY2hvciIsInB0cyIsImJyZWFrcyIsInBsYWNlIiwiY2FuU3RpY2siLCJfcGF1c2VMaXN0ZW5lcnMiLCJjaGVja1NpemVzIiwiYm90dG9tUG9pbnQiLCJfc2V0U3RpY2t5Iiwic3RpY2tUbyIsIm1yZ24iLCJub3RTdHVja1RvIiwiaXNUb3AiLCJzdGlja1RvVG9wIiwiYW5jaG9yUHQiLCJhbmNob3JIZWlnaHQiLCJ0b3BPckJvdHRvbSIsInN0aWNreU9uIiwibmV3RWxlbVdpZHRoIiwiY29tcCIsInBkbmdsIiwicGRuZ3IiLCJuZXdDb250YWluZXJIZWlnaHQiLCJfc2V0QnJlYWtQb2ludHMiLCJtVG9wIiwiZW1DYWxjIiwibWFyZ2luVG9wIiwibUJ0bSIsIm1hcmdpbkJvdHRvbSIsImVtIiwiZm9udFNpemUiLCJUYWJzIiwiJHRhYlRpdGxlcyIsImxpbmtDbGFzcyIsImxpbmtBY3RpdmVDbGFzcyIsImxvYWQiLCJkZWVwTGlua1NtdWRnZURlbGF5Iiwic2VsZWN0VGFiIiwiZGVlcExpbmtTbXVkZ2UiLCJtYXRjaEhlaWdodCIsIl9zZXRIZWlnaHQiLCJfYWRkS2V5SGFuZGxlciIsIl9hZGRDbGlja0hhbmRsZXIiLCJfc2V0SGVpZ2h0TXFIYW5kbGVyIiwiX2hhbmRsZVRhYkNoYW5nZSIsIndyYXBPbktleXMiLCJhY3RpdmVDb2xsYXBzZSIsIl9jb2xsYXBzZVRhYiIsIiRvbGRUYWIiLCIkdGFiTGluayIsIiR0YXJnZXRDb250ZW50IiwiX29wZW5UYWIiLCJ1cGRhdGVIaXN0b3J5IiwicGFuZWxBY3RpdmVDbGFzcyIsIiR0YXJnZXRfYW5jaG9yIiwiaWRTdHIiLCJwYW5lbENsYXNzIiwicGFuZWwiLCJUb2dnbGVyIiwidG9nZ2xlQ2xhc3MiLCJfdXBkYXRlQVJJQSIsIlRvb2x0aXAiLCJpc0NsaWNrIiwiZWxlbUlkIiwiX2dldFBvc2l0aW9uQ2xhc3MiLCJ0aXBUZXh0IiwidGVtcGxhdGUiLCJfYnVpbGRUZW1wbGF0ZSIsImFsbG93SHRtbCIsInRyaWdnZXJDbGFzcyIsInRlbXBsYXRlQ2xhc3NlcyIsInRvb2x0aXBDbGFzcyIsIiR0ZW1wbGF0ZSIsIiR0aXBEaW1zIiwic2hvd09uIiwiZmFkZUluIiwiZmFkZUluRHVyYXRpb24iLCJmYWRlT3V0RHVyYXRpb24iLCJpc0ZvY3VzIiwiZGlzYWJsZUZvclRvdWNoIiwidG91Y2hDbG9zZVRleHQiLCJlbmRFdmVudCIsIk1vdGlvblVJIiwicmVhZHkiLCJ2aWRlb3MiLCJjbGljayIsInBhdGhuYW1lIiwiaG9zdG5hbWUiLCJmb290ZXIiLCJwb3MiLCJzdGlja3lGb290ZXIiXSwibWFwcGluZ3MiOiI7O0FBQUEsQ0FBQyxVQUFTQSxDQUFULEVBQVk7O0FBRWI7O0FBRUEsTUFBSUMscUJBQXFCLE9BQXpCOztBQUVBO0FBQ0E7QUFDQSxNQUFJQyxhQUFhO0FBQ2ZDLGFBQVNGLGtCQURNOztBQUdmOzs7QUFHQUcsY0FBVSxFQU5LOztBQVFmOzs7QUFHQUMsWUFBUSxFQVhPOztBQWFmOzs7QUFHQUMsU0FBSyxZQUFVO0FBQ2IsYUFBT04sRUFBRSxNQUFGLEVBQVVPLElBQVYsQ0FBZSxLQUFmLE1BQTBCLEtBQWpDO0FBQ0QsS0FsQmM7QUFtQmY7Ozs7QUFJQUMsWUFBUSxVQUFTQSxNQUFULEVBQWlCQyxJQUFqQixFQUF1QjtBQUM3QjtBQUNBO0FBQ0EsVUFBSUMsWUFBYUQsUUFBUUUsYUFBYUgsTUFBYixDQUF6QjtBQUNBO0FBQ0E7QUFDQSxVQUFJSSxXQUFZQyxVQUFVSCxTQUFWLENBQWhCOztBQUVBO0FBQ0EsV0FBS04sUUFBTCxDQUFjUSxRQUFkLElBQTBCLEtBQUtGLFNBQUwsSUFBa0JGLE1BQTVDO0FBQ0QsS0FqQ2M7QUFrQ2Y7Ozs7Ozs7OztBQVNBTSxvQkFBZ0IsVUFBU04sTUFBVCxFQUFpQkMsSUFBakIsRUFBc0I7QUFDcEMsVUFBSU0sYUFBYU4sT0FBT0ksVUFBVUosSUFBVixDQUFQLEdBQXlCRSxhQUFhSCxPQUFPUSxXQUFwQixFQUFpQ0MsV0FBakMsRUFBMUM7QUFDQVQsYUFBT1UsSUFBUCxHQUFjLEtBQUtDLFdBQUwsQ0FBaUIsQ0FBakIsRUFBb0JKLFVB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MUIsSUFBSXIyQixHQUF0QjtBQUNBTSxXQUFTQSxTQUFTODFCLE9BQU85MUIsTUFBUCxFQUFULEdBQTBCLENBQW5DOztBQUVBLFdBQVNnMkIsWUFBVCxHQUF3QjtBQUN0QkYsV0FBT2x4QixHQUFQLENBQVc7QUFDUCxvQkFBYzVFLFNBQVM7QUFEaEIsS0FBWDtBQUdEOztBQUVELE1BQUlBLFNBQVMsQ0FBYixFQUFnQjtBQUNkZzJCO0FBQ0Q7QUFDSCxDQWhCRCIsImZpbGUiOiJmb3VuZGF0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsiIWZ1bmN0aW9uKCQpIHtcblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBGT1VOREFUSU9OX1ZFUlNJT04gPSAnNi4zLjAnO1xuXG4vLyBHbG9iYWwgRm91bmRhdGlvbiBvYmplY3Rcbi8vIFRoaXMgaXMgYXR0YWNoZWQgdG8gdGhlIHdpbmRvdywgb3IgdXNlZCBhcyBhIG1vZHVsZSBmb3IgQU1EL0Jyb3dzZXJpZnlcbnZhciBGb3VuZGF0aW9uID0ge1xuICB2ZXJzaW9uOiBGT1VOREFUSU9OX1ZFUlNJT04sXG5cbiAgLyoqXG4gICAqIFN0b3JlcyBpbml0aWFsaXplZCBwbHVnaW5zLlxuICAgKi9cbiAgX3BsdWdpbnM6IHt9LFxuXG4gIC8qKlxuICAgKiBTdG9yZXMgZ2VuZXJhdGVkIHVuaXF1ZSBpZHMgZm9yIHBsdWdpbiBpbnN0YW5jZXNcbiAgICovXG4gIF91dWlkczogW10sXG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBib29sZWFuIGZvciBSVEwgc3VwcG9ydFxuICAgKi9cbiAgcnRsOiBmdW5jdGlvbigpe1xuICAgIHJldHVybiAkKCdodG1sJykuYXR0cignZGlyJykgPT09ICdydGwnO1xuICB9LFxuICAvKipcbiAgICogRGVmaW5lcyBhIEZvdW5kYXRpb24gcGx1Z2luLCBhZGRpbmcgaXQgdG8gdGhlIGBGb3VuZGF0aW9uYCBuYW1lc3BhY2UgYW5kIHRoZSBsaXN0IG9mIHBsdWdpbnMgdG8gaW5pdGlhbGl6ZSB3aGVuIHJlZmxvd2luZy5cbiAgICogQHBhcmFtIHtPYmplY3R9IHBsdWdpbiAtIFRoZSBjb25zdHJ1Y3RvciBvZiB0aGUgcGx1Z2luLlxuICAgKi9cbiAgcGx1Z2luOiBmdW5jdGlvbihwbHVnaW4sIG5hbWUpIHtcbiAgICAvLyBPYmplY3Qga2V5IHRvIHVzZSB3aGVuIGFkZGluZyB0byBnbG9iYWwgRm91bmRhdGlvbiBvYmplY3RcbiAgICAvLyBFeGFtcGxlczogRm91bmRhdGlvbi5SZXZlYWwsIEZvdW5kYXRpb24uT2ZmQ2FudmFzXG4gICAgdmFyIGNsYXNzTmFtZSA9IChuYW1lIHx8IGZ1bmN0aW9uTmFtZShwbHVnaW4pKTtcbiAgICAvLyBPYmplY3Qga2V5IHRvIHVzZSB3aGVuIHN0b3JpbmcgdGhlIHBsdWdpbiwgYWxzbyB1c2VkIHRvIGNyZWF0ZSB0aGUgaWRlbnRpZnlpbmcgZGF0YSBhdHRyaWJ1dGUgZm9yIHRoZSBwbHVnaW5cbiAgICAvLyBFeGFtcGxlczogZGF0YS1yZXZlYWwsIGRhdGEtb2ZmLWNhbnZhc1xuICAgIHZhciBhdHRyTmFtZSAgPSBoeXBoZW5hdGUoY2xhc3NOYW1lKTtcblxuICAgIC8vIEFkZCB0byB0aGUgRm91bmRhdGlvbiBvYmplY3QgYW5kIHRoZSBwbHVnaW5zIGxpc3QgKGZvciByZWZsb3dpbmcpXG4gICAgdGhpcy5fcGx1Z2luc1thdHRyTmFtZV0gPSB0aGlzW2NsYXNzTmFtZV0gPSBwbHVnaW47XG4gIH0sXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogUG9wdWxhdGVzIHRoZSBfdXVpZHMgYXJyYXkgd2l0aCBwb2ludGVycyB0byBlYWNoIGluZGl2aWR1YWwgcGx1Z2luIGluc3RhbmNlLlxuICAgKiBBZGRzIHRoZSBgemZQbHVnaW5gIGRhdGEtYXR0cmlidXRlIHRvIHByb2dyYW1tYXRpY2FsbHkgY3JlYXRlZCBwbHVnaW5zIHRvIGFsbG93IHVzZSBvZiAkKHNlbGVjdG9yKS5mb3VuZGF0aW9uKG1ldGhvZCkgY2FsbHMuXG4gICAqIEFsc28gZmlyZXMgdGhlIGluaXRpYWxpemF0aW9uIGV2ZW50IGZvciBlYWNoIHBsdWdpbiwgY29uc29saWRhdGluZyByZXBldGl0aXZlIGNvZGUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBwbHVnaW4gLSBhbiBpbnN0YW5jZSBvZiBhIHBsdWdpbiwgdXN1YWxseSBgdGhpc2AgaW4gY29udGV4dC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgLSB0aGUgbmFtZSBvZiB0aGUgcGx1Z2luLCBwYXNzZWQgYXMgYSBjYW1lbENhc2VkIHN0cmluZy5cbiAgICogQGZpcmVzIFBsdWdpbiNpbml0XG4gICAqL1xuICByZWdpc3RlclBsdWdpbjogZnVuY3Rpb24ocGx1Z2luLCBuYW1lKXtcbiAgICB2YXIgcGx1Z2luTmFtZSA9IG5hbWUgPyBoeXBoZW5hdGUobmFtZSkgOiBmdW5jdGlvbk5hbWUocGx1Z2luLmNvbnN0cnVjdG9yKS50b0xvd2VyQ2FzZSgpO1xuICAgIHBsdWdpbi51dWlkID0gdGhpcy5HZXRZb0RpZ2l0cyg2LCBwbHVnaW5OYW1lKTtcblxuICAgIGlmKCFwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkpeyBwbHVnaW4uJGVsZW1lbnQuYXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCwgcGx1Z2luLnV1aWQpOyB9XG4gICAgaWYoIXBsdWdpbi4kZWxlbWVudC5kYXRhKCd6ZlBsdWdpbicpKXsgcGx1Z2luLiRlbGVtZW50LmRhdGEoJ3pmUGx1Z2luJywgcGx1Z2luKTsgfVxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgaW5pdGlhbGl6ZWQuXG4gICAgICAgICAgICogQGV2ZW50IFBsdWdpbiNpbml0XG4gICAgICAgICAgICovXG4gICAgcGx1Z2luLiRlbGVtZW50LnRyaWdnZXIoYGluaXQuemYuJHtwbHVnaW5OYW1lfWApO1xuXG4gICAgdGhpcy5fdXVpZHMucHVzaChwbHVnaW4udXVpZCk7XG5cbiAgICByZXR1cm47XG4gIH0sXG4gIC8qKlxuICAgKiBAZnVuY3Rpb25cbiAgICogUmVtb3ZlcyB0aGUgcGx1Z2lucyB1dWlkIGZyb20gdGhlIF91dWlkcyBhcnJheS5cbiAgICogUmVtb3ZlcyB0aGUgemZQbHVnaW4gZGF0YSBhdHRyaWJ1dGUsIGFzIHdlbGwgYXMgdGhlIGRhdGEtcGx1Z2luLW5hbWUgYXR0cmlidXRlLlxuICAgKiBBbHNvIGZpcmVzIHRoZSBkZXN0cm95ZWQgZXZlbnQgZm9yIHRoZSBwbHVnaW4sIGNvbnNvbGlkYXRpbmcgcmVwZXRpdGl2ZSBjb2RlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gcGx1Z2luIC0gYW4gaW5zdGFuY2Ugb2YgYSBwbHVnaW4sIHVzdWFsbHkgYHRoaXNgIGluIGNvbnRleHQuXG4gICAqIEBmaXJlcyBQbHVnaW4jZGVzdHJveWVkXG4gICAqL1xuICB1bnJlZ2lzdGVyUGx1Z2luOiBmdW5jdGlvbihwbHVnaW4pe1xuICAgIHZhciBwbHVnaW5OYW1lID0gaHlwaGVuYXRlKGZ1bmN0aW9uTmFtZShwbHVnaW4uJGVsZW1lbnQuZGF0YSgnemZQbHVnaW4nKS5jb25zdHJ1Y3RvcikpO1xuXG4gICAgdGhpcy5fdXVpZHMuc3BsaWNlKHRoaXMuX3V1aWRzLmluZGV4T2YocGx1Z2luLnV1aWQpLCAxKTtcbiAgICBwbHVnaW4uJGVsZW1lbnQucmVtb3ZlQXR0cihgZGF0YS0ke3BsdWdpbk5hbWV9YCkucmVtb3ZlRGF0YSgnemZQbHVnaW4nKVxuICAgICAgICAgIC8qKlxuICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHBsdWdpbiBoYXMgYmVlbiBkZXN0cm95ZWQuXG4gICAgICAgICAgICogQGV2ZW50IFBsdWdpbiNkZXN0cm95ZWRcbiAgICAgICAgICAgKi9cbiAgICAgICAgICAudHJpZ2dlcihgZGVzdHJveWVkLnpmLiR7cGx1Z2luTmFtZX1gKTtcbiAgICBmb3IodmFyIHByb3AgaW4gcGx1Z2luKXtcbiAgICAgIHBsdWdpbltwcm9wXSA9IG51bGw7Ly9jbGVhbiB1cCBzY3JpcHQgdG8gcHJlcCBmb3IgZ2FyYmFnZSBjb2xsZWN0aW9uLlxuICAgIH1cbiAgICByZXR1cm47XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvblxuICAgKiBDYXVzZXMgb25lIG9yIG1vcmUgYWN0aXZlIHBsdWdpbnMgdG8gcmUtaW5pdGlhbGl6ZSwgcmVzZXR0aW5nIGV2ZW50IGxpc3RlbmVycywgcmVjYWxjdWxhdGluZyBwb3NpdGlvbnMsIGV0Yy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBsdWdpbnMgLSBvcHRpb25hbCBzdHJpbmcgb2YgYW4gaW5kaXZpZHVhbCBwbHVnaW4ga2V5LCBhdHRhaW5lZCBieSBjYWxsaW5nIGAkKGVsZW1lbnQpLmRhdGEoJ3BsdWdpbk5hbWUnKWAsIG9yIHN0cmluZyBvZiBhIHBsdWdpbiBjbGFzcyBpLmUuIGAnZHJvcGRvd24nYFxuICAgKiBAZGVmYXVsdCBJZiBubyBhcmd1bWVudCBpcyBwYXNzZWQsIHJlZmxvdyBhbGwgY3VycmVudGx5IGFjdGl2ZSBwbHVnaW5zLlxuICAgKi9cbiAgIHJlSW5pdDogZnVuY3Rpb24ocGx1Z2lucyl7XG4gICAgIHZhciBpc0pRID0gcGx1Z2lucyBpbnN0YW5jZW9mICQ7XG4gICAgIHRyeXtcbiAgICAgICBpZihpc0pRKXtcbiAgICAgICAgIHBsdWdpbnMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAkKHRoaXMpLmRhdGEoJ3pmUGx1Z2luJykuX2luaXQoKTtcbiAgICAgICAgIH0pO1xuICAgICAgIH1lbHNle1xuICAgICAgICAgdmFyIHR5cGUgPSB0eXBlb2YgcGx1Z2lucyxcbiAgICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgIGZucyA9IHtcbiAgICAgICAgICAgJ29iamVjdCc6IGZ1bmN0aW9uKHBsZ3Mpe1xuICAgICAgICAgICAgIHBsZ3MuZm9yRWFjaChmdW5jdGlvbihwKXtcbiAgICAgICAgICAgICAgIHAgPSBoeXBoZW5hdGUocCk7XG4gICAgICAgICAgICAgICAkKCdbZGF0YS0nKyBwICsnXScpLmZvdW5kYXRpb24oJ19pbml0Jyk7XG4gICAgICAgICAgICAgfSk7XG4gICAgICAgICAgIH0sXG4gICAgICAgICAgICdzdHJpbmcnOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgIHBsdWdpbnMgPSBoeXBoZW5hdGUocGx1Z2lucyk7XG4gICAgICAgICAgICAgJCgnW2RhdGEtJysgcGx1Z2lucyArJ10nKS5mb3VuZGF0aW9uKCdfaW5pdCcpO1xuICAgICAgICAgICB9LFxuICAgICAgICAgICAndW5kZWZpbmVkJzogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICB0aGlzWydvYmplY3QnXShPYmplY3Qua2V5cyhfdGhpcy5fcGx1Z2lucykpO1xuICAgICAgICAgICB9XG4gICAgICAgICB9O1xuICAgICAgICAgZm5zW3R5cGVdKHBsdWdpbnMpO1xuICAgICAgIH1cbiAgICAgfWNhdGNoKGVycil7XG4gICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICB9ZmluYWxseXtcbiAgICAgICByZXR1cm4gcGx1Z2lucztcbiAgICAgfVxuICAgfSxcblxuICAvKipcbiAgICogcmV0dXJucyBhIHJhbmRvbSBiYXNlLTM2IHVpZCB3aXRoIG5hbWVzcGFjaW5nXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge051bWJlcn0gbGVuZ3RoIC0gbnVtYmVyIG9mIHJhbmRvbSBiYXNlLTM2IGRpZ2l0cyBkZXNpcmVkLiBJbmNyZWFzZSBmb3IgbW9yZSByYW5kb20gc3RyaW5ncy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVzcGFjZSAtIG5hbWUgb2YgcGx1Z2luIHRvIGJlIGluY29ycG9yYXRlZCBpbiB1aWQsIG9wdGlvbmFsLlxuICAgKiBAZGVmYXVsdCB7U3RyaW5nfSAnJyAtIGlmIG5vIHBsdWdpbiBuYW1lIGlzIHByb3ZpZGVkLCBub3RoaW5nIGlzIGFwcGVuZGVkIHRvIHRoZSB1aWQuXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IC0gdW5pcXVlIGlkXG4gICAqL1xuICBHZXRZb0RpZ2l0czogZnVuY3Rpb24obGVuZ3RoLCBuYW1lc3BhY2Upe1xuICAgIGxlbmd0aCA9IGxlbmd0aCB8fCA2O1xuICAgIHJldHVybiBNYXRoLnJvdW5kKChNYXRoLnBvdygzNiwgbGVuZ3RoICsgMSkgLSBNYXRoLnJhbmRvbSgpICogTWF0aC5wb3coMzYsIGxlbmd0aCkpKS50b1N0cmluZygzNikuc2xpY2UoMSkgKyAobmFtZXNwYWNlID8gYC0ke25hbWVzcGFjZX1gIDogJycpO1xuICB9LFxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBwbHVnaW5zIG9uIGFueSBlbGVtZW50cyB3aXRoaW4gYGVsZW1gIChhbmQgYGVsZW1gIGl0c2VsZikgdGhhdCBhcmVuJ3QgYWxyZWFkeSBpbml0aWFsaXplZC5cbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGVsZW1lbnQgdG8gY2hlY2sgaW5zaWRlLiBBbHNvIGNoZWNrcyB0aGUgZWxlbWVudCBpdHNlbGYsIHVubGVzcyBpdCdzIHRoZSBgZG9jdW1lbnRgIG9iamVjdC5cbiAgICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IHBsdWdpbnMgLSBBIGxpc3Qgb2YgcGx1Z2lucyB0byBpbml0aWFsaXplLiBMZWF2ZSB0aGlzIG91dCB0byBpbml0aWFsaXplIGV2ZXJ5dGhpbmcuXG4gICAqL1xuICByZWZsb3c6IGZ1bmN0aW9uKGVsZW0sIHBsdWdpbnMpIHtcblxuICAgIC8vIElmIHBsdWdpbnMgaXMgdW5kZWZpbmVkLCBqdXN0IGdyYWIgZXZlcnl0aGluZ1xuICAgIGlmICh0eXBlb2YgcGx1Z2lucyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHBsdWdpbnMgPSBPYmplY3Qua2V5cyh0aGlzLl9wbHVnaW5zKTtcbiAgICB9XG4gICAgLy8gSWYgcGx1Z2lucyBpcyBhIHN0cmluZywgY29udmVydCBpdCB0byBhbiBhcnJheSB3aXRoIG9uZSBpdGVtXG4gICAgZWxzZSBpZiAodHlwZW9mIHBsdWdpbnMgPT09ICdzdHJpbmcnKSB7XG4gICAgICBwbHVnaW5zID0gW3BsdWdpbnNdO1xuICAgIH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggZWFjaCBwbHVnaW5cbiAgICAkLmVhY2gocGx1Z2lucywgZnVuY3Rpb24oaSwgbmFtZSkge1xuICAgICAgLy8gR2V0IHRoZSBjdXJyZW50IHBsdWdpblxuICAgICAgdmFyIHBsdWdpbiA9IF90aGlzLl9wbHVnaW5zW25hbWVdO1xuXG4gICAgICAvLyBMb2NhbGl6ZSB0aGUgc2VhcmNoIHRvIGFsbCBlbGVtZW50cyBpbnNpZGUgZWxlbSwgYXMgd2VsbCBhcyBlbGVtIGl0c2VsZiwgdW5sZXNzIGVsZW0gPT09IGRvY3VtZW50XG4gICAgICB2YXIgJGVsZW0gPSAkKGVsZW0pLmZpbmQoJ1tkYXRhLScrbmFtZSsnXScpLmFkZEJhY2soJ1tkYXRhLScrbmFtZSsnXScpO1xuXG4gICAgICAvLyBGb3IgZWFjaCBwbHVnaW4gZm91bmQsIGluaXRpYWxpemUgaXRcbiAgICAgICRlbGVtLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciAkZWwgPSAkKHRoaXMpLFxuICAgICAgICAgICAgb3B0cyA9IHt9O1xuICAgICAgICAvLyBEb24ndCBkb3VibGUtZGlwIG9uIHBsdWdpbnNcbiAgICAgICAgaWYgKCRlbC5kYXRhKCd6ZlBsdWdpbicpKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKFwiVHJpZWQgdG8gaW5pdGlhbGl6ZSBcIituYW1lK1wiIG9uIGFuIGVsZW1lbnQgdGhhdCBhbHJlYWR5IGhhcyBhIEZvdW5kYXRpb24gcGx1Z2luLlwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZigkZWwuYXR0cignZGF0YS1vcHRpb25zJykpe1xuICAgICAgICAgIHZhciB0aGluZyA9ICRlbC5hdHRyKCdkYXRhLW9wdGlvbnMnKS5zcGxpdCgnOycpLmZvckVhY2goZnVuY3Rpb24oZSwgaSl7XG4gICAgICAgICAgICB2YXIgb3B0ID0gZS5zcGxpdCgnOicpLm1hcChmdW5jdGlvbihlbCl7IHJldHVybiBlbC50cmltKCk7IH0pO1xuICAgICAgICAgICAgaWYob3B0WzBdKSBvcHRzW29wdFswXV0gPSBwYXJzZVZhbHVlKG9wdFsxXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5e1xuICAgICAgICAgICRlbC5kYXRhKCd6ZlBsdWdpbicsIG5ldyBwbHVnaW4oJCh0aGlzKSwgb3B0cykpO1xuICAgICAgICB9Y2F0Y2goZXIpe1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXIpO1xuICAgICAgICB9ZmluYWxseXtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuICBnZXRGbk5hbWU6IGZ1bmN0aW9uTmFtZSxcbiAgdHJhbnNpdGlvbmVuZDogZnVuY3Rpb24oJGVsZW0pe1xuICAgIHZhciB0cmFuc2l0aW9ucyA9IHtcbiAgICAgICd0cmFuc2l0aW9uJzogJ3RyYW5zaXRpb25lbmQnLFxuICAgICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgICAnTW96VHJhbnNpdGlvbic6ICd0cmFuc2l0aW9uZW5kJyxcbiAgICAgICdPVHJhbnNpdGlvbic6ICdvdHJhbnNpdGlvbmVuZCdcbiAgICB9O1xuICAgIHZhciBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgIGVuZDtcblxuICAgIGZvciAodmFyIHQgaW4gdHJhbnNpdGlvbnMpe1xuICAgICAgaWYgKHR5cGVvZiBlbGVtLnN0eWxlW3RdICE9PSAndW5kZWZpbmVkJyl7XG4gICAgICAgIGVuZCA9IHRyYW5zaXRpb25zW3RdO1xuICAgICAgfVxuICAgIH1cbiAgICBpZihlbmQpe1xuICAgICAgcmV0dXJuIGVuZDtcbiAgICB9ZWxzZXtcbiAgICAgIGVuZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgJGVsZW0udHJpZ2dlckhhbmRsZXIoJ3RyYW5zaXRpb25lbmQnLCBbJGVsZW1dKTtcbiAgICAgIH0sIDEpO1xuICAgICAgcmV0dXJuICd0cmFuc2l0aW9uZW5kJztcbiAgICB9XG4gIH1cbn07XG5cbkZvdW5kYXRpb24udXRpbCA9IHtcbiAgLyoqXG4gICAqIEZ1bmN0aW9uIGZvciBhcHBseWluZyBhIGRlYm91bmNlIGVmZmVjdCB0byBhIGZ1bmN0aW9uIGNhbGwuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIC0gRnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IGVuZCBvZiB0aW1lb3V0LlxuICAgKiBAcGFyYW0ge051bWJlcn0gZGVsYXkgLSBUaW1lIGluIG1zIHRvIGRlbGF5IHRoZSBjYWxsIG9mIGBmdW5jYC5cbiAgICogQHJldHVybnMgZnVuY3Rpb25cbiAgICovXG4gIHRocm90dGxlOiBmdW5jdGlvbiAoZnVuYywgZGVsYXkpIHtcbiAgICB2YXIgdGltZXIgPSBudWxsO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcblxuICAgICAgaWYgKHRpbWVyID09PSBudWxsKSB7XG4gICAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICB0aW1lciA9IG51bGw7XG4gICAgICAgIH0sIGRlbGF5KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59O1xuXG4vLyBUT0RPOiBjb25zaWRlciBub3QgbWFraW5nIHRoaXMgYSBqUXVlcnkgZnVuY3Rpb25cbi8vIFRPRE86IG5lZWQgd2F5IHRvIHJlZmxvdyB2cy4gcmUtaW5pdGlhbGl6ZVxuLyoqXG4gKiBUaGUgRm91bmRhdGlvbiBqUXVlcnkgbWV0aG9kLlxuICogQHBhcmFtIHtTdHJpbmd8QXJyYXl9IG1ldGhvZCAtIEFuIGFjdGlvbiB0byBwZXJmb3JtIG9uIHRoZSBjdXJyZW50IGpRdWVyeSBvYmplY3QuXG4gKi9cbnZhciBmb3VuZGF0aW9uID0gZnVuY3Rpb24obWV0aG9kKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIG1ldGhvZCxcbiAgICAgICRtZXRhID0gJCgnbWV0YS5mb3VuZGF0aW9uLW1xJyksXG4gICAgICAkbm9KUyA9ICQoJy5uby1qcycpO1xuXG4gIGlmKCEkbWV0YS5sZW5ndGgpe1xuICAgICQoJzxtZXRhIGNsYXNzPVwiZm91bmRhdGlvbi1tcVwiPicpLmFwcGVuZFRvKGRvY3VtZW50LmhlYWQpO1xuICB9XG4gIGlmKCRub0pTLmxlbmd0aCl7XG4gICAgJG5vSlMucmVtb3ZlQ2xhc3MoJ25vLWpzJyk7XG4gIH1cblxuICBpZih0eXBlID09PSAndW5kZWZpbmVkJyl7Ly9uZWVkcyB0byBpbml0aWFsaXplIHRoZSBGb3VuZGF0aW9uIG9iamVjdCwgb3IgYW4gaW5kaXZpZHVhbCBwbHVnaW4uXG4gICAgRm91bmRhdGlvbi5NZWRpYVF1ZXJ5Ll9pbml0KCk7XG4gICAgRm91bmRhdGlvbi5yZWZsb3codGhpcyk7XG4gIH1lbHNlIGlmKHR5cGUgPT09ICdzdHJpbmcnKXsvL2FuIGluZGl2aWR1YWwgbWV0aG9kIHRvIGludm9rZSBvbiBhIHBsdWdpbiBvciBncm91cCBvZiBwbHVnaW5zXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpOy8vY29sbGVjdCBhbGwgdGhlIGFyZ3VtZW50cywgaWYgbmVjZXNzYXJ5XG4gICAgdmFyIHBsdWdDbGFzcyA9IHRoaXMuZGF0YSgnemZQbHVnaW4nKTsvL2RldGVybWluZSB0aGUgY2xhc3Mgb2YgcGx1Z2luXG5cbiAgICBpZihwbHVnQ2xhc3MgIT09IHVuZGVmaW5lZCAmJiBwbHVnQ2xhc3NbbWV0aG9kXSAhPT0gdW5kZWZpbmVkKXsvL21ha2Ugc3VyZSBib3RoIHRoZSBjbGFzcyBhbmQgbWV0aG9kIGV4aXN0XG4gICAgICBpZih0aGlzLmxlbmd0aCA9PT0gMSl7Ly9pZiB0aGVyZSdzIG9ubHkgb25lLCBjYWxsIGl0IGRpcmVjdGx5LlxuICAgICAgICAgIHBsdWdDbGFzc1ttZXRob2RdLmFwcGx5KHBsdWdDbGFzcywgYXJncyk7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5lYWNoKGZ1bmN0aW9uKGksIGVsKXsvL290aGVyd2lzZSBsb29wIHRocm91Z2ggdGhlIGpRdWVyeSBjb2xsZWN0aW9uIGFuZCBpbnZva2UgdGhlIG1ldGhvZCBvbiBlYWNoXG4gICAgICAgICAgcGx1Z0NsYXNzW21ldGhvZF0uYXBwbHkoJChlbCkuZGF0YSgnemZQbHVnaW4nKSwgYXJncyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1lbHNley8vZXJyb3IgZm9yIG5vIGNsYXNzIG9yIG5vIG1ldGhvZFxuICAgICAgdGhyb3cgbmV3IFJlZmVyZW5jZUVycm9yKFwiV2UncmUgc29ycnksICdcIiArIG1ldGhvZCArIFwiJyBpcyBub3QgYW4gYXZhaWxhYmxlIG1ldGhvZCBmb3IgXCIgKyAocGx1Z0NsYXNzID8gZnVuY3Rpb25OYW1lKHBsdWdDbGFzcykgOiAndGhpcyBlbGVtZW50JykgKyAnLicpO1xuICAgIH1cbiAgfWVsc2V7Ly9lcnJvciBmb3IgaW52YWxpZCBhcmd1bWVudCB0eXBlXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihgV2UncmUgc29ycnksICR7dHlwZX0gaXMgbm90IGEgdmFsaWQgcGFyYW1ldGVyLiBZb3UgbXVzdCB1c2UgYSBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBtZXRob2QgeW91IHdpc2ggdG8gaW52b2tlLmApO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxud2luZG93LkZvdW5kYXRpb24gPSBGb3VuZGF0aW9uO1xuJC5mbi5mb3VuZGF0aW9uID0gZm91bmRhdGlvbjtcblxuLy8gUG9seWZpbGwgZm9yIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuKGZ1bmN0aW9uKCkge1xuICBpZiAoIURhdGUubm93IHx8ICF3aW5kb3cuRGF0ZS5ub3cpXG4gICAgd2luZG93LkRhdGUubm93ID0gRGF0ZS5ub3cgPSBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIHZhciB2ZW5kb3JzID0gWyd3ZWJraXQnLCAnbW96J107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ICsraSkge1xuICAgICAgdmFyIHZwID0gdmVuZG9yc1tpXTtcbiAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSB3aW5kb3dbdnArJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gKHdpbmRvd1t2cCsnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgd2luZG93W3ZwKydDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSk7XG4gIH1cbiAgaWYgKC9pUChhZHxob25lfG9kKS4qT1MgNi8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnVzZXJBZ2VudClcbiAgICB8fCAhd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCAhd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgdmFyIGxhc3RUaW1lID0gMDtcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHZhciBuZXh0VGltZSA9IE1hdGgubWF4KGxhc3RUaW1lICsgMTYsIG5vdyk7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhsYXN0VGltZSA9IG5leHRUaW1lKTsgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFRpbWUgLSBub3cpO1xuICAgIH07XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lID0gY2xlYXJUaW1lb3V0O1xuICB9XG4gIC8qKlxuICAgKiBQb2x5ZmlsbCBmb3IgcGVyZm9ybWFuY2Uubm93LCByZXF1aXJlZCBieSByQUZcbiAgICovXG4gIGlmKCF3aW5kb3cucGVyZm9ybWFuY2UgfHwgIXdpbmRvdy5wZXJmb3JtYW5jZS5ub3cpe1xuICAgIHdpbmRvdy5wZXJmb3JtYW5jZSA9IHtcbiAgICAgIHN0YXJ0OiBEYXRlLm5vdygpLFxuICAgICAgbm93OiBmdW5jdGlvbigpeyByZXR1cm4gRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnQ7IH1cbiAgICB9O1xuICB9XG59KSgpO1xuaWYgKCFGdW5jdGlvbi5wcm90b3R5cGUuYmluZCkge1xuICBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKG9UaGlzKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAvLyBjbG9zZXN0IHRoaW5nIHBvc3NpYmxlIHRvIHRoZSBFQ01BU2NyaXB0IDVcbiAgICAgIC8vIGludGVybmFsIElzQ2FsbGFibGUgZnVuY3Rpb25cbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Z1bmN0aW9uLnByb3RvdHlwZS5iaW5kIC0gd2hhdCBpcyB0cnlpbmcgdG8gYmUgYm91bmQgaXMgbm90IGNhbGxhYmxlJyk7XG4gICAgfVxuXG4gICAgdmFyIGFBcmdzICAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuICAgICAgICBmVG9CaW5kID0gdGhpcyxcbiAgICAgICAgZk5PUCAgICA9IGZ1bmN0aW9uKCkge30sXG4gICAgICAgIGZCb3VuZCAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gZlRvQmluZC5hcHBseSh0aGlzIGluc3RhbmNlb2YgZk5PUFxuICAgICAgICAgICAgICAgICA/IHRoaXNcbiAgICAgICAgICAgICAgICAgOiBvVGhpcyxcbiAgICAgICAgICAgICAgICAgYUFyZ3MuY29uY2F0KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgICAgfTtcblxuICAgIGlmICh0aGlzLnByb3RvdHlwZSkge1xuICAgICAgLy8gbmF0aXZlIGZ1bmN0aW9ucyBkb24ndCBoYXZlIGEgcHJvdG90eXBlXG4gICAgICBmTk9QLnByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlO1xuICAgIH1cbiAgICBmQm91bmQucHJvdG90eXBlID0gbmV3IGZOT1AoKTtcblxuICAgIHJldHVybiBmQm91bmQ7XG4gIH07XG59XG4vLyBQb2x5ZmlsbCB0byBnZXQgdGhlIG5hbWUgb2YgYSBmdW5jdGlvbiBpbiBJRTlcbmZ1bmN0aW9uIGZ1bmN0aW9uTmFtZShmbikge1xuICBpZiAoRnVuY3Rpb24ucHJvdG90eXBlLm5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBmdW5jTmFtZVJlZ2V4ID0gL2Z1bmN0aW9uXFxzKFteKF17MSx9KVxcKC87XG4gICAgdmFyIHJlc3VsdHMgPSAoZnVuY05hbWVSZWdleCkuZXhlYygoZm4pLnRvU3RyaW5nKCkpO1xuICAgIHJldHVybiAocmVzdWx0cyAmJiByZXN1bHRzLmxlbmd0aCA+IDEpID8gcmVzdWx0c1sxXS50cmltKCkgOiBcIlwiO1xuICB9XG4gIGVsc2UgaWYgKGZuLnByb3RvdHlwZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGZuLmNvbnN0cnVjdG9yLm5hbWU7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIGZuLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5uYW1lO1xuICB9XG59XG5mdW5jdGlvbiBwYXJzZVZhbHVlKHN0cil7XG4gIGlmICgndHJ1ZScgPT09IHN0cikgcmV0dXJuIHRydWU7XG4gIGVsc2UgaWYgKCdmYWxzZScgPT09IHN0cikgcmV0dXJuIGZhbHNlO1xuICBlbHNlIGlmICghaXNOYU4oc3RyICogMSkpIHJldHVybiBwYXJzZUZsb2F0KHN0cik7XG4gIHJldHVybiBzdHI7XG59XG4vLyBDb252ZXJ0IFBhc2NhbENhc2UgdG8ga2ViYWItY2FzZVxuLy8gVGhhbmsgeW91OiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS84OTU1NTgwXG5mdW5jdGlvbiBoeXBoZW5hdGUoc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgJyQxLSQyJykudG9Mb3dlckNhc2UoKTtcbn1cblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5Gb3VuZGF0aW9uLkJveCA9IHtcbiAgSW1Ob3RUb3VjaGluZ1lvdTogSW1Ob3RUb3VjaGluZ1lvdSxcbiAgR2V0RGltZW5zaW9uczogR2V0RGltZW5zaW9ucyxcbiAgR2V0T2Zmc2V0czogR2V0T2Zmc2V0c1xufVxuXG4vKipcbiAqIENvbXBhcmVzIHRoZSBkaW1lbnNpb25zIG9mIGFuIGVsZW1lbnQgdG8gYSBjb250YWluZXIgYW5kIGRldGVybWluZXMgY29sbGlzaW9uIGV2ZW50cyB3aXRoIGNvbnRhaW5lci5cbiAqIEBmdW5jdGlvblxuICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHRlc3QgZm9yIGNvbGxpc2lvbnMuXG4gKiBAcGFyYW0ge2pRdWVyeX0gcGFyZW50IC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgYm91bmRpbmcgY29udGFpbmVyLlxuICogQHBhcmFtIHtCb29sZWFufSBsck9ubHkgLSBzZXQgdG8gdHJ1ZSB0byBjaGVjayBsZWZ0IGFuZCByaWdodCB2YWx1ZXMgb25seS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdGJPbmx5IC0gc2V0IHRvIHRydWUgdG8gY2hlY2sgdG9wIGFuZCBib3R0b20gdmFsdWVzIG9ubHkuXG4gKiBAZGVmYXVsdCBpZiBubyBwYXJlbnQgb2JqZWN0IHBhc3NlZCwgZGV0ZWN0cyBjb2xsaXNpb25zIHdpdGggYHdpbmRvd2AuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSB0cnVlIGlmIGNvbGxpc2lvbiBmcmVlLCBmYWxzZSBpZiBhIGNvbGxpc2lvbiBpbiBhbnkgZGlyZWN0aW9uLlxuICovXG5mdW5jdGlvbiBJbU5vdFRvdWNoaW5nWW91KGVsZW1lbnQsIHBhcmVudCwgbHJPbmx5LCB0Yk9ubHkpIHtcbiAgdmFyIGVsZURpbXMgPSBHZXREaW1lbnNpb25zKGVsZW1lbnQpLFxuICAgICAgdG9wLCBib3R0b20sIGxlZnQsIHJpZ2h0O1xuXG4gIGlmIChwYXJlbnQpIHtcbiAgICB2YXIgcGFyRGltcyA9IEdldERpbWVuc2lvbnMocGFyZW50KTtcblxuICAgIGJvdHRvbSA9IChlbGVEaW1zLm9mZnNldC50b3AgKyBlbGVEaW1zLmhlaWdodCA8PSBwYXJEaW1zLmhlaWdodCArIHBhckRpbXMub2Zmc2V0LnRvcCk7XG4gICAgdG9wICAgID0gKGVsZURpbXMub2Zmc2V0LnRvcCA+PSBwYXJEaW1zLm9mZnNldC50b3ApO1xuICAgIGxlZnQgICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ID49IHBhckRpbXMub2Zmc2V0LmxlZnQpO1xuICAgIHJpZ2h0ICA9IChlbGVEaW1zLm9mZnNldC5sZWZ0ICsgZWxlRGltcy53aWR0aCA8PSBwYXJEaW1zLndpZHRoICsgcGFyRGltcy5vZmZzZXQubGVmdCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgYm90dG9tID0gKGVsZURpbXMub2Zmc2V0LnRvcCArIGVsZURpbXMuaGVpZ2h0IDw9IGVsZURpbXMud2luZG93RGltcy5oZWlnaHQgKyBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCk7XG4gICAgdG9wICAgID0gKGVsZURpbXMub2Zmc2V0LnRvcCA+PSBlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCk7XG4gICAgbGVmdCAgID0gKGVsZURpbXMub2Zmc2V0LmxlZnQgPj0gZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC5sZWZ0KTtcbiAgICByaWdodCAgPSAoZWxlRGltcy5vZmZzZXQubGVmdCArIGVsZURpbXMud2lkdGggPD0gZWxlRGltcy53aW5kb3dEaW1zLndpZHRoKTtcbiAgfVxuXG4gIHZhciBhbGxEaXJzID0gW2JvdHRvbSwgdG9wLCBsZWZ0LCByaWdodF07XG5cbiAgaWYgKGxyT25seSkge1xuICAgIHJldHVybiBsZWZ0ID09PSByaWdodCA9PT0gdHJ1ZTtcbiAgfVxuXG4gIGlmICh0Yk9ubHkpIHtcbiAgICByZXR1cm4gdG9wID09PSBib3R0b20gPT09IHRydWU7XG4gIH1cblxuICByZXR1cm4gYWxsRGlycy5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG59O1xuXG4vKipcbiAqIFVzZXMgbmF0aXZlIG1ldGhvZHMgdG8gcmV0dXJuIGFuIG9iamVjdCBvZiBkaW1lbnNpb24gdmFsdWVzLlxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeSB8fCBIVE1MfSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCBvciBET00gZWxlbWVudCBmb3Igd2hpY2ggdG8gZ2V0IHRoZSBkaW1lbnNpb25zLiBDYW4gYmUgYW55IGVsZW1lbnQgb3RoZXIgdGhhdCBkb2N1bWVudCBvciB3aW5kb3cuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSAtIG5lc3RlZCBvYmplY3Qgb2YgaW50ZWdlciBwaXhlbCB2YWx1ZXNcbiAqIFRPRE8gLSBpZiBlbGVtZW50IGlzIHdpbmRvdywgcmV0dXJuIG9ubHkgdGhvc2UgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBHZXREaW1lbnNpb25zKGVsZW0sIHRlc3Qpe1xuICBlbGVtID0gZWxlbS5sZW5ndGggPyBlbGVtWzBdIDogZWxlbTtcblxuICBpZiAoZWxlbSA9PT0gd2luZG93IHx8IGVsZW0gPT09IGRvY3VtZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSSdtIHNvcnJ5LCBEYXZlLiBJJ20gYWZyYWlkIEkgY2FuJ3QgZG8gdGhhdC5cIik7XG4gIH1cblxuICB2YXIgcmVjdCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICBwYXJSZWN0ID0gZWxlbS5wYXJlbnROb2RlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLFxuICAgICAgd2luUmVjdCA9IGRvY3VtZW50LmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICB3aW5ZID0gd2luZG93LnBhZ2VZT2Zmc2V0LFxuICAgICAgd2luWCA9IHdpbmRvdy5wYWdlWE9mZnNldDtcblxuICByZXR1cm4ge1xuICAgIHdpZHRoOiByZWN0LndpZHRoLFxuICAgIGhlaWdodDogcmVjdC5oZWlnaHQsXG4gICAgb2Zmc2V0OiB7XG4gICAgICB0b3A6IHJlY3QudG9wICsgd2luWSxcbiAgICAgIGxlZnQ6IHJlY3QubGVmdCArIHdpblhcbiAgICB9LFxuICAgIHBhcmVudERpbXM6IHtcbiAgICAgIHdpZHRoOiBwYXJSZWN0LndpZHRoLFxuICAgICAgaGVpZ2h0OiBwYXJSZWN0LmhlaWdodCxcbiAgICAgIG9mZnNldDoge1xuICAgICAgICB0b3A6IHBhclJlY3QudG9wICsgd2luWSxcbiAgICAgICAgbGVmdDogcGFyUmVjdC5sZWZ0ICsgd2luWFxuICAgICAgfVxuICAgIH0sXG4gICAgd2luZG93RGltczoge1xuICAgICAgd2lkdGg6IHdpblJlY3Qud2lkdGgsXG4gICAgICBoZWlnaHQ6IHdpblJlY3QuaGVpZ2h0LFxuICAgICAgb2Zmc2V0OiB7XG4gICAgICAgIHRvcDogd2luWSxcbiAgICAgICAgbGVmdDogd2luWFxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IG9mIHRvcCBhbmQgbGVmdCBpbnRlZ2VyIHBpeGVsIHZhbHVlcyBmb3IgZHluYW1pY2FsbHkgcmVuZGVyZWQgZWxlbWVudHMsXG4gKiBzdWNoIGFzOiBUb29sdGlwLCBSZXZlYWwsIGFuZCBEcm9wZG93blxuICogQGZ1bmN0aW9uXG4gKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50IGJlaW5nIHBvc2l0aW9uZWQuXG4gKiBAcGFyYW0ge2pRdWVyeX0gYW5jaG9yIC0galF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnQncyBhbmNob3IgcG9pbnQuXG4gKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBhIHN0cmluZyByZWxhdGluZyB0byB0aGUgZGVzaXJlZCBwb3NpdGlvbiBvZiB0aGUgZWxlbWVudCwgcmVsYXRpdmUgdG8gaXQncyBhbmNob3JcbiAqIEBwYXJhbSB7TnVtYmVyfSB2T2Zmc2V0IC0gaW50ZWdlciBwaXhlbCB2YWx1ZSBvZiBkZXNpcmVkIHZlcnRpY2FsIHNlcGFyYXRpb24gYmV0d2VlbiBhbmNob3IgYW5kIGVsZW1lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0gaE9mZnNldCAtIGludGVnZXIgcGl4ZWwgdmFsdWUgb2YgZGVzaXJlZCBob3Jpem9udGFsIHNlcGFyYXRpb24gYmV0d2VlbiBhbmNob3IgYW5kIGVsZW1lbnQuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGlzT3ZlcmZsb3cgLSBpZiBhIGNvbGxpc2lvbiBldmVudCBpcyBkZXRlY3RlZCwgc2V0cyB0byB0cnVlIHRvIGRlZmF1bHQgdGhlIGVsZW1lbnQgdG8gZnVsbCB3aWR0aCAtIGFueSBkZXNpcmVkIG9mZnNldC5cbiAqIFRPRE8gYWx0ZXIvcmV3cml0ZSB0byB3b3JrIHdpdGggYGVtYCB2YWx1ZXMgYXMgd2VsbC9pbnN0ZWFkIG9mIHBpeGVsc1xuICovXG5mdW5jdGlvbiBHZXRPZmZzZXRzKGVsZW1lbnQsIGFuY2hvciwgcG9zaXRpb24sIHZPZmZzZXQsIGhPZmZzZXQsIGlzT3ZlcmZsb3cpIHtcbiAgdmFyICRlbGVEaW1zID0gR2V0RGltZW5zaW9ucyhlbGVtZW50KSxcbiAgICAgICRhbmNob3JEaW1zID0gYW5jaG9yID8gR2V0RGltZW5zaW9ucyhhbmNob3IpIDogbnVsbDtcblxuICBzd2l0Y2ggKHBvc2l0aW9uKSB7XG4gICAgY2FzZSAndG9wJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6IChGb3VuZGF0aW9uLnJ0bCgpID8gJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAkZWxlRGltcy53aWR0aCArICRhbmNob3JEaW1zLndpZHRoIDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgLSAoJGVsZURpbXMuaGVpZ2h0ICsgdk9mZnNldClcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGFuY2hvckRpbXMub2Zmc2V0LmxlZnQgLSAoJGVsZURpbXMud2lkdGggKyBoT2Zmc2V0KSxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdyaWdodCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICRhbmNob3JEaW1zLndpZHRoICsgaE9mZnNldCxcbiAgICAgICAgdG9wOiAkYW5jaG9yRGltcy5vZmZzZXQudG9wXG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgdG9wJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArICgkYW5jaG9yRGltcy53aWR0aCAvIDIpKSAtICgkZWxlRGltcy53aWR0aCAvIDIpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgLSAoJGVsZURpbXMuaGVpZ2h0ICsgdk9mZnNldClcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlciBib3R0b20nOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogaXNPdmVyZmxvdyA/IGhPZmZzZXQgOiAoKCRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgKCRhbmNob3JEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMikpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlICdjZW50ZXIgbGVmdCc6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICgkZWxlRGltcy53aWR0aCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICgkYW5jaG9yRGltcy5vZmZzZXQudG9wICsgKCRhbmNob3JEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAnY2VudGVyIHJpZ2h0JzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0ICsgMSxcbiAgICAgICAgdG9wOiAoJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICgkYW5jaG9yRGltcy5oZWlnaHQgLyAyKSkgLSAoJGVsZURpbXMuaGVpZ2h0IC8gMilcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2NlbnRlcic6XG4gICAgICByZXR1cm4ge1xuICAgICAgICBsZWZ0OiAoJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCArICgkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC8gMikpIC0gKCRlbGVEaW1zLndpZHRoIC8gMiksXG4gICAgICAgIHRvcDogKCRlbGVEaW1zLndpbmRvd0RpbXMub2Zmc2V0LnRvcCArICgkZWxlRGltcy53aW5kb3dEaW1zLmhlaWdodCAvIDIpKSAtICgkZWxlRGltcy5oZWlnaHQgLyAyKVxuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmV2ZWFsJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICgkZWxlRGltcy53aW5kb3dEaW1zLndpZHRoIC0gJGVsZURpbXMud2lkdGgpIC8gMixcbiAgICAgICAgdG9wOiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3AgKyB2T2Zmc2V0XG4gICAgICB9XG4gICAgY2FzZSAncmV2ZWFsIGZ1bGwnOlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogJGVsZURpbXMud2luZG93RGltcy5vZmZzZXQubGVmdCxcbiAgICAgICAgdG9wOiAkZWxlRGltcy53aW5kb3dEaW1zLm9mZnNldC50b3BcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2xlZnQgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0LFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9O1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAncmlnaHQgYm90dG9tJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlZnQ6ICRhbmNob3JEaW1zLm9mZnNldC5sZWZ0ICsgJGFuY2hvckRpbXMud2lkdGggKyBoT2Zmc2V0IC0gJGVsZURpbXMud2lkdGgsXG4gICAgICAgIHRvcDogJGFuY2hvckRpbXMub2Zmc2V0LnRvcCArICRhbmNob3JEaW1zLmhlaWdodCArIHZPZmZzZXRcbiAgICAgIH07XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVmdDogKEZvdW5kYXRpb24ucnRsKCkgPyAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCAtICRlbGVEaW1zLndpZHRoICsgJGFuY2hvckRpbXMud2lkdGggOiAkYW5jaG9yRGltcy5vZmZzZXQubGVmdCArIGhPZmZzZXQpLFxuICAgICAgICB0b3A6ICRhbmNob3JEaW1zLm9mZnNldC50b3AgKyAkYW5jaG9yRGltcy5oZWlnaHQgKyB2T2Zmc2V0XG4gICAgICB9XG4gIH1cbn1cblxufShqUXVlcnkpO1xuIiwiLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiBUaGlzIHV0aWwgd2FzIGNyZWF0ZWQgYnkgTWFyaXVzIE9sYmVydHogKlxuICogUGxlYXNlIHRoYW5rIE1hcml1cyBvbiBHaXRIdWIgL293bGJlcnR6ICpcbiAqIG9yIHRoZSB3ZWIgaHR0cDovL3d3dy5tYXJpdXNvbGJlcnR6LmRlLyAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5jb25zdCBrZXlDb2RlcyA9IHtcbiAgOTogJ1RBQicsXG4gIDEzOiAnRU5URVInLFxuICAyNzogJ0VTQ0FQRScsXG4gIDMyOiAnU1BBQ0UnLFxuICAzNzogJ0FSUk9XX0xFRlQnLFxuICAzODogJ0FSUk9XX1VQJyxcbiAgMzk6ICdBUlJPV19SSUdIVCcsXG4gIDQwOiAnQVJST1dfRE9XTidcbn1cblxudmFyIGNvbW1hbmRzID0ge31cblxudmFyIEtleWJvYXJkID0ge1xuICBrZXlzOiBnZXRLZXlDb2RlcyhrZXlDb2RlcyksXG5cbiAgLyoqXG4gICAqIFBhcnNlcyB0aGUgKGtleWJvYXJkKSBldmVudCBhbmQgcmV0dXJucyBhIFN0cmluZyB0aGF0IHJlcHJlc2VudHMgaXRzIGtleVxuICAgKiBDYW4gYmUgdXNlZCBsaWtlIEZvdW5kYXRpb24ucGFyc2VLZXkoZXZlbnQpID09PSBGb3VuZGF0aW9uLmtleXMuU1BBQ0VcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSB0aGUgZXZlbnQgZ2VuZXJhdGVkIGJ5IHRoZSBldmVudCBoYW5kbGVyXG4gICAqIEByZXR1cm4gU3RyaW5nIGtleSAtIFN0cmluZyB0aGF0IHJlcHJlc2VudHMgdGhlIGtleSBwcmVzc2VkXG4gICAqL1xuICBwYXJzZUtleShldmVudCkge1xuICAgIHZhciBrZXkgPSBrZXlDb2Rlc1tldmVudC53aGljaCB8fCBldmVudC5rZXlDb2RlXSB8fCBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LndoaWNoKS50b1VwcGVyQ2FzZSgpO1xuXG4gICAgLy8gUmVtb3ZlIHVuLXByaW50YWJsZSBjaGFyYWN0ZXJzLCBlLmcuIGZvciBgZnJvbUNoYXJDb2RlYCBjYWxscyBmb3IgQ1RSTCBvbmx5IGV2ZW50c1xuICAgIGtleSA9IGtleS5yZXBsYWNlKC9cXFcrLywgJycpO1xuXG4gICAgaWYgKGV2ZW50LnNoaWZ0S2V5KSBrZXkgPSBgU0hJRlRfJHtrZXl9YDtcbiAgICBpZiAoZXZlbnQuY3RybEtleSkga2V5ID0gYENUUkxfJHtrZXl9YDtcbiAgICBpZiAoZXZlbnQuYWx0S2V5KSBrZXkgPSBgQUxUXyR7a2V5fWA7XG5cbiAgICAvLyBSZW1vdmUgdHJhaWxpbmcgdW5kZXJzY29yZSwgaW4gY2FzZSBvbmx5IG1vZGlmaWVycyB3ZXJlIHVzZWQgKGUuZy4gb25seSBgQ1RSTF9BTFRgKVxuICAgIGtleSA9IGtleS5yZXBsYWNlKC9fJC8sICcnKTtcblxuICAgIHJldHVybiBrZXk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgdGhlIGdpdmVuIChrZXlib2FyZCkgZXZlbnRcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnQgLSB0aGUgZXZlbnQgZ2VuZXJhdGVkIGJ5IHRoZSBldmVudCBoYW5kbGVyXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBjb21wb25lbnQgLSBGb3VuZGF0aW9uIGNvbXBvbmVudCdzIG5hbWUsIGUuZy4gU2xpZGVyIG9yIFJldmVhbFxuICAgKiBAcGFyYW0ge09iamVjdHN9IGZ1bmN0aW9ucyAtIGNvbGxlY3Rpb24gb2YgZnVuY3Rpb25zIHRoYXQgYXJlIHRvIGJlIGV4ZWN1dGVkXG4gICAqL1xuICBoYW5kbGVLZXkoZXZlbnQsIGNvbXBvbmVudCwgZnVuY3Rpb25zKSB7XG4gICAgdmFyIGNvbW1hbmRMaXN0ID0gY29tbWFuZHNbY29tcG9uZW50XSxcbiAgICAgIGtleUNvZGUgPSB0aGlzLnBhcnNlS2V5KGV2ZW50KSxcbiAgICAgIGNtZHMsXG4gICAgICBjb21tYW5kLFxuICAgICAgZm47XG5cbiAgICBpZiAoIWNvbW1hbmRMaXN0KSByZXR1cm4gY29uc29sZS53YXJuKCdDb21wb25lbnQgbm90IGRlZmluZWQhJyk7XG5cbiAgICBpZiAodHlwZW9mIGNvbW1hbmRMaXN0Lmx0ciA9PT0gJ3VuZGVmaW5lZCcpIHsgLy8gdGhpcyBjb21wb25lbnQgZG9lcyBub3QgZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIGx0ciBhbmQgcnRsXG4gICAgICAgIGNtZHMgPSBjb21tYW5kTGlzdDsgLy8gdXNlIHBsYWluIGxpc3RcbiAgICB9IGVsc2UgeyAvLyBtZXJnZSBsdHIgYW5kIHJ0bDogaWYgZG9jdW1lbnQgaXMgcnRsLCBydGwgb3ZlcndyaXRlcyBsdHIgYW5kIHZpY2UgdmVyc2FcbiAgICAgICAgaWYgKEZvdW5kYXRpb24ucnRsKCkpIGNtZHMgPSAkLmV4dGVuZCh7fSwgY29tbWFuZExpc3QubHRyLCBjb21tYW5kTGlzdC5ydGwpO1xuXG4gICAgICAgIGVsc2UgY21kcyA9ICQuZXh0ZW5kKHt9LCBjb21tYW5kTGlzdC5ydGwsIGNvbW1hbmRMaXN0Lmx0cik7XG4gICAgfVxuICAgIGNvbW1hbmQgPSBjbWRzW2tleUNvZGVdO1xuXG4gICAgZm4gPSBmdW5jdGlvbnNbY29tbWFuZF07XG4gICAgaWYgKGZuICYmIHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJykgeyAvLyBleGVjdXRlIGZ1bmN0aW9uICBpZiBleGlzdHNcbiAgICAgIHZhciByZXR1cm5WYWx1ZSA9IGZuLmFwcGx5KCk7XG4gICAgICBpZiAoZnVuY3Rpb25zLmhhbmRsZWQgfHwgdHlwZW9mIGZ1bmN0aW9ucy5oYW5kbGVkID09PSAnZnVuY3Rpb24nKSB7IC8vIGV4ZWN1dGUgZnVuY3Rpb24gd2hlbiBldmVudCB3YXMgaGFuZGxlZFxuICAgICAgICAgIGZ1bmN0aW9ucy5oYW5kbGVkKHJldHVyblZhbHVlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGZ1bmN0aW9ucy51bmhhbmRsZWQgfHwgdHlwZW9mIGZ1bmN0aW9ucy51bmhhbmRsZWQgPT09ICdmdW5jdGlvbicpIHsgLy8gZXhlY3V0ZSBmdW5jdGlvbiB3aGVuIGV2ZW50IHdhcyBub3QgaGFuZGxlZFxuICAgICAgICAgIGZ1bmN0aW9ucy51bmhhbmRsZWQoKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEZpbmRzIGFsbCBmb2N1c2FibGUgZWxlbWVudHMgd2l0aGluIHRoZSBnaXZlbiBgJGVsZW1lbnRgXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gc2VhcmNoIHdpdGhpblxuICAgKiBAcmV0dXJuIHtqUXVlcnl9ICRmb2N1c2FibGUgLSBhbGwgZm9jdXNhYmxlIGVsZW1lbnRzIHdpdGhpbiBgJGVsZW1lbnRgXG4gICAqL1xuICBmaW5kRm9jdXNhYmxlKCRlbGVtZW50KSB7XG4gICAgaWYoISRlbGVtZW50KSB7cmV0dXJuIGZhbHNlOyB9XG4gICAgcmV0dXJuICRlbGVtZW50LmZpbmQoJ2FbaHJlZl0sIGFyZWFbaHJlZl0sIGlucHV0Om5vdChbZGlzYWJsZWRdKSwgc2VsZWN0Om5vdChbZGlzYWJsZWRdKSwgdGV4dGFyZWE6bm90KFtkaXNhYmxlZF0pLCBidXR0b246bm90KFtkaXNhYmxlZF0pLCBpZnJhbWUsIG9iamVjdCwgZW1iZWQsICpbdGFiaW5kZXhdLCAqW2NvbnRlbnRlZGl0YWJsZV0nKS5maWx0ZXIoZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISQodGhpcykuaXMoJzp2aXNpYmxlJykgfHwgJCh0aGlzKS5hdHRyKCd0YWJpbmRleCcpIDwgMCkgeyByZXR1cm4gZmFsc2U7IH0gLy9vbmx5IGhhdmUgdmlzaWJsZSBlbGVtZW50cyBhbmQgdGhvc2UgdGhhdCBoYXZlIGEgdGFiaW5kZXggZ3JlYXRlciBvciBlcXVhbCAwXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfSxcblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgY29tcG9uZW50IG5hbWUgbmFtZVxuICAgKiBAcGFyYW0ge09iamVjdH0gY29tcG9uZW50IC0gRm91bmRhdGlvbiBjb21wb25lbnQsIGUuZy4gU2xpZGVyIG9yIFJldmVhbFxuICAgKiBAcmV0dXJuIFN0cmluZyBjb21wb25lbnROYW1lXG4gICAqL1xuXG4gIHJlZ2lzdGVyKGNvbXBvbmVudE5hbWUsIGNtZHMpIHtcbiAgICBjb21tYW5kc1tjb21wb25lbnROYW1lXSA9IGNtZHM7XG4gIH0sICBcblxuICAvKipcbiAgICogVHJhcHMgdGhlIGZvY3VzIGluIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgKiBAcGFyYW0gIHtqUXVlcnl9ICRlbGVtZW50ICBqUXVlcnkgb2JqZWN0IHRvIHRyYXAgdGhlIGZvdWNzIGludG8uXG4gICAqL1xuICB0cmFwRm9jdXMoJGVsZW1lbnQpIHtcbiAgICB2YXIgJGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSgkZWxlbWVudCksXG4gICAgICAgICRmaXJzdEZvY3VzYWJsZSA9ICRmb2N1c2FibGUuZXEoMCksXG4gICAgICAgICRsYXN0Rm9jdXNhYmxlID0gJGZvY3VzYWJsZS5lcSgtMSk7XG5cbiAgICAkZWxlbWVudC5vbigna2V5ZG93bi56Zi50cmFwZm9jdXMnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgaWYgKGV2ZW50LnRhcmdldCA9PT0gJGxhc3RGb2N1c2FibGVbMF0gJiYgRm91bmRhdGlvbi5LZXlib2FyZC5wYXJzZUtleShldmVudCkgPT09ICdUQUInKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICRmaXJzdEZvY3VzYWJsZS5mb2N1cygpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoZXZlbnQudGFyZ2V0ID09PSAkZmlyc3RGb2N1c2FibGVbMF0gJiYgRm91bmRhdGlvbi5LZXlib2FyZC5wYXJzZUtleShldmVudCkgPT09ICdTSElGVF9UQUInKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICRsYXN0Rm9jdXNhYmxlLmZvY3VzKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIC8qKlxuICAgKiBSZWxlYXNlcyB0aGUgdHJhcHBlZCBmb2N1cyBmcm9tIHRoZSBnaXZlbiBlbGVtZW50LlxuICAgKiBAcGFyYW0gIHtqUXVlcnl9ICRlbGVtZW50ICBqUXVlcnkgb2JqZWN0IHRvIHJlbGVhc2UgdGhlIGZvY3VzIGZvci5cbiAgICovXG4gIHJlbGVhc2VGb2N1cygkZWxlbWVudCkge1xuICAgICRlbGVtZW50Lm9mZigna2V5ZG93bi56Zi50cmFwZm9jdXMnKTtcbiAgfVxufVxuXG4vKlxuICogQ29uc3RhbnRzIGZvciBlYXNpZXIgY29tcGFyaW5nLlxuICogQ2FuIGJlIHVzZWQgbGlrZSBGb3VuZGF0aW9uLnBhcnNlS2V5KGV2ZW50KSA9PT0gRm91bmRhdGlvbi5rZXlzLlNQQUNFXG4gKi9cbmZ1bmN0aW9uIGdldEtleUNvZGVzKGtjcykge1xuICB2YXIgayA9IHt9O1xuICBmb3IgKHZhciBrYyBpbiBrY3MpIGtba2NzW2tjXV0gPSBrY3Nba2NdO1xuICByZXR1cm4gaztcbn1cblxuRm91bmRhdGlvbi5LZXlib2FyZCA9IEtleWJvYXJkO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8vIERlZmF1bHQgc2V0IG9mIG1lZGlhIHF1ZXJpZXNcbmNvbnN0IGRlZmF1bHRRdWVyaWVzID0ge1xuICAnZGVmYXVsdCcgOiAnb25seSBzY3JlZW4nLFxuICBsYW5kc2NhcGUgOiAnb25seSBzY3JlZW4gYW5kIChvcmllbnRhdGlvbjogbGFuZHNjYXBlKScsXG4gIHBvcnRyYWl0IDogJ29ubHkgc2NyZWVuIGFuZCAob3JpZW50YXRpb246IHBvcnRyYWl0KScsXG4gIHJldGluYSA6ICdvbmx5IHNjcmVlbiBhbmQgKC13ZWJraXQtbWluLWRldmljZS1waXhlbC1yYXRpbzogMiksJyArXG4gICAgJ29ubHkgc2NyZWVuIGFuZCAobWluLS1tb3otZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwnICtcbiAgICAnb25seSBzY3JlZW4gYW5kICgtby1taW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyLzEpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAxOTJkcGkpLCcgK1xuICAgICdvbmx5IHNjcmVlbiBhbmQgKG1pbi1yZXNvbHV0aW9uOiAyZHBweCknXG59O1xuXG52YXIgTWVkaWFRdWVyeSA9IHtcbiAgcXVlcmllczogW10sXG5cbiAgY3VycmVudDogJycsXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBtZWRpYSBxdWVyeSBoZWxwZXIsIGJ5IGV4dHJhY3RpbmcgdGhlIGJyZWFrcG9pbnQgbGlzdCBmcm9tIHRoZSBDU1MgYW5kIGFjdGl2YXRpbmcgdGhlIGJyZWFrcG9pbnQgd2F0Y2hlci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGV4dHJhY3RlZFN0eWxlcyA9ICQoJy5mb3VuZGF0aW9uLW1xJykuY3NzKCdmb250LWZhbWlseScpO1xuICAgIHZhciBuYW1lZFF1ZXJpZXM7XG5cbiAgICBuYW1lZFF1ZXJpZXMgPSBwYXJzZVN0eWxlVG9PYmplY3QoZXh0cmFjdGVkU3R5bGVzKTtcblxuICAgIGZvciAodmFyIGtleSBpbiBuYW1lZFF1ZXJpZXMpIHtcbiAgICAgIGlmKG5hbWVkUXVlcmllcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIHNlbGYucXVlcmllcy5wdXNoKHtcbiAgICAgICAgICBuYW1lOiBrZXksXG4gICAgICAgICAgdmFsdWU6IGBvbmx5IHNjcmVlbiBhbmQgKG1pbi13aWR0aDogJHtuYW1lZFF1ZXJpZXNba2V5XX0pYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnQgPSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpO1xuXG4gICAgdGhpcy5fd2F0Y2hlcigpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIHNjcmVlbiBpcyBhdCBsZWFzdCBhcyB3aWRlIGFzIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBjaGVjay5cbiAgICogQHJldHVybnMge0Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgYnJlYWtwb2ludCBtYXRjaGVzLCBgZmFsc2VgIGlmIGl0J3Mgc21hbGxlci5cbiAgICovXG4gIGF0TGVhc3Qoc2l6ZSkge1xuICAgIHZhciBxdWVyeSA9IHRoaXMuZ2V0KHNpemUpO1xuXG4gICAgaWYgKHF1ZXJ5KSB7XG4gICAgICByZXR1cm4gd2luZG93Lm1hdGNoTWVkaWEocXVlcnkpLm1hdGNoZXM7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIHNjcmVlbiBtYXRjaGVzIHRvIGEgYnJlYWtwb2ludC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBzaXplIC0gTmFtZSBvZiB0aGUgYnJlYWtwb2ludCB0byBjaGVjaywgZWl0aGVyICdzbWFsbCBvbmx5JyBvciAnc21hbGwnLiBPbWl0dGluZyAnb25seScgZmFsbHMgYmFjayB0byB1c2luZyBhdExlYXN0KCkgbWV0aG9kLlxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gYHRydWVgIGlmIHRoZSBicmVha3BvaW50IG1hdGNoZXMsIGBmYWxzZWAgaWYgaXQgZG9lcyBub3QuXG4gICAqL1xuICBpcyhzaXplKSB7XG4gICAgc2l6ZSA9IHNpemUudHJpbSgpLnNwbGl0KCcgJyk7XG4gICAgaWYoc2l6ZS5sZW5ndGggPiAxICYmIHNpemVbMV0gPT09ICdvbmx5Jykge1xuICAgICAgaWYoc2l6ZVswXSA9PT0gdGhpcy5fZ2V0Q3VycmVudFNpemUoKSkgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmF0TGVhc3Qoc2l6ZVswXSk7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuICAvKipcbiAgICogR2V0cyB0aGUgbWVkaWEgcXVlcnkgb2YgYSBicmVha3BvaW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHNpemUgLSBOYW1lIG9mIHRoZSBicmVha3BvaW50IHRvIGdldC5cbiAgICogQHJldHVybnMge1N0cmluZ3xudWxsfSAtIFRoZSBtZWRpYSBxdWVyeSBvZiB0aGUgYnJlYWtwb2ludCwgb3IgYG51bGxgIGlmIHRoZSBicmVha3BvaW50IGRvZXNuJ3QgZXhpc3QuXG4gICAqL1xuICBnZXQoc2l6ZSkge1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5xdWVyaWVzKSB7XG4gICAgICBpZih0aGlzLnF1ZXJpZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW2ldO1xuICAgICAgICBpZiAoc2l6ZSA9PT0gcXVlcnkubmFtZSkgcmV0dXJuIHF1ZXJ5LnZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9LFxuXG4gIC8qKlxuICAgKiBHZXRzIHRoZSBjdXJyZW50IGJyZWFrcG9pbnQgbmFtZSBieSB0ZXN0aW5nIGV2ZXJ5IGJyZWFrcG9pbnQgYW5kIHJldHVybmluZyB0aGUgbGFzdCBvbmUgdG8gbWF0Y2ggKHRoZSBiaWdnZXN0IG9uZSkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcmV0dXJucyB7U3RyaW5nfSBOYW1lIG9mIHRoZSBjdXJyZW50IGJyZWFrcG9pbnQuXG4gICAqL1xuICBfZ2V0Q3VycmVudFNpemUoKSB7XG4gICAgdmFyIG1hdGNoZWQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMucXVlcmllcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHF1ZXJ5ID0gdGhpcy5xdWVyaWVzW2ldO1xuXG4gICAgICBpZiAod2luZG93Lm1hdGNoTWVkaWEocXVlcnkudmFsdWUpLm1hdGNoZXMpIHtcbiAgICAgICAgbWF0Y2hlZCA9IHF1ZXJ5O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgbWF0Y2hlZCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBtYXRjaGVkLm5hbWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBtYXRjaGVkO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQWN0aXZhdGVzIHRoZSBicmVha3BvaW50IHdhdGNoZXIsIHdoaWNoIGZpcmVzIGFuIGV2ZW50IG9uIHRoZSB3aW5kb3cgd2hlbmV2ZXIgdGhlIGJyZWFrcG9pbnQgY2hhbmdlcy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfd2F0Y2hlcigpIHtcbiAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5tZWRpYXF1ZXJ5JywgKCkgPT4ge1xuICAgICAgdmFyIG5ld1NpemUgPSB0aGlzLl9nZXRDdXJyZW50U2l6ZSgpLCBjdXJyZW50U2l6ZSA9IHRoaXMuY3VycmVudDtcblxuICAgICAgaWYgKG5ld1NpemUgIT09IGN1cnJlbnRTaXplKSB7XG4gICAgICAgIC8vIENoYW5nZSB0aGUgY3VycmVudCBtZWRpYSBxdWVyeVxuICAgICAgICB0aGlzLmN1cnJlbnQgPSBuZXdTaXplO1xuXG4gICAgICAgIC8vIEJyb2FkY2FzdCB0aGUgbWVkaWEgcXVlcnkgY2hhbmdlIG9uIHRoZSB3aW5kb3dcbiAgICAgICAgJCh3aW5kb3cpLnRyaWdnZXIoJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIFtuZXdTaXplLCBjdXJyZW50U2l6ZV0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG5Gb3VuZGF0aW9uLk1lZGlhUXVlcnkgPSBNZWRpYVF1ZXJ5O1xuXG4vLyBtYXRjaE1lZGlhKCkgcG9seWZpbGwgLSBUZXN0IGEgQ1NTIG1lZGlhIHR5cGUvcXVlcnkgaW4gSlMuXG4vLyBBdXRob3JzICYgY29weXJpZ2h0IChjKSAyMDEyOiBTY290dCBKZWhsLCBQYXVsIElyaXNoLCBOaWNob2xhcyBaYWthcywgRGF2aWQgS25pZ2h0LiBEdWFsIE1JVC9CU0QgbGljZW5zZVxud2luZG93Lm1hdGNoTWVkaWEgfHwgKHdpbmRvdy5tYXRjaE1lZGlhID0gZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBGb3IgYnJvd3NlcnMgdGhhdCBzdXBwb3J0IG1hdGNoTWVkaXVtIGFwaSBzdWNoIGFzIElFIDkgYW5kIHdlYmtpdFxuICB2YXIgc3R5bGVNZWRpYSA9ICh3aW5kb3cuc3R5bGVNZWRpYSB8fCB3aW5kb3cubWVkaWEpO1xuXG4gIC8vIEZvciB0aG9zZSB0aGF0IGRvbid0IHN1cHBvcnQgbWF0Y2hNZWRpdW1cbiAgaWYgKCFzdHlsZU1lZGlhKSB7XG4gICAgdmFyIHN0eWxlICAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpLFxuICAgIHNjcmlwdCAgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpWzBdLFxuICAgIGluZm8gICAgICAgID0gbnVsbDtcblxuICAgIHN0eWxlLnR5cGUgID0gJ3RleHQvY3NzJztcbiAgICBzdHlsZS5pZCAgICA9ICdtYXRjaG1lZGlhanMtdGVzdCc7XG5cbiAgICBzY3JpcHQgJiYgc2NyaXB0LnBhcmVudE5vZGUgJiYgc2NyaXB0LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHN0eWxlLCBzY3JpcHQpO1xuXG4gICAgLy8gJ3N0eWxlLmN1cnJlbnRTdHlsZScgaXMgdXNlZCBieSBJRSA8PSA4IGFuZCAnd2luZG93LmdldENvbXB1dGVkU3R5bGUnIGZvciBhbGwgb3RoZXIgYnJvd3NlcnNcbiAgICBpbmZvID0gKCdnZXRDb21wdXRlZFN0eWxlJyBpbiB3aW5kb3cpICYmIHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHN0eWxlLCBudWxsKSB8fCBzdHlsZS5jdXJyZW50U3R5bGU7XG5cbiAgICBzdHlsZU1lZGlhID0ge1xuICAgICAgbWF0Y2hNZWRpdW0obWVkaWEpIHtcbiAgICAgICAgdmFyIHRleHQgPSBgQG1lZGlhICR7bWVkaWF9eyAjbWF0Y2htZWRpYWpzLXRlc3QgeyB3aWR0aDogMXB4OyB9IH1gO1xuXG4gICAgICAgIC8vICdzdHlsZS5zdHlsZVNoZWV0JyBpcyB1c2VkIGJ5IElFIDw9IDggYW5kICdzdHlsZS50ZXh0Q29udGVudCcgZm9yIGFsbCBvdGhlciBicm93c2Vyc1xuICAgICAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IHRleHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3R5bGUudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVGVzdCBpZiBtZWRpYSBxdWVyeSBpcyB0cnVlIG9yIGZhbHNlXG4gICAgICAgIHJldHVybiBpbmZvLndpZHRoID09PSAnMXB4JztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24obWVkaWEpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWF0Y2hlczogc3R5bGVNZWRpYS5tYXRjaE1lZGl1bShtZWRpYSB8fCAnYWxsJyksXG4gICAgICBtZWRpYTogbWVkaWEgfHwgJ2FsbCdcbiAgICB9O1xuICB9XG59KCkpO1xuXG4vLyBUaGFuayB5b3U6IGh0dHBzOi8vZ2l0aHViLmNvbS9zaW5kcmVzb3JodXMvcXVlcnktc3RyaW5nXG5mdW5jdGlvbiBwYXJzZVN0eWxlVG9PYmplY3Qoc3RyKSB7XG4gIHZhciBzdHlsZU9iamVjdCA9IHt9O1xuXG4gIGlmICh0eXBlb2Ygc3RyICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBzdHlsZU9iamVjdDtcbiAgfVxuXG4gIHN0ciA9IHN0ci50cmltKCkuc2xpY2UoMSwgLTEpOyAvLyBicm93c2VycyByZS1xdW90ZSBzdHJpbmcgc3R5bGUgdmFsdWVzXG5cbiAgaWYgKCFzdHIpIHtcbiAgICByZXR1cm4gc3R5bGVPYmplY3Q7XG4gIH1cblxuICBzdHlsZU9iamVjdCA9IHN0ci5zcGxpdCgnJicpLnJlZHVjZShmdW5jdGlvbihyZXQsIHBhcmFtKSB7XG4gICAgdmFyIHBhcnRzID0gcGFyYW0ucmVwbGFjZSgvXFwrL2csICcgJykuc3BsaXQoJz0nKTtcbiAgICB2YXIga2V5ID0gcGFydHNbMF07XG4gICAgdmFyIHZhbCA9IHBhcnRzWzFdO1xuICAgIGtleSA9IGRlY29kZVVSSUNvbXBvbmVudChrZXkpO1xuXG4gICAgLy8gbWlzc2luZyBgPWAgc2hvdWxkIGJlIGBudWxsYDpcbiAgICAvLyBodHRwOi8vdzMub3JnL1RSLzIwMTIvV0QtdXJsLTIwMTIwNTI0LyNjb2xsZWN0LXVybC1wYXJhbWV0ZXJzXG4gICAgdmFsID0gdmFsID09PSB1bmRlZmluZWQgPyBudWxsIDogZGVjb2RlVVJJQ29tcG9uZW50KHZhbCk7XG5cbiAgICBpZiAoIXJldC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICByZXRba2V5XSA9IHZhbDtcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmV0W2tleV0pKSB7XG4gICAgICByZXRba2V5XS5wdXNoKHZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldFtrZXldID0gW3JldFtrZXldLCB2YWxdO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9LCB7fSk7XG5cbiAgcmV0dXJuIHN0eWxlT2JqZWN0O1xufVxuXG5Gb3VuZGF0aW9uLk1lZGlhUXVlcnkgPSBNZWRpYVF1ZXJ5O1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogTW90aW9uIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5tb3Rpb25cbiAqL1xuXG5jb25zdCBpbml0Q2xhc3NlcyAgID0gWydtdWktZW50ZXInLCAnbXVpLWxlYXZlJ107XG5jb25zdCBhY3RpdmVDbGFzc2VzID0gWydtdWktZW50ZXItYWN0aXZlJywgJ211aS1sZWF2ZS1hY3RpdmUnXTtcblxuY29uc3QgTW90aW9uID0ge1xuICBhbmltYXRlSW46IGZ1bmN0aW9uKGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgICBhbmltYXRlKHRydWUsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9LFxuXG4gIGFuaW1hdGVPdXQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgICBhbmltYXRlKGZhbHNlLCBlbGVtZW50LCBhbmltYXRpb24sIGNiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBNb3ZlKGR1cmF0aW9uLCBlbGVtLCBmbil7XG4gIHZhciBhbmltLCBwcm9nLCBzdGFydCA9IG51bGw7XG4gIC8vIGNvbnNvbGUubG9nKCdjYWxsZWQnKTtcblxuICBpZiAoZHVyYXRpb24gPT09IDApIHtcbiAgICBmbi5hcHBseShlbGVtKTtcbiAgICBlbGVtLnRyaWdnZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pLnRyaWdnZXJIYW5kbGVyKCdmaW5pc2hlZC56Zi5hbmltYXRlJywgW2VsZW1dKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBmdW5jdGlvbiBtb3ZlKHRzKXtcbiAgICBpZighc3RhcnQpIHN0YXJ0ID0gdHM7XG4gICAgLy8gY29uc29sZS5sb2coc3RhcnQsIHRzKTtcbiAgICBwcm9nID0gdHMgLSBzdGFydDtcbiAgICBmbi5hcHBseShlbGVtKTtcblxuICAgIGlmKHByb2cgPCBkdXJhdGlvbil7IGFuaW0gPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKG1vdmUsIGVsZW0pOyB9XG4gICAgZWxzZXtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShhbmltKTtcbiAgICAgIGVsZW0udHJpZ2dlcignZmluaXNoZWQuemYuYW5pbWF0ZScsIFtlbGVtXSkudHJpZ2dlckhhbmRsZXIoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBbZWxlbV0pO1xuICAgIH1cbiAgfVxuICBhbmltID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShtb3ZlKTtcbn1cblxuLyoqXG4gKiBBbmltYXRlcyBhbiBlbGVtZW50IGluIG9yIG91dCB1c2luZyBhIENTUyB0cmFuc2l0aW9uIGNsYXNzLlxuICogQGZ1bmN0aW9uXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtCb29sZWFufSBpc0luIC0gRGVmaW5lcyBpZiB0aGUgYW5pbWF0aW9uIGlzIGluIG9yIG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9yIEhUTUwgb2JqZWN0IHRvIGFuaW1hdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gYW5pbWF0aW9uIC0gQ1NTIGNsYXNzIHRvIHVzZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQ2FsbGJhY2sgdG8gcnVuIHdoZW4gYW5pbWF0aW9uIGlzIGZpbmlzaGVkLlxuICovXG5mdW5jdGlvbiBhbmltYXRlKGlzSW4sIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCk7XG5cbiAgaWYgKCFlbGVtZW50Lmxlbmd0aCkgcmV0dXJuO1xuXG4gIHZhciBpbml0Q2xhc3MgPSBpc0luID8gaW5pdENsYXNzZXNbMF0gOiBpbml0Q2xhc3Nlc1sxXTtcbiAgdmFyIGFjdGl2ZUNsYXNzID0gaXNJbiA/IGFjdGl2ZUNsYXNzZXNbMF0gOiBhY3RpdmVDbGFzc2VzWzFdO1xuXG4gIC8vIFNldCB1cCB0aGUgYW5pbWF0aW9uXG4gIHJlc2V0KCk7XG5cbiAgZWxlbWVudFxuICAgIC5hZGRDbGFzcyhhbmltYXRpb24pXG4gICAgLmNzcygndHJhbnNpdGlvbicsICdub25lJyk7XG5cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBlbGVtZW50LmFkZENsYXNzKGluaXRDbGFzcyk7XG4gICAgaWYgKGlzSW4pIGVsZW1lbnQuc2hvdygpO1xuICB9KTtcblxuICAvLyBTdGFydCB0aGUgYW5pbWF0aW9uXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgZWxlbWVudFswXS5vZmZzZXRXaWR0aDtcbiAgICBlbGVtZW50XG4gICAgICAuY3NzKCd0cmFuc2l0aW9uJywgJycpXG4gICAgICAuYWRkQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICB9KTtcblxuICAvLyBDbGVhbiB1cCB0aGUgYW5pbWF0aW9uIHdoZW4gaXQgZmluaXNoZXNcbiAgZWxlbWVudC5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKGVsZW1lbnQpLCBmaW5pc2gpO1xuXG4gIC8vIEhpZGVzIHRoZSBlbGVtZW50IChmb3Igb3V0IGFuaW1hdGlvbnMpLCByZXNldHMgdGhlIGVsZW1lbnQsIGFuZCBydW5zIGEgY2FsbGJhY2tcbiAgZnVuY3Rpb24gZmluaXNoKCkge1xuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XG4gICAgcmVzZXQoKTtcbiAgICBpZiAoY2IpIGNiLmFwcGx5KGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gUmVzZXRzIHRyYW5zaXRpb25zIGFuZCByZW1vdmVzIG1vdGlvbi1zcGVjaWZpYyBjbGFzc2VzXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGVsZW1lbnRbMF0uc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gMDtcbiAgICBlbGVtZW50LnJlbW92ZUNsYXNzKGAke2luaXRDbGFzc30gJHthY3RpdmVDbGFzc30gJHthbmltYXRpb259YCk7XG4gIH1cbn1cblxuRm91bmRhdGlvbi5Nb3ZlID0gTW92ZTtcbkZvdW5kYXRpb24uTW90aW9uID0gTW90aW9uO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbmNvbnN0IE5lc3QgPSB7XG4gIEZlYXRoZXIobWVudSwgdHlwZSA9ICd6ZicpIHtcbiAgICBtZW51LmF0dHIoJ3JvbGUnLCAnbWVudWJhcicpO1xuXG4gICAgdmFyIGl0ZW1zID0gbWVudS5maW5kKCdsaScpLmF0dHIoeydyb2xlJzogJ21lbnVpdGVtJ30pLFxuICAgICAgICBzdWJNZW51Q2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51YCxcbiAgICAgICAgc3ViSXRlbUNsYXNzID0gYCR7c3ViTWVudUNsYXNzfS1pdGVtYCxcbiAgICAgICAgaGFzU3ViQ2xhc3MgPSBgaXMtJHt0eXBlfS1zdWJtZW51LXBhcmVudGA7XG5cbiAgICBpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyICRpdGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkc3ViID0gJGl0ZW0uY2hpbGRyZW4oJ3VsJyk7XG5cbiAgICAgIGlmICgkc3ViLmxlbmd0aCkge1xuICAgICAgICAkaXRlbVxuICAgICAgICAgIC5hZGRDbGFzcyhoYXNTdWJDbGFzcylcbiAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnYXJpYS1oYXNwb3B1cCc6IHRydWUsXG4gICAgICAgICAgICAnYXJpYS1sYWJlbCc6ICRpdGVtLmNoaWxkcmVuKCdhOmZpcnN0JykudGV4dCgpXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgLy8gTm90ZTogIERyaWxsZG93bnMgYmVoYXZlIGRpZmZlcmVudGx5IGluIGhvdyB0aGV5IGhpZGUsIGFuZCBzbyBuZWVkXG4gICAgICAgICAgLy8gYWRkaXRpb25hbCBhdHRyaWJ1dGVzLiAgV2Ugc2hvdWxkIGxvb2sgaWYgdGhpcyBwb3NzaWJseSBvdmVyLWdlbmVyYWxpemVkXG4gICAgICAgICAgLy8gdXRpbGl0eSAoTmVzdCkgaXMgYXBwcm9wcmlhdGUgd2hlbiB3ZSByZXdvcmsgbWVudXMgaW4gNi40XG4gICAgICAgICAgaWYodHlwZSA9PT0gJ2RyaWxsZG93bicpIHtcbiAgICAgICAgICAgICRpdGVtLmF0dHIoeydhcmlhLWV4cGFuZGVkJzogZmFsc2V9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgJHN1YlxuICAgICAgICAgIC5hZGRDbGFzcyhgc3VibWVudSAke3N1Yk1lbnVDbGFzc31gKVxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdkYXRhLXN1Ym1lbnUnOiAnJyxcbiAgICAgICAgICAgICdyb2xlJzogJ21lbnUnXG4gICAgICAgICAgfSk7XG4gICAgICAgIGlmKHR5cGUgPT09ICdkcmlsbGRvd24nKSB7XG4gICAgICAgICAgJHN1Yi5hdHRyKHsnYXJpYS1oaWRkZW4nOiB0cnVlfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCRpdGVtLnBhcmVudCgnW2RhdGEtc3VibWVudV0nKS5sZW5ndGgpIHtcbiAgICAgICAgJGl0ZW0uYWRkQ2xhc3MoYGlzLXN1Ym1lbnUtaXRlbSAke3N1Ykl0ZW1DbGFzc31gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybjtcbiAgfSxcblxuICBCdXJuKG1lbnUsIHR5cGUpIHtcbiAgICB2YXIgLy9pdGVtcyA9IG1lbnUuZmluZCgnbGknKSxcbiAgICAgICAgc3ViTWVudUNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudWAsXG4gICAgICAgIHN1Ykl0ZW1DbGFzcyA9IGAke3N1Yk1lbnVDbGFzc30taXRlbWAsXG4gICAgICAgIGhhc1N1YkNsYXNzID0gYGlzLSR7dHlwZX0tc3VibWVudS1wYXJlbnRgO1xuXG4gICAgbWVudVxuICAgICAgLmZpbmQoJz5saSwgLm1lbnUsIC5tZW51ID4gbGknKVxuICAgICAgLnJlbW92ZUNsYXNzKGAke3N1Yk1lbnVDbGFzc30gJHtzdWJJdGVtQ2xhc3N9ICR7aGFzU3ViQ2xhc3N9IGlzLXN1Ym1lbnUtaXRlbSBzdWJtZW51IGlzLWFjdGl2ZWApXG4gICAgICAucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51JykuY3NzKCdkaXNwbGF5JywgJycpO1xuXG4gICAgLy8gY29uc29sZS5sb2coICAgICAgbWVudS5maW5kKCcuJyArIHN1Yk1lbnVDbGFzcyArICcsIC4nICsgc3ViSXRlbUNsYXNzICsgJywgLmhhcy1zdWJtZW51LCAuaXMtc3VibWVudS1pdGVtLCAuc3VibWVudSwgW2RhdGEtc3VibWVudV0nKVxuICAgIC8vICAgICAgICAgICAucmVtb3ZlQ2xhc3Moc3ViTWVudUNsYXNzICsgJyAnICsgc3ViSXRlbUNsYXNzICsgJyBoYXMtc3VibWVudSBpcy1zdWJtZW51LWl0ZW0gc3VibWVudScpXG4gICAgLy8gICAgICAgICAgIC5yZW1vdmVBdHRyKCdkYXRhLXN1Ym1lbnUnKSk7XG4gICAgLy8gaXRlbXMuZWFjaChmdW5jdGlvbigpe1xuICAgIC8vICAgdmFyICRpdGVtID0gJCh0aGlzKSxcbiAgICAvLyAgICAgICAkc3ViID0gJGl0ZW0uY2hpbGRyZW4oJ3VsJyk7XG4gICAgLy8gICBpZigkaXRlbS5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKXtcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2lzLXN1Ym1lbnUtaXRlbSAnICsgc3ViSXRlbUNsYXNzKTtcbiAgICAvLyAgIH1cbiAgICAvLyAgIGlmKCRzdWIubGVuZ3RoKXtcbiAgICAvLyAgICAgJGl0ZW0ucmVtb3ZlQ2xhc3MoJ2hhcy1zdWJtZW51Jyk7XG4gICAgLy8gICAgICRzdWIucmVtb3ZlQ2xhc3MoJ3N1Ym1lbnUgJyArIHN1Yk1lbnVDbGFzcykucmVtb3ZlQXR0cignZGF0YS1zdWJtZW51Jyk7XG4gICAgLy8gICB9XG4gICAgLy8gfSk7XG4gIH1cbn1cblxuRm91bmRhdGlvbi5OZXN0ID0gTmVzdDtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG5mdW5jdGlvbiBUaW1lcihlbGVtLCBvcHRpb25zLCBjYikge1xuICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgZHVyYXRpb24gPSBvcHRpb25zLmR1cmF0aW9uLC8vb3B0aW9ucyBpcyBhbiBvYmplY3QgZm9yIGVhc2lseSBhZGRpbmcgZmVhdHVyZXMgbGF0ZXIuXG4gICAgICBuYW1lU3BhY2UgPSBPYmplY3Qua2V5cyhlbGVtLmRhdGEoKSlbMF0gfHwgJ3RpbWVyJyxcbiAgICAgIHJlbWFpbiA9IC0xLFxuICAgICAgc3RhcnQsXG4gICAgICB0aW1lcjtcblxuICB0aGlzLmlzUGF1c2VkID0gZmFsc2U7XG5cbiAgdGhpcy5yZXN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgcmVtYWluID0gLTE7XG4gICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICB0aGlzLnN0YXJ0KCk7XG4gIH1cblxuICB0aGlzLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc1BhdXNlZCA9IGZhbHNlO1xuICAgIC8vIGlmKCFlbGVtLmRhdGEoJ3BhdXNlZCcpKXsgcmV0dXJuIGZhbHNlOyB9Ly9tYXliZSBpbXBsZW1lbnQgdGhpcyBzYW5pdHkgY2hlY2sgaWYgdXNlZCBmb3Igb3RoZXIgdGhpbmdzLlxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgcmVtYWluID0gcmVtYWluIDw9IDAgPyBkdXJhdGlvbiA6IHJlbWFpbjtcbiAgICBlbGVtLmRhdGEoJ3BhdXNlZCcsIGZhbHNlKTtcbiAgICBzdGFydCA9IERhdGUubm93KCk7XG4gICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBpZihvcHRpb25zLmluZmluaXRlKXtcbiAgICAgICAgX3RoaXMucmVzdGFydCgpOy8vcmVydW4gdGhlIHRpbWVyLlxuICAgICAgfVxuICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9XG4gICAgfSwgcmVtYWluKTtcbiAgICBlbGVtLnRyaWdnZXIoYHRpbWVyc3RhcnQuemYuJHtuYW1lU3BhY2V9YCk7XG4gIH1cblxuICB0aGlzLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5pc1BhdXNlZCA9IHRydWU7XG4gICAgLy9pZihlbGVtLmRhdGEoJ3BhdXNlZCcpKXsgcmV0dXJuIGZhbHNlOyB9Ly9tYXliZSBpbXBsZW1lbnQgdGhpcyBzYW5pdHkgY2hlY2sgaWYgdXNlZCBmb3Igb3RoZXIgdGhpbmdzLlxuICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgZWxlbS5kYXRhKCdwYXVzZWQnLCB0cnVlKTtcbiAgICB2YXIgZW5kID0gRGF0ZS5ub3coKTtcbiAgICByZW1haW4gPSByZW1haW4gLSAoZW5kIC0gc3RhcnQpO1xuICAgIGVsZW0udHJpZ2dlcihgdGltZXJwYXVzZWQuemYuJHtuYW1lU3BhY2V9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSdW5zIGEgY2FsbGJhY2sgZnVuY3Rpb24gd2hlbiBpbWFnZXMgYXJlIGZ1bGx5IGxvYWRlZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBpbWFnZXMgLSBJbWFnZShzKSB0byBjaGVjayBpZiBsb2FkZWQuXG4gKiBAcGFyYW0ge0Z1bmN9IGNhbGxiYWNrIC0gRnVuY3Rpb24gdG8gZXhlY3V0ZSB3aGVuIGltYWdlIGlzIGZ1bGx5IGxvYWRlZC5cbiAqL1xuZnVuY3Rpb24gb25JbWFnZXNMb2FkZWQoaW1hZ2VzLCBjYWxsYmFjayl7XG4gIHZhciBzZWxmID0gdGhpcyxcbiAgICAgIHVubG9hZGVkID0gaW1hZ2VzLmxlbmd0aDtcblxuICBpZiAodW5sb2FkZWQgPT09IDApIHtcbiAgICBjYWxsYmFjaygpO1xuICB9XG5cbiAgaW1hZ2VzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgLy8gQ2hlY2sgaWYgaW1hZ2UgaXMgbG9hZGVkXG4gICAgaWYgKHRoaXMuY29tcGxldGUgfHwgKHRoaXMucmVhZHlTdGF0ZSA9PT0gNCkgfHwgKHRoaXMucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJykpIHtcbiAgICAgIHNpbmdsZUltYWdlTG9hZGVkKCk7XG4gICAgfVxuICAgIC8vIEZvcmNlIGxvYWQgdGhlIGltYWdlXG4gICAgZWxzZSB7XG4gICAgICAvLyBmaXggZm9yIElFLiBTZWUgaHR0cHM6Ly9jc3MtdHJpY2tzLmNvbS9zbmlwcGV0cy9qcXVlcnkvZml4aW5nLWxvYWQtaW4taWUtZm9yLWNhY2hlZC1pbWFnZXMvXG4gICAgICB2YXIgc3JjID0gJCh0aGlzKS5hdHRyKCdzcmMnKTtcbiAgICAgICQodGhpcykuYXR0cignc3JjJywgc3JjICsgJz8nICsgKG5ldyBEYXRlKCkuZ2V0VGltZSgpKSk7XG4gICAgICAkKHRoaXMpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzaW5nbGVJbWFnZUxvYWRlZCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBzaW5nbGVJbWFnZUxvYWRlZCgpIHtcbiAgICB1bmxvYWRlZC0tO1xuICAgIGlmICh1bmxvYWRlZCA9PT0gMCkge1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cbn1cblxuRm91bmRhdGlvbi5UaW1lciA9IFRpbWVyO1xuRm91bmRhdGlvbi5vbkltYWdlc0xvYWRlZCA9IG9uSW1hZ2VzTG9hZGVkO1xuXG59KGpRdWVyeSk7XG4iLCIvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqV29yayBpbnNwaXJlZCBieSBtdWx0aXBsZSBqcXVlcnkgc3dpcGUgcGx1Z2lucyoqXG4vLyoqRG9uZSBieSBZb2hhaSBBcmFyYXQgKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4vLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4oZnVuY3Rpb24oJCkge1xuXG4gICQuc3BvdFN3aXBlID0ge1xuICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgZW5hYmxlZDogJ29udG91Y2hzdGFydCcgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LFxuICAgIHByZXZlbnREZWZhdWx0OiBmYWxzZSxcbiAgICBtb3ZlVGhyZXNob2xkOiA3NSxcbiAgICB0aW1lVGhyZXNob2xkOiAyMDBcbiAgfTtcblxuICB2YXIgICBzdGFydFBvc1gsXG4gICAgICAgIHN0YXJ0UG9zWSxcbiAgICAgICAgc3RhcnRUaW1lLFxuICAgICAgICBlbGFwc2VkVGltZSxcbiAgICAgICAgaXNNb3ZpbmcgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBvblRvdWNoRW5kKCkge1xuICAgIC8vICBhbGVydCh0aGlzKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIG9uVG91Y2hNb3ZlKTtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgb25Ub3VjaEVuZCk7XG4gICAgaXNNb3ZpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uVG91Y2hNb3ZlKGUpIHtcbiAgICBpZiAoJC5zcG90U3dpcGUucHJldmVudERlZmF1bHQpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG4gICAgaWYoaXNNb3ZpbmcpIHtcbiAgICAgIHZhciB4ID0gZS50b3VjaGVzWzBdLnBhZ2VYO1xuICAgICAgdmFyIHkgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICB2YXIgZHggPSBzdGFydFBvc1ggLSB4O1xuICAgICAgdmFyIGR5ID0gc3RhcnRQb3NZIC0geTtcbiAgICAgIHZhciBkaXI7XG4gICAgICBlbGFwc2VkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnRUaW1lO1xuICAgICAgaWYoTWF0aC5hYnMoZHgpID49ICQuc3BvdFN3aXBlLm1vdmVUaHJlc2hvbGQgJiYgZWxhcHNlZFRpbWUgPD0gJC5zcG90U3dpcGUudGltZVRocmVzaG9sZCkge1xuICAgICAgICBkaXIgPSBkeCA+IDAgPyAnbGVmdCcgOiAncmlnaHQnO1xuICAgICAgfVxuICAgICAgLy8gZWxzZSBpZihNYXRoLmFicyhkeSkgPj0gJC5zcG90U3dpcGUubW92ZVRocmVzaG9sZCAmJiBlbGFwc2VkVGltZSA8PSAkLnNwb3RTd2lwZS50aW1lVGhyZXNob2xkKSB7XG4gICAgICAvLyAgIGRpciA9IGR5ID4gMCA/ICdkb3duJyA6ICd1cCc7XG4gICAgICAvLyB9XG4gICAgICBpZihkaXIpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBvblRvdWNoRW5kLmNhbGwodGhpcyk7XG4gICAgICAgICQodGhpcykudHJpZ2dlcignc3dpcGUnLCBkaXIpLnRyaWdnZXIoYHN3aXBlJHtkaXJ9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gb25Ub3VjaFN0YXJ0KGUpIHtcbiAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PSAxKSB7XG4gICAgICBzdGFydFBvc1ggPSBlLnRvdWNoZXNbMF0ucGFnZVg7XG4gICAgICBzdGFydFBvc1kgPSBlLnRvdWNoZXNbMF0ucGFnZVk7XG4gICAgICBpc01vdmluZyA9IHRydWU7XG4gICAgICBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgb25Ub3VjaE1vdmUsIGZhbHNlKTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBvblRvdWNoRW5kLCBmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIgJiYgdGhpcy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0Jywgb25Ub3VjaFN0YXJ0LCBmYWxzZSk7XG4gIH1cblxuICBmdW5jdGlvbiB0ZWFyZG93bigpIHtcbiAgICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBvblRvdWNoU3RhcnQpO1xuICB9XG5cbiAgJC5ldmVudC5zcGVjaWFsLnN3aXBlID0geyBzZXR1cDogaW5pdCB9O1xuXG4gICQuZWFjaChbJ2xlZnQnLCAndXAnLCAnZG93bicsICdyaWdodCddLCBmdW5jdGlvbiAoKSB7XG4gICAgJC5ldmVudC5zcGVjaWFsW2Bzd2lwZSR7dGhpc31gXSA9IHsgc2V0dXA6IGZ1bmN0aW9uKCl7XG4gICAgICAkKHRoaXMpLm9uKCdzd2lwZScsICQubm9vcCk7XG4gICAgfSB9O1xuICB9KTtcbn0pKGpRdWVyeSk7XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTWV0aG9kIGZvciBhZGRpbmcgcHN1ZWRvIGRyYWcgZXZlbnRzIHRvIGVsZW1lbnRzICpcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4hZnVuY3Rpb24oJCl7XG4gICQuZm4uYWRkVG91Y2ggPSBmdW5jdGlvbigpe1xuICAgIHRoaXMuZWFjaChmdW5jdGlvbihpLGVsKXtcbiAgICAgICQoZWwpLmJpbmQoJ3RvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsJyxmdW5jdGlvbigpe1xuICAgICAgICAvL3dlIHBhc3MgdGhlIG9yaWdpbmFsIGV2ZW50IG9iamVjdCBiZWNhdXNlIHRoZSBqUXVlcnkgZXZlbnRcbiAgICAgICAgLy9vYmplY3QgaXMgbm9ybWFsaXplZCB0byB3M2Mgc3BlY3MgYW5kIGRvZXMgbm90IHByb3ZpZGUgdGhlIFRvdWNoTGlzdFxuICAgICAgICBoYW5kbGVUb3VjaChldmVudCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHZhciBoYW5kbGVUb3VjaCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgIHZhciB0b3VjaGVzID0gZXZlbnQuY2hhbmdlZFRvdWNoZXMsXG4gICAgICAgICAgZmlyc3QgPSB0b3VjaGVzWzBdLFxuICAgICAgICAgIGV2ZW50VHlwZXMgPSB7XG4gICAgICAgICAgICB0b3VjaHN0YXJ0OiAnbW91c2Vkb3duJyxcbiAgICAgICAgICAgIHRvdWNobW92ZTogJ21vdXNlbW92ZScsXG4gICAgICAgICAgICB0b3VjaGVuZDogJ21vdXNldXAnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0eXBlID0gZXZlbnRUeXBlc1tldmVudC50eXBlXSxcbiAgICAgICAgICBzaW11bGF0ZWRFdmVudFxuICAgICAgICA7XG5cbiAgICAgIGlmKCdNb3VzZUV2ZW50JyBpbiB3aW5kb3cgJiYgdHlwZW9mIHdpbmRvdy5Nb3VzZUV2ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gbmV3IHdpbmRvdy5Nb3VzZUV2ZW50KHR5cGUsIHtcbiAgICAgICAgICAnYnViYmxlcyc6IHRydWUsXG4gICAgICAgICAgJ2NhbmNlbGFibGUnOiB0cnVlLFxuICAgICAgICAgICdzY3JlZW5YJzogZmlyc3Quc2NyZWVuWCxcbiAgICAgICAgICAnc2NyZWVuWSc6IGZpcnN0LnNjcmVlblksXG4gICAgICAgICAgJ2NsaWVudFgnOiBmaXJzdC5jbGllbnRYLFxuICAgICAgICAgICdjbGllbnRZJzogZmlyc3QuY2xpZW50WVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNpbXVsYXRlZEV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ01vdXNlRXZlbnQnKTtcbiAgICAgICAgc2ltdWxhdGVkRXZlbnQuaW5pdE1vdXNlRXZlbnQodHlwZSwgdHJ1ZSwgdHJ1ZSwgd2luZG93LCAxLCBmaXJzdC5zY3JlZW5YLCBmaXJzdC5zY3JlZW5ZLCBmaXJzdC5jbGllbnRYLCBmaXJzdC5jbGllbnRZLCBmYWxzZSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgMC8qbGVmdCovLCBudWxsKTtcbiAgICAgIH1cbiAgICAgIGZpcnN0LnRhcmdldC5kaXNwYXRjaEV2ZW50KHNpbXVsYXRlZEV2ZW50KTtcbiAgICB9O1xuICB9O1xufShqUXVlcnkpO1xuXG5cbi8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuLy8qKkZyb20gdGhlIGpRdWVyeSBNb2JpbGUgTGlicmFyeSoqXG4vLyoqbmVlZCB0byByZWNyZWF0ZSBmdW5jdGlvbmFsaXR5Kipcbi8vKiphbmQgdHJ5IHRvIGltcHJvdmUgaWYgcG9zc2libGUqKlxuLy8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbi8qIFJlbW92aW5nIHRoZSBqUXVlcnkgZnVuY3Rpb24gKioqKlxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbihmdW5jdGlvbiggJCwgd2luZG93LCB1bmRlZmluZWQgKSB7XG5cblx0dmFyICRkb2N1bWVudCA9ICQoIGRvY3VtZW50ICksXG5cdFx0Ly8gc3VwcG9ydFRvdWNoID0gJC5tb2JpbGUuc3VwcG9ydC50b3VjaCxcblx0XHR0b3VjaFN0YXJ0RXZlbnQgPSAndG91Y2hzdGFydCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hzdGFydFwiIDogXCJtb3VzZWRvd25cIixcblx0XHR0b3VjaFN0b3BFdmVudCA9ICd0b3VjaGVuZCcvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2hlbmRcIiA6IFwibW91c2V1cFwiLFxuXHRcdHRvdWNoTW92ZUV2ZW50ID0gJ3RvdWNobW92ZScvL3N1cHBvcnRUb3VjaCA/IFwidG91Y2htb3ZlXCIgOiBcIm1vdXNlbW92ZVwiO1xuXG5cdC8vIHNldHVwIG5ldyBldmVudCBzaG9ydGN1dHNcblx0JC5lYWNoKCAoIFwidG91Y2hzdGFydCB0b3VjaG1vdmUgdG91Y2hlbmQgXCIgK1xuXHRcdFwic3dpcGUgc3dpcGVsZWZ0IHN3aXBlcmlnaHRcIiApLnNwbGl0KCBcIiBcIiApLCBmdW5jdGlvbiggaSwgbmFtZSApIHtcblxuXHRcdCQuZm5bIG5hbWUgXSA9IGZ1bmN0aW9uKCBmbiApIHtcblx0XHRcdHJldHVybiBmbiA/IHRoaXMuYmluZCggbmFtZSwgZm4gKSA6IHRoaXMudHJpZ2dlciggbmFtZSApO1xuXHRcdH07XG5cblx0XHQvLyBqUXVlcnkgPCAxLjhcblx0XHRpZiAoICQuYXR0ckZuICkge1xuXHRcdFx0JC5hdHRyRm5bIG5hbWUgXSA9IHRydWU7XG5cdFx0fVxuXHR9KTtcblxuXHRmdW5jdGlvbiB0cmlnZ2VyQ3VzdG9tRXZlbnQoIG9iaiwgZXZlbnRUeXBlLCBldmVudCwgYnViYmxlICkge1xuXHRcdHZhciBvcmlnaW5hbFR5cGUgPSBldmVudC50eXBlO1xuXHRcdGV2ZW50LnR5cGUgPSBldmVudFR5cGU7XG5cdFx0aWYgKCBidWJibGUgKSB7XG5cdFx0XHQkLmV2ZW50LnRyaWdnZXIoIGV2ZW50LCB1bmRlZmluZWQsIG9iaiApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkLmV2ZW50LmRpc3BhdGNoLmNhbGwoIG9iaiwgZXZlbnQgKTtcblx0XHR9XG5cdFx0ZXZlbnQudHlwZSA9IG9yaWdpbmFsVHlwZTtcblx0fVxuXG5cdC8vIGFsc28gaGFuZGxlcyB0YXBob2xkXG5cblx0Ly8gQWxzbyBoYW5kbGVzIHN3aXBlbGVmdCwgc3dpcGVyaWdodFxuXHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUgPSB7XG5cblx0XHQvLyBNb3JlIHRoYW4gdGhpcyBob3Jpem9udGFsIGRpc3BsYWNlbWVudCwgYW5kIHdlIHdpbGwgc3VwcHJlc3Mgc2Nyb2xsaW5nLlxuXHRcdHNjcm9sbFN1cHJlc3Npb25UaHJlc2hvbGQ6IDMwLFxuXG5cdFx0Ly8gTW9yZSB0aW1lIHRoYW4gdGhpcywgYW5kIGl0IGlzbid0IGEgc3dpcGUuXG5cdFx0ZHVyYXRpb25UaHJlc2hvbGQ6IDEwMDAsXG5cblx0XHQvLyBTd2lwZSBob3Jpem9udGFsIGRpc3BsYWNlbWVudCBtdXN0IGJlIG1vcmUgdGhhbiB0aGlzLlxuXHRcdGhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZDogd2luZG93LmRldmljZVBpeGVsUmF0aW8gPj0gMiA/IDE1IDogMzAsXG5cblx0XHQvLyBTd2lwZSB2ZXJ0aWNhbCBkaXNwbGFjZW1lbnQgbXVzdCBiZSBsZXNzIHRoYW4gdGhpcy5cblx0XHR2ZXJ0aWNhbERpc3RhbmNlVGhyZXNob2xkOiB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyA+PSAyID8gMTUgOiAzMCxcblxuXHRcdGdldExvY2F0aW9uOiBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdFx0dmFyIHdpblBhZ2VYID0gd2luZG93LnBhZ2VYT2Zmc2V0LFxuXHRcdFx0XHR3aW5QYWdlWSA9IHdpbmRvdy5wYWdlWU9mZnNldCxcblx0XHRcdFx0eCA9IGV2ZW50LmNsaWVudFgsXG5cdFx0XHRcdHkgPSBldmVudC5jbGllbnRZO1xuXG5cdFx0XHRpZiAoIGV2ZW50LnBhZ2VZID09PSAwICYmIE1hdGguZmxvb3IoIHkgKSA+IE1hdGguZmxvb3IoIGV2ZW50LnBhZ2VZICkgfHxcblx0XHRcdFx0ZXZlbnQucGFnZVggPT09IDAgJiYgTWF0aC5mbG9vciggeCApID4gTWF0aC5mbG9vciggZXZlbnQucGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBpT1M0IGNsaWVudFgvY2xpZW50WSBoYXZlIHRoZSB2YWx1ZSB0aGF0IHNob3VsZCBoYXZlIGJlZW5cblx0XHRcdFx0Ly8gaW4gcGFnZVgvcGFnZVkuIFdoaWxlIHBhZ2VYL3BhZ2UvIGhhdmUgdGhlIHZhbHVlIDBcblx0XHRcdFx0eCA9IHggLSB3aW5QYWdlWDtcblx0XHRcdFx0eSA9IHkgLSB3aW5QYWdlWTtcblx0XHRcdH0gZWxzZSBpZiAoIHkgPCAoIGV2ZW50LnBhZ2VZIC0gd2luUGFnZVkpIHx8IHggPCAoIGV2ZW50LnBhZ2VYIC0gd2luUGFnZVggKSApIHtcblxuXHRcdFx0XHQvLyBTb21lIEFuZHJvaWQgYnJvd3NlcnMgaGF2ZSB0b3RhbGx5IGJvZ3VzIHZhbHVlcyBmb3IgY2xpZW50WC9ZXG5cdFx0XHRcdC8vIHdoZW4gc2Nyb2xsaW5nL3pvb21pbmcgYSBwYWdlLiBEZXRlY3RhYmxlIHNpbmNlIGNsaWVudFgvY2xpZW50WVxuXHRcdFx0XHQvLyBzaG91bGQgbmV2ZXIgYmUgc21hbGxlciB0aGFuIHBhZ2VYL3BhZ2VZIG1pbnVzIHBhZ2Ugc2Nyb2xsXG5cdFx0XHRcdHggPSBldmVudC5wYWdlWCAtIHdpblBhZ2VYO1xuXHRcdFx0XHR5ID0gZXZlbnQucGFnZVkgLSB3aW5QYWdlWTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0eDogeCxcblx0XHRcdFx0eTogeVxuXHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RhcnQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBkYXRhID0gZXZlbnQub3JpZ2luYWxFdmVudC50b3VjaGVzID9cblx0XHRcdFx0XHRldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXNbIDAgXSA6IGV2ZW50LFxuXHRcdFx0XHRsb2NhdGlvbiA9ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5nZXRMb2NhdGlvbiggZGF0YSApO1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdHRpbWU6ICggbmV3IERhdGUoKSApLmdldFRpbWUoKSxcblx0XHRcdFx0XHRcdGNvb3JkczogWyBsb2NhdGlvbi54LCBsb2NhdGlvbi55IF0sXG5cdFx0XHRcdFx0XHRvcmlnaW46ICQoIGV2ZW50LnRhcmdldCApXG5cdFx0XHRcdFx0fTtcblx0XHR9LFxuXG5cdFx0c3RvcDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGRhdGEgPSBldmVudC5vcmlnaW5hbEV2ZW50LnRvdWNoZXMgP1xuXHRcdFx0XHRcdGV2ZW50Lm9yaWdpbmFsRXZlbnQudG91Y2hlc1sgMCBdIDogZXZlbnQsXG5cdFx0XHRcdGxvY2F0aW9uID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmdldExvY2F0aW9uKCBkYXRhICk7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0dGltZTogKCBuZXcgRGF0ZSgpICkuZ2V0VGltZSgpLFxuXHRcdFx0XHRcdFx0Y29vcmRzOiBbIGxvY2F0aW9uLngsIGxvY2F0aW9uLnkgXVxuXHRcdFx0XHRcdH07XG5cdFx0fSxcblxuXHRcdGhhbmRsZVN3aXBlOiBmdW5jdGlvbiggc3RhcnQsIHN0b3AsIHRoaXNPYmplY3QsIG9yaWdUYXJnZXQgKSB7XG5cdFx0XHRpZiAoIHN0b3AudGltZSAtIHN0YXJ0LnRpbWUgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZHVyYXRpb25UaHJlc2hvbGQgJiZcblx0XHRcdFx0TWF0aC5hYnMoIHN0YXJ0LmNvb3Jkc1sgMCBdIC0gc3RvcC5jb29yZHNbIDAgXSApID4gJC5ldmVudC5zcGVjaWFsLnN3aXBlLmhvcml6b250YWxEaXN0YW5jZVRocmVzaG9sZCAmJlxuXHRcdFx0XHRNYXRoLmFicyggc3RhcnQuY29vcmRzWyAxIF0gLSBzdG9wLmNvb3Jkc1sgMSBdICkgPCAkLmV2ZW50LnNwZWNpYWwuc3dpcGUudmVydGljYWxEaXN0YW5jZVRocmVzaG9sZCApIHtcblx0XHRcdFx0dmFyIGRpcmVjdGlvbiA9IHN0YXJ0LmNvb3Jkc1swXSA+IHN0b3AuY29vcmRzWyAwIF0gPyBcInN3aXBlbGVmdFwiIDogXCJzd2lwZXJpZ2h0XCI7XG5cblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBcInN3aXBlXCIsICQuRXZlbnQoIFwic3dpcGVcIiwgeyB0YXJnZXQ6IG9yaWdUYXJnZXQsIHN3aXBlc3RhcnQ6IHN0YXJ0LCBzd2lwZXN0b3A6IHN0b3AgfSksIHRydWUgKTtcblx0XHRcdFx0dHJpZ2dlckN1c3RvbUV2ZW50KCB0aGlzT2JqZWN0LCBkaXJlY3Rpb24sJC5FdmVudCggZGlyZWN0aW9uLCB7IHRhcmdldDogb3JpZ1RhcmdldCwgc3dpcGVzdGFydDogc3RhcnQsIHN3aXBlc3RvcDogc3RvcCB9ICksIHRydWUgKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHR9LFxuXG5cdFx0Ly8gVGhpcyBzZXJ2ZXMgYXMgYSBmbGFnIHRvIGVuc3VyZSB0aGF0IGF0IG1vc3Qgb25lIHN3aXBlIGV2ZW50IGV2ZW50IGlzXG5cdFx0Ly8gaW4gd29yayBhdCBhbnkgZ2l2ZW4gdGltZVxuXHRcdGV2ZW50SW5Qcm9ncmVzczogZmFsc2UsXG5cblx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZXZlbnRzLFxuXHRcdFx0XHR0aGlzT2JqZWN0ID0gdGhpcyxcblx0XHRcdFx0JHRoaXMgPSAkKCB0aGlzT2JqZWN0ICksXG5cdFx0XHRcdGNvbnRleHQgPSB7fTtcblxuXHRcdFx0Ly8gUmV0cmlldmUgdGhlIGV2ZW50cyBkYXRhIGZvciB0aGlzIGVsZW1lbnQgYW5kIGFkZCB0aGUgc3dpcGUgY29udGV4dFxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCAhZXZlbnRzICkge1xuXHRcdFx0XHRldmVudHMgPSB7IGxlbmd0aDogMCB9O1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsIFwibW9iaWxlLWV2ZW50c1wiLCBldmVudHMgKTtcblx0XHRcdH1cblx0XHRcdGV2ZW50cy5sZW5ndGgrKztcblx0XHRcdGV2ZW50cy5zd2lwZSA9IGNvbnRleHQ7XG5cblx0XHRcdGNvbnRleHQuc3RhcnQgPSBmdW5jdGlvbiggZXZlbnQgKSB7XG5cblx0XHRcdFx0Ly8gQmFpbCBpZiB3ZSdyZSBhbHJlYWR5IHdvcmtpbmcgb24gYSBzd2lwZSBldmVudFxuXHRcdFx0XHRpZiAoICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSB0cnVlO1xuXG5cdFx0XHRcdHZhciBzdG9wLFxuXHRcdFx0XHRcdHN0YXJ0ID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0YXJ0KCBldmVudCApLFxuXHRcdFx0XHRcdG9yaWdUYXJnZXQgPSBldmVudC50YXJnZXQsXG5cdFx0XHRcdFx0ZW1pdHRlZCA9IGZhbHNlO1xuXG5cdFx0XHRcdGNvbnRleHQubW92ZSA9IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRpZiAoICFzdGFydCB8fCBldmVudC5pc0RlZmF1bHRQcmV2ZW50ZWQoKSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzdG9wID0gJC5ldmVudC5zcGVjaWFsLnN3aXBlLnN0b3AoIGV2ZW50ICk7XG5cdFx0XHRcdFx0aWYgKCAhZW1pdHRlZCApIHtcblx0XHRcdFx0XHRcdGVtaXR0ZWQgPSAkLmV2ZW50LnNwZWNpYWwuc3dpcGUuaGFuZGxlU3dpcGUoIHN0YXJ0LCBzdG9wLCB0aGlzT2JqZWN0LCBvcmlnVGFyZ2V0ICk7XG5cdFx0XHRcdFx0XHRpZiAoIGVtaXR0ZWQgKSB7XG5cblx0XHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHRcdCQuZXZlbnQuc3BlY2lhbC5zd2lwZS5ldmVudEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gcHJldmVudCBzY3JvbGxpbmdcblx0XHRcdFx0XHRpZiAoIE1hdGguYWJzKCBzdGFydC5jb29yZHNbIDAgXSAtIHN0b3AuY29vcmRzWyAwIF0gKSA+ICQuZXZlbnQuc3BlY2lhbC5zd2lwZS5zY3JvbGxTdXByZXNzaW9uVGhyZXNob2xkICkge1xuXHRcdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Y29udGV4dC5zdG9wID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRlbWl0dGVkID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0Ly8gUmVzZXQgdGhlIGNvbnRleHQgdG8gbWFrZSB3YXkgZm9yIHRoZSBuZXh0IHN3aXBlIGV2ZW50XG5cdFx0XHRcdFx0XHQkLmV2ZW50LnNwZWNpYWwuc3dpcGUuZXZlbnRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdFx0XHRjb250ZXh0Lm1vdmUgPSBudWxsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRkb2N1bWVudC5vbiggdG91Y2hNb3ZlRXZlbnQsIGNvbnRleHQubW92ZSApXG5cdFx0XHRcdFx0Lm9uZSggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0fTtcblx0XHRcdCR0aGlzLm9uKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHR9LFxuXG5cdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGV2ZW50cywgY29udGV4dDtcblxuXHRcdFx0ZXZlbnRzID0gJC5kYXRhKCB0aGlzLCBcIm1vYmlsZS1ldmVudHNcIiApO1xuXHRcdFx0aWYgKCBldmVudHMgKSB7XG5cdFx0XHRcdGNvbnRleHQgPSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGRlbGV0ZSBldmVudHMuc3dpcGU7XG5cdFx0XHRcdGV2ZW50cy5sZW5ndGgtLTtcblx0XHRcdFx0aWYgKCBldmVudHMubGVuZ3RoID09PSAwICkge1xuXHRcdFx0XHRcdCQucmVtb3ZlRGF0YSggdGhpcywgXCJtb2JpbGUtZXZlbnRzXCIgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIGNvbnRleHQgKSB7XG5cdFx0XHRcdGlmICggY29udGV4dC5zdGFydCApIHtcblx0XHRcdFx0XHQkKCB0aGlzICkub2ZmKCB0b3VjaFN0YXJ0RXZlbnQsIGNvbnRleHQuc3RhcnQgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoIGNvbnRleHQubW92ZSApIHtcblx0XHRcdFx0XHQkZG9jdW1lbnQub2ZmKCB0b3VjaE1vdmVFdmVudCwgY29udGV4dC5tb3ZlICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBjb250ZXh0LnN0b3AgKSB7XG5cdFx0XHRcdFx0JGRvY3VtZW50Lm9mZiggdG91Y2hTdG9wRXZlbnQsIGNvbnRleHQuc3RvcCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHQkLmVhY2goe1xuXHRcdHN3aXBlbGVmdDogXCJzd2lwZS5sZWZ0XCIsXG5cdFx0c3dpcGVyaWdodDogXCJzd2lwZS5yaWdodFwiXG5cdH0sIGZ1bmN0aW9uKCBldmVudCwgc291cmNlRXZlbnQgKSB7XG5cblx0XHQkLmV2ZW50LnNwZWNpYWxbIGV2ZW50IF0gPSB7XG5cdFx0XHRzZXR1cDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5iaW5kKCBzb3VyY2VFdmVudCwgJC5ub29wICk7XG5cdFx0XHR9LFxuXHRcdFx0dGVhcmRvd246IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkudW5iaW5kKCBzb3VyY2VFdmVudCApO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xufSkoIGpRdWVyeSwgdGhpcyApO1xuKi9cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuY29uc3QgTXV0YXRpb25PYnNlcnZlciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBwcmVmaXhlcyA9IFsnV2ViS2l0JywgJ01veicsICdPJywgJ01zJywgJyddO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChgJHtwcmVmaXhlc1tpXX1NdXRhdGlvbk9ic2VydmVyYCBpbiB3aW5kb3cpIHtcbiAgICAgIHJldHVybiB3aW5kb3dbYCR7cHJlZml4ZXNbaV19TXV0YXRpb25PYnNlcnZlcmBdO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZmFsc2U7XG59KCkpO1xuXG5jb25zdCB0cmlnZ2VycyA9IChlbCwgdHlwZSkgPT4ge1xuICBlbC5kYXRhKHR5cGUpLnNwbGl0KCcgJykuZm9yRWFjaChpZCA9PiB7XG4gICAgJChgIyR7aWR9YClbIHR5cGUgPT09ICdjbG9zZScgPyAndHJpZ2dlcicgOiAndHJpZ2dlckhhbmRsZXInXShgJHt0eXBlfS56Zi50cmlnZ2VyYCwgW2VsXSk7XG4gIH0pO1xufTtcbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtb3Blbl0gd2lsbCByZXZlYWwgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS1vcGVuXScsIGZ1bmN0aW9uKCkge1xuICB0cmlnZ2VycygkKHRoaXMpLCAnb3BlbicpO1xufSk7XG5cbi8vIEVsZW1lbnRzIHdpdGggW2RhdGEtY2xvc2VdIHdpbGwgY2xvc2UgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4vLyBJZiB1c2VkIHdpdGhvdXQgYSB2YWx1ZSBvbiBbZGF0YS1jbG9zZV0sIHRoZSBldmVudCB3aWxsIGJ1YmJsZSwgYWxsb3dpbmcgaXQgdG8gY2xvc2UgYSBwYXJlbnQgY29tcG9uZW50LlxuJChkb2N1bWVudCkub24oJ2NsaWNrLnpmLnRyaWdnZXInLCAnW2RhdGEtY2xvc2VdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgnY2xvc2UnKTtcbiAgaWYgKGlkKSB7XG4gICAgdHJpZ2dlcnMoJCh0aGlzKSwgJ2Nsb3NlJyk7XG4gIH1cbiAgZWxzZSB7XG4gICAgJCh0aGlzKS50cmlnZ2VyKCdjbG9zZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLXRvZ2dsZV0gd2lsbCB0b2dnbGUgYSBwbHVnaW4gdGhhdCBzdXBwb3J0cyBpdCB3aGVuIGNsaWNrZWQuXG4kKGRvY3VtZW50KS5vbignY2xpY2suemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGVdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlJyk7XG4gIGlmIChpZCkge1xuICAgIHRyaWdnZXJzKCQodGhpcyksICd0b2dnbGUnKTtcbiAgfSBlbHNlIHtcbiAgICAkKHRoaXMpLnRyaWdnZXIoJ3RvZ2dsZS56Zi50cmlnZ2VyJyk7XG4gIH1cbn0pO1xuXG4vLyBFbGVtZW50cyB3aXRoIFtkYXRhLWNsb3NhYmxlXSB3aWxsIHJlc3BvbmQgdG8gY2xvc2UuemYudHJpZ2dlciBldmVudHMuXG4kKGRvY3VtZW50KS5vbignY2xvc2UuemYudHJpZ2dlcicsICdbZGF0YS1jbG9zYWJsZV0nLCBmdW5jdGlvbihlKXtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgbGV0IGFuaW1hdGlvbiA9ICQodGhpcykuZGF0YSgnY2xvc2FibGUnKTtcblxuICBpZihhbmltYXRpb24gIT09ICcnKXtcbiAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KCQodGhpcyksIGFuaW1hdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAkKHRoaXMpLnRyaWdnZXIoJ2Nsb3NlZC56ZicpO1xuICAgIH0pO1xuICB9ZWxzZXtcbiAgICAkKHRoaXMpLmZhZGVPdXQoKS50cmlnZ2VyKCdjbG9zZWQuemYnKTtcbiAgfVxufSk7XG5cbiQoZG9jdW1lbnQpLm9uKCdmb2N1cy56Zi50cmlnZ2VyIGJsdXIuemYudHJpZ2dlcicsICdbZGF0YS10b2dnbGUtZm9jdXNdJywgZnVuY3Rpb24oKSB7XG4gIGxldCBpZCA9ICQodGhpcykuZGF0YSgndG9nZ2xlLWZvY3VzJyk7XG4gICQoYCMke2lkfWApLnRyaWdnZXJIYW5kbGVyKCd0b2dnbGUuemYudHJpZ2dlcicsIFskKHRoaXMpXSk7XG59KTtcblxuLyoqXG4qIEZpcmVzIG9uY2UgYWZ0ZXIgYWxsIG90aGVyIHNjcmlwdHMgaGF2ZSBsb2FkZWRcbiogQGZ1bmN0aW9uXG4qIEBwcml2YXRlXG4qL1xuJCh3aW5kb3cpLm9uKCdsb2FkJywgKCkgPT4ge1xuICBjaGVja0xpc3RlbmVycygpO1xufSk7XG5cbmZ1bmN0aW9uIGNoZWNrTGlzdGVuZXJzKCkge1xuICBldmVudHNMaXN0ZW5lcigpO1xuICByZXNpemVMaXN0ZW5lcigpO1xuICBzY3JvbGxMaXN0ZW5lcigpO1xuICBtdXRhdGVMaXN0ZW5lcigpO1xuICBjbG9zZW1lTGlzdGVuZXIoKTtcbn1cblxuLy8qKioqKioqKiBvbmx5IGZpcmVzIHRoaXMgZnVuY3Rpb24gb25jZSBvbiBsb2FkLCBpZiB0aGVyZSdzIHNvbWV0aGluZyB0byB3YXRjaCAqKioqKioqKlxuZnVuY3Rpb24gY2xvc2VtZUxpc3RlbmVyKHBsdWdpbk5hbWUpIHtcbiAgdmFyIHlldGlCb3hlcyA9ICQoJ1tkYXRhLXlldGktYm94XScpLFxuICAgICAgcGx1Z05hbWVzID0gWydkcm9wZG93bicsICd0b29sdGlwJywgJ3JldmVhbCddO1xuXG4gIGlmKHBsdWdpbk5hbWUpe1xuICAgIGlmKHR5cGVvZiBwbHVnaW5OYW1lID09PSAnc3RyaW5nJyl7XG4gICAgICBwbHVnTmFtZXMucHVzaChwbHVnaW5OYW1lKTtcbiAgICB9ZWxzZSBpZih0eXBlb2YgcGx1Z2luTmFtZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHBsdWdpbk5hbWVbMF0gPT09ICdzdHJpbmcnKXtcbiAgICAgIHBsdWdOYW1lcy5jb25jYXQocGx1Z2luTmFtZSk7XG4gICAgfWVsc2V7XG4gICAgICBjb25zb2xlLmVycm9yKCdQbHVnaW4gbmFtZXMgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICB9XG4gIGlmKHlldGlCb3hlcy5sZW5ndGgpe1xuICAgIGxldCBsaXN0ZW5lcnMgPSBwbHVnTmFtZXMubWFwKChuYW1lKSA9PiB7XG4gICAgICByZXR1cm4gYGNsb3NlbWUuemYuJHtuYW1lfWA7XG4gICAgfSkuam9pbignICcpO1xuXG4gICAgJCh3aW5kb3cpLm9mZihsaXN0ZW5lcnMpLm9uKGxpc3RlbmVycywgZnVuY3Rpb24oZSwgcGx1Z2luSWQpe1xuICAgICAgbGV0IHBsdWdpbiA9IGUubmFtZXNwYWNlLnNwbGl0KCcuJylbMF07XG4gICAgICBsZXQgcGx1Z2lucyA9ICQoYFtkYXRhLSR7cGx1Z2lufV1gKS5ub3QoYFtkYXRhLXlldGktYm94PVwiJHtwbHVnaW5JZH1cIl1gKTtcblxuICAgICAgcGx1Z2lucy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIGxldCBfdGhpcyA9ICQodGhpcyk7XG5cbiAgICAgICAgX3RoaXMudHJpZ2dlckhhbmRsZXIoJ2Nsb3NlLnpmLnRyaWdnZXInLCBbX3RoaXNdKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlc2l6ZUxpc3RlbmVyKGRlYm91bmNlKXtcbiAgbGV0IHRpbWVyLFxuICAgICAgJG5vZGVzID0gJCgnW2RhdGEtcmVzaXplXScpO1xuICBpZigkbm9kZXMubGVuZ3RoKXtcbiAgICAkKHdpbmRvdykub2ZmKCdyZXNpemUuemYudHJpZ2dlcicpXG4gICAgLm9uKCdyZXNpemUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG5cbiAgICAgIHRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG4gICAgICAgIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsvL2ZhbGxiYWNrIGZvciBJRSA5XG4gICAgICAgICAgJG5vZGVzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQodGhpcykudHJpZ2dlckhhbmRsZXIoJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgcmVzaXplIGV2ZW50XG4gICAgICAgICRub2Rlcy5hdHRyKCdkYXRhLWV2ZW50cycsIFwicmVzaXplXCIpO1xuICAgICAgfSwgZGVib3VuY2UgfHwgMTApOy8vZGVmYXVsdCB0aW1lIHRvIGVtaXQgcmVzaXplIGV2ZW50XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2Nyb2xsTGlzdGVuZXIoZGVib3VuY2Upe1xuICBsZXQgdGltZXIsXG4gICAgICAkbm9kZXMgPSAkKCdbZGF0YS1zY3JvbGxdJyk7XG4gIGlmKCRub2Rlcy5sZW5ndGgpe1xuICAgICQod2luZG93KS5vZmYoJ3Njcm9sbC56Zi50cmlnZ2VyJylcbiAgICAub24oJ3Njcm9sbC56Zi50cmlnZ2VyJywgZnVuY3Rpb24oZSl7XG4gICAgICBpZih0aW1lcil7IGNsZWFyVGltZW91dCh0aW1lcik7IH1cblxuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cbiAgICAgICAgaWYoIU11dGF0aW9uT2JzZXJ2ZXIpey8vZmFsbGJhY2sgZm9yIElFIDlcbiAgICAgICAgICAkbm9kZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vdHJpZ2dlciBhbGwgbGlzdGVuaW5nIGVsZW1lbnRzIGFuZCBzaWduYWwgYSBzY3JvbGwgZXZlbnRcbiAgICAgICAgJG5vZGVzLmF0dHIoJ2RhdGEtZXZlbnRzJywgXCJzY3JvbGxcIik7XG4gICAgICB9LCBkZWJvdW5jZSB8fCAxMCk7Ly9kZWZhdWx0IHRpbWUgdG8gZW1pdCBzY3JvbGwgZXZlbnRcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtdXRhdGVMaXN0ZW5lcihkZWJvdW5jZSkge1xuICAgIGxldCAkbm9kZXMgPSAkKCdbZGF0YS1tdXRhdGVdJyk7XG4gICAgaWYgKCRub2Rlcy5sZW5ndGggJiYgTXV0YXRpb25PYnNlcnZlcil7XG5cdFx0XHQvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgbXV0YXRlIGV2ZW50XG4gICAgICAvL25vIElFIDkgb3IgMTBcblx0XHRcdCRub2Rlcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdCAgJCh0aGlzKS50cmlnZ2VySGFuZGxlcignbXV0YXRlbWUuemYudHJpZ2dlcicpO1xuXHRcdFx0fSk7XG4gICAgfVxuIH1cblxuZnVuY3Rpb24gZXZlbnRzTGlzdGVuZXIoKSB7XG4gIGlmKCFNdXRhdGlvbk9ic2VydmVyKXsgcmV0dXJuIGZhbHNlOyB9XG4gIGxldCBub2RlcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLXJlc2l6ZV0sIFtkYXRhLXNjcm9sbF0sIFtkYXRhLW11dGF0ZV0nKTtcblxuICAvL2VsZW1lbnQgY2FsbGJhY2tcbiAgdmFyIGxpc3RlbmluZ0VsZW1lbnRzTXV0YXRpb24gPSBmdW5jdGlvbiAobXV0YXRpb25SZWNvcmRzTGlzdCkge1xuICAgICAgdmFyICR0YXJnZXQgPSAkKG11dGF0aW9uUmVjb3Jkc0xpc3RbMF0udGFyZ2V0KTtcblxuXHQgIC8vdHJpZ2dlciB0aGUgZXZlbnQgaGFuZGxlciBmb3IgdGhlIGVsZW1lbnQgZGVwZW5kaW5nIG9uIHR5cGVcbiAgICAgIHN3aXRjaCAobXV0YXRpb25SZWNvcmRzTGlzdFswXS50eXBlKSB7XG5cbiAgICAgICAgY2FzZSBcImF0dHJpYnV0ZXNcIjpcbiAgICAgICAgICBpZiAoJHRhcmdldC5hdHRyKFwiZGF0YS1ldmVudHNcIikgPT09IFwic2Nyb2xsXCIgJiYgbXV0YXRpb25SZWNvcmRzTGlzdFswXS5hdHRyaWJ1dGVOYW1lID09PSBcImRhdGEtZXZlbnRzXCIpIHtcblx0XHQgIFx0JHRhcmdldC50cmlnZ2VySGFuZGxlcignc2Nyb2xsbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LCB3aW5kb3cucGFnZVlPZmZzZXRdKTtcblx0XHQgIH1cblx0XHQgIGlmICgkdGFyZ2V0LmF0dHIoXCJkYXRhLWV2ZW50c1wiKSA9PT0gXCJyZXNpemVcIiAmJiBtdXRhdGlvblJlY29yZHNMaXN0WzBdLmF0dHJpYnV0ZU5hbWUgPT09IFwiZGF0YS1ldmVudHNcIikge1xuXHRcdCAgXHQkdGFyZ2V0LnRyaWdnZXJIYW5kbGVyKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgWyR0YXJnZXRdKTtcblx0XHQgICB9XG5cdFx0ICBpZiAobXV0YXRpb25SZWNvcmRzTGlzdFswXS5hdHRyaWJ1dGVOYW1lID09PSBcInN0eWxlXCIpIHtcblx0XHRcdCAgJHRhcmdldC5jbG9zZXN0KFwiW2RhdGEtbXV0YXRlXVwiKS5hdHRyKFwiZGF0YS1ldmVudHNcIixcIm11dGF0ZVwiKTtcblx0XHRcdCAgJHRhcmdldC5jbG9zZXN0KFwiW2RhdGEtbXV0YXRlXVwiKS50cmlnZ2VySGFuZGxlcignbXV0YXRlbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpXSk7XG5cdFx0ICB9XG5cdFx0ICBicmVhaztcblxuICAgICAgICBjYXNlIFwiY2hpbGRMaXN0XCI6XG5cdFx0ICAkdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpLmF0dHIoXCJkYXRhLWV2ZW50c1wiLFwibXV0YXRlXCIpO1xuXHRcdCAgJHRhcmdldC5jbG9zZXN0KFwiW2RhdGEtbXV0YXRlXVwiKS50cmlnZ2VySGFuZGxlcignbXV0YXRlbWUuemYudHJpZ2dlcicsIFskdGFyZ2V0LmNsb3Nlc3QoXCJbZGF0YS1tdXRhdGVdXCIpXSk7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIC8vbm90aGluZ1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAobm9kZXMubGVuZ3RoKSB7XG4gICAgICAvL2ZvciBlYWNoIGVsZW1lbnQgdGhhdCBuZWVkcyB0byBsaXN0ZW4gZm9yIHJlc2l6aW5nLCBzY3JvbGxpbmcsIG9yIG11dGF0aW9uIGFkZCBhIHNpbmdsZSBvYnNlcnZlclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gbm9kZXMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICAgIHZhciBlbGVtZW50T2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihsaXN0ZW5pbmdFbGVtZW50c011dGF0aW9uKTtcbiAgICAgICAgZWxlbWVudE9ic2VydmVyLm9ic2VydmUobm9kZXNbaV0sIHsgYXR0cmlidXRlczogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBjaGFyYWN0ZXJEYXRhOiBmYWxzZSwgc3VidHJlZTogdHJ1ZSwgYXR0cmlidXRlRmlsdGVyOiBbXCJkYXRhLWV2ZW50c1wiLCBcInN0eWxlXCJdIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gW1BIXVxuLy8gRm91bmRhdGlvbi5DaGVja1dhdGNoZXJzID0gY2hlY2tXYXRjaGVycztcbkZvdW5kYXRpb24uSUhlYXJZb3UgPSBjaGVja0xpc3RlbmVycztcbi8vIEZvdW5kYXRpb24uSVNlZVlvdSA9IHNjcm9sbExpc3RlbmVyO1xuLy8gRm91bmRhdGlvbi5JRmVlbFlvdSA9IGNsb3NlbWVMaXN0ZW5lcjtcblxufShqUXVlcnkpO1xuXG4vLyBmdW5jdGlvbiBkb21NdXRhdGlvbk9ic2VydmVyKGRlYm91bmNlKSB7XG4vLyAgIC8vICEhISBUaGlzIGlzIGNvbWluZyBzb29uIGFuZCBuZWVkcyBtb3JlIHdvcms7IG5vdCBhY3RpdmUgICEhISAvL1xuLy8gICB2YXIgdGltZXIsXG4vLyAgIG5vZGVzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtbXV0YXRlXScpO1xuLy8gICAvL1xuLy8gICBpZiAobm9kZXMubGVuZ3RoKSB7XG4vLyAgICAgLy8gdmFyIE11dGF0aW9uT2JzZXJ2ZXIgPSAoZnVuY3Rpb24gKCkge1xuLy8gICAgIC8vICAgdmFyIHByZWZpeGVzID0gWydXZWJLaXQnLCAnTW96JywgJ08nLCAnTXMnLCAnJ107XG4vLyAgICAgLy8gICBmb3IgKHZhciBpPTA7IGkgPCBwcmVmaXhlcy5sZW5ndGg7IGkrKykge1xuLy8gICAgIC8vICAgICBpZiAocHJlZml4ZXNbaV0gKyAnTXV0YXRpb25PYnNlcnZlcicgaW4gd2luZG93KSB7XG4vLyAgICAgLy8gICAgICAgcmV0dXJuIHdpbmRvd1twcmVmaXhlc1tpXSArICdNdXRhdGlvbk9ic2VydmVyJ107XG4vLyAgICAgLy8gICAgIH1cbi8vICAgICAvLyAgIH1cbi8vICAgICAvLyAgIHJldHVybiBmYWxzZTtcbi8vICAgICAvLyB9KCkpO1xuLy9cbi8vXG4vLyAgICAgLy9mb3IgdGhlIGJvZHksIHdlIG5lZWQgdG8gbGlzdGVuIGZvciBhbGwgY2hhbmdlcyBlZmZlY3RpbmcgdGhlIHN0eWxlIGFuZCBjbGFzcyBhdHRyaWJ1dGVzXG4vLyAgICAgdmFyIGJvZHlPYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGJvZHlNdXRhdGlvbik7XG4vLyAgICAgYm9keU9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IGZhbHNlLCBzdWJ0cmVlOnRydWUsIGF0dHJpYnV0ZUZpbHRlcjpbXCJzdHlsZVwiLCBcImNsYXNzXCJdfSk7XG4vL1xuLy9cbi8vICAgICAvL2JvZHkgY2FsbGJhY2tcbi8vICAgICBmdW5jdGlvbiBib2R5TXV0YXRpb24obXV0YXRlKSB7XG4vLyAgICAgICAvL3RyaWdnZXIgYWxsIGxpc3RlbmluZyBlbGVtZW50cyBhbmQgc2lnbmFsIGEgbXV0YXRpb24gZXZlbnRcbi8vICAgICAgIGlmICh0aW1lcikgeyBjbGVhclRpbWVvdXQodGltZXIpOyB9XG4vL1xuLy8gICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuLy8gICAgICAgICBib2R5T2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuLy8gICAgICAgICAkKCdbZGF0YS1tdXRhdGVdJykuYXR0cignZGF0YS1ldmVudHMnLFwibXV0YXRlXCIpO1xuLy8gICAgICAgfSwgZGVib3VuY2UgfHwgMTUwKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBBYmlkZSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uYWJpZGVcbiAqL1xuXG5jbGFzcyBBYmlkZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEFiaWRlLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEFiaWRlI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBBYmlkZS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWJpZGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgQWJpZGUgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IEFiaWRlIGZ1bmN0aW9uaW5nIG9uIGxvYWQuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLiRpbnB1dHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2lucHV0LCB0ZXh0YXJlYSwgc2VsZWN0Jyk7XG5cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIEFiaWRlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLmFiaWRlJylcbiAgICAgIC5vbigncmVzZXQuemYuYWJpZGUnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMucmVzZXRGb3JtKCk7XG4gICAgICB9KVxuICAgICAgLm9uKCdzdWJtaXQuemYuYWJpZGUnLCAoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnZhbGlkYXRlRm9ybSgpO1xuICAgICAgfSk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnZhbGlkYXRlT24gPT09ICdmaWVsZENoYW5nZScpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdjaGFuZ2UuemYuYWJpZGUnKVxuICAgICAgICAub24oJ2NoYW5nZS56Zi5hYmlkZScsIChlKSA9PiB7XG4gICAgICAgICAgdGhpcy52YWxpZGF0ZUlucHV0KCQoZS50YXJnZXQpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5saXZlVmFsaWRhdGUpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdpbnB1dC56Zi5hYmlkZScpXG4gICAgICAgIC5vbignaW5wdXQuemYuYWJpZGUnLCAoZSkgPT4ge1xuICAgICAgICAgIHRoaXMudmFsaWRhdGVJbnB1dCgkKGUudGFyZ2V0KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMudmFsaWRhdGVPbkJsdXIpIHtcbiAgICAgIHRoaXMuJGlucHV0c1xuICAgICAgICAub2ZmKCdibHVyLnpmLmFiaWRlJylcbiAgICAgICAgLm9uKCdibHVyLnpmLmFiaWRlJywgKGUpID0+IHtcbiAgICAgICAgICB0aGlzLnZhbGlkYXRlSW5wdXQoJChlLnRhcmdldCkpO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgQWJpZGUgdXBvbiBET00gY2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIHRoaXMuX2luaXQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciBvciBub3QgYSBmb3JtIGVsZW1lbnQgaGFzIHRoZSByZXF1aXJlZCBhdHRyaWJ1dGUgYW5kIGlmIGl0J3MgY2hlY2tlZCBvciBub3RcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgcmVxdWlyZWRDaGVjaygkZWwpIHtcbiAgICBpZiAoISRlbC5hdHRyKCdyZXF1aXJlZCcpKSByZXR1cm4gdHJ1ZTtcblxuICAgIHZhciBpc0dvb2QgPSB0cnVlO1xuXG4gICAgc3dpdGNoICgkZWxbMF0udHlwZSkge1xuICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICBpc0dvb2QgPSAkZWxbMF0uY2hlY2tlZDtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICBjYXNlICdzZWxlY3Qtb25lJzpcbiAgICAgIGNhc2UgJ3NlbGVjdC1tdWx0aXBsZSc6XG4gICAgICAgIHZhciBvcHQgPSAkZWwuZmluZCgnb3B0aW9uOnNlbGVjdGVkJyk7XG4gICAgICAgIGlmICghb3B0Lmxlbmd0aCB8fCAhb3B0LnZhbCgpKSBpc0dvb2QgPSBmYWxzZTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmKCEkZWwudmFsKCkgfHwgISRlbC52YWwoKS5sZW5ndGgpIGlzR29vZCA9IGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBpc0dvb2Q7XG4gIH1cblxuICAvKipcbiAgICogQmFzZWQgb24gJGVsLCBnZXQgdGhlIGZpcnN0IGVsZW1lbnQgd2l0aCBzZWxlY3RvciBpbiB0aGlzIG9yZGVyOlxuICAgKiAxLiBUaGUgZWxlbWVudCdzIGRpcmVjdCBzaWJsaW5nKCdzKS5cbiAgICogMy4gVGhlIGVsZW1lbnQncyBwYXJlbnQncyBjaGlsZHJlbi5cbiAgICpcbiAgICogVGhpcyBhbGxvd3MgZm9yIG11bHRpcGxlIGZvcm0gZXJyb3JzIHBlciBpbnB1dCwgdGhvdWdoIGlmIG5vbmUgYXJlIGZvdW5kLCBubyBmb3JtIGVycm9ycyB3aWxsIGJlIHNob3duLlxuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byB1c2UgYXMgcmVmZXJlbmNlIHRvIGZpbmQgdGhlIGZvcm0gZXJyb3Igc2VsZWN0b3IuXG4gICAqIEByZXR1cm5zIHtPYmplY3R9IGpRdWVyeSBvYmplY3Qgd2l0aCB0aGUgc2VsZWN0b3IuXG4gICAqL1xuICBmaW5kRm9ybUVycm9yKCRlbCkge1xuICAgIHZhciAkZXJyb3IgPSAkZWwuc2libGluZ3ModGhpcy5vcHRpb25zLmZvcm1FcnJvclNlbGVjdG9yKTtcblxuICAgIGlmICghJGVycm9yLmxlbmd0aCkge1xuICAgICAgJGVycm9yID0gJGVsLnBhcmVudCgpLmZpbmQodGhpcy5vcHRpb25zLmZvcm1FcnJvclNlbGVjdG9yKTtcbiAgICB9XG5cbiAgICByZXR1cm4gJGVycm9yO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZmlyc3QgZWxlbWVudCBpbiB0aGlzIG9yZGVyOlxuICAgKiAyLiBUaGUgPGxhYmVsPiB3aXRoIHRoZSBhdHRyaWJ1dGUgYFtmb3I9XCJzb21lSW5wdXRJZFwiXWBcbiAgICogMy4gVGhlIGAuY2xvc2VzdCgpYCA8bGFiZWw+XG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgb2JqZWN0IHRvIGNoZWNrIGZvciByZXF1aXJlZCBhdHRyaWJ1dGVcbiAgICogQHJldHVybnMge0Jvb2xlYW59IEJvb2xlYW4gdmFsdWUgZGVwZW5kcyBvbiB3aGV0aGVyIG9yIG5vdCBhdHRyaWJ1dGUgaXMgY2hlY2tlZCBvciBlbXB0eVxuICAgKi9cbiAgZmluZExhYmVsKCRlbCkge1xuICAgIHZhciBpZCA9ICRlbFswXS5pZDtcbiAgICB2YXIgJGxhYmVsID0gdGhpcy4kZWxlbWVudC5maW5kKGBsYWJlbFtmb3I9XCIke2lkfVwiXWApO1xuXG4gICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJGVsLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuICRsYWJlbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHNldCBvZiBsYWJlbHMgYXNzb2NpYXRlZCB3aXRoIGEgc2V0IG9mIHJhZGlvIGVscyBpbiB0aGlzIG9yZGVyXG4gICAqIDIuIFRoZSA8bGFiZWw+IHdpdGggdGhlIGF0dHJpYnV0ZSBgW2Zvcj1cInNvbWVJbnB1dElkXCJdYFxuICAgKiAzLiBUaGUgYC5jbG9zZXN0KClgIDxsYWJlbD5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gY2hlY2sgZm9yIHJlcXVpcmVkIGF0dHJpYnV0ZVxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0dHJpYnV0ZSBpcyBjaGVja2VkIG9yIGVtcHR5XG4gICAqL1xuICBmaW5kUmFkaW9MYWJlbHMoJGVscykge1xuICAgIHZhciBsYWJlbHMgPSAkZWxzLm1hcCgoaSwgZWwpID0+IHtcbiAgICAgIHZhciBpZCA9IGVsLmlkO1xuICAgICAgdmFyICRsYWJlbCA9IHRoaXMuJGVsZW1lbnQuZmluZChgbGFiZWxbZm9yPVwiJHtpZH1cIl1gKTtcblxuICAgICAgaWYgKCEkbGFiZWwubGVuZ3RoKSB7XG4gICAgICAgICRsYWJlbCA9ICQoZWwpLmNsb3Nlc3QoJ2xhYmVsJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gJGxhYmVsWzBdO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuICQobGFiZWxzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIHRoZSBDU1MgZXJyb3IgY2xhc3MgYXMgc3BlY2lmaWVkIGJ5IHRoZSBBYmlkZSBzZXR0aW5ncyB0byB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSBjbGFzcyB0b1xuICAgKi9cbiAgYWRkRXJyb3JDbGFzc2VzKCRlbCkge1xuICAgIHZhciAkbGFiZWwgPSB0aGlzLmZpbmRMYWJlbCgkZWwpO1xuICAgIHZhciAkZm9ybUVycm9yID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbCk7XG5cbiAgICBpZiAoJGxhYmVsLmxlbmd0aCkge1xuICAgICAgJGxhYmVsLmFkZENsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9yLmxlbmd0aCkge1xuICAgICAgJGZvcm1FcnJvci5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuZm9ybUVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgICRlbC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5hdHRyKCdkYXRhLWludmFsaWQnLCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIENTUyBlcnJvciBjbGFzc2VzIGV0YyBmcm9tIGFuIGVudGlyZSByYWRpbyBidXR0b24gZ3JvdXBcbiAgICogQHBhcmFtIHtTdHJpbmd9IGdyb3VwTmFtZSAtIEEgc3RyaW5nIHRoYXQgc3BlY2lmaWVzIHRoZSBuYW1lIG9mIGEgcmFkaW8gYnV0dG9uIGdyb3VwXG4gICAqXG4gICAqL1xuXG4gIHJlbW92ZVJhZGlvRXJyb3JDbGFzc2VzKGdyb3VwTmFtZSkge1xuICAgIHZhciAkZWxzID0gdGhpcy4kZWxlbWVudC5maW5kKGA6cmFkaW9bbmFtZT1cIiR7Z3JvdXBOYW1lfVwiXWApO1xuICAgIHZhciAkbGFiZWxzID0gdGhpcy5maW5kUmFkaW9MYWJlbHMoJGVscyk7XG4gICAgdmFyICRmb3JtRXJyb3JzID0gdGhpcy5maW5kRm9ybUVycm9yKCRlbHMpO1xuXG4gICAgaWYgKCRsYWJlbHMubGVuZ3RoKSB7XG4gICAgICAkbGFiZWxzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5sYWJlbEVycm9yQ2xhc3MpO1xuICAgIH1cblxuICAgIGlmICgkZm9ybUVycm9ycy5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3JzLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5mb3JtRXJyb3JDbGFzcyk7XG4gICAgfVxuXG4gICAgJGVscy5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuaW5wdXRFcnJvckNsYXNzKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcblxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgQ1NTIGVycm9yIGNsYXNzIGFzIHNwZWNpZmllZCBieSB0aGUgQWJpZGUgc2V0dGluZ3MgZnJvbSB0aGUgbGFiZWwsIGlucHV0LCBhbmQgdGhlIGZvcm1cbiAgICogQHBhcmFtIHtPYmplY3R9ICRlbCAtIGpRdWVyeSBvYmplY3QgdG8gcmVtb3ZlIHRoZSBjbGFzcyBmcm9tXG4gICAqL1xuICByZW1vdmVFcnJvckNsYXNzZXMoJGVsKSB7XG4gICAgLy8gcmFkaW9zIG5lZWQgdG8gY2xlYXIgYWxsIG9mIHRoZSBlbHNcbiAgICBpZigkZWxbMF0udHlwZSA9PSAncmFkaW8nKSB7XG4gICAgICByZXR1cm4gdGhpcy5yZW1vdmVSYWRpb0Vycm9yQ2xhc3NlcygkZWwuYXR0cignbmFtZScpKTtcbiAgICB9XG5cbiAgICB2YXIgJGxhYmVsID0gdGhpcy5maW5kTGFiZWwoJGVsKTtcbiAgICB2YXIgJGZvcm1FcnJvciA9IHRoaXMuZmluZEZvcm1FcnJvcigkZWwpO1xuXG4gICAgaWYgKCRsYWJlbC5sZW5ndGgpIHtcbiAgICAgICRsYWJlbC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMubGFiZWxFcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICBpZiAoJGZvcm1FcnJvci5sZW5ndGgpIHtcbiAgICAgICRmb3JtRXJyb3IucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmZvcm1FcnJvckNsYXNzKTtcbiAgICB9XG5cbiAgICAkZWwucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmlucHV0RXJyb3JDbGFzcykucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gIH1cblxuICAvKipcbiAgICogR29lcyB0aHJvdWdoIGEgZm9ybSB0byBmaW5kIGlucHV0cyBhbmQgcHJvY2VlZHMgdG8gdmFsaWRhdGUgdGhlbSBpbiB3YXlzIHNwZWNpZmljIHRvIHRoZWlyIHR5cGVcbiAgICogQGZpcmVzIEFiaWRlI2ludmFsaWRcbiAgICogQGZpcmVzIEFiaWRlI3ZhbGlkXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byB2YWxpZGF0ZSwgc2hvdWxkIGJlIGFuIEhUTUwgaW5wdXRcbiAgICogQHJldHVybnMge0Jvb2xlYW59IGdvb2RUb0dvIC0gSWYgdGhlIGlucHV0IGlzIHZhbGlkIG9yIG5vdC5cbiAgICovXG4gIHZhbGlkYXRlSW5wdXQoJGVsKSB7XG4gICAgdmFyIGNsZWFyUmVxdWlyZSA9IHRoaXMucmVxdWlyZWRDaGVjaygkZWwpLFxuICAgICAgICB2YWxpZGF0ZWQgPSBmYWxzZSxcbiAgICAgICAgY3VzdG9tVmFsaWRhdG9yID0gdHJ1ZSxcbiAgICAgICAgdmFsaWRhdG9yID0gJGVsLmF0dHIoJ2RhdGEtdmFsaWRhdG9yJyksXG4gICAgICAgIGVxdWFsVG8gPSB0cnVlO1xuXG4gICAgLy8gZG9uJ3QgdmFsaWRhdGUgaWdub3JlZCBpbnB1dHMgb3IgaGlkZGVuIGlucHV0c1xuICAgIGlmICgkZWwuaXMoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKSB8fCAkZWwuaXMoJ1t0eXBlPVwiaGlkZGVuXCJdJykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHN3aXRjaCAoJGVsWzBdLnR5cGUpIHtcbiAgICAgIGNhc2UgJ3JhZGlvJzpcbiAgICAgICAgdmFsaWRhdGVkID0gdGhpcy52YWxpZGF0ZVJhZGlvKCRlbC5hdHRyKCduYW1lJykpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnY2hlY2tib3gnOlxuICAgICAgICB2YWxpZGF0ZWQgPSBjbGVhclJlcXVpcmU7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdzZWxlY3QnOlxuICAgICAgY2FzZSAnc2VsZWN0LW9uZSc6XG4gICAgICBjYXNlICdzZWxlY3QtbXVsdGlwbGUnOlxuICAgICAgICB2YWxpZGF0ZWQgPSBjbGVhclJlcXVpcmU7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YWxpZGF0ZWQgPSB0aGlzLnZhbGlkYXRlVGV4dCgkZWwpO1xuICAgIH1cblxuICAgIGlmICh2YWxpZGF0b3IpIHtcbiAgICAgIGN1c3RvbVZhbGlkYXRvciA9IHRoaXMubWF0Y2hWYWxpZGF0aW9uKCRlbCwgdmFsaWRhdG9yLCAkZWwuYXR0cigncmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgaWYgKCRlbC5hdHRyKCdkYXRhLWVxdWFsdG8nKSkge1xuICAgICAgZXF1YWxUbyA9IHRoaXMub3B0aW9ucy52YWxpZGF0b3JzLmVxdWFsVG8oJGVsKTtcbiAgICB9XG5cblxuICAgIHZhciBnb29kVG9HbyA9IFtjbGVhclJlcXVpcmUsIHZhbGlkYXRlZCwgY3VzdG9tVmFsaWRhdG9yLCBlcXVhbFRvXS5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG4gICAgdmFyIG1lc3NhZ2UgPSAoZ29vZFRvR28gPyAndmFsaWQnIDogJ2ludmFsaWQnKSArICcuemYuYWJpZGUnO1xuXG4gICAgaWYgKGdvb2RUb0dvKSB7XG4gICAgICAvLyBSZS12YWxpZGF0ZSBpbnB1dHMgdGhhdCBkZXBlbmQgb24gdGhpcyBvbmUgd2l0aCBlcXVhbHRvXG4gICAgICBjb25zdCBkZXBlbmRlbnRFbGVtZW50cyA9IHRoaXMuJGVsZW1lbnQuZmluZChgW2RhdGEtZXF1YWx0bz1cIiR7JGVsLmF0dHIoJ2lkJyl9XCJdYCk7XG4gICAgICBpZiAoZGVwZW5kZW50RWxlbWVudHMubGVuZ3RoKSB7XG4gICAgICAgIGxldCBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGRlcGVuZGVudEVsZW1lbnRzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCQodGhpcykudmFsKCkpIHtcbiAgICAgICAgICAgIF90aGlzLnZhbGlkYXRlSW5wdXQoJCh0aGlzKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzW2dvb2RUb0dvID8gJ3JlbW92ZUVycm9yQ2xhc3NlcycgOiAnYWRkRXJyb3JDbGFzc2VzJ10oJGVsKTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGlucHV0IGlzIGRvbmUgY2hlY2tpbmcgZm9yIHZhbGlkYXRpb24uIEV2ZW50IHRyaWdnZXIgaXMgZWl0aGVyIGB2YWxpZC56Zi5hYmlkZWAgb3IgYGludmFsaWQuemYuYWJpZGVgXG4gICAgICogVHJpZ2dlciBpbmNsdWRlcyB0aGUgRE9NIGVsZW1lbnQgb2YgdGhlIGlucHV0LlxuICAgICAqIEBldmVudCBBYmlkZSN2YWxpZFxuICAgICAqIEBldmVudCBBYmlkZSNpbnZhbGlkXG4gICAgICovXG4gICAgJGVsLnRyaWdnZXIobWVzc2FnZSwgWyRlbF0pO1xuXG4gICAgcmV0dXJuIGdvb2RUb0dvO1xuICB9XG5cbiAgLyoqXG4gICAqIEdvZXMgdGhyb3VnaCBhIGZvcm0gYW5kIGlmIHRoZXJlIGFyZSBhbnkgaW52YWxpZCBpbnB1dHMsIGl0IHdpbGwgZGlzcGxheSB0aGUgZm9ybSBlcnJvciBlbGVtZW50XG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBub0Vycm9yIC0gdHJ1ZSBpZiBubyBlcnJvcnMgd2VyZSBkZXRlY3RlZC4uLlxuICAgKiBAZmlyZXMgQWJpZGUjZm9ybXZhbGlkXG4gICAqIEBmaXJlcyBBYmlkZSNmb3JtaW52YWxpZFxuICAgKi9cbiAgdmFsaWRhdGVGb3JtKCkge1xuICAgIHZhciBhY2MgPSBbXTtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kaW5wdXRzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBhY2MucHVzaChfdGhpcy52YWxpZGF0ZUlucHV0KCQodGhpcykpKTtcbiAgICB9KTtcblxuICAgIHZhciBub0Vycm9yID0gYWNjLmluZGV4T2YoZmFsc2UpID09PSAtMTtcblxuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJykuY3NzKCdkaXNwbGF5JywgKG5vRXJyb3IgPyAnbm9uZScgOiAnYmxvY2snKSk7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBmb3JtIGlzIGZpbmlzaGVkIHZhbGlkYXRpbmcuIEV2ZW50IHRyaWdnZXIgaXMgZWl0aGVyIGBmb3JtdmFsaWQuemYuYWJpZGVgIG9yIGBmb3JtaW52YWxpZC56Zi5hYmlkZWAuXG4gICAgICogVHJpZ2dlciBpbmNsdWRlcyB0aGUgZWxlbWVudCBvZiB0aGUgZm9ybS5cbiAgICAgKiBAZXZlbnQgQWJpZGUjZm9ybXZhbGlkXG4gICAgICogQGV2ZW50IEFiaWRlI2Zvcm1pbnZhbGlkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKChub0Vycm9yID8gJ2Zvcm12YWxpZCcgOiAnZm9ybWludmFsaWQnKSArICcuemYuYWJpZGUnLCBbdGhpcy4kZWxlbWVudF0pO1xuXG4gICAgcmV0dXJuIG5vRXJyb3I7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lcyB3aGV0aGVyIG9yIGEgbm90IGEgdGV4dCBpbnB1dCBpcyB2YWxpZCBiYXNlZCBvbiB0aGUgcGF0dGVybiBzcGVjaWZpZWQgaW4gdGhlIGF0dHJpYnV0ZS4gSWYgbm8gbWF0Y2hpbmcgcGF0dGVybiBpcyBmb3VuZCwgcmV0dXJucyB0cnVlLlxuICAgKiBAcGFyYW0ge09iamVjdH0gJGVsIC0galF1ZXJ5IG9iamVjdCB0byB2YWxpZGF0ZSwgc2hvdWxkIGJlIGEgdGV4dCBpbnB1dCBIVE1MIGVsZW1lbnRcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdHRlcm4gLSBzdHJpbmcgdmFsdWUgb2Ygb25lIG9mIHRoZSBSZWdFeCBwYXR0ZXJucyBpbiBBYmlkZS5vcHRpb25zLnBhdHRlcm5zXG4gICAqIEByZXR1cm5zIHtCb29sZWFufSBCb29sZWFuIHZhbHVlIGRlcGVuZHMgb24gd2hldGhlciBvciBub3QgdGhlIGlucHV0IHZhbHVlIG1hdGNoZXMgdGhlIHBhdHRlcm4gc3BlY2lmaWVkXG4gICAqL1xuICB2YWxpZGF0ZVRleHQoJGVsLCBwYXR0ZXJuKSB7XG4gICAgLy8gQSBwYXR0ZXJuIGNhbiBiZSBwYXNzZWQgdG8gdGhpcyBmdW5jdGlvbiwgb3IgaXQgd2lsbCBiZSBpbmZlcmVkIGZyb20gdGhlIGlucHV0J3MgXCJwYXR0ZXJuXCIgYXR0cmlidXRlLCBvciBpdCdzIFwidHlwZVwiIGF0dHJpYnV0ZVxuICAgIHBhdHRlcm4gPSAocGF0dGVybiB8fCAkZWwuYXR0cigncGF0dGVybicpIHx8ICRlbC5hdHRyKCd0eXBlJykpO1xuICAgIHZhciBpbnB1dFRleHQgPSAkZWwudmFsKCk7XG4gICAgdmFyIHZhbGlkID0gZmFsc2U7XG5cbiAgICBpZiAoaW5wdXRUZXh0Lmxlbmd0aCkge1xuICAgICAgLy8gSWYgdGhlIHBhdHRlcm4gYXR0cmlidXRlIG9uIHRoZSBlbGVtZW50IGlzIGluIEFiaWRlJ3MgbGlzdCBvZiBwYXR0ZXJucywgdGhlbiB0ZXN0IHRoYXQgcmVnZXhwXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnBhdHRlcm5zLmhhc093blByb3BlcnR5KHBhdHRlcm4pKSB7XG4gICAgICAgIHZhbGlkID0gdGhpcy5vcHRpb25zLnBhdHRlcm5zW3BhdHRlcm5dLnRlc3QoaW5wdXRUZXh0KTtcbiAgICAgIH1cbiAgICAgIC8vIElmIHRoZSBwYXR0ZXJuIG5hbWUgaXNuJ3QgYWxzbyB0aGUgdHlwZSBhdHRyaWJ1dGUgb2YgdGhlIGZpZWxkLCB0aGVuIHRlc3QgaXQgYXMgYSByZWdleHBcbiAgICAgIGVsc2UgaWYgKHBhdHRlcm4gIT09ICRlbC5hdHRyKCd0eXBlJykpIHtcbiAgICAgICAgdmFsaWQgPSBuZXcgUmVnRXhwKHBhdHRlcm4pLnRlc3QoaW5wdXRUZXh0KTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICB2YWxpZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEFuIGVtcHR5IGZpZWxkIGlzIHZhbGlkIGlmIGl0J3Mgbm90IHJlcXVpcmVkXG4gICAgZWxzZSBpZiAoISRlbC5wcm9wKCdyZXF1aXJlZCcpKSB7XG4gICAgICB2YWxpZCA9IHRydWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHZhbGlkO1xuICAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3IgYSBub3QgYSByYWRpbyBpbnB1dCBpcyB2YWxpZCBiYXNlZCBvbiB3aGV0aGVyIG9yIG5vdCBpdCBpcyByZXF1aXJlZCBhbmQgc2VsZWN0ZWQuIEFsdGhvdWdoIHRoZSBmdW5jdGlvbiB0YXJnZXRzIGEgc2luZ2xlIGA8aW5wdXQ+YCwgaXQgdmFsaWRhdGVzIGJ5IGNoZWNraW5nIHRoZSBgcmVxdWlyZWRgIGFuZCBgY2hlY2tlZGAgcHJvcGVydGllcyBvZiBhbGwgcmFkaW8gYnV0dG9ucyBpbiBpdHMgZ3JvdXAuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBncm91cE5hbWUgLSBBIHN0cmluZyB0aGF0IHNwZWNpZmllcyB0aGUgbmFtZSBvZiBhIHJhZGlvIGJ1dHRvbiBncm91cFxuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gQm9vbGVhbiB2YWx1ZSBkZXBlbmRzIG9uIHdoZXRoZXIgb3Igbm90IGF0IGxlYXN0IG9uZSByYWRpbyBpbnB1dCBoYXMgYmVlbiBzZWxlY3RlZCAoaWYgaXQncyByZXF1aXJlZClcbiAgICovXG4gIHZhbGlkYXRlUmFkaW8oZ3JvdXBOYW1lKSB7XG4gICAgLy8gSWYgYXQgbGVhc3Qgb25lIHJhZGlvIGluIHRoZSBncm91cCBoYXMgdGhlIGByZXF1aXJlZGAgYXR0cmlidXRlLCB0aGUgZ3JvdXAgaXMgY29uc2lkZXJlZCByZXF1aXJlZFxuICAgIC8vIFBlciBXM0Mgc3BlYywgYWxsIHJhZGlvIGJ1dHRvbnMgaW4gYSBncm91cCBzaG91bGQgaGF2ZSBgcmVxdWlyZWRgLCBidXQgd2UncmUgYmVpbmcgbmljZVxuICAgIHZhciAkZ3JvdXAgPSB0aGlzLiRlbGVtZW50LmZpbmQoYDpyYWRpb1tuYW1lPVwiJHtncm91cE5hbWV9XCJdYCk7XG4gICAgdmFyIHZhbGlkID0gZmFsc2UsIHJlcXVpcmVkID0gZmFsc2U7XG5cbiAgICAvLyBGb3IgdGhlIGdyb3VwIHRvIGJlIHJlcXVpcmVkLCBhdCBsZWFzdCBvbmUgcmFkaW8gbmVlZHMgdG8gYmUgcmVxdWlyZWRcbiAgICAkZ3JvdXAuZWFjaCgoaSwgZSkgPT4ge1xuICAgICAgaWYgKCQoZSkuYXR0cigncmVxdWlyZWQnKSkge1xuICAgICAgICByZXF1aXJlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYoIXJlcXVpcmVkKSB2YWxpZD10cnVlO1xuXG4gICAgaWYgKCF2YWxpZCkge1xuICAgICAgLy8gRm9yIHRoZSBncm91cCB0byBiZSB2YWxpZCwgYXQgbGVhc3Qgb25lIHJhZGlvIG5lZWRzIHRvIGJlIGNoZWNrZWRcbiAgICAgICRncm91cC5lYWNoKChpLCBlKSA9PiB7XG4gICAgICAgIGlmICgkKGUpLnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgIHZhbGlkID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB2YWxpZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmVzIGlmIGEgc2VsZWN0ZWQgaW5wdXQgcGFzc2VzIGEgY3VzdG9tIHZhbGlkYXRpb24gZnVuY3Rpb24uIE11bHRpcGxlIHZhbGlkYXRpb25zIGNhbiBiZSB1c2VkLCBpZiBwYXNzZWQgdG8gdGhlIGVsZW1lbnQgd2l0aCBgZGF0YS12YWxpZGF0b3I9XCJmb28gYmFyIGJhelwiYCBpbiBhIHNwYWNlIHNlcGFyYXRlZCBsaXN0ZWQuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSAkZWwgLSBqUXVlcnkgaW5wdXQgZWxlbWVudC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IHZhbGlkYXRvcnMgLSBhIHN0cmluZyBvZiBmdW5jdGlvbiBuYW1lcyBtYXRjaGluZyBmdW5jdGlvbnMgaW4gdGhlIEFiaWRlLm9wdGlvbnMudmFsaWRhdG9ycyBvYmplY3QuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gcmVxdWlyZWQgLSBzZWxmIGV4cGxhbmF0b3J5P1xuICAgKiBAcmV0dXJucyB7Qm9vbGVhbn0gLSB0cnVlIGlmIHZhbGlkYXRpb25zIHBhc3NlZC5cbiAgICovXG4gIG1hdGNoVmFsaWRhdGlvbigkZWwsIHZhbGlkYXRvcnMsIHJlcXVpcmVkKSB7XG4gICAgcmVxdWlyZWQgPSByZXF1aXJlZCA/IHRydWUgOiBmYWxzZTtcblxuICAgIHZhciBjbGVhciA9IHZhbGlkYXRvcnMuc3BsaXQoJyAnKS5tYXAoKHYpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLm9wdGlvbnMudmFsaWRhdG9yc1t2XSgkZWwsIHJlcXVpcmVkLCAkZWwucGFyZW50KCkpO1xuICAgIH0pO1xuICAgIHJldHVybiBjbGVhci5pbmRleE9mKGZhbHNlKSA9PT0gLTE7XG4gIH1cblxuICAvKipcbiAgICogUmVzZXRzIGZvcm0gaW5wdXRzIGFuZCBzdHlsZXNcbiAgICogQGZpcmVzIEFiaWRlI2Zvcm1yZXNldFxuICAgKi9cbiAgcmVzZXRGb3JtKCkge1xuICAgIHZhciAkZm9ybSA9IHRoaXMuJGVsZW1lbnQsXG4gICAgICAgIG9wdHMgPSB0aGlzLm9wdGlvbnM7XG5cbiAgICAkKGAuJHtvcHRzLmxhYmVsRXJyb3JDbGFzc31gLCAkZm9ybSkubm90KCdzbWFsbCcpLnJlbW92ZUNsYXNzKG9wdHMubGFiZWxFcnJvckNsYXNzKTtcbiAgICAkKGAuJHtvcHRzLmlucHV0RXJyb3JDbGFzc31gLCAkZm9ybSkubm90KCdzbWFsbCcpLnJlbW92ZUNsYXNzKG9wdHMuaW5wdXRFcnJvckNsYXNzKTtcbiAgICAkKGAke29wdHMuZm9ybUVycm9yU2VsZWN0b3J9LiR7b3B0cy5mb3JtRXJyb3JDbGFzc31gKS5yZW1vdmVDbGFzcyhvcHRzLmZvcm1FcnJvckNsYXNzKTtcbiAgICAkZm9ybS5maW5kKCdbZGF0YS1hYmlkZS1lcnJvcl0nKS5jc3MoJ2Rpc3BsYXknLCAnbm9uZScpO1xuICAgICQoJzppbnB1dCcsICRmb3JtKS5ub3QoJzpidXR0b24sIDpzdWJtaXQsIDpyZXNldCwgOmhpZGRlbiwgOnJhZGlvLCA6Y2hlY2tib3gsIFtkYXRhLWFiaWRlLWlnbm9yZV0nKS52YWwoJycpLnJlbW92ZUF0dHIoJ2RhdGEtaW52YWxpZCcpO1xuICAgICQoJzppbnB1dDpyYWRpbycsICRmb3JtKS5ub3QoJ1tkYXRhLWFiaWRlLWlnbm9yZV0nKS5wcm9wKCdjaGVja2VkJyxmYWxzZSkucmVtb3ZlQXR0cignZGF0YS1pbnZhbGlkJyk7XG4gICAgJCgnOmlucHV0OmNoZWNrYm94JywgJGZvcm0pLm5vdCgnW2RhdGEtYWJpZGUtaWdub3JlXScpLnByb3AoJ2NoZWNrZWQnLGZhbHNlKS5yZW1vdmVBdHRyKCdkYXRhLWludmFsaWQnKTtcbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBmb3JtIGhhcyBiZWVuIHJlc2V0LlxuICAgICAqIEBldmVudCBBYmlkZSNmb3JtcmVzZXRcbiAgICAgKi9cbiAgICAkZm9ybS50cmlnZ2VyKCdmb3JtcmVzZXQuemYuYWJpZGUnLCBbJGZvcm1dKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBBYmlkZS5cbiAgICogUmVtb3ZlcyBlcnJvciBzdHlsZXMgYW5kIGNsYXNzZXMgZnJvbSBlbGVtZW50cywgd2l0aG91dCByZXNldHRpbmcgdGhlaXIgdmFsdWVzLlxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5vZmYoJy5hYmlkZScpXG4gICAgICAuZmluZCgnW2RhdGEtYWJpZGUtZXJyb3JdJylcbiAgICAgICAgLmNzcygnZGlzcGxheScsICdub25lJyk7XG5cbiAgICB0aGlzLiRpbnB1dHNcbiAgICAgIC5vZmYoJy5hYmlkZScpXG4gICAgICAuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMucmVtb3ZlRXJyb3JDbGFzc2VzKCQodGhpcykpO1xuICAgICAgfSk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHNldHRpbmdzIGZvciBwbHVnaW5cbiAqL1xuQWJpZGUuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBldmVudCB0byB2YWxpZGF0ZSBpbnB1dHMuIENoZWNrYm94ZXMgYW5kIHJhZGlvcyB2YWxpZGF0ZSBpbW1lZGlhdGVseS5cbiAgICogUmVtb3ZlIG9yIGNoYW5nZSB0aGlzIHZhbHVlIGZvciBtYW51YWwgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZmllbGRDaGFuZ2UnXG4gICAqL1xuICB2YWxpZGF0ZU9uOiAnZmllbGRDaGFuZ2UnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB0byBiZSBhcHBsaWVkIHRvIGlucHV0IGxhYmVscyBvbiBmYWlsZWQgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaXMtaW52YWxpZC1sYWJlbCdcbiAgICovXG4gIGxhYmVsRXJyb3JDbGFzczogJ2lzLWludmFsaWQtbGFiZWwnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB0byBiZSBhcHBsaWVkIHRvIGlucHV0cyBvbiBmYWlsZWQgdmFsaWRhdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaXMtaW52YWxpZC1pbnB1dCdcbiAgICovXG4gIGlucHV0RXJyb3JDbGFzczogJ2lzLWludmFsaWQtaW5wdXQnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBzZWxlY3RvciB0byB1c2UgdG8gdGFyZ2V0IEZvcm0gRXJyb3JzIGZvciBzaG93L2hpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJy5mb3JtLWVycm9yJ1xuICAgKi9cbiAgZm9ybUVycm9yU2VsZWN0b3I6ICcuZm9ybS1lcnJvcicsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFkZGVkIHRvIEZvcm0gRXJyb3JzIG9uIGZhaWxlZCB2YWxpZGF0aW9uLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdpcy12aXNpYmxlJ1xuICAgKi9cbiAgZm9ybUVycm9yQ2xhc3M6ICdpcy12aXNpYmxlJyxcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgdG8gdmFsaWRhdGUgdGV4dCBpbnB1dHMgb24gYW55IHZhbHVlIGNoYW5nZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgbGl2ZVZhbGlkYXRlOiBmYWxzZSxcblxuICAvKipcbiAgICogU2V0IHRvIHRydWUgdG8gdmFsaWRhdGUgaW5wdXRzIG9uIGJsdXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHZhbGlkYXRlT25CbHVyOiBmYWxzZSxcblxuICBwYXR0ZXJuczoge1xuICAgIGFscGhhIDogL15bYS16QS1aXSskLyxcbiAgICBhbHBoYV9udW1lcmljIDogL15bYS16QS1aMC05XSskLyxcbiAgICBpbnRlZ2VyIDogL15bLStdP1xcZCskLyxcbiAgICBudW1iZXIgOiAvXlstK10/XFxkKig/OltcXC5cXCxdXFxkKyk/JC8sXG5cbiAgICAvLyBhbWV4LCB2aXNhLCBkaW5lcnNcbiAgICBjYXJkIDogL14oPzo0WzAtOV17MTJ9KD86WzAtOV17M30pP3w1WzEtNV1bMC05XXsxNH18Nig/OjAxMXw1WzAtOV1bMC05XSlbMC05XXsxMn18M1s0N11bMC05XXsxM318Myg/OjBbMC01XXxbNjhdWzAtOV0pWzAtOV17MTF9fCg/OjIxMzF8MTgwMHwzNVxcZHszfSlcXGR7MTF9KSQvLFxuICAgIGN2diA6IC9eKFswLTldKXszLDR9JC8sXG5cbiAgICAvLyBodHRwOi8vd3d3LndoYXR3Zy5vcmcvc3BlY3Mvd2ViLWFwcHMvY3VycmVudC13b3JrL211bHRpcGFnZS9zdGF0ZXMtb2YtdGhlLXR5cGUtYXR0cmlidXRlLmh0bWwjdmFsaWQtZS1tYWlsLWFkZHJlc3NcbiAgICBlbWFpbCA6IC9eW2EtekEtWjAtOS4hIyQlJicqK1xcLz0/Xl9ge3x9fi1dK0BbYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8oPzpcXC5bYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8pKyQvLFxuXG4gICAgdXJsIDogL14oaHR0cHM/fGZ0cHxmaWxlfHNzaCk6XFwvXFwvKCgoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDopKkApPygoKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKSl8KCgoW2EtekEtWl18XFxkfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpBLVpdfFxcZHxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkpKVxcLikrKChbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KChbYS16QS1aXXxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSkqKFthLXpBLVpdfFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKSkpXFwuPykoOlxcZCopPykoXFwvKCgoW2EtekEtWl18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSsoXFwvKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApKikqKT8pPyhcXD8oKChbYS16QS1aXXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFtcXHVFMDAwLVxcdUY4RkZdfFxcL3xcXD8pKik/KFxcIygoKFthLXpBLVpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCl8XFwvfFxcPykqKT8kLyxcbiAgICAvLyBhYmMuZGVcbiAgICBkb21haW4gOiAvXihbYS16QS1aMC05XShbYS16QS1aMC05XFwtXXswLDYxfVthLXpBLVowLTldKT9cXC4pK1thLXpBLVpdezIsOH0kLyxcblxuICAgIGRhdGV0aW1lIDogL14oWzAtMl1bMC05XXszfSlcXC0oWzAtMV1bMC05XSlcXC0oWzAtM11bMC05XSlUKFswLTVdWzAtOV0pXFw6KFswLTVdWzAtOV0pXFw6KFswLTVdWzAtOV0pKFp8KFtcXC1cXCtdKFswLTFdWzAtOV0pXFw6MDApKSQvLFxuICAgIC8vIFlZWVktTU0tRERcbiAgICBkYXRlIDogLyg/OjE5fDIwKVswLTldezJ9LSg/Oig/OjBbMS05XXwxWzAtMl0pLSg/OjBbMS05XXwxWzAtOV18MlswLTldKXwoPzooPyEwMikoPzowWzEtOV18MVswLTJdKS0oPzozMCkpfCg/Oig/OjBbMTM1NzhdfDFbMDJdKS0zMSkpJC8sXG4gICAgLy8gSEg6TU06U1NcbiAgICB0aW1lIDogL14oMFswLTldfDFbMC05XXwyWzAtM10pKDpbMC01XVswLTldKXsyfSQvLFxuICAgIGRhdGVJU08gOiAvXlxcZHs0fVtcXC9cXC1dXFxkezEsMn1bXFwvXFwtXVxcZHsxLDJ9JC8sXG4gICAgLy8gTU0vREQvWVlZWVxuICAgIG1vbnRoX2RheV95ZWFyIDogL14oMFsxLTldfDFbMDEyXSlbLSBcXC8uXSgwWzEtOV18WzEyXVswLTldfDNbMDFdKVstIFxcLy5dXFxkezR9JC8sXG4gICAgLy8gREQvTU0vWVlZWVxuICAgIGRheV9tb250aF95ZWFyIDogL14oMFsxLTldfFsxMl1bMC05XXwzWzAxXSlbLSBcXC8uXSgwWzEtOV18MVswMTJdKVstIFxcLy5dXFxkezR9JC8sXG5cbiAgICAvLyAjRkZGIG9yICNGRkZGRkZcbiAgICBjb2xvciA6IC9eIz8oW2EtZkEtRjAtOV17Nn18W2EtZkEtRjAtOV17M30pJC9cbiAgfSxcblxuICAvKipcbiAgICogT3B0aW9uYWwgdmFsaWRhdGlvbiBmdW5jdGlvbnMgdG8gYmUgdXNlZC4gYGVxdWFsVG9gIGJlaW5nIHRoZSBvbmx5IGRlZmF1bHQgaW5jbHVkZWQgZnVuY3Rpb24uXG4gICAqIEZ1bmN0aW9ucyBzaG91bGQgcmV0dXJuIG9ubHkgYSBib29sZWFuIGlmIHRoZSBpbnB1dCBpcyB2YWxpZCBvciBub3QuIEZ1bmN0aW9ucyBhcmUgZ2l2ZW4gdGhlIGZvbGxvd2luZyBhcmd1bWVudHM6XG4gICAqIGVsIDogVGhlIGpRdWVyeSBlbGVtZW50IHRvIHZhbGlkYXRlLlxuICAgKiByZXF1aXJlZCA6IEJvb2xlYW4gdmFsdWUgb2YgdGhlIHJlcXVpcmVkIGF0dHJpYnV0ZSBiZSBwcmVzZW50IG9yIG5vdC5cbiAgICogcGFyZW50IDogVGhlIGRpcmVjdCBwYXJlbnQgb2YgdGhlIGlucHV0LlxuICAgKiBAb3B0aW9uXG4gICAqL1xuICB2YWxpZGF0b3JzOiB7XG4gICAgZXF1YWxUbzogZnVuY3Rpb24gKGVsLCByZXF1aXJlZCwgcGFyZW50KSB7XG4gICAgICByZXR1cm4gJChgIyR7ZWwuYXR0cignZGF0YS1lcXVhbHRvJyl9YCkudmFsKCkgPT09IGVsLnZhbCgpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oQWJpZGUsICdBYmlkZScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogQWNjb3JkaW9uIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5hY2NvcmRpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKi9cblxuY2xhc3MgQWNjb3JkaW9uIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEFjY29yZGlvbiNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIGEgcGxhaW4gb2JqZWN0IHdpdGggc2V0dGluZ3MgdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgb3B0aW9ucy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgQWNjb3JkaW9uLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdBY2NvcmRpb24nKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdBY2NvcmRpb24nLCB7XG4gICAgICAnRU5URVInOiAndG9nZ2xlJyxcbiAgICAgICdTUEFDRSc6ICd0b2dnbGUnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAncHJldmlvdXMnXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGFjY29yZGlvbiBieSBhbmltYXRpbmcgdGhlIHByZXNldCBhY3RpdmUgcGFuZShzKS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cigncm9sZScsICd0YWJsaXN0Jyk7XG4gICAgdGhpcy4kdGFicyA9IHRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLWFjY29yZGlvbi1pdGVtXScpO1xuXG4gICAgdGhpcy4kdGFicy5lYWNoKGZ1bmN0aW9uKGlkeCwgZWwpIHtcbiAgICAgIHZhciAkZWwgPSAkKGVsKSxcbiAgICAgICAgICAkY29udGVudCA9ICRlbC5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyksXG4gICAgICAgICAgaWQgPSAkY29udGVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdhY2NvcmRpb24nKSxcbiAgICAgICAgICBsaW5rSWQgPSBlbC5pZCB8fCBgJHtpZH0tbGFiZWxgO1xuXG4gICAgICAkZWwuZmluZCgnYTpmaXJzdCcpLmF0dHIoe1xuICAgICAgICAnYXJpYS1jb250cm9scyc6IGlkLFxuICAgICAgICAncm9sZSc6ICd0YWInLFxuICAgICAgICAnaWQnOiBsaW5rSWQsXG4gICAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXG4gICAgICAgICdhcmlhLXNlbGVjdGVkJzogZmFsc2VcbiAgICAgIH0pO1xuXG4gICAgICAkY29udGVudC5hdHRyKHsncm9sZSc6ICd0YWJwYW5lbCcsICdhcmlhLWxhYmVsbGVkYnknOiBsaW5rSWQsICdhcmlhLWhpZGRlbic6IHRydWUsICdpZCc6IGlkfSk7XG4gICAgfSk7XG4gICAgdmFyICRpbml0QWN0aXZlID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtYWN0aXZlJykuY2hpbGRyZW4oJ1tkYXRhLXRhYi1jb250ZW50XScpO1xuICAgIGlmKCRpbml0QWN0aXZlLmxlbmd0aCl7XG4gICAgICB0aGlzLmRvd24oJGluaXRBY3RpdmUsIHRydWUpO1xuICAgIH1cbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIGFjY29yZGlvbi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHRoaXMuJHRhYnMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHZhciAkZWxlbSA9ICQodGhpcyk7XG4gICAgICB2YXIgJHRhYkNvbnRlbnQgPSAkZWxlbS5jaGlsZHJlbignW2RhdGEtdGFiLWNvbnRlbnRdJyk7XG4gICAgICBpZiAoJHRhYkNvbnRlbnQubGVuZ3RoKSB7XG4gICAgICAgICRlbGVtLmNoaWxkcmVuKCdhJykub2ZmKCdjbGljay56Zi5hY2NvcmRpb24ga2V5ZG93bi56Zi5hY2NvcmRpb24nKVxuICAgICAgICAgICAgICAgLm9uKCdjbGljay56Zi5hY2NvcmRpb24nLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLnRvZ2dsZSgkdGFiQ29udGVudCk7XG4gICAgICAgIH0pLm9uKCdrZXlkb3duLnpmLmFjY29yZGlvbicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdBY2NvcmRpb24nLCB7XG4gICAgICAgICAgICB0b2dnbGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBfdGhpcy50b2dnbGUoJHRhYkNvbnRlbnQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICB2YXIgJGEgPSAkZWxlbS5uZXh0KCkuZmluZCgnYScpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIGlmICghX3RoaXMub3B0aW9ucy5tdWx0aUV4cGFuZCkge1xuICAgICAgICAgICAgICAgICRhLnRyaWdnZXIoJ2NsaWNrLnpmLmFjY29yZGlvbicpXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHZhciAkYSA9ICRlbGVtLnByZXYoKS5maW5kKCdhJykuZm9jdXMoKTtcbiAgICAgICAgICAgICAgaWYgKCFfdGhpcy5vcHRpb25zLm11bHRpRXhwYW5kKSB7XG4gICAgICAgICAgICAgICAgJGEudHJpZ2dlcignY2xpY2suemYuYWNjb3JkaW9uJylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIHNlbGVjdGVkIGNvbnRlbnQgcGFuZSdzIG9wZW4vY2xvc2Ugc3RhdGUuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0galF1ZXJ5IG9iamVjdCBvZiB0aGUgcGFuZSB0byB0b2dnbGUgKGAuYWNjb3JkaW9uLWNvbnRlbnRgKS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICB0b2dnbGUoJHRhcmdldCkge1xuICAgIGlmKCR0YXJnZXQucGFyZW50KCkuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKSB7XG4gICAgICB0aGlzLnVwKCR0YXJnZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmRvd24oJHRhcmdldCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBhY2NvcmRpb24gdGFiIGRlZmluZWQgYnkgYCR0YXJnZXRgLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIEFjY29yZGlvbiBwYW5lIHRvIG9wZW4gKGAuYWNjb3JkaW9uLWNvbnRlbnRgKS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBmaXJzdFRpbWUgLSBmbGFnIHRvIGRldGVybWluZSBpZiByZWZsb3cgc2hvdWxkIGhhcHBlbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbiNkb3duXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZG93bigkdGFyZ2V0LCBmaXJzdFRpbWUpIHtcbiAgICAkdGFyZ2V0XG4gICAgICAuYXR0cignYXJpYS1oaWRkZW4nLCBmYWxzZSlcbiAgICAgIC5wYXJlbnQoJ1tkYXRhLXRhYi1jb250ZW50XScpXG4gICAgICAuYWRkQmFjaygpXG4gICAgICAucGFyZW50KCkuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMubXVsdGlFeHBhbmQgJiYgIWZpcnN0VGltZSkge1xuICAgICAgdmFyICRjdXJyZW50QWN0aXZlID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignLmlzLWFjdGl2ZScpLmNoaWxkcmVuKCdbZGF0YS10YWItY29udGVudF0nKTtcbiAgICAgIGlmICgkY3VycmVudEFjdGl2ZS5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy51cCgkY3VycmVudEFjdGl2ZS5ub3QoJHRhcmdldCkpO1xuICAgICAgfVxuICAgIH1cblxuICAgICR0YXJnZXQuc2xpZGVEb3duKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAoKSA9PiB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIHdoZW4gdGhlIHRhYiBpcyBkb25lIG9wZW5pbmcuXG4gICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uI2Rvd25cbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdkb3duLnpmLmFjY29yZGlvbicsIFskdGFyZ2V0XSk7XG4gICAgfSk7XG5cbiAgICAkKGAjJHskdGFyZ2V0LmF0dHIoJ2FyaWEtbGFiZWxsZWRieScpfWApLmF0dHIoe1xuICAgICAgJ2FyaWEtZXhwYW5kZWQnOiB0cnVlLFxuICAgICAgJ2FyaWEtc2VsZWN0ZWQnOiB0cnVlXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSB0YWIgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gQWNjb3JkaW9uIHRhYiB0byBjbG9zZSAoYC5hY2NvcmRpb24tY29udGVudGApLlxuICAgKiBAZmlyZXMgQWNjb3JkaW9uI3VwXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdXAoJHRhcmdldCkge1xuICAgIHZhciAkYXVudHMgPSAkdGFyZ2V0LnBhcmVudCgpLnNpYmxpbmdzKCksXG4gICAgICAgIF90aGlzID0gdGhpcztcblxuICAgIGlmKCghdGhpcy5vcHRpb25zLmFsbG93QWxsQ2xvc2VkICYmICEkYXVudHMuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpKSB8fCAhJHRhcmdldC5wYXJlbnQoKS5oYXNDbGFzcygnaXMtYWN0aXZlJykpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBGb3VuZGF0aW9uLk1vdmUodGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsICR0YXJnZXQsIGZ1bmN0aW9uKCl7XG4gICAgICAkdGFyZ2V0LnNsaWRlVXAoX3RoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSB0YWIgaXMgZG9uZSBjb2xsYXBzaW5nIHVwLlxuICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uI3VwXG4gICAgICAgICAqL1xuICAgICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd1cC56Zi5hY2NvcmRpb24nLCBbJHRhcmdldF0pO1xuICAgICAgfSk7XG4gICAgLy8gfSk7XG5cbiAgICAkdGFyZ2V0LmF0dHIoJ2FyaWEtaGlkZGVuJywgdHJ1ZSlcbiAgICAgICAgICAgLnBhcmVudCgpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICQoYCMkeyR0YXJnZXQuYXR0cignYXJpYS1sYWJlbGxlZGJ5Jyl9YCkuYXR0cih7XG4gICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2UsXG4gICAgICdhcmlhLXNlbGVjdGVkJzogZmFsc2VcbiAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGFuIGFjY29yZGlvbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbiNkZXN0cm95ZWRcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtdGFiLWNvbnRlbnRdJykuc3RvcCh0cnVlKS5zbGlkZVVwKDApLmNzcygnZGlzcGxheScsICcnKTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJy56Zi5hY2NvcmRpb24nKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5BY2NvcmRpb24uZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBhbmltYXRlIHRoZSBvcGVuaW5nIG9mIGFuIGFjY29yZGlvbiBwYW5lLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1MFxuICAgKi9cbiAgc2xpZGVTcGVlZDogMjUwLFxuICAvKipcbiAgICogQWxsb3cgdGhlIGFjY29yZGlvbiB0byBoYXZlIG11bHRpcGxlIG9wZW4gcGFuZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIG11bHRpRXhwYW5kOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFsbG93IHRoZSBhY2NvcmRpb24gdG8gY2xvc2UgYWxsIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhbGxvd0FsbENsb3NlZDogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihBY2NvcmRpb24sICdBY2NvcmRpb24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEFjY29yZGlvbk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmFjY29yZGlvbk1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBBY2NvcmRpb25NZW51IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgQWNjb3JkaW9uTWVudSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIGludG8gYW4gYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgQWNjb3JkaW9uTWVudS5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkZlYXRoZXIodGhpcy4kZWxlbWVudCwgJ2FjY29yZGlvbicpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnQWNjb3JkaW9uTWVudScpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ0FjY29yZGlvbk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAndG9nZ2xlJyxcbiAgICAgICdTUEFDRSc6ICd0b2dnbGUnLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ2Rvd24nLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAnY2xvc2UnLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZUFsbCdcbiAgICB9KTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIGFjY29yZGlvbiBtZW51IGJ5IGhpZGluZyBhbGwgbmVzdGVkIG1lbnVzLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zdWJtZW51XScpLm5vdCgnLmlzLWFjdGl2ZScpLnNsaWRlVXAoMCk7Ly8uZmluZCgnYScpLmNzcygncGFkZGluZy1sZWZ0JywgJzFyZW0nKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ3JvbGUnOiAnbWVudScsXG4gICAgICAnYXJpYS1tdWx0aXNlbGVjdGFibGUnOiB0aGlzLm9wdGlvbnMubXVsdGlPcGVuXG4gICAgfSk7XG5cbiAgICB0aGlzLiRtZW51TGlua3MgPSB0aGlzLiRlbGVtZW50LmZpbmQoJy5pcy1hY2NvcmRpb24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRtZW51TGlua3MuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyIGxpbmtJZCA9IHRoaXMuaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnYWNjLW1lbnUtbGluaycpLFxuICAgICAgICAgICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyksXG4gICAgICAgICAgc3ViSWQgPSAkc3ViWzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ2FjYy1tZW51JyksXG4gICAgICAgICAgaXNBY3RpdmUgPSAkc3ViLmhhc0NsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICRlbGVtLmF0dHIoe1xuICAgICAgICAnYXJpYS1jb250cm9scyc6IHN1YklkLFxuICAgICAgICAnYXJpYS1leHBhbmRlZCc6IGlzQWN0aXZlLFxuICAgICAgICAncm9sZSc6ICdtZW51aXRlbScsXG4gICAgICAgICdpZCc6IGxpbmtJZFxuICAgICAgfSk7XG4gICAgICAkc3ViLmF0dHIoe1xuICAgICAgICAnYXJpYS1sYWJlbGxlZGJ5JzogbGlua0lkLFxuICAgICAgICAnYXJpYS1oaWRkZW4nOiAhaXNBY3RpdmUsXG4gICAgICAgICdyb2xlJzogJ21lbnUnLFxuICAgICAgICAnaWQnOiBzdWJJZFxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdmFyIGluaXRQYW5lcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpO1xuICAgIGlmKGluaXRQYW5lcy5sZW5ndGgpe1xuICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgIGluaXRQYW5lcy5lYWNoKGZ1bmN0aW9uKCl7XG4gICAgICAgIF90aGlzLmRvd24oJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5fZXZlbnRzKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyBmb3IgaXRlbXMgd2l0aGluIHRoZSBtZW51LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdsaScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgJHN1Ym1lbnUgPSAkKHRoaXMpLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpO1xuXG4gICAgICBpZiAoJHN1Ym1lbnUubGVuZ3RoKSB7XG4gICAgICAgICQodGhpcykuY2hpbGRyZW4oJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKS5vbignY2xpY2suemYuYWNjb3JkaW9uTWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICBfdGhpcy50b2dnbGUoJHN1Ym1lbnUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KS5vbigna2V5ZG93bi56Zi5hY2NvcmRpb25tZW51JywgZnVuY3Rpb24oZSl7XG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAgICRlbGVtZW50cyA9ICRlbGVtZW50LnBhcmVudCgndWwnKS5jaGlsZHJlbignbGknKSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50LFxuICAgICAgICAgICR0YXJnZXQgPSAkZWxlbWVudC5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKTtcblxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSkuZmluZCgnYScpLmZpcnN0KCk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSkuZmluZCgnYScpLmZpcnN0KCk7XG5cbiAgICAgICAgICBpZiAoJCh0aGlzKS5jaGlsZHJlbignW2RhdGEtc3VibWVudV06dmlzaWJsZScpLmxlbmd0aCkgeyAvLyBoYXMgb3BlbiBzdWIgbWVudVxuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnQuZmluZCgnbGk6Zmlyc3QtY2hpbGQnKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCQodGhpcykuaXMoJzpmaXJzdC1jaGlsZCcpKSB7IC8vIGlzIGZpcnN0IGVsZW1lbnQgb2Ygc3ViIG1lbnVcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRwcmV2RWxlbWVudC5wYXJlbnRzKCdsaScpLmZpcnN0KCkuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdOnZpc2libGUnKS5sZW5ndGgpIHsgLy8gaWYgcHJldmlvdXMgZWxlbWVudCBoYXMgb3BlbiBzdWIgbWVudVxuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJHByZXZFbGVtZW50LnBhcmVudHMoJ2xpJykuZmluZCgnbGk6bGFzdC1jaGlsZCcpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoJCh0aGlzKS5pcygnOmxhc3QtY2hpbGQnKSkgeyAvLyBpcyBsYXN0IGVsZW1lbnQgb2Ygc3ViIG1lbnVcbiAgICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5uZXh0KCdsaScpLmZpbmQoJ2EnKS5maXJzdCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdBY2NvcmRpb25NZW51Jywge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgICAgICBfdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgICAgICAgJHRhcmdldC5maW5kKCdsaScpLmZpcnN0KCkuZmluZCgnYScpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJHRhcmdldC5sZW5ndGggJiYgISR0YXJnZXQuaXMoJzpoaWRkZW4nKSkgeyAvLyBjbG9zZSBhY3RpdmUgc3ViIG9mIHRoaXMgaXRlbVxuICAgICAgICAgICAgX3RoaXMudXAoJHRhcmdldCk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkZWxlbWVudC5wYXJlbnQoJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7IC8vIGNsb3NlIGN1cnJlbnRseSBvcGVuIHN1YlxuICAgICAgICAgICAgX3RoaXMudXAoJGVsZW1lbnQucGFyZW50KCdbZGF0YS1zdWJtZW51XScpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudHMoJ2xpJykuZmlyc3QoKS5maW5kKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgdXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICRwcmV2RWxlbWVudC5mb2N1cygpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBkb3duOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkbmV4dEVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBpZiAoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBfdGhpcy50b2dnbGUoJGVsZW1lbnQuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2VBbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmhpZGVBbGwoKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGFuZGxlZDogZnVuY3Rpb24ocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICBpZiAocHJldmVudERlZmF1bHQpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7Ly8uYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgYWxsIHBhbmVzIG9mIHRoZSBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGhpZGVBbGwoKSB7XG4gICAgdGhpcy51cCh0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGFsbCBwYW5lcyBvZiB0aGUgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzaG93QWxsKCkge1xuICAgIHRoaXMuZG93bih0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9wZW4vY2xvc2Ugc3RhdGUgb2YgYSBzdWJtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtqUXVlcnl9ICR0YXJnZXQgLSB0aGUgc3VibWVudSB0byB0b2dnbGVcbiAgICovXG4gIHRvZ2dsZSgkdGFyZ2V0KXtcbiAgICBpZighJHRhcmdldC5pcygnOmFuaW1hdGVkJykpIHtcbiAgICAgIGlmICghJHRhcmdldC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgIHRoaXMudXAoJHRhcmdldCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5kb3duKCR0YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgc3ViLW1lbnUgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gb3Blbi5cbiAgICogQGZpcmVzIEFjY29yZGlvbk1lbnUjZG93blxuICAgKi9cbiAgZG93bigkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmKCF0aGlzLm9wdGlvbnMubXVsdGlPcGVuKSB7XG4gICAgICB0aGlzLnVwKHRoaXMuJGVsZW1lbnQuZmluZCgnLmlzLWFjdGl2ZScpLm5vdCgkdGFyZ2V0LnBhcmVudHNVbnRpbCh0aGlzLiRlbGVtZW50KS5hZGQoJHRhcmdldCkpKTtcbiAgICB9XG5cbiAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKS5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pXG4gICAgICAucGFyZW50KCcuaXMtYWNjb3JkaW9uLXN1Ym1lbnUtcGFyZW50JykuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG5cbiAgICAgIC8vRm91bmRhdGlvbi5Nb3ZlKHRoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCAkdGFyZ2V0LCBmdW5jdGlvbigpIHtcbiAgICAgICAgJHRhcmdldC5zbGlkZURvd24oX3RoaXMub3B0aW9ucy5zbGlkZVNwZWVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLyoqXG4gICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBkb25lIG9wZW5pbmcuXG4gICAgICAgICAgICogQGV2ZW50IEFjY29yZGlvbk1lbnUjZG93blxuICAgICAgICAgICAqL1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Rvd24uemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICAgIH0pO1xuICAgICAgLy99KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbG9zZXMgdGhlIHN1Yi1tZW51IGRlZmluZWQgYnkgYCR0YXJnZXRgLiBBbGwgc3ViLW1lbnVzIGluc2lkZSB0aGUgdGFyZ2V0IHdpbGwgYmUgY2xvc2VkIGFzIHdlbGwuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gU3ViLW1lbnUgdG8gY2xvc2UuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I3VwXG4gICAqL1xuICB1cCgkdGFyZ2V0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAvL0ZvdW5kYXRpb24uTW92ZSh0aGlzLm9wdGlvbnMuc2xpZGVTcGVlZCwgJHRhcmdldCwgZnVuY3Rpb24oKXtcbiAgICAgICR0YXJnZXQuc2xpZGVVcChfdGhpcy5vcHRpb25zLnNsaWRlU3BlZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIG1lbnUgaXMgZG9uZSBjb2xsYXBzaW5nIHVwLlxuICAgICAgICAgKiBAZXZlbnQgQWNjb3JkaW9uTWVudSN1cFxuICAgICAgICAgKi9cbiAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcigndXAuemYuYWNjb3JkaW9uTWVudScsIFskdGFyZ2V0XSk7XG4gICAgICB9KTtcbiAgICAvL30pO1xuXG4gICAgdmFyICRtZW51cyA9ICR0YXJnZXQuZmluZCgnW2RhdGEtc3VibWVudV0nKS5zbGlkZVVwKDApLmFkZEJhY2soKS5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuXG4gICAgJG1lbnVzLnBhcmVudCgnLmlzLWFjY29yZGlvbi1zdWJtZW51LXBhcmVudCcpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYWNjb3JkaW9uIG1lbnUuXG4gICAqIEBmaXJlcyBBY2NvcmRpb25NZW51I2Rlc3Ryb3llZFxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXN1Ym1lbnVdJykuc2xpZGVEb3duKDApLmNzcygnZGlzcGxheScsICcnKTtcbiAgICB0aGlzLiRlbGVtZW50LmZpbmQoJ2EnKS5vZmYoJ2NsaWNrLnpmLmFjY29yZGlvbk1lbnUnKTtcblxuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdhY2NvcmRpb24nKTtcbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuQWNjb3JkaW9uTWVudS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGFuaW1hdGUgdGhlIG9wZW5pbmcgb2YgYSBzdWJtZW51IGluIG1zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDI1MFxuICAgKi9cbiAgc2xpZGVTcGVlZDogMjUwLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gaGF2ZSBtdWx0aXBsZSBvcGVuIHBhbmVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIG11bHRpT3BlbjogdHJ1ZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEFjY29yZGlvbk1lbnUsICdBY2NvcmRpb25NZW51Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcmlsbGRvd24gbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyaWxsZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubmVzdFxuICovXG5cbmNsYXNzIERyaWxsZG93biB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgZHJpbGxkb3duIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGFuIGFjY29yZGlvbiBtZW51LlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIERyaWxsZG93bi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgRm91bmRhdGlvbi5OZXN0LkZlYXRoZXIodGhpcy4kZWxlbWVudCwgJ2RyaWxsZG93bicpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnRHJpbGxkb3duJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignRHJpbGxkb3duJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3VwJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ2Rvd24nLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnLFxuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZScsXG4gICAgICAnVEFCJzogJ2Rvd24nLFxuICAgICAgJ1NISUZUX1RBQic6ICd1cCdcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgZHJpbGxkb3duIGJ5IGNyZWF0aW5nIGpRdWVyeSBjb2xsZWN0aW9ucyBvZiBlbGVtZW50c1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2xpLmlzLWRyaWxsZG93bi1zdWJtZW51LXBhcmVudCcpLmNoaWxkcmVuKCdhJyk7XG4gICAgdGhpcy4kc3VibWVudXMgPSB0aGlzLiRzdWJtZW51QW5jaG9ycy5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJyk7XG4gICAgdGhpcy4kbWVudUl0ZW1zID0gdGhpcy4kZWxlbWVudC5maW5kKCdsaScpLm5vdCgnLmpzLWRyaWxsZG93bi1iYWNrJykuYXR0cigncm9sZScsICdtZW51aXRlbScpLmZpbmQoJ2EnKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtbXV0YXRlJywgKHRoaXMuJGVsZW1lbnQuYXR0cignZGF0YS1kcmlsbGRvd24nKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdkcmlsbGRvd24nKSkpO1xuXG4gICAgdGhpcy5fcHJlcGFyZU1lbnUoKTtcbiAgICB0aGlzLl9yZWdpc3RlckV2ZW50cygpO1xuXG4gICAgdGhpcy5fa2V5Ym9hcmRFdmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBwcmVwYXJlcyBkcmlsbGRvd24gbWVudSBieSBzZXR0aW5nIGF0dHJpYnV0ZXMgdG8gbGlua3MgYW5kIGVsZW1lbnRzXG4gICAqIHNldHMgYSBtaW4gaGVpZ2h0IHRvIHByZXZlbnQgY29udGVudCBqdW1waW5nXG4gICAqIHdyYXBzIHRoZSBlbGVtZW50IGlmIG5vdCBhbHJlYWR5IHdyYXBwZWRcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfcHJlcGFyZU1lbnUoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAvLyBpZighdGhpcy5vcHRpb25zLmhvbGRPcGVuKXtcbiAgICAvLyAgIHRoaXMuX21lbnVMaW5rRXZlbnRzKCk7XG4gICAgLy8gfVxuICAgIHRoaXMuJHN1Ym1lbnVBbmNob3JzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkbGluayA9ICQodGhpcyk7XG4gICAgICB2YXIgJHN1YiA9ICRsaW5rLnBhcmVudCgpO1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5wYXJlbnRMaW5rKXtcbiAgICAgICAgJGxpbmsuY2xvbmUoKS5wcmVwZW5kVG8oJHN1Yi5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKSkud3JhcCgnPGxpIGNsYXNzPVwiaXMtc3VibWVudS1wYXJlbnQtaXRlbSBpcy1zdWJtZW51LWl0ZW0gaXMtZHJpbGxkb3duLXN1Ym1lbnUtaXRlbVwiIHJvbGU9XCJtZW51LWl0ZW1cIj48L2xpPicpO1xuICAgICAgfVxuICAgICAgJGxpbmsuZGF0YSgnc2F2ZWRIcmVmJywgJGxpbmsuYXR0cignaHJlZicpKS5yZW1vdmVBdHRyKCdocmVmJykuYXR0cigndGFiaW5kZXgnLCAwKTtcbiAgICAgICRsaW5rLmNoaWxkcmVuKCdbZGF0YS1zdWJtZW51XScpXG4gICAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICAgICAgICd0YWJpbmRleCc6IDAsXG4gICAgICAgICAgICAncm9sZSc6ICdtZW51J1xuICAgICAgICAgIH0pO1xuICAgICAgX3RoaXMuX2V2ZW50cygkbGluayk7XG4gICAgfSk7XG4gICAgdGhpcy4kc3VibWVudXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRtZW51ID0gJCh0aGlzKSxcbiAgICAgICAgICAkYmFjayA9ICRtZW51LmZpbmQoJy5qcy1kcmlsbGRvd24tYmFjaycpO1xuICAgICAgaWYoISRiYWNrLmxlbmd0aCl7XG4gICAgICAgIHN3aXRjaCAoX3RoaXMub3B0aW9ucy5iYWNrQnV0dG9uUG9zaXRpb24pIHtcbiAgICAgICAgICBjYXNlIFwiYm90dG9tXCI6XG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoX3RoaXMub3B0aW9ucy5iYWNrQnV0dG9uKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgXCJ0b3BcIjpcbiAgICAgICAgICAgICRtZW51LnByZXBlbmQoX3RoaXMub3B0aW9ucy5iYWNrQnV0dG9uKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVW5zdXBwb3J0ZWQgYmFja0J1dHRvblBvc2l0aW9uIHZhbHVlICdcIiArIF90aGlzLm9wdGlvbnMuYmFja0J1dHRvblBvc2l0aW9uICsgXCInXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBfdGhpcy5fYmFjaygkbWVudSk7XG4gICAgfSk7XG5cbiAgICBpZighdGhpcy5vcHRpb25zLmF1dG9IZWlnaHQpIHtcbiAgICAgIHRoaXMuJHN1Ym1lbnVzLmFkZENsYXNzKCdkcmlsbGRvd24tc3VibWVudS1jb3Zlci1wcmV2aW91cycpO1xuICAgIH1cblxuICAgIGlmKCF0aGlzLiRlbGVtZW50LnBhcmVudCgpLmhhc0NsYXNzKCdpcy1kcmlsbGRvd24nKSl7XG4gICAgICB0aGlzLiR3cmFwcGVyID0gJCh0aGlzLm9wdGlvbnMud3JhcHBlcikuYWRkQ2xhc3MoJ2lzLWRyaWxsZG93bicpO1xuICAgICAgaWYodGhpcy5vcHRpb25zLmFuaW1hdGVIZWlnaHQpIHRoaXMuJHdyYXBwZXIuYWRkQ2xhc3MoJ2FuaW1hdGUtaGVpZ2h0Jyk7XG4gICAgICB0aGlzLiR3cmFwcGVyID0gdGhpcy4kZWxlbWVudC53cmFwKHRoaXMuJHdyYXBwZXIpLnBhcmVudCgpLmNzcyh0aGlzLl9nZXRNYXhEaW1zKCkpO1xuICAgIH1cbiAgfVxuXG4gIF9yZXNpemUoKSB7XG4gICAgdGhpcy4kd3JhcHBlci5jc3MoeydtYXgtd2lkdGgnOiAnbm9uZScsICdtaW4taGVpZ2h0JzogJ25vbmUnfSk7XG4gICAgLy8gX2dldE1heERpbXMgaGFzIHNpZGUgZWZmZWN0cyAoYm9vKSBidXQgY2FsbGluZyBpdCBzaG91bGQgdXBkYXRlIGFsbCBvdGhlciBuZWNlc3NhcnkgaGVpZ2h0cyAmIHdpZHRoc1xuICAgIHRoaXMuJHdyYXBwZXIuY3NzKHRoaXMuX2dldE1heERpbXMoKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyB0byBlbGVtZW50cyBpbiB0aGUgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IG1lbnUgaXRlbSB0byBhZGQgaGFuZGxlcnMgdG8uXG4gICAqL1xuICBfZXZlbnRzKCRlbGVtKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICRlbGVtLm9mZignY2xpY2suemYuZHJpbGxkb3duJylcbiAgICAub24oJ2NsaWNrLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgaWYoJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsICdsaScpLmhhc0NsYXNzKCdpcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKSl7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH1cblxuICAgICAgLy8gaWYoZS50YXJnZXQgIT09IGUuY3VycmVudFRhcmdldC5maXJzdEVsZW1lbnRDaGlsZCl7XG4gICAgICAvLyAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIH1cbiAgICAgIF90aGlzLl9zaG93KCRlbGVtLnBhcmVudCgnbGknKSk7XG5cbiAgICAgIGlmKF90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKXtcbiAgICAgICAgdmFyICRib2R5ID0gJCgnYm9keScpO1xuICAgICAgICAkYm9keS5vZmYoJy56Zi5kcmlsbGRvd24nKS5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgICAgaWYgKGUudGFyZ2V0ID09PSBfdGhpcy4kZWxlbWVudFswXSB8fCAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLl9oaWRlQWxsKCk7XG4gICAgICAgICAgJGJvZHkub2ZmKCcuemYuZHJpbGxkb3duJyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuXHQgIHRoaXMuJGVsZW1lbnQub24oJ211dGF0ZW1lLnpmLnRyaWdnZXInLCB0aGlzLl9yZXNpemUuYmluZCh0aGlzKSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBoYW5kbGVycyB0byB0aGUgbWVudSBlbGVtZW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWdpc3RlckV2ZW50cygpIHtcbiAgICBpZih0aGlzLm9wdGlvbnMuc2Nyb2xsVG9wKXtcbiAgICAgIHRoaXMuX2JpbmRIYW5kbGVyID0gdGhpcy5fc2Nyb2xsVG9wLmJpbmQodGhpcyk7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdvcGVuLnpmLmRyaWxsZG93biBoaWRlLnpmLmRyaWxsZG93biBjbG9zZWQuemYuZHJpbGxkb3duJyx0aGlzLl9iaW5kSGFuZGxlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNjcm9sbCB0byBUb3Agb2YgRWxlbWVudCBvciBkYXRhLXNjcm9sbC10b3AtZWxlbWVudFxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNzY3JvbGxtZVxuICAgKi9cbiAgX3Njcm9sbFRvcCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciAkc2Nyb2xsVG9wRWxlbWVudCA9IF90aGlzLm9wdGlvbnMuc2Nyb2xsVG9wRWxlbWVudCE9Jyc/JChfdGhpcy5vcHRpb25zLnNjcm9sbFRvcEVsZW1lbnQpOl90aGlzLiRlbGVtZW50LFxuICAgICAgICBzY3JvbGxQb3MgPSBwYXJzZUludCgkc2Nyb2xsVG9wRWxlbWVudC5vZmZzZXQoKS50b3ArX3RoaXMub3B0aW9ucy5zY3JvbGxUb3BPZmZzZXQpO1xuICAgICQoJ2h0bWwsIGJvZHknKS5zdG9wKHRydWUpLmFuaW1hdGUoeyBzY3JvbGxUb3A6IHNjcm9sbFBvcyB9LCBfdGhpcy5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uLCBfdGhpcy5vcHRpb25zLmFuaW1hdGlvbkVhc2luZyxmdW5jdGlvbigpe1xuICAgICAgLyoqXG4gICAgICAgICogRmlyZXMgYWZ0ZXIgdGhlIG1lbnUgaGFzIHNjcm9sbGVkXG4gICAgICAgICogQGV2ZW50IERyaWxsZG93biNzY3JvbGxtZVxuICAgICAgICAqL1xuICAgICAgaWYodGhpcz09PSQoJ2h0bWwnKVswXSlfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzY3JvbGxtZS56Zi5kcmlsbGRvd24nKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGtleWRvd24gZXZlbnQgbGlzdGVuZXIgdG8gYGxpYCdzIGluIHRoZSBtZW51LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2tleWJvYXJkRXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMuYWRkKHRoaXMuJGVsZW1lbnQuZmluZCgnLmpzLWRyaWxsZG93bi1iYWNrID4gYSwgLmlzLXN1Ym1lbnUtcGFyZW50LWl0ZW0gPiBhJykpLm9uKCdrZXlkb3duLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgdmFyICRlbGVtZW50ID0gJCh0aGlzKSxcbiAgICAgICAgICAkZWxlbWVudHMgPSAkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpLmNoaWxkcmVuKCdsaScpLmNoaWxkcmVuKCdhJyksXG4gICAgICAgICAgJHByZXZFbGVtZW50LFxuICAgICAgICAgICRuZXh0RWxlbWVudDtcblxuICAgICAgJGVsZW1lbnRzLmVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgICBpZiAoJCh0aGlzKS5pcygkZWxlbWVudCkpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQgPSAkZWxlbWVudHMuZXEoTWF0aC5tYXgoMCwgaS0xKSk7XG4gICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0RyaWxsZG93bicsIHtcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCRlbGVtZW50LmlzKF90aGlzLiRzdWJtZW51QW5jaG9ycykpIHtcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtZW50LnBhcmVudCgnbGknKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5maW5kKCd1bCBsaSBhJykuZmlsdGVyKF90aGlzLiRtZW51SXRlbXMpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwcmV2aW91czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKSk7XG4gICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5vbmUoRm91bmRhdGlvbi50cmFuc2l0aW9uZW5kKCRlbGVtZW50KSwgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpLmNoaWxkcmVuKCdhJykuZmlyc3QoKS5mb2N1cygpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIHVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQuZm9jdXMoKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgZG93bjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmZvY3VzKCk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0sXG4gICAgICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBfdGhpcy5fYmFjaygpO1xuICAgICAgICAgIC8vX3RoaXMuJG1lbnVJdGVtcy5maXJzdCgpLmZvY3VzKCk7IC8vIGZvY3VzIHRvIGZpcnN0IGVsZW1lbnRcbiAgICAgICAgfSxcbiAgICAgICAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKCEkZWxlbWVudC5pcyhfdGhpcy4kbWVudUl0ZW1zKSkgeyAvLyBub3QgbWVudSBpdGVtIG1lYW5zIGJhY2sgYnV0dG9uXG4gICAgICAgICAgICBfdGhpcy5faGlkZSgkZWxlbWVudC5wYXJlbnQoJ2xpJykucGFyZW50KCd1bCcpKTtcbiAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJGVsZW1lbnQucGFyZW50KCdsaScpLnBhcmVudCgndWwnKS5wYXJlbnQoJ2xpJykuY2hpbGRyZW4oJ2EnKS5maXJzdCgpLmZvY3VzKCk7XG4gICAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCRlbGVtZW50LmlzKF90aGlzLiRzdWJtZW51QW5jaG9ycykpIHtcbiAgICAgICAgICAgIF90aGlzLl9zaG93KCRlbGVtZW50LnBhcmVudCgnbGknKSk7XG4gICAgICAgICAgICAkZWxlbWVudC5wYXJlbnQoJ2xpJykub25lKEZvdW5kYXRpb24udHJhbnNpdGlvbmVuZCgkZWxlbWVudCksIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICRlbGVtZW50LnBhcmVudCgnbGknKS5maW5kKCd1bCBsaSBhJykuZmlsdGVyKF90aGlzLiRtZW51SXRlbXMpLmZpcnN0KCkuZm9jdXMoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbihwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgIGlmIChwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTsgLy8gZW5kIGtleWJvYXJkQWNjZXNzXG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIGFsbCBvcGVuIGVsZW1lbnRzLCBhbmQgcmV0dXJucyB0byByb290IG1lbnUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJpbGxkb3duI2Nsb3NlZFxuICAgKi9cbiAgX2hpZGVBbGwoKSB7XG4gICAgdmFyICRlbGVtID0gdGhpcy4kZWxlbWVudC5maW5kKCcuaXMtZHJpbGxkb3duLXN1Ym1lbnUuaXMtYWN0aXZlJykuYWRkQ2xhc3MoJ2lzLWNsb3NpbmcnKTtcbiAgICBpZih0aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkgdGhpcy4kd3JhcHBlci5jc3Moe2hlaWdodDokZWxlbS5wYXJlbnQoKS5jbG9zZXN0KCd1bCcpLmRhdGEoJ2NhbGNIZWlnaHQnKX0pO1xuICAgICRlbGVtLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbihlKXtcbiAgICAgICRlbGVtLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUgaXMtY2xvc2luZycpO1xuICAgIH0pO1xuICAgICAgICAvKipcbiAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgbWVudSBpcyBmdWxseSBjbG9zZWQuXG4gICAgICAgICAqIEBldmVudCBEcmlsbGRvd24jY2xvc2VkXG4gICAgICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VkLnpmLmRyaWxsZG93bicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXIgZm9yIGVhY2ggYGJhY2tgIGJ1dHRvbiwgYW5kIGNsb3NlcyBvcGVuIG1lbnVzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNiYWNrXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IHN1Yi1tZW51IHRvIGFkZCBgYmFja2AgZXZlbnQuXG4gICAqL1xuICBfYmFjaygkZWxlbSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgJGVsZW0ub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKTtcbiAgICAkZWxlbS5jaGlsZHJlbignLmpzLWRyaWxsZG93bi1iYWNrJylcbiAgICAgIC5vbignY2xpY2suemYuZHJpbGxkb3duJywgZnVuY3Rpb24oZSl7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdtb3VzZXVwIG9uIGJhY2snKTtcbiAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuXG4gICAgICAgIC8vIElmIHRoZXJlIGlzIGEgcGFyZW50IHN1Ym1lbnUsIGNhbGwgc2hvd1xuICAgICAgICBsZXQgcGFyZW50U3ViTWVudSA9ICRlbGVtLnBhcmVudCgnbGknKS5wYXJlbnQoJ3VsJykucGFyZW50KCdsaScpO1xuICAgICAgICBpZiAocGFyZW50U3ViTWVudS5sZW5ndGgpIHtcbiAgICAgICAgICBfdGhpcy5fc2hvdyhwYXJlbnRTdWJNZW51KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lciB0byBtZW51IGl0ZW1zIHcvbyBzdWJtZW51cyB0byBjbG9zZSBvcGVuIG1lbnVzIG9uIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9tZW51TGlua0V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuJG1lbnVJdGVtcy5ub3QoJy5pcy1kcmlsbGRvd24tc3VibWVudS1wYXJlbnQnKVxuICAgICAgICAub2ZmKCdjbGljay56Zi5kcmlsbGRvd24nKVxuICAgICAgICAub24oJ2NsaWNrLnpmLmRyaWxsZG93bicsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIC8vIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3RoaXMuX2hpZGVBbGwoKTtcbiAgICAgICAgICB9LCAwKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIGEgc3VibWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBEcmlsbGRvd24jb3BlblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSB0aGUgY3VycmVudCBlbGVtZW50IHdpdGggYSBzdWJtZW51IHRvIG9wZW4sIGkuZS4gdGhlIGBsaWAgdGFnLlxuICAgKi9cbiAgX3Nob3coJGVsZW0pIHtcbiAgICBpZih0aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkgdGhpcy4kd3JhcHBlci5jc3Moe2hlaWdodDokZWxlbS5jaGlsZHJlbignW2RhdGEtc3VibWVudV0nKS5kYXRhKCdjYWxjSGVpZ2h0Jyl9KTtcbiAgICAkZWxlbS5hdHRyKCdhcmlhLWV4cGFuZGVkJywgdHJ1ZSk7XG4gICAgJGVsZW0uY2hpbGRyZW4oJ1tkYXRhLXN1Ym1lbnVdJykuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmF0dHIoJ2FyaWEtaGlkZGVuJywgZmFsc2UpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHN1Ym1lbnUgaGFzIG9wZW5lZC5cbiAgICAgKiBAZXZlbnQgRHJpbGxkb3duI29wZW5cbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ29wZW4uemYuZHJpbGxkb3duJywgWyRlbGVtXSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEhpZGVzIGEgc3VibWVudVxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIERyaWxsZG93biNoaWRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbSAtIHRoZSBjdXJyZW50IHN1Yi1tZW51IHRvIGhpZGUsIGkuZS4gdGhlIGB1bGAgdGFnLlxuICAgKi9cbiAgX2hpZGUoJGVsZW0pIHtcbiAgICBpZih0aGlzLm9wdGlvbnMuYXV0b0hlaWdodCkgdGhpcy4kd3JhcHBlci5jc3Moe2hlaWdodDokZWxlbS5wYXJlbnQoKS5jbG9zZXN0KCd1bCcpLmRhdGEoJ2NhbGNIZWlnaHQnKX0pO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgJGVsZW0ucGFyZW50KCdsaScpLmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBmYWxzZSk7XG4gICAgJGVsZW0uYXR0cignYXJpYS1oaWRkZW4nLCB0cnVlKS5hZGRDbGFzcygnaXMtY2xvc2luZycpXG4gICAgJGVsZW0uYWRkQ2xhc3MoJ2lzLWNsb3NpbmcnKVxuICAgICAgICAgLm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQoJGVsZW0pLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAkZWxlbS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcnKTtcbiAgICAgICAgICAgJGVsZW0uYmx1cigpO1xuICAgICAgICAgfSk7XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgc3VibWVudSBoYXMgY2xvc2VkLlxuICAgICAqIEBldmVudCBEcmlsbGRvd24jaGlkZVxuICAgICAqL1xuICAgICRlbGVtLnRyaWdnZXIoJ2hpZGUuemYuZHJpbGxkb3duJywgWyRlbGVtXSk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZXMgdGhyb3VnaCB0aGUgbmVzdGVkIG1lbnVzIHRvIGNhbGN1bGF0ZSB0aGUgbWluLWhlaWdodCwgYW5kIG1heC13aWR0aCBmb3IgdGhlIG1lbnUuXG4gICAqIFByZXZlbnRzIGNvbnRlbnQganVtcGluZy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZ2V0TWF4RGltcygpIHtcbiAgICB2YXIgIG1heEhlaWdodCA9IDAsIHJlc3VsdCA9IHt9LCBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kc3VibWVudXMuYWRkKHRoaXMuJGVsZW1lbnQpLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciBudW1PZkVsZW1zID0gJCh0aGlzKS5jaGlsZHJlbignbGknKS5sZW5ndGg7XG4gICAgICB2YXIgaGVpZ2h0ID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzKS5oZWlnaHQ7XG4gICAgICBtYXhIZWlnaHQgPSBoZWlnaHQgPiBtYXhIZWlnaHQgPyBoZWlnaHQgOiBtYXhIZWlnaHQ7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLmF1dG9IZWlnaHQpIHtcbiAgICAgICAgJCh0aGlzKS5kYXRhKCdjYWxjSGVpZ2h0JyxoZWlnaHQpO1xuICAgICAgICBpZiAoISQodGhpcykuaGFzQ2xhc3MoJ2lzLWRyaWxsZG93bi1zdWJtZW51JykpIHJlc3VsdFsnaGVpZ2h0J10gPSBoZWlnaHQ7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZighdGhpcy5vcHRpb25zLmF1dG9IZWlnaHQpIHJlc3VsdFsnbWluLWhlaWdodCddID0gYCR7bWF4SGVpZ2h0fXB4YDtcblxuICAgIHJlc3VsdFsnbWF4LXdpZHRoJ10gPSBgJHt0aGlzLiRlbGVtZW50WzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRofXB4YDtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIERyaWxsZG93biBNZW51XG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICBpZih0aGlzLm9wdGlvbnMuc2Nyb2xsVG9wKSB0aGlzLiRlbGVtZW50Lm9mZignLnpmLmRyaWxsZG93bicsdGhpcy5fYmluZEhhbmRsZXIpO1xuICAgIHRoaXMuX2hpZGVBbGwoKTtcblx0ICB0aGlzLiRlbGVtZW50Lm9mZignbXV0YXRlbWUuemYudHJpZ2dlcicpO1xuICAgIEZvdW5kYXRpb24uTmVzdC5CdXJuKHRoaXMuJGVsZW1lbnQsICdkcmlsbGRvd24nKTtcbiAgICB0aGlzLiRlbGVtZW50LnVud3JhcCgpXG4gICAgICAgICAgICAgICAgIC5maW5kKCcuanMtZHJpbGxkb3duLWJhY2ssIC5pcy1zdWJtZW51LXBhcmVudC1pdGVtJykucmVtb3ZlKClcbiAgICAgICAgICAgICAgICAgLmVuZCgpLmZpbmQoJy5pcy1hY3RpdmUsIC5pcy1jbG9zaW5nLCAuaXMtZHJpbGxkb3duLXN1Ym1lbnUnKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWNsb3NpbmcgaXMtZHJpbGxkb3duLXN1Ym1lbnUnKVxuICAgICAgICAgICAgICAgICAuZW5kKCkuZmluZCgnW2RhdGEtc3VibWVudV0nKS5yZW1vdmVBdHRyKCdhcmlhLWhpZGRlbiB0YWJpbmRleCByb2xlJyk7XG4gICAgdGhpcy4kc3VibWVudUFuY2hvcnMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICQodGhpcykub2ZmKCcuemYuZHJpbGxkb3duJyk7XG4gICAgfSk7XG5cbiAgICB0aGlzLiRzdWJtZW51cy5yZW1vdmVDbGFzcygnZHJpbGxkb3duLXN1Ym1lbnUtY292ZXItcHJldmlvdXMnKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuZmluZCgnYScpLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkbGluayA9ICQodGhpcyk7XG4gICAgICAkbGluay5yZW1vdmVBdHRyKCd0YWJpbmRleCcpO1xuICAgICAgaWYoJGxpbmsuZGF0YSgnc2F2ZWRIcmVmJykpe1xuICAgICAgICAkbGluay5hdHRyKCdocmVmJywgJGxpbmsuZGF0YSgnc2F2ZWRIcmVmJykpLnJlbW92ZURhdGEoJ3NhdmVkSHJlZicpO1xuICAgICAgfWVsc2V7IHJldHVybjsgfVxuICAgIH0pO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfTtcbn1cblxuRHJpbGxkb3duLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogTWFya3VwIHVzZWQgZm9yIEpTIGdlbmVyYXRlZCBiYWNrIGJ1dHRvbi4gUHJlcGVuZGVkICBvciBhcHBlbmRlZCAoc2VlIGJhY2tCdXR0b25Qb3NpdGlvbikgdG8gc3VibWVudSBsaXN0cyBhbmQgZGVsZXRlZCBvbiBgZGVzdHJveWAgbWV0aG9kLCAnanMtZHJpbGxkb3duLWJhY2snIGNsYXNzIHJlcXVpcmVkLiBSZW1vdmUgdGhlIGJhY2tzbGFzaCAoYFxcYCkgaWYgY29weSBhbmQgcGFzdGluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnPFxcbGk+PFxcYT5CYWNrPFxcL2E+PFxcL2xpPidcbiAgICovXG4gIGJhY2tCdXR0b246ICc8bGkgY2xhc3M9XCJqcy1kcmlsbGRvd24tYmFja1wiPjxhIHRhYmluZGV4PVwiMFwiPkJhY2s8L2E+PC9saT4nLFxuICAvKipcbiAgICogUG9zaXRpb24gdGhlIGJhY2sgYnV0dG9uIGVpdGhlciBhdCB0aGUgdG9wIG9yIGJvdHRvbSBvZiBkcmlsbGRvd24gc3VibWVudXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgYm90dG9tXG4gICAqL1xuICBiYWNrQnV0dG9uUG9zaXRpb246ICd0b3AnLFxuICAvKipcbiAgICogTWFya3VwIHVzZWQgdG8gd3JhcCBkcmlsbGRvd24gbWVudS4gVXNlIGEgY2xhc3MgbmFtZSBmb3IgaW5kZXBlbmRlbnQgc3R5bGluZzsgdGhlIEpTIGFwcGxpZWQgY2xhc3M6IGBpcy1kcmlsbGRvd25gIGlzIHJlcXVpcmVkLiBSZW1vdmUgdGhlIGJhY2tzbGFzaCAoYFxcYCkgaWYgY29weSBhbmQgcGFzdGluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnPFxcZGl2IGNsYXNzPVwiaXMtZHJpbGxkb3duXCI+PFxcL2Rpdj4nXG4gICAqL1xuICB3cmFwcGVyOiAnPGRpdj48L2Rpdj4nLFxuICAvKipcbiAgICogQWRkcyB0aGUgcGFyZW50IGxpbmsgdG8gdGhlIHN1Ym1lbnUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHBhcmVudExpbms6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gcmV0dXJuIHRvIHJvb3QgbGlzdCBvbiBib2R5IGNsaWNrLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIG1lbnUgdG8gYXV0byBhZGp1c3QgaGVpZ2h0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhdXRvSGVpZ2h0OiBmYWxzZSxcbiAgLyoqXG4gICAqIEFuaW1hdGUgdGhlIGF1dG8gYWRqdXN0IGhlaWdodC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYW5pbWF0ZUhlaWdodDogZmFsc2UsXG4gIC8qKlxuICAgKiBTY3JvbGwgdG8gdGhlIHRvcCBvZiB0aGUgbWVudSBhZnRlciBvcGVuaW5nIGEgc3VibWVudSBvciBuYXZpZ2F0aW5nIGJhY2sgdXNpbmcgdGhlIG1lbnUgYmFjayBidXR0b25cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgc2Nyb2xsVG9wOiBmYWxzZSxcbiAgLyoqXG4gICAqIFN0cmluZyBqcXVlcnkgc2VsZWN0b3IgKGZvciBleGFtcGxlICdib2R5Jykgb2YgZWxlbWVudCB0byB0YWtlIG9mZnNldCgpLnRvcCBmcm9tLCBpZiBlbXB0eSBzdHJpbmcgdGhlIGRyaWxsZG93biBtZW51IG9mZnNldCgpLnRvcCBpcyB0YWtlblxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICcnXG4gICAqL1xuICBzY3JvbGxUb3BFbGVtZW50OiAnJyxcbiAgLyoqXG4gICAqIFNjcm9sbFRvcCBvZmZzZXRcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMDBcbiAgICovXG4gIHNjcm9sbFRvcE9mZnNldDogMCxcbiAgLyoqXG4gICAqIFNjcm9sbCBhbmltYXRpb24gZHVyYXRpb25cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG4gIGFuaW1hdGlvbkR1cmF0aW9uOiA1MDAsXG4gIC8qKlxuICAgKiBTY3JvbGwgYW5pbWF0aW9uIGVhc2luZ1xuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzd2luZydcbiAgICovXG4gIGFuaW1hdGlvbkVhc2luZzogJ3N3aW5nJ1xuICAvLyBob2xkT3BlbjogZmFsc2Vcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcmlsbGRvd24sICdEcmlsbGRvd24nKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIERyb3Bkb3duIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5kcm9wZG93blxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5rZXlib2FyZFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5ib3hcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBEcm9wZG93biB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgZHJvcGRvd24uXG4gICAqIEBjbGFzc1xuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24uXG4gICAqICAgICAgICBPYmplY3Qgc2hvdWxkIGJlIG9mIHRoZSBkcm9wZG93biBwYW5lbCwgcmF0aGVyIHRoYW4gaXRzIGFuY2hvci5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBEcm9wZG93bi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0Ryb3Bkb3duJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignRHJvcGRvd24nLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4gYnkgc2V0dGluZy9jaGVja2luZyBvcHRpb25zIGFuZCBhdHRyaWJ1dGVzLCBhZGRpbmcgaGVscGVyIHZhcmlhYmxlcywgYW5kIHNhdmluZyB0aGUgYW5jaG9yLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciAkaWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJyk7XG5cbiAgICB0aGlzLiRhbmNob3IgPSAkKGBbZGF0YS10b2dnbGU9XCIkeyRpZH1cIl1gKS5sZW5ndGggPyAkKGBbZGF0YS10b2dnbGU9XCIkeyRpZH1cIl1gKSA6ICQoYFtkYXRhLW9wZW49XCIkeyRpZH1cIl1gKTtcbiAgICB0aGlzLiRhbmNob3IuYXR0cih7XG4gICAgICAnYXJpYS1jb250cm9scyc6ICRpZCxcbiAgICAgICdkYXRhLWlzLWZvY3VzJzogZmFsc2UsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICdhcmlhLWV4cGFuZGVkJzogZmFsc2VcblxuICAgIH0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLnBhcmVudENsYXNzKXtcbiAgICAgIHRoaXMuJHBhcmVudCA9IHRoaXMuJGVsZW1lbnQucGFyZW50cygnLicgKyB0aGlzLm9wdGlvbnMucGFyZW50Q2xhc3MpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy4kcGFyZW50ID0gbnVsbDtcbiAgICB9XG4gICAgdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKTtcbiAgICB0aGlzLmNvdW50ZXIgPSA0O1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnYXJpYS1oaWRkZW4nOiAndHJ1ZScsXG4gICAgICAnZGF0YS15ZXRpLWJveCc6ICRpZCxcbiAgICAgICdkYXRhLXJlc2l6ZSc6ICRpZCxcbiAgICAgICdhcmlhLWxhYmVsbGVkYnknOiB0aGlzLiRhbmNob3JbMF0uaWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZGQtYW5jaG9yJylcbiAgICB9KTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIZWxwZXIgZnVuY3Rpb24gdG8gZGV0ZXJtaW5lIGN1cnJlbnQgb3JpZW50YXRpb24gb2YgZHJvcGRvd24gcGFuZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEByZXR1cm5zIHtTdHJpbmd9IHBvc2l0aW9uIC0gc3RyaW5nIHZhbHVlIG9mIGEgcG9zaXRpb24gY2xhc3MuXG4gICAqL1xuICBnZXRQb3NpdGlvbkNsYXNzKCkge1xuICAgIHZhciB2ZXJ0aWNhbFBvc2l0aW9uID0gdGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goLyh0b3B8bGVmdHxyaWdodHxib3R0b20pL2cpO1xuICAgICAgICB2ZXJ0aWNhbFBvc2l0aW9uID0gdmVydGljYWxQb3NpdGlvbiA/IHZlcnRpY2FsUG9zaXRpb25bMF0gOiAnJztcbiAgICB2YXIgaG9yaXpvbnRhbFBvc2l0aW9uID0gL2Zsb2F0LShcXFMrKS8uZXhlYyh0aGlzLiRhbmNob3JbMF0uY2xhc3NOYW1lKTtcbiAgICAgICAgaG9yaXpvbnRhbFBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uWzFdIDogJyc7XG4gICAgdmFyIHBvc2l0aW9uID0gaG9yaXpvbnRhbFBvc2l0aW9uID8gaG9yaXpvbnRhbFBvc2l0aW9uICsgJyAnICsgdmVydGljYWxQb3NpdGlvbiA6IHZlcnRpY2FsUG9zaXRpb247XG5cbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0cyB0aGUgZHJvcGRvd24gcGFuZXMgb3JpZW50YXRpb24gYnkgYWRkaW5nL3JlbW92aW5nIHBvc2l0aW9uaW5nIGNsYXNzZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbiBjbGFzcyB0byByZW1vdmUuXG4gICAqL1xuICBfcmVwb3NpdGlvbihwb3NpdGlvbikge1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucy5wdXNoKHBvc2l0aW9uID8gcG9zaXRpb24gOiAnYm90dG9tJyk7XG4gICAgLy9kZWZhdWx0LCB0cnkgc3dpdGNoaW5nIHRvIG9wcG9zaXRlIHNpZGVcbiAgICBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ3RvcCcpO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAndG9wJyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpe1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfVxuXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XG4gICAgZWxzZSBpZighcG9zaXRpb24gJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCd0b3AnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9ZWxzZSBpZihwb3NpdGlvbiA9PT0gJ3RvcCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfWVsc2UgaWYocG9zaXRpb24gPT09ICdsZWZ0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3JpZ2h0JykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdib3R0b20nKSA8IDApKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1lbHNlIGlmKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSl7XG4gICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHBvc2l0aW9uKTtcbiAgICB9XG4gICAgLy9pZiBub3RoaW5nIGNsZWFyZWQsIHNldCB0byBib3R0b21cbiAgICBlbHNle1xuICAgICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICB0aGlzLmNvdW50ZXItLTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBwb3NpdGlvbiBhbmQgb3JpZW50YXRpb24gb2YgdGhlIGRyb3Bkb3duIHBhbmUsIGNoZWNrcyBmb3IgY29sbGlzaW9ucy5cbiAgICogUmVjdXJzaXZlbHkgY2FsbHMgaXRzZWxmIGlmIGEgY29sbGlzaW9uIGlzIGRldGVjdGVkLCB3aXRoIGEgbmV3IHBvc2l0aW9uIGNsYXNzLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRQb3NpdGlvbigpIHtcbiAgICBpZih0aGlzLiRhbmNob3IuYXR0cignYXJpYS1leHBhbmRlZCcpID09PSAnZmFsc2UnKXsgcmV0dXJuIGZhbHNlOyB9XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5nZXRQb3NpdGlvbkNsYXNzKCksXG4gICAgICAgICRlbGVEaW1zID0gRm91bmRhdGlvbi5Cb3guR2V0RGltZW5zaW9ucyh0aGlzLiRlbGVtZW50KSxcbiAgICAgICAgJGFuY2hvckRpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMuJGFuY2hvciksXG4gICAgICAgIF90aGlzID0gdGhpcyxcbiAgICAgICAgZGlyZWN0aW9uID0gKHBvc2l0aW9uID09PSAnbGVmdCcgPyAnbGVmdCcgOiAoKHBvc2l0aW9uID09PSAncmlnaHQnKSA/ICdsZWZ0JyA6ICd0b3AnKSksXG4gICAgICAgIHBhcmFtID0gKGRpcmVjdGlvbiA9PT0gJ3RvcCcpID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICBvZmZzZXQgPSAocGFyYW0gPT09ICdoZWlnaHQnKSA/IHRoaXMub3B0aW9ucy52T2Zmc2V0IDogdGhpcy5vcHRpb25zLmhPZmZzZXQ7XG5cbiAgICBpZigoJGVsZURpbXMud2lkdGggPj0gJGVsZURpbXMud2luZG93RGltcy53aWR0aCkgfHwgKCF0aGlzLmNvdW50ZXIgJiYgIUZvdW5kYXRpb24uQm94LkltTm90VG91Y2hpbmdZb3UodGhpcy4kZWxlbWVudCwgdGhpcy4kcGFyZW50KSkpe1xuICAgICAgdmFyIG5ld1dpZHRoID0gJGVsZURpbXMud2luZG93RGltcy53aWR0aCxcbiAgICAgICAgICBwYXJlbnRIT2Zmc2V0ID0gMDtcbiAgICAgIGlmKHRoaXMuJHBhcmVudCl7XG4gICAgICAgIHZhciAkcGFyZW50RGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy4kcGFyZW50KSxcbiAgICAgICAgICAgIHBhcmVudEhPZmZzZXQgPSAkcGFyZW50RGltcy5vZmZzZXQubGVmdDtcbiAgICAgICAgaWYgKCRwYXJlbnREaW1zLndpZHRoIDwgbmV3V2lkdGgpe1xuICAgICAgICAgIG5ld1dpZHRoID0gJHBhcmVudERpbXMud2lkdGg7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy4kZWxlbWVudC5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLiRlbGVtZW50LCB0aGlzLiRhbmNob3IsICdjZW50ZXIgYm90dG9tJywgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0ICsgcGFyZW50SE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAgICd3aWR0aCc6IG5ld1dpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bydcbiAgICAgIH0pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy4kZWxlbWVudCwgdGhpcy4kYW5jaG9yLCBwb3NpdGlvbiwgdGhpcy5vcHRpb25zLnZPZmZzZXQsIHRoaXMub3B0aW9ucy5oT2Zmc2V0KSk7XG5cbiAgICB3aGlsZSghRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSh0aGlzLiRlbGVtZW50LCB0aGlzLiRwYXJlbnQsIHRydWUpICYmIHRoaXMuY291bnRlcil7XG4gICAgICB0aGlzLl9yZXBvc2l0aW9uKHBvc2l0aW9uKTtcbiAgICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIHRoZSBlbGVtZW50IHV0aWxpemluZyB0aGUgdHJpZ2dlcnMgdXRpbGl0eSBsaWJyYXJ5LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5fc2V0UG9zaXRpb24uYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmhvdmVyKXtcbiAgICAgIHRoaXMuJGFuY2hvci5vZmYoJ21vdXNlZW50ZXIuemYuZHJvcGRvd24gbW91c2VsZWF2ZS56Zi5kcm9wZG93bicpXG4gICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgYm9keURhdGEgPSAkKCdib2R5JykuZGF0YSgpO1xuICAgICAgICBpZih0eXBlb2YoYm9keURhdGEud2hhdGlucHV0KSA9PT0gJ3VuZGVmaW5lZCcgfHwgYm9keURhdGEud2hhdGlucHV0ID09PSAnbW91c2UnKSB7XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgdHJ1ZSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KTtcbiAgICAgICAgfVxuICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICBfdGhpcy4kYW5jaG9yLmRhdGEoJ2hvdmVyJywgZmFsc2UpO1xuICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgfSk7XG4gICAgICBpZih0aGlzLm9wdGlvbnMuaG92ZXJQYW5lKXtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ21vdXNlZW50ZXIuemYuZHJvcGRvd24gbW91c2VsZWF2ZS56Zi5kcm9wZG93bicpXG4gICAgICAgICAgICAub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd24nLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMudGltZW91dCk7XG4gICAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZS56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgICAgICAgX3RoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInLCBmYWxzZSk7XG4gICAgICAgICAgICAgIH0sIF90aGlzLm9wdGlvbnMuaG92ZXJEZWxheSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy4kYW5jaG9yLmFkZCh0aGlzLiRlbGVtZW50KS5vbigna2V5ZG93bi56Zi5kcm9wZG93bicsIGZ1bmN0aW9uKGUpIHtcblxuICAgICAgdmFyICR0YXJnZXQgPSAkKHRoaXMpLFxuICAgICAgICB2aXNpYmxlRm9jdXNhYmxlRWxlbWVudHMgPSBGb3VuZGF0aW9uLktleWJvYXJkLmZpbmRGb2N1c2FibGUoX3RoaXMuJGVsZW1lbnQpO1xuXG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLmhhbmRsZUtleShlLCAnRHJvcGRvd24nLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICgkdGFyZ2V0LmlzKF90aGlzLiRhbmNob3IpKSB7XG4gICAgICAgICAgICBfdGhpcy5vcGVuKCk7XG4gICAgICAgICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCd0YWJpbmRleCcsIC0xKS5mb2N1cygpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgX3RoaXMuJGFuY2hvci5mb2N1cygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICAgdmFyICRib2R5ID0gJChkb2N1bWVudC5ib2R5KS5ub3QodGhpcy4kZWxlbWVudCksXG4gICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgICRib2R5Lm9mZignY2xpY2suemYuZHJvcGRvd24nKVxuICAgICAgICAgIC5vbignY2xpY2suemYuZHJvcGRvd24nLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgIGlmKF90aGlzLiRhbmNob3IuaXMoZS50YXJnZXQpIHx8IF90aGlzLiRhbmNob3IuZmluZChlLnRhcmdldCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmKF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgJGJvZHkub2ZmKCdjbGljay56Zi5kcm9wZG93bicpO1xuICAgICAgICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wZW5zIHRoZSBkcm9wZG93biBwYW5lLCBhbmQgZmlyZXMgYSBidWJibGluZyBldmVudCB0byBjbG9zZSBvdGhlciBkcm9wZG93bnMuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jY2xvc2VtZVxuICAgKiBAZmlyZXMgRHJvcGRvd24jc2hvd1xuICAgKi9cbiAgb3BlbigpIHtcbiAgICAvLyB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHRvIGNsb3NlIG90aGVyIG9wZW4gZHJvcGRvd25zXG4gICAgICogQGV2ZW50IERyb3Bkb3duI2Nsb3NlbWVcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlbWUuemYuZHJvcGRvd24nLCB0aGlzLiRlbGVtZW50LmF0dHIoJ2lkJykpO1xuICAgIHRoaXMuJGFuY2hvci5hZGRDbGFzcygnaG92ZXInKVxuICAgICAgICAuYXR0cih7J2FyaWEtZXhwYW5kZWQnOiB0cnVlfSk7XG4gICAgLy8gdGhpcy4kZWxlbWVudC8qLnNob3coKSovO1xuICAgIHRoaXMuX3NldFBvc2l0aW9uKCk7XG4gICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnaXMtb3BlbicpXG4gICAgICAgIC5hdHRyKHsnYXJpYS1oaWRkZW4nOiBmYWxzZX0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmF1dG9Gb2N1cyl7XG4gICAgICB2YXIgJGZvY3VzYWJsZSA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcbiAgICAgIGlmKCRmb2N1c2FibGUubGVuZ3RoKXtcbiAgICAgICAgJGZvY3VzYWJsZS5lcSgwKS5mb2N1cygpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2speyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnRyYXBGb2N1cykge1xuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC50cmFwRm9jdXModGhpcy4kZWxlbWVudCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmlyZXMgb25jZSB0aGUgZHJvcGRvd24gaXMgdmlzaWJsZS5cbiAgICAgKiBAZXZlbnQgRHJvcGRvd24jc2hvd1xuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2hvdy56Zi5kcm9wZG93bicsIFt0aGlzLiRlbGVtZW50XSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBvcGVuIGRyb3Bkb3duIHBhbmUuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgRHJvcGRvd24jaGlkZVxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgaWYoIXRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2lzLW9wZW4nKVxuICAgICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogdHJ1ZX0pO1xuXG4gICAgdGhpcy4kYW5jaG9yLnJlbW92ZUNsYXNzKCdob3ZlcicpXG4gICAgICAgIC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgZmFsc2UpO1xuXG4gICAgaWYodGhpcy5jbGFzc0NoYW5nZWQpe1xuICAgICAgdmFyIGN1clBvc2l0aW9uQ2xhc3MgPSB0aGlzLmdldFBvc2l0aW9uQ2xhc3MoKTtcbiAgICAgIGlmKGN1clBvc2l0aW9uQ2xhc3Mpe1xuICAgICAgICB0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKGN1clBvc2l0aW9uQ2xhc3MpO1xuICAgICAgfVxuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcylcbiAgICAgICAgICAvKi5oaWRlKCkqLy5jc3Moe2hlaWdodDogJycsIHdpZHRoOiAnJ30pO1xuICAgICAgdGhpcy5jbGFzc0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgICB0aGlzLnVzZWRQb3NpdGlvbnMubGVuZ3RoID0gMDtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdoaWRlLnpmLmRyb3Bkb3duJywgW3RoaXMuJGVsZW1lbnRdKTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMudHJhcEZvY3VzKSB7XG4gICAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlbGVhc2VGb2N1cyh0aGlzLiRlbGVtZW50KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgZHJvcGRvd24gcGFuZSdzIHZpc2liaWxpdHkuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIGlmKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLW9wZW4nKSl7XG4gICAgICBpZih0aGlzLiRhbmNob3IuZGF0YSgnaG92ZXInKSkgcmV0dXJuO1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5vcGVuKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBkcm9wZG93bi5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlcicpLmhpZGUoKTtcbiAgICB0aGlzLiRhbmNob3Iub2ZmKCcuemYuZHJvcGRvd24nKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5Ecm9wZG93bi5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIENsYXNzIHRoYXQgZGVzaWduYXRlcyBib3VuZGluZyBjb250YWluZXIgb2YgRHJvcGRvd24gKERlZmF1bHQ6IHdpbmRvdylcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZHJvcGRvd24tcGFyZW50J1xuICAgKi9cbiAgcGFyZW50Q2xhc3M6IG51bGwsXG4gIC8qKlxuICAgKiBBbW91bnQgb2YgdGltZSB0byBkZWxheSBvcGVuaW5nIGEgc3VibWVudSBvbiBob3ZlciBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyNTBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDI1MCxcbiAgLyoqXG4gICAqIEFsbG93IHN1Ym1lbnVzIHRvIG9wZW4gb24gaG92ZXIgZXZlbnRzXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGhvdmVyOiBmYWxzZSxcbiAgLyoqXG4gICAqIERvbid0IGNsb3NlIGRyb3Bkb3duIHdoZW4gaG92ZXJpbmcgb3ZlciBkcm9wZG93biBwYW5lXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgaG92ZXJQYW5lOiBmYWxzZSxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgYmV0d2VlbiB0aGUgZHJvcGRvd24gcGFuZSBhbmQgdGhlIHRyaWdnZXJpbmcgZWxlbWVudCBvbiBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDFcbiAgICovXG4gIHZPZmZzZXQ6IDEsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIGJldHdlZW4gdGhlIGRyb3Bkb3duIHBhbmUgYW5kIHRoZSB0cmlnZ2VyaW5nIGVsZW1lbnQgb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBoT2Zmc2V0OiAxLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBhZGp1c3Qgb3BlbiBwb3NpdGlvbi4gSlMgd2lsbCB0ZXN0IGFuZCBmaWxsIHRoaXMgaW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RvcCdcbiAgICovXG4gIHBvc2l0aW9uQ2xhc3M6ICcnLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byB0cmFwIGZvY3VzIHRvIHRoZSBkcm9wZG93biBwYW5lIGlmIG9wZW5lZCB3aXRoIGtleWJvYXJkIGNvbW1hbmRzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICB0cmFwRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3cgdGhlIHBsdWdpbiB0byBzZXQgZm9jdXMgdG8gdGhlIGZpcnN0IGZvY3VzYWJsZSBlbGVtZW50IHdpdGhpbiB0aGUgcGFuZSwgcmVnYXJkbGVzcyBvZiBtZXRob2Qgb2Ygb3BlbmluZy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBhdXRvRm9jdXM6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIGEgY2xpY2sgb24gdGhlIGJvZHkgdG8gY2xvc2UgdGhlIGRyb3Bkb3duLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2s6IGZhbHNlXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihEcm9wZG93biwgJ0Ryb3Bkb3duJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBEcm9wZG93bk1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLmRyb3Bkb3duLW1lbnVcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYm94XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm5lc3RcbiAqL1xuXG5jbGFzcyBEcm9wZG93bk1lbnUge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBEcm9wZG93bk1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIGRyb3Bkb3duIG1lbnUuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgRHJvcGRvd25NZW51LmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICBGb3VuZGF0aW9uLk5lc3QuRmVhdGhlcih0aGlzLiRlbGVtZW50LCAnZHJvcGRvd24nKTtcbiAgICB0aGlzLl9pbml0KCk7XG5cbiAgICBGb3VuZGF0aW9uLnJlZ2lzdGVyUGx1Z2luKHRoaXMsICdEcm9wZG93bk1lbnUnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdEcm9wZG93bk1lbnUnLCB7XG4gICAgICAnRU5URVInOiAnb3BlbicsXG4gICAgICAnU1BBQ0UnOiAnb3BlbicsXG4gICAgICAnQVJST1dfUklHSFQnOiAnbmV4dCcsXG4gICAgICAnQVJST1dfVVAnOiAndXAnLFxuICAgICAgJ0FSUk9XX0RPV04nOiAnZG93bicsXG4gICAgICAnQVJST1dfTEVGVCc6ICdwcmV2aW91cycsXG4gICAgICAnRVNDQVBFJzogJ2Nsb3NlJ1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4sIGFuZCBjYWxscyBfcHJlcGFyZU1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgc3VicyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKTtcbiAgICB0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCcuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKS5hZGRDbGFzcygnZmlyc3Qtc3ViJyk7XG5cbiAgICB0aGlzLiRtZW51SXRlbXMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tyb2xlPVwibWVudWl0ZW1cIl0nKTtcbiAgICB0aGlzLiR0YWJzID0gdGhpcy4kZWxlbWVudC5jaGlsZHJlbignW3JvbGU9XCJtZW51aXRlbVwiXScpO1xuICAgIHRoaXMuJHRhYnMuZmluZCgndWwuaXMtZHJvcGRvd24tc3VibWVudScpLmFkZENsYXNzKHRoaXMub3B0aW9ucy52ZXJ0aWNhbENsYXNzKTtcblxuICAgIGlmICh0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKHRoaXMub3B0aW9ucy5yaWdodENsYXNzKSB8fCB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAncmlnaHQnIHx8IEZvdW5kYXRpb24ucnRsKCkgfHwgdGhpcy4kZWxlbWVudC5wYXJlbnRzKCcudG9wLWJhci1yaWdodCcpLmlzKCcqJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPSAncmlnaHQnO1xuICAgICAgc3Vicy5hZGRDbGFzcygnb3BlbnMtbGVmdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdWJzLmFkZENsYXNzKCdvcGVucy1yaWdodCcpO1xuICAgIH1cbiAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9ldmVudHMoKTtcbiAgfTtcblxuICBfaXNWZXJ0aWNhbCgpIHtcbiAgICByZXR1cm4gdGhpcy4kdGFicy5jc3MoJ2Rpc3BsYXknKSA9PT0gJ2Jsb2NrJztcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGxpc3RlbmVycyB0byBlbGVtZW50cyB3aXRoaW4gdGhlIG1lbnVcbiAgICogQHByaXZhdGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGhhc1RvdWNoID0gJ29udG91Y2hzdGFydCcgaW4gd2luZG93IHx8ICh0eXBlb2Ygd2luZG93Lm9udG91Y2hzdGFydCAhPT0gJ3VuZGVmaW5lZCcpLFxuICAgICAgICBwYXJDbGFzcyA9ICdpcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCc7XG5cbiAgICAvLyB1c2VkIGZvciBvbkNsaWNrIGFuZCBpbiB0aGUga2V5Ym9hcmQgaGFuZGxlcnNcbiAgICB2YXIgaGFuZGxlQ2xpY2tGbiA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkZWxlbSA9ICQoZS50YXJnZXQpLnBhcmVudHNVbnRpbCgndWwnLCBgLiR7cGFyQ2xhc3N9YCksXG4gICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpLFxuICAgICAgICAgIGhhc0NsaWNrZWQgPSAkZWxlbS5hdHRyKCdkYXRhLWlzLWNsaWNrJykgPT09ICd0cnVlJyxcbiAgICAgICAgICAkc3ViID0gJGVsZW0uY2hpbGRyZW4oJy5pcy1kcm9wZG93bi1zdWJtZW51Jyk7XG5cbiAgICAgIGlmIChoYXNTdWIpIHtcbiAgICAgICAgaWYgKGhhc0NsaWNrZWQpIHtcbiAgICAgICAgICBpZiAoIV90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrIHx8ICghX3RoaXMub3B0aW9ucy5jbGlja09wZW4gJiYgIWhhc1RvdWNoKSB8fCAoX3RoaXMub3B0aW9ucy5mb3JjZUZvbGxvdyAmJiBoYXNUb3VjaCkpIHsgcmV0dXJuOyB9XG4gICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgX3RoaXMuX2hpZGUoJGVsZW0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbS5hZGQoJGVsZW0ucGFyZW50c1VudGlsKF90aGlzLiRlbGVtZW50LCBgLiR7cGFyQ2xhc3N9YCkpLmF0dHIoJ2RhdGEtaXMtY2xpY2snLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrT3BlbiB8fCBoYXNUb3VjaCkge1xuICAgICAgdGhpcy4kbWVudUl0ZW1zLm9uKCdjbGljay56Zi5kcm9wZG93bm1lbnUgdG91Y2hzdGFydC56Zi5kcm9wZG93bm1lbnUnLCBoYW5kbGVDbGlja0ZuKTtcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgTGVhZiBlbGVtZW50IENsaWNrc1xuICAgIGlmKF90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrSW5zaWRlKXtcbiAgICAgIHRoaXMuJG1lbnVJdGVtcy5vbignY2xpY2suemYuZHJvcGRvd25tZW51IHRvdWNoZW5kLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGhhc1N1YiA9ICRlbGVtLmhhc0NsYXNzKHBhckNsYXNzKTtcbiAgICAgICAgaWYoIWhhc1N1Yil7XG4gICAgICAgICAgX3RoaXMuX2hpZGUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZUhvdmVyKSB7XG4gICAgICB0aGlzLiRtZW51SXRlbXMub24oJ21vdXNlZW50ZXIuemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgJGVsZW0gPSAkKHRoaXMpLFxuICAgICAgICAgICAgaGFzU3ViID0gJGVsZW0uaGFzQ2xhc3MocGFyQ2xhc3MpO1xuXG4gICAgICAgIGlmIChoYXNTdWIpIHtcbiAgICAgICAgICBjbGVhclRpbWVvdXQoJGVsZW0uZGF0YSgnX2RlbGF5JykpO1xuICAgICAgICAgICRlbGVtLmRhdGEoJ19kZWxheScsIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5fc2hvdygkZWxlbS5jaGlsZHJlbignLmlzLWRyb3Bkb3duLXN1Ym1lbnUnKSk7XG4gICAgICAgICAgfSwgX3RoaXMub3B0aW9ucy5ob3ZlckRlbGF5KSk7XG4gICAgICAgIH1cbiAgICAgIH0pLm9uKCdtb3VzZWxlYXZlLnpmLmRyb3Bkb3dubWVudScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAgIGhhc1N1YiA9ICRlbGVtLmhhc0NsYXNzKHBhckNsYXNzKTtcbiAgICAgICAgaWYgKGhhc1N1YiAmJiBfdGhpcy5vcHRpb25zLmF1dG9jbG9zZSkge1xuICAgICAgICAgIGlmICgkZWxlbS5hdHRyKCdkYXRhLWlzLWNsaWNrJykgPT09ICd0cnVlJyAmJiBfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgICAgICAgIGNsZWFyVGltZW91dCgkZWxlbS5kYXRhKCdfZGVsYXknKSk7XG4gICAgICAgICAgJGVsZW0uZGF0YSgnX2RlbGF5Jywgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLl9oaWRlKCRlbGVtKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmNsb3NpbmdUaW1lKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICB0aGlzLiRtZW51SXRlbXMub24oJ2tleWRvd24uemYuZHJvcGRvd25tZW51JywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyICRlbGVtZW50ID0gJChlLnRhcmdldCkucGFyZW50c1VudGlsKCd1bCcsICdbcm9sZT1cIm1lbnVpdGVtXCJdJyksXG4gICAgICAgICAgaXNUYWIgPSBfdGhpcy4kdGFicy5pbmRleCgkZWxlbWVudCkgPiAtMSxcbiAgICAgICAgICAkZWxlbWVudHMgPSBpc1RhYiA/IF90aGlzLiR0YWJzIDogJGVsZW1lbnQuc2libGluZ3MoJ2xpJykuYWRkKCRlbGVtZW50KSxcbiAgICAgICAgICAkcHJldkVsZW1lbnQsXG4gICAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgICRwcmV2RWxlbWVudCA9ICRlbGVtZW50cy5lcShpLTEpO1xuICAgICAgICAgICRuZXh0RWxlbWVudCA9ICRlbGVtZW50cy5lcShpKzEpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHZhciBuZXh0U2libGluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoISRlbGVtZW50LmlzKCc6bGFzdC1jaGlsZCcpKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmNoaWxkcmVuKCdhOmZpcnN0JykuZm9jdXMoKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0sIHByZXZTaWJsaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICRwcmV2RWxlbWVudC5jaGlsZHJlbignYTpmaXJzdCcpLmZvY3VzKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIH0sIG9wZW5TdWIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyICRzdWIgPSAkZWxlbWVudC5jaGlsZHJlbigndWwuaXMtZHJvcGRvd24tc3VibWVudScpO1xuICAgICAgICBpZiAoJHN1Yi5sZW5ndGgpIHtcbiAgICAgICAgICBfdGhpcy5fc2hvdygkc3ViKTtcbiAgICAgICAgICAkZWxlbWVudC5maW5kKCdsaSA+IGE6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSBlbHNlIHsgcmV0dXJuOyB9XG4gICAgICB9LCBjbG9zZVN1YiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAvL2lmICgkZWxlbWVudC5pcygnOmZpcnN0LWNoaWxkJykpIHtcbiAgICAgICAgdmFyIGNsb3NlID0gJGVsZW1lbnQucGFyZW50KCd1bCcpLnBhcmVudCgnbGknKTtcbiAgICAgICAgY2xvc2UuY2hpbGRyZW4oJ2E6Zmlyc3QnKS5mb2N1cygpO1xuICAgICAgICBfdGhpcy5faGlkZShjbG9zZSk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgLy99XG4gICAgICB9O1xuICAgICAgdmFyIGZ1bmN0aW9ucyA9IHtcbiAgICAgICAgb3Blbjogb3BlblN1YixcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLl9oaWRlKF90aGlzLiRlbGVtZW50KTtcbiAgICAgICAgICBfdGhpcy4kbWVudUl0ZW1zLmZpbmQoJ2E6Zmlyc3QnKS5mb2N1cygpOyAvLyBmb2N1cyB0byBmaXJzdCBlbGVtZW50XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBpZiAoaXNUYWIpIHtcbiAgICAgICAgaWYgKF90aGlzLl9pc1ZlcnRpY2FsKCkpIHsgLy8gdmVydGljYWwgbWVudVxuICAgICAgICAgIGlmIChGb3VuZGF0aW9uLnJ0bCgpKSB7IC8vIHJpZ2h0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBkb3duOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgdXA6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgICBuZXh0OiBjbG9zZVN1YixcbiAgICAgICAgICAgICAgcHJldmlvdXM6IG9wZW5TdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSB7IC8vIGxlZnQgYWxpZ25lZFxuICAgICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICAgIGRvd246IG5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICB1cDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIG5leHQ6IG9wZW5TdWIsXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBjbG9zZVN1YlxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgeyAvLyBob3Jpem9udGFsIG1lbnVcbiAgICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgeyAvLyByaWdodCBhbGlnbmVkXG4gICAgICAgICAgICAkLmV4dGVuZChmdW5jdGlvbnMsIHtcbiAgICAgICAgICAgICAgbmV4dDogcHJldlNpYmxpbmcsXG4gICAgICAgICAgICAgIHByZXZpb3VzOiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgZG93bjogb3BlblN1YixcbiAgICAgICAgICAgICAgdXA6IGNsb3NlU3ViXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2UgeyAvLyBsZWZ0IGFsaWduZWRcbiAgICAgICAgICAgICQuZXh0ZW5kKGZ1bmN0aW9ucywge1xuICAgICAgICAgICAgICBuZXh0OiBuZXh0U2libGluZyxcbiAgICAgICAgICAgICAgcHJldmlvdXM6IHByZXZTaWJsaW5nLFxuICAgICAgICAgICAgICBkb3duOiBvcGVuU3ViLFxuICAgICAgICAgICAgICB1cDogY2xvc2VTdWJcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgLy8gbm90IHRhYnMgLT4gb25lIHN1YlxuICAgICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSkgeyAvLyByaWdodCBhbGlnbmVkXG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICBuZXh0OiBjbG9zZVN1YixcbiAgICAgICAgICAgIHByZXZpb3VzOiBvcGVuU3ViLFxuICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB1cDogcHJldlNpYmxpbmdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHsgLy8gbGVmdCBhbGlnbmVkXG4gICAgICAgICAgJC5leHRlbmQoZnVuY3Rpb25zLCB7XG4gICAgICAgICAgICBuZXh0OiBvcGVuU3ViLFxuICAgICAgICAgICAgcHJldmlvdXM6IGNsb3NlU3ViLFxuICAgICAgICAgICAgZG93bjogbmV4dFNpYmxpbmcsXG4gICAgICAgICAgICB1cDogcHJldlNpYmxpbmdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ0Ryb3Bkb3duTWVudScsIGZ1bmN0aW9ucyk7XG5cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGFuIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGJvZHkgdG8gY2xvc2UgYW55IGRyb3Bkb3ducyBvbiBhIGNsaWNrLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9hZGRCb2R5SGFuZGxlcigpIHtcbiAgICB2YXIgJGJvZHkgPSAkKGRvY3VtZW50LmJvZHkpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG4gICAgJGJvZHkub2ZmKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnKVxuICAgICAgICAgLm9uKCdtb3VzZXVwLnpmLmRyb3Bkb3dubWVudSB0b3VjaGVuZC56Zi5kcm9wZG93bm1lbnUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgIHZhciAkbGluayA9IF90aGlzLiRlbGVtZW50LmZpbmQoZS50YXJnZXQpO1xuICAgICAgICAgICBpZiAoJGxpbmsubGVuZ3RoKSB7IHJldHVybjsgfVxuXG4gICAgICAgICAgIF90aGlzLl9oaWRlKCk7XG4gICAgICAgICAgICRib2R5Lm9mZignbW91c2V1cC56Zi5kcm9wZG93bm1lbnUgdG91Y2hlbmQuemYuZHJvcGRvd25tZW51Jyk7XG4gICAgICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyBhIGRyb3Bkb3duIHBhbmUsIGFuZCBjaGVja3MgZm9yIGNvbGxpc2lvbnMgZmlyc3QuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkc3ViIC0gdWwgZWxlbWVudCB0aGF0IGlzIGEgc3VibWVudSB0byBzaG93XG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAZmlyZXMgRHJvcGRvd25NZW51I3Nob3dcbiAgICovXG4gIF9zaG93KCRzdWIpIHtcbiAgICB2YXIgaWR4ID0gdGhpcy4kdGFicy5pbmRleCh0aGlzLiR0YWJzLmZpbHRlcihmdW5jdGlvbihpLCBlbCkge1xuICAgICAgcmV0dXJuICQoZWwpLmZpbmQoJHN1YikubGVuZ3RoID4gMDtcbiAgICB9KSk7XG4gICAgdmFyICRzaWJzID0gJHN1Yi5wYXJlbnQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jykuc2libGluZ3MoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50Jyk7XG4gICAgdGhpcy5faGlkZSgkc2licywgaWR4KTtcbiAgICAkc3ViLmNzcygndmlzaWJpbGl0eScsICdoaWRkZW4nKS5hZGRDbGFzcygnanMtZHJvcGRvd24tYWN0aXZlJylcbiAgICAgICAgLnBhcmVudCgnbGkuaXMtZHJvcGRvd24tc3VibWVudS1wYXJlbnQnKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgdmFyIGNsZWFyID0gRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSgkc3ViLCBudWxsLCB0cnVlKTtcbiAgICBpZiAoIWNsZWFyKSB7XG4gICAgICB2YXIgb2xkQ2xhc3MgPSB0aGlzLm9wdGlvbnMuYWxpZ25tZW50ID09PSAnbGVmdCcgPyAnLXJpZ2h0JyA6ICctbGVmdCcsXG4gICAgICAgICAgJHBhcmVudExpID0gJHN1Yi5wYXJlbnQoJy5pcy1kcm9wZG93bi1zdWJtZW51LXBhcmVudCcpO1xuICAgICAgJHBhcmVudExpLnJlbW92ZUNsYXNzKGBvcGVucyR7b2xkQ2xhc3N9YCkuYWRkQ2xhc3MoYG9wZW5zLSR7dGhpcy5vcHRpb25zLmFsaWdubWVudH1gKTtcbiAgICAgIGNsZWFyID0gRm91bmRhdGlvbi5Cb3guSW1Ob3RUb3VjaGluZ1lvdSgkc3ViLCBudWxsLCB0cnVlKTtcbiAgICAgIGlmICghY2xlYXIpIHtcbiAgICAgICAgJHBhcmVudExpLnJlbW92ZUNsYXNzKGBvcGVucy0ke3RoaXMub3B0aW9ucy5hbGlnbm1lbnR9YCkuYWRkQ2xhc3MoJ29wZW5zLWlubmVyJyk7XG4gICAgICB9XG4gICAgICB0aGlzLmNoYW5nZWQgPSB0cnVlO1xuICAgIH1cbiAgICAkc3ViLmNzcygndmlzaWJpbGl0eScsICcnKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljaykgeyB0aGlzLl9hZGRCb2R5SGFuZGxlcigpOyB9XG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgbmV3IGRyb3Bkb3duIHBhbmUgaXMgdmlzaWJsZS5cbiAgICAgKiBAZXZlbnQgRHJvcGRvd25NZW51I3Nob3dcbiAgICAgKi9cbiAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3Nob3cuemYuZHJvcGRvd25tZW51JywgWyRzdWJdKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIaWRlcyBhIHNpbmdsZSwgY3VycmVudGx5IG9wZW4gZHJvcGRvd24gcGFuZSwgaWYgcGFzc2VkIGEgcGFyYW1ldGVyLCBvdGhlcndpc2UsIGhpZGVzIGV2ZXJ5dGhpbmcuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW0gLSBlbGVtZW50IHdpdGggYSBzdWJtZW51IHRvIGhpZGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIGluZGV4IG9mIHRoZSAkdGFicyBjb2xsZWN0aW9uIHRvIGhpZGVcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9oaWRlKCRlbGVtLCBpZHgpIHtcbiAgICB2YXIgJHRvQ2xvc2U7XG4gICAgaWYgKCRlbGVtICYmICRlbGVtLmxlbmd0aCkge1xuICAgICAgJHRvQ2xvc2UgPSAkZWxlbTtcbiAgICB9IGVsc2UgaWYgKGlkeCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAkdG9DbG9zZSA9IHRoaXMuJHRhYnMubm90KGZ1bmN0aW9uKGksIGVsKSB7XG4gICAgICAgIHJldHVybiBpID09PSBpZHg7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAkdG9DbG9zZSA9IHRoaXMuJGVsZW1lbnQ7XG4gICAgfVxuICAgIHZhciBzb21ldGhpbmdUb0Nsb3NlID0gJHRvQ2xvc2UuaGFzQ2xhc3MoJ2lzLWFjdGl2ZScpIHx8ICR0b0Nsb3NlLmZpbmQoJy5pcy1hY3RpdmUnKS5sZW5ndGggPiAwO1xuXG4gICAgaWYgKHNvbWV0aGluZ1RvQ2xvc2UpIHtcbiAgICAgICR0b0Nsb3NlLmZpbmQoJ2xpLmlzLWFjdGl2ZScpLmFkZCgkdG9DbG9zZSkuYXR0cih7XG4gICAgICAgICdkYXRhLWlzLWNsaWNrJzogZmFsc2VcbiAgICAgIH0pLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcblxuICAgICAgJHRvQ2xvc2UuZmluZCgndWwuanMtZHJvcGRvd24tYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2pzLWRyb3Bkb3duLWFjdGl2ZScpO1xuXG4gICAgICBpZiAodGhpcy5jaGFuZ2VkIHx8ICR0b0Nsb3NlLmZpbmQoJ29wZW5zLWlubmVyJykubGVuZ3RoKSB7XG4gICAgICAgIHZhciBvbGRDbGFzcyA9IHRoaXMub3B0aW9ucy5hbGlnbm1lbnQgPT09ICdsZWZ0JyA/ICdyaWdodCcgOiAnbGVmdCc7XG4gICAgICAgICR0b0Nsb3NlLmZpbmQoJ2xpLmlzLWRyb3Bkb3duLXN1Ym1lbnUtcGFyZW50JykuYWRkKCR0b0Nsb3NlKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcyhgb3BlbnMtaW5uZXIgb3BlbnMtJHt0aGlzLm9wdGlvbnMuYWxpZ25tZW50fWApXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKGBvcGVucy0ke29sZENsYXNzfWApO1xuICAgICAgICB0aGlzLmNoYW5nZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgb3BlbiBtZW51cyBhcmUgY2xvc2VkLlxuICAgICAgICogQGV2ZW50IERyb3Bkb3duTWVudSNoaWRlXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignaGlkZS56Zi5kcm9wZG93bm1lbnUnLCBbJHRvQ2xvc2VdKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIHBsdWdpbi5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJG1lbnVJdGVtcy5vZmYoJy56Zi5kcm9wZG93bm1lbnUnKS5yZW1vdmVBdHRyKCdkYXRhLWlzLWNsaWNrJylcbiAgICAgICAgLnJlbW92ZUNsYXNzKCdpcy1yaWdodC1hcnJvdyBpcy1sZWZ0LWFycm93IGlzLWRvd24tYXJyb3cgb3BlbnMtcmlnaHQgb3BlbnMtbGVmdCBvcGVucy1pbm5lcicpO1xuICAgICQoZG9jdW1lbnQuYm9keSkub2ZmKCcuemYuZHJvcGRvd25tZW51Jyk7XG4gICAgRm91bmRhdGlvbi5OZXN0LkJ1cm4odGhpcy4kZWxlbWVudCwgJ2Ryb3Bkb3duJyk7XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkRyb3Bkb3duTWVudS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIERpc2FsbG93cyBob3ZlciBldmVudHMgZnJvbSBvcGVuaW5nIHN1Ym1lbnVzXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvdyBhIHN1Ym1lbnUgdG8gYXV0b21hdGljYWxseSBjbG9zZSBvbiBhIG1vdXNlbGVhdmUgZXZlbnQsIGlmIG5vdCBjbGlja2VkIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgYXV0b2Nsb3NlOiB0cnVlLFxuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUgdG8gZGVsYXkgb3BlbmluZyBhIHN1Ym1lbnUgb24gaG92ZXIgZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDUwLFxuICAvKipcbiAgICogQWxsb3cgYSBzdWJtZW51IHRvIG9wZW4vcmVtYWluIG9wZW4gb24gcGFyZW50IGNsaWNrIGV2ZW50LiBBbGxvd3MgY3Vyc29yIHRvIG1vdmUgYXdheSBmcm9tIG1lbnUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xpY2tPcGVuOiBmYWxzZSxcbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIHRvIGRlbGF5IGNsb3NpbmcgYSBzdWJtZW51IG9uIGEgbW91c2VsZWF2ZSBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSA1MDBcbiAgICovXG5cbiAgY2xvc2luZ1RpbWU6IDUwMCxcbiAgLyoqXG4gICAqIFBvc2l0aW9uIG9mIHRoZSBtZW51IHJlbGF0aXZlIHRvIHdoYXQgZGlyZWN0aW9uIHRoZSBzdWJtZW51cyBzaG91bGQgb3Blbi4gSGFuZGxlZCBieSBKUy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbGVmdCdcbiAgICovXG4gIGFsaWdubWVudDogJ2xlZnQnLFxuICAvKipcbiAgICogQWxsb3cgY2xpY2tzIG9uIHRoZSBib2R5IHRvIGNsb3NlIGFueSBvcGVuIHN1Ym1lbnVzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25DbGljazogdHJ1ZSxcbiAgLyoqXG4gICAqIEFsbG93IGNsaWNrcyBvbiBsZWFmIGFuY2hvciBsaW5rcyB0byBjbG9zZSBhbnkgb3BlbiBzdWJtZW51cy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbG9zZU9uQ2xpY2tJbnNpZGU6IHRydWUsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHZlcnRpY2FsIG9yaWVudGVkIG1lbnVzLCBGb3VuZGF0aW9uIGRlZmF1bHQgaXMgYHZlcnRpY2FsYC4gVXBkYXRlIHRoaXMgaWYgdXNpbmcgeW91ciBvd24gY2xhc3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3ZlcnRpY2FsJ1xuICAgKi9cbiAgdmVydGljYWxDbGFzczogJ3ZlcnRpY2FsJyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gcmlnaHQtc2lkZSBvcmllbnRlZCBtZW51cywgRm91bmRhdGlvbiBkZWZhdWx0IGlzIGBhbGlnbi1yaWdodGAuIFVwZGF0ZSB0aGlzIGlmIHVzaW5nIHlvdXIgb3duIGNsYXNzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdhbGlnbi1yaWdodCdcbiAgICovXG4gIHJpZ2h0Q2xhc3M6ICdhbGlnbi1yaWdodCcsXG4gIC8qKlxuICAgKiBCb29sZWFuIHRvIGZvcmNlIG92ZXJpZGUgdGhlIGNsaWNraW5nIG9mIGxpbmtzIHRvIHBlcmZvcm0gZGVmYXVsdCBhY3Rpb24sIG9uIHNlY29uZCB0b3VjaCBldmVudCBmb3IgbW9iaWxlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBmb3JjZUZvbGxvdzogdHJ1ZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKERyb3Bkb3duTWVudSwgJ0Ryb3Bkb3duTWVudScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogRXF1YWxpemVyIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5lcXVhbGl6ZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubWVkaWFRdWVyeVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50aW1lckFuZEltYWdlTG9hZGVyIGlmIGVxdWFsaXplciBjb250YWlucyBpbWFnZXNcbiAqL1xuXG5jbGFzcyBFcXVhbGl6ZXIge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBFcXVhbGl6ZXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgRXF1YWxpemVyI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucyl7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBFcXVhbGl6ZXIuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0VxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBFcXVhbGl6ZXIgcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGVxdWFsaXplciBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGVxSWQgPSB0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtZXF1YWxpemVyJykgfHwgJyc7XG4gICAgdmFyICR3YXRjaGVkID0gdGhpcy4kZWxlbWVudC5maW5kKGBbZGF0YS1lcXVhbGl6ZXItd2F0Y2g9XCIke2VxSWR9XCJdYCk7XG5cbiAgICB0aGlzLiR3YXRjaGVkID0gJHdhdGNoZWQubGVuZ3RoID8gJHdhdGNoZWQgOiB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWVxdWFsaXplci13YXRjaF0nKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtcmVzaXplJywgKGVxSWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZXEnKSkpO1xuXHR0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtbXV0YXRlJywgKGVxSWQgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAnZXEnKSkpO1xuXG4gICAgdGhpcy5oYXNOZXN0ZWQgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWVxdWFsaXplcl0nKS5sZW5ndGggPiAwO1xuICAgIHRoaXMuaXNOZXN0ZWQgPSB0aGlzLiRlbGVtZW50LnBhcmVudHNVbnRpbChkb2N1bWVudC5ib2R5LCAnW2RhdGEtZXF1YWxpemVyXScpLmxlbmd0aCA+IDA7XG4gICAgdGhpcy5pc09uID0gZmFsc2U7XG4gICAgdGhpcy5fYmluZEhhbmRsZXIgPSB7XG4gICAgICBvblJlc2l6ZU1lQm91bmQ6IHRoaXMuX29uUmVzaXplTWUuYmluZCh0aGlzKSxcbiAgICAgIG9uUG9zdEVxdWFsaXplZEJvdW5kOiB0aGlzLl9vblBvc3RFcXVhbGl6ZWQuYmluZCh0aGlzKVxuICAgIH07XG5cbiAgICB2YXIgaW1ncyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW1nJyk7XG4gICAgdmFyIHRvb1NtYWxsO1xuICAgIGlmKHRoaXMub3B0aW9ucy5lcXVhbGl6ZU9uKXtcbiAgICAgIHRvb1NtYWxsID0gdGhpcy5fY2hlY2tNUSgpO1xuICAgICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl9jaGVja01RLmJpbmQodGhpcykpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy5fZXZlbnRzKCk7XG4gICAgfVxuICAgIGlmKCh0b29TbWFsbCAhPT0gdW5kZWZpbmVkICYmIHRvb1NtYWxsID09PSBmYWxzZSkgfHwgdG9vU21hbGwgPT09IHVuZGVmaW5lZCl7XG4gICAgICBpZihpbWdzLmxlbmd0aCl7XG4gICAgICAgIEZvdW5kYXRpb24ub25JbWFnZXNMb2FkZWQoaW1ncywgdGhpcy5fcmVmbG93LmJpbmQodGhpcykpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuX3JlZmxvdygpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGV2ZW50IGxpc3RlbmVycyBpZiB0aGUgYnJlYWtwb2ludCBpcyB0b28gc21hbGwuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcGF1c2VFdmVudHMoKSB7XG4gICAgdGhpcy5pc09uID0gZmFsc2U7XG4gICAgdGhpcy4kZWxlbWVudC5vZmYoe1xuICAgICAgJy56Zi5lcXVhbGl6ZXInOiB0aGlzLl9iaW5kSGFuZGxlci5vblBvc3RFcXVhbGl6ZWRCb3VuZCxcbiAgICAgICdyZXNpemVtZS56Zi50cmlnZ2VyJzogdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kLFxuXHQgICdtdXRhdGVtZS56Zi50cmlnZ2VyJzogdGhpcy5fYmluZEhhbmRsZXIub25SZXNpemVNZUJvdW5kXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogZnVuY3Rpb24gdG8gaGFuZGxlICRlbGVtZW50cyByZXNpemVtZS56Zi50cmlnZ2VyLCB3aXRoIGJvdW5kIHRoaXMgb24gX2JpbmRIYW5kbGVyLm9uUmVzaXplTWVCb3VuZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX29uUmVzaXplTWUoZSkge1xuICAgIHRoaXMuX3JlZmxvdygpO1xuICB9XG5cbiAgLyoqXG4gICAqIGZ1bmN0aW9uIHRvIGhhbmRsZSAkZWxlbWVudHMgcG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXIsIHdpdGggYm91bmQgdGhpcyBvbiBfYmluZEhhbmRsZXIub25Qb3N0RXF1YWxpemVkQm91bmRcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9vblBvc3RFcXVhbGl6ZWQoZSkge1xuICAgIGlmKGUudGFyZ2V0ICE9PSB0aGlzLiRlbGVtZW50WzBdKXsgdGhpcy5fcmVmbG93KCk7IH1cbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIEVxdWFsaXplci5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLl9wYXVzZUV2ZW50cygpO1xuICAgIGlmKHRoaXMuaGFzTmVzdGVkKXtcbiAgICAgIHRoaXMuJGVsZW1lbnQub24oJ3Bvc3RlcXVhbGl6ZWQuemYuZXF1YWxpemVyJywgdGhpcy5fYmluZEhhbmRsZXIub25Qb3N0RXF1YWxpemVkQm91bmQpO1xuICAgIH1lbHNle1xuICAgICAgdGhpcy4kZWxlbWVudC5vbigncmVzaXplbWUuemYudHJpZ2dlcicsIHRoaXMuX2JpbmRIYW5kbGVyLm9uUmVzaXplTWVCb3VuZCk7XG5cdCAgdGhpcy4kZWxlbWVudC5vbignbXV0YXRlbWUuemYudHJpZ2dlcicsIHRoaXMuX2JpbmRIYW5kbGVyLm9uUmVzaXplTWVCb3VuZCk7XG4gICAgfVxuICAgIHRoaXMuaXNPbiA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBjdXJyZW50IGJyZWFrcG9pbnQgdG8gdGhlIG1pbmltdW0gcmVxdWlyZWQgc2l6ZS5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jaGVja01RKCkge1xuICAgIHZhciB0b29TbWFsbCA9ICFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuaXModGhpcy5vcHRpb25zLmVxdWFsaXplT24pO1xuICAgIGlmKHRvb1NtYWxsKXtcbiAgICAgIGlmKHRoaXMuaXNPbil7XG4gICAgICAgIHRoaXMuX3BhdXNlRXZlbnRzKCk7XG4gICAgICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgaWYoIXRoaXMuaXNPbil7XG4gICAgICAgIHRoaXMuX2V2ZW50cygpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdG9vU21hbGw7XG4gIH1cblxuICAvKipcbiAgICogQSBub29wIHZlcnNpb24gZm9yIHRoZSBwbHVnaW5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9raWxsc3dpdGNoKCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxscyBuZWNlc3NhcnkgZnVuY3Rpb25zIHRvIHVwZGF0ZSBFcXVhbGl6ZXIgdXBvbiBET00gY2hhbmdlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfcmVmbG93KCkge1xuICAgIGlmKCF0aGlzLm9wdGlvbnMuZXF1YWxpemVPblN0YWNrKXtcbiAgICAgIGlmKHRoaXMuX2lzU3RhY2tlZCgpKXtcbiAgICAgICAgdGhpcy4kd2F0Y2hlZC5jc3MoJ2hlaWdodCcsICdhdXRvJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy5lcXVhbGl6ZUJ5Um93KSB7XG4gICAgICB0aGlzLmdldEhlaWdodHNCeVJvdyh0aGlzLmFwcGx5SGVpZ2h0QnlSb3cuYmluZCh0aGlzKSk7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLmdldEhlaWdodHModGhpcy5hcHBseUhlaWdodC5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTWFudWFsbHkgZGV0ZXJtaW5lcyBpZiB0aGUgZmlyc3QgMiBlbGVtZW50cyBhcmUgKk5PVCogc3RhY2tlZC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pc1N0YWNrZWQoKSB7XG4gICAgaWYgKCF0aGlzLiR3YXRjaGVkWzBdIHx8ICF0aGlzLiR3YXRjaGVkWzFdKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuJHdhdGNoZWRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wICE9PSB0aGlzLiR3YXRjaGVkWzFdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLnRvcDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyB0aGUgb3V0ZXIgaGVpZ2h0cyBvZiBjaGlsZHJlbiBjb250YWluZWQgd2l0aGluIGFuIEVxdWFsaXplciBwYXJlbnQgYW5kIHJldHVybnMgdGhlbSBpbiBhbiBhcnJheVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIEEgbm9uLW9wdGlvbmFsIGNhbGxiYWNrIHRvIHJldHVybiB0aGUgaGVpZ2h0cyBhcnJheSB0by5cbiAgICogQHJldHVybnMge0FycmF5fSBoZWlnaHRzIC0gQW4gYXJyYXkgb2YgaGVpZ2h0cyBvZiBjaGlsZHJlbiB3aXRoaW4gRXF1YWxpemVyIGNvbnRhaW5lclxuICAgKi9cbiAgZ2V0SGVpZ2h0cyhjYikge1xuICAgIHZhciBoZWlnaHRzID0gW107XG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdGhpcy4kd2F0Y2hlZC5sZW5ndGg7IGkgPCBsZW47IGkrKyl7XG4gICAgICB0aGlzLiR3YXRjaGVkW2ldLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgIGhlaWdodHMucHVzaCh0aGlzLiR3YXRjaGVkW2ldLm9mZnNldEhlaWdodCk7XG4gICAgfVxuICAgIGNiKGhlaWdodHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIHRoZSBvdXRlciBoZWlnaHRzIG9mIGNoaWxkcmVuIGNvbnRhaW5lZCB3aXRoaW4gYW4gRXF1YWxpemVyIHBhcmVudCBhbmQgcmV0dXJucyB0aGVtIGluIGFuIGFycmF5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gQSBub24tb3B0aW9uYWwgY2FsbGJhY2sgdG8gcmV0dXJuIHRoZSBoZWlnaHRzIGFycmF5IHRvLlxuICAgKiBAcmV0dXJucyB7QXJyYXl9IGdyb3VwcyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXIgZ3JvdXBlZCBieSByb3cgd2l0aCBlbGVtZW50LGhlaWdodCBhbmQgbWF4IGFzIGxhc3QgY2hpbGRcbiAgICovXG4gIGdldEhlaWdodHNCeVJvdyhjYikge1xuICAgIHZhciBsYXN0RWxUb3BPZmZzZXQgPSAodGhpcy4kd2F0Y2hlZC5sZW5ndGggPyB0aGlzLiR3YXRjaGVkLmZpcnN0KCkub2Zmc2V0KCkudG9wIDogMCksXG4gICAgICAgIGdyb3VwcyA9IFtdLFxuICAgICAgICBncm91cCA9IDA7XG4gICAgLy9ncm91cCBieSBSb3dcbiAgICBncm91cHNbZ3JvdXBdID0gW107XG4gICAgZm9yKHZhciBpID0gMCwgbGVuID0gdGhpcy4kd2F0Y2hlZC5sZW5ndGg7IGkgPCBsZW47IGkrKyl7XG4gICAgICB0aGlzLiR3YXRjaGVkW2ldLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgIC8vbWF5YmUgY291bGQgdXNlIHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0VG9wXG4gICAgICB2YXIgZWxPZmZzZXRUb3AgPSAkKHRoaXMuJHdhdGNoZWRbaV0pLm9mZnNldCgpLnRvcDtcbiAgICAgIGlmIChlbE9mZnNldFRvcCE9bGFzdEVsVG9wT2Zmc2V0KSB7XG4gICAgICAgIGdyb3VwKys7XG4gICAgICAgIGdyb3Vwc1tncm91cF0gPSBbXTtcbiAgICAgICAgbGFzdEVsVG9wT2Zmc2V0PWVsT2Zmc2V0VG9wO1xuICAgICAgfVxuICAgICAgZ3JvdXBzW2dyb3VwXS5wdXNoKFt0aGlzLiR3YXRjaGVkW2ldLHRoaXMuJHdhdGNoZWRbaV0ub2Zmc2V0SGVpZ2h0XSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDAsIGxuID0gZ3JvdXBzLmxlbmd0aDsgaiA8IGxuOyBqKyspIHtcbiAgICAgIHZhciBoZWlnaHRzID0gJChncm91cHNbal0pLm1hcChmdW5jdGlvbigpeyByZXR1cm4gdGhpc1sxXTsgfSkuZ2V0KCk7XG4gICAgICB2YXIgbWF4ICAgICAgICAgPSBNYXRoLm1heC5hcHBseShudWxsLCBoZWlnaHRzKTtcbiAgICAgIGdyb3Vwc1tqXS5wdXNoKG1heCk7XG4gICAgfVxuICAgIGNiKGdyb3Vwcyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hhbmdlcyB0aGUgQ1NTIGhlaWdodCBwcm9wZXJ0eSBvZiBlYWNoIGNoaWxkIGluIGFuIEVxdWFsaXplciBwYXJlbnQgdG8gbWF0Y2ggdGhlIHRhbGxlc3RcbiAgICogQHBhcmFtIHthcnJheX0gaGVpZ2h0cyAtIEFuIGFycmF5IG9mIGhlaWdodHMgb2YgY2hpbGRyZW4gd2l0aGluIEVxdWFsaXplciBjb250YWluZXJcbiAgICogQGZpcmVzIEVxdWFsaXplciNwcmVlcXVhbGl6ZWRcbiAgICogQGZpcmVzIEVxdWFsaXplciNwb3N0ZXF1YWxpemVkXG4gICAqL1xuICBhcHBseUhlaWdodChoZWlnaHRzKSB7XG4gICAgdmFyIG1heCA9IE1hdGgubWF4LmFwcGx5KG51bGwsIGhlaWdodHMpO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIGJlZm9yZSB0aGUgaGVpZ2h0cyBhcmUgYXBwbGllZFxuICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG5cbiAgICB0aGlzLiR3YXRjaGVkLmNzcygnaGVpZ2h0JywgbWF4KTtcblxuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgaGF2ZSBiZWVuIGFwcGxpZWRcbiAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICAgKi9cbiAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkLnpmLmVxdWFsaXplcicpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoYW5nZXMgdGhlIENTUyBoZWlnaHQgcHJvcGVydHkgb2YgZWFjaCBjaGlsZCBpbiBhbiBFcXVhbGl6ZXIgcGFyZW50IHRvIG1hdGNoIHRoZSB0YWxsZXN0IGJ5IHJvd1xuICAgKiBAcGFyYW0ge2FycmF5fSBncm91cHMgLSBBbiBhcnJheSBvZiBoZWlnaHRzIG9mIGNoaWxkcmVuIHdpdGhpbiBFcXVhbGl6ZXIgY29udGFpbmVyIGdyb3VwZWQgYnkgcm93IHdpdGggZWxlbWVudCxoZWlnaHQgYW5kIG1heCBhcyBsYXN0IGNoaWxkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkXG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcHJlZXF1YWxpemVkcm93XG4gICAqIEBmaXJlcyBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZHJvd1xuICAgKiBAZmlyZXMgRXF1YWxpemVyI3Bvc3RlcXVhbGl6ZWRcbiAgICovXG4gIGFwcGx5SGVpZ2h0QnlSb3coZ3JvdXBzKSB7XG4gICAgLyoqXG4gICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIGFyZSBhcHBsaWVkXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWQuemYuZXF1YWxpemVyJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGdyb3Vwcy5sZW5ndGg7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgIHZhciBncm91cHNJTGVuZ3RoID0gZ3JvdXBzW2ldLmxlbmd0aCxcbiAgICAgICAgICBtYXggPSBncm91cHNbaV1bZ3JvdXBzSUxlbmd0aCAtIDFdO1xuICAgICAgaWYgKGdyb3Vwc0lMZW5ndGg8PTIpIHtcbiAgICAgICAgJChncm91cHNbaV1bMF1bMF0pLmNzcyh7J2hlaWdodCc6J2F1dG8nfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgICogRmlyZXMgYmVmb3JlIHRoZSBoZWlnaHRzIHBlciByb3cgYXJlIGFwcGxpZWRcbiAgICAgICAgKiBAZXZlbnQgRXF1YWxpemVyI3ByZWVxdWFsaXplZHJvd1xuICAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwcmVlcXVhbGl6ZWRyb3cuemYuZXF1YWxpemVyJyk7XG4gICAgICBmb3IgKHZhciBqID0gMCwgbGVuSiA9IChncm91cHNJTGVuZ3RoLTEpOyBqIDwgbGVuSiA7IGorKykge1xuICAgICAgICAkKGdyb3Vwc1tpXVtqXVswXSkuY3NzKHsnaGVpZ2h0JzptYXh9KTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGhlaWdodHMgcGVyIHJvdyBoYXZlIGJlZW4gYXBwbGllZFxuICAgICAgICAqIEBldmVudCBFcXVhbGl6ZXIjcG9zdGVxdWFsaXplZHJvd1xuICAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdwb3N0ZXF1YWxpemVkcm93LnpmLmVxdWFsaXplcicpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBoZWlnaHRzIGhhdmUgYmVlbiBhcHBsaWVkXG4gICAgICovXG4gICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcigncG9zdGVxdWFsaXplZC56Zi5lcXVhbGl6ZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyBhbiBpbnN0YW5jZSBvZiBFcXVhbGl6ZXIuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLl9wYXVzZUV2ZW50cygpO1xuICAgIHRoaXMuJHdhdGNoZWQuY3NzKCdoZWlnaHQnLCAnYXV0bycpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbkVxdWFsaXplci5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEVuYWJsZSBoZWlnaHQgZXF1YWxpemF0aW9uIHdoZW4gc3RhY2tlZCBvbiBzbWFsbGVyIHNjcmVlbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgZXF1YWxpemVPblN0YWNrOiBmYWxzZSxcbiAgLyoqXG4gICAqIEVuYWJsZSBoZWlnaHQgZXF1YWxpemF0aW9uIHJvdyBieSByb3cuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGVxdWFsaXplQnlSb3c6IGZhbHNlLFxuICAvKipcbiAgICogU3RyaW5nIHJlcHJlc2VudGluZyB0aGUgbWluaW11bSBicmVha3BvaW50IHNpemUgdGhlIHBsdWdpbiBzaG91bGQgZXF1YWxpemUgaGVpZ2h0cyBvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbWVkaXVtJ1xuICAgKi9cbiAgZXF1YWxpemVPbjogJydcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihFcXVhbGl6ZXIsICdFcXVhbGl6ZXInKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIEludGVyY2hhbmdlIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5pbnRlcmNoYW5nZVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXJcbiAqL1xuXG5jbGFzcyBJbnRlcmNoYW5nZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIEludGVyY2hhbmdlLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIEludGVyY2hhbmdlI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBJbnRlcmNoYW5nZS5kZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgdGhpcy5ydWxlcyA9IFtdO1xuICAgIHRoaXMuY3VycmVudFBhdGggPSAnJztcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ0ludGVyY2hhbmdlJyk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIEludGVyY2hhbmdlIHBsdWdpbiBhbmQgY2FsbHMgZnVuY3Rpb25zIHRvIGdldCBpbnRlcmNoYW5nZSBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHRoaXMuX2FkZEJyZWFrcG9pbnRzKCk7XG4gICAgdGhpcy5fZ2VuZXJhdGVSdWxlcygpO1xuICAgIHRoaXMuX3JlZmxvdygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGV2ZW50cyBmb3IgSW50ZXJjaGFuZ2UuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5pbnRlcmNoYW5nZScsIEZvdW5kYXRpb24udXRpbC50aHJvdHRsZSgoKSA9PiB7XG4gICAgICB0aGlzLl9yZWZsb3coKTtcbiAgICB9LCA1MCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxzIG5lY2Vzc2FyeSBmdW5jdGlvbnMgdG8gdXBkYXRlIEludGVyY2hhbmdlIHVwb24gRE9NIGNoYW5nZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZWZsb3coKSB7XG4gICAgdmFyIG1hdGNoO1xuXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGVhY2ggcnVsZSwgYnV0IG9ubHkgc2F2ZSB0aGUgbGFzdCBtYXRjaFxuICAgIGZvciAodmFyIGkgaW4gdGhpcy5ydWxlcykge1xuICAgICAgaWYodGhpcy5ydWxlcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICB2YXIgcnVsZSA9IHRoaXMucnVsZXNbaV07XG4gICAgICAgIGlmICh3aW5kb3cubWF0Y2hNZWRpYShydWxlLnF1ZXJ5KS5tYXRjaGVzKSB7XG4gICAgICAgICAgbWF0Y2ggPSBydWxlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICB0aGlzLnJlcGxhY2UobWF0Y2gucGF0aCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIEZvdW5kYXRpb24gYnJlYWtwb2ludHMgYW5kIGFkZHMgdGhlbSB0byB0aGUgSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTIG9iamVjdC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkQnJlYWtwb2ludHMoKSB7XG4gICAgZm9yICh2YXIgaSBpbiBGb3VuZGF0aW9uLk1lZGlhUXVlcnkucXVlcmllcykge1xuICAgICAgaWYgKEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzLmhhc093blByb3BlcnR5KGkpKSB7XG4gICAgICAgIHZhciBxdWVyeSA9IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5xdWVyaWVzW2ldO1xuICAgICAgICBJbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVNbcXVlcnkubmFtZV0gPSBxdWVyeS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBJbnRlcmNoYW5nZSBlbGVtZW50IGZvciB0aGUgcHJvdmlkZWQgbWVkaWEgcXVlcnkgKyBjb250ZW50IHBhaXJpbmdzXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdGhhdCBpcyBhbiBJbnRlcmNoYW5nZSBpbnN0YW5jZVxuICAgKiBAcmV0dXJucyB7QXJyYXl9IHNjZW5hcmlvcyAtIEFycmF5IG9mIG9iamVjdHMgdGhhdCBoYXZlICdtcScgYW5kICdwYXRoJyBrZXlzIHdpdGggY29ycmVzcG9uZGluZyBrZXlzXG4gICAqL1xuICBfZ2VuZXJhdGVSdWxlcyhlbGVtZW50KSB7XG4gICAgdmFyIHJ1bGVzTGlzdCA9IFtdO1xuICAgIHZhciBydWxlcztcblxuICAgIGlmICh0aGlzLm9wdGlvbnMucnVsZXMpIHtcbiAgICAgIHJ1bGVzID0gdGhpcy5vcHRpb25zLnJ1bGVzO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJ1bGVzID0gdGhpcy4kZWxlbWVudC5kYXRhKCdpbnRlcmNoYW5nZScpLm1hdGNoKC9cXFsuKj9cXF0vZyk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSBpbiBydWxlcykge1xuICAgICAgaWYocnVsZXMuaGFzT3duUHJvcGVydHkoaSkpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSBydWxlc1tpXS5zbGljZSgxLCAtMSkuc3BsaXQoJywgJyk7XG4gICAgICAgIHZhciBwYXRoID0gcnVsZS5zbGljZSgwLCAtMSkuam9pbignJyk7XG4gICAgICAgIHZhciBxdWVyeSA9IHJ1bGVbcnVsZS5sZW5ndGggLSAxXTtcblxuICAgICAgICBpZiAoSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5XSkge1xuICAgICAgICAgIHF1ZXJ5ID0gSW50ZXJjaGFuZ2UuU1BFQ0lBTF9RVUVSSUVTW3F1ZXJ5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJ1bGVzTGlzdC5wdXNoKHtcbiAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgIHF1ZXJ5OiBxdWVyeVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJ1bGVzID0gcnVsZXNMaXN0O1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgYHNyY2AgcHJvcGVydHkgb2YgYW4gaW1hZ2UsIG9yIGNoYW5nZSB0aGUgSFRNTCBvZiBhIGNvbnRhaW5lciwgdG8gdGhlIHNwZWNpZmllZCBwYXRoLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGggLSBQYXRoIHRvIHRoZSBpbWFnZSBvciBIVE1MIHBhcnRpYWwuXG4gICAqIEBmaXJlcyBJbnRlcmNoYW5nZSNyZXBsYWNlZFxuICAgKi9cbiAgcmVwbGFjZShwYXRoKSB7XG4gICAgaWYgKHRoaXMuY3VycmVudFBhdGggPT09IHBhdGgpIHJldHVybjtcblxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHRyaWdnZXIgPSAncmVwbGFjZWQuemYuaW50ZXJjaGFuZ2UnO1xuXG4gICAgLy8gUmVwbGFjaW5nIGltYWdlc1xuICAgIGlmICh0aGlzLiRlbGVtZW50WzBdLm5vZGVOYW1lID09PSAnSU1HJykge1xuICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdzcmMnLCBwYXRoKS5vbignbG9hZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICB9KVxuICAgICAgLnRyaWdnZXIodHJpZ2dlcik7XG4gICAgfVxuICAgIC8vIFJlcGxhY2luZyBiYWNrZ3JvdW5kIGltYWdlc1xuICAgIGVsc2UgaWYgKHBhdGgubWF0Y2goL1xcLihnaWZ8anBnfGpwZWd8cG5nfHN2Z3x0aWZmKShbPyNdLiopPy9pKSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3MoeyAnYmFja2dyb3VuZC1pbWFnZSc6ICd1cmwoJytwYXRoKycpJyB9KVxuICAgICAgICAgIC50cmlnZ2VyKHRyaWdnZXIpO1xuICAgIH1cbiAgICAvLyBSZXBsYWNpbmcgSFRNTFxuICAgIGVsc2Uge1xuICAgICAgJC5nZXQocGF0aCwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgX3RoaXMuJGVsZW1lbnQuaHRtbChyZXNwb25zZSlcbiAgICAgICAgICAgICAudHJpZ2dlcih0cmlnZ2VyKTtcbiAgICAgICAgJChyZXNwb25zZSkuZm91bmRhdGlvbigpO1xuICAgICAgICBfdGhpcy5jdXJyZW50UGF0aCA9IHBhdGg7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIGNvbnRlbnQgaW4gYW4gSW50ZXJjaGFuZ2UgZWxlbWVudCBpcyBkb25lIGJlaW5nIGxvYWRlZC5cbiAgICAgKiBAZXZlbnQgSW50ZXJjaGFuZ2UjcmVwbGFjZWRcbiAgICAgKi9cbiAgICAvLyB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3JlcGxhY2VkLnpmLmludGVyY2hhbmdlJyk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgaW50ZXJjaGFuZ2UuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICAvL1RPRE8gdGhpcy5cbiAgfVxufVxuXG4vKipcbiAqIERlZmF1bHQgc2V0dGluZ3MgZm9yIHBsdWdpblxuICovXG5JbnRlcmNoYW5nZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFJ1bGVzIHRvIGJlIGFwcGxpZWQgdG8gSW50ZXJjaGFuZ2UgZWxlbWVudHMuIFNldCB3aXRoIHRoZSBgZGF0YS1pbnRlcmNoYW5nZWAgYXJyYXkgbm90YXRpb24uXG4gICAqIEBvcHRpb25cbiAgICovXG4gIHJ1bGVzOiBudWxsXG59O1xuXG5JbnRlcmNoYW5nZS5TUEVDSUFMX1FVRVJJRVMgPSB7XG4gICdsYW5kc2NhcGUnOiAnc2NyZWVuIGFuZCAob3JpZW50YXRpb246IGxhbmRzY2FwZSknLFxuICAncG9ydHJhaXQnOiAnc2NyZWVuIGFuZCAob3JpZW50YXRpb246IHBvcnRyYWl0KScsXG4gICdyZXRpbmEnOiAnb25seSBzY3JlZW4gYW5kICgtd2Via2l0LW1pbi1kZXZpY2UtcGl4ZWwtcmF0aW86IDIpLCBvbmx5IHNjcmVlbiBhbmQgKG1pbi0tbW96LWRldmljZS1waXhlbC1yYXRpbzogMiksIG9ubHkgc2NyZWVuIGFuZCAoLW8tbWluLWRldmljZS1waXhlbC1yYXRpbzogMi8xKSwgb25seSBzY3JlZW4gYW5kIChtaW4tZGV2aWNlLXBpeGVsLXJhdGlvOiAyKSwgb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMTkyZHBpKSwgb25seSBzY3JlZW4gYW5kIChtaW4tcmVzb2x1dGlvbjogMmRwcHgpJ1xufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKEludGVyY2hhbmdlLCAnSW50ZXJjaGFuZ2UnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIE1hZ2VsbGFuIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi5tYWdlbGxhblxuICovXG5cbmNsYXNzIE1hZ2VsbGFuIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgTWFnZWxsYW4uXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgTWFnZWxsYW4jaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gYWRkIHRoZSB0cmlnZ2VyIHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zICA9ICQuZXh0ZW5kKHt9LCBNYWdlbGxhbi5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuY2FsY1BvaW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnTWFnZWxsYW4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgTWFnZWxsYW4gcGx1Z2luIGFuZCBjYWxscyBmdW5jdGlvbnMgdG8gZ2V0IGVxdWFsaXplciBmdW5jdGlvbmluZyBvbiBsb2FkLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdtYWdlbGxhbicpO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy4kdGFyZ2V0cyA9ICQoJ1tkYXRhLW1hZ2VsbGFuLXRhcmdldF0nKTtcbiAgICB0aGlzLiRsaW5rcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnYScpO1xuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAnZGF0YS1yZXNpemUnOiBpZCxcbiAgICAgICdkYXRhLXNjcm9sbCc6IGlkLFxuICAgICAgJ2lkJzogaWRcbiAgICB9KTtcbiAgICB0aGlzLiRhY3RpdmUgPSAkKCk7XG4gICAgdGhpcy5zY3JvbGxQb3MgPSBwYXJzZUludCh3aW5kb3cucGFnZVlPZmZzZXQsIDEwKTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGN1bGF0ZXMgYW4gYXJyYXkgb2YgcGl4ZWwgdmFsdWVzIHRoYXQgYXJlIHRoZSBkZW1hcmNhdGlvbiBsaW5lcyBiZXR3ZWVuIGxvY2F0aW9ucyBvbiB0aGUgcGFnZS5cbiAgICogQ2FuIGJlIGludm9rZWQgaWYgbmV3IGVsZW1lbnRzIGFyZSBhZGRlZCBvciB0aGUgc2l6ZSBvZiBhIGxvY2F0aW9uIGNoYW5nZXMuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgY2FsY1BvaW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzLFxuICAgICAgICBib2R5ID0gZG9jdW1lbnQuYm9keSxcbiAgICAgICAgaHRtbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcblxuICAgIHRoaXMucG9pbnRzID0gW107XG4gICAgdGhpcy53aW5IZWlnaHQgPSBNYXRoLnJvdW5kKE1hdGgubWF4KHdpbmRvdy5pbm5lckhlaWdodCwgaHRtbC5jbGllbnRIZWlnaHQpKTtcbiAgICB0aGlzLmRvY0hlaWdodCA9IE1hdGgucm91bmQoTWF0aC5tYXgoYm9keS5zY3JvbGxIZWlnaHQsIGJvZHkub2Zmc2V0SGVpZ2h0LCBodG1sLmNsaWVudEhlaWdodCwgaHRtbC5zY3JvbGxIZWlnaHQsIGh0bWwub2Zmc2V0SGVpZ2h0KSk7XG5cbiAgICB0aGlzLiR0YXJnZXRzLmVhY2goZnVuY3Rpb24oKXtcbiAgICAgIHZhciAkdGFyID0gJCh0aGlzKSxcbiAgICAgICAgICBwdCA9IE1hdGgucm91bmQoJHRhci5vZmZzZXQoKS50b3AgLSBfdGhpcy5vcHRpb25zLnRocmVzaG9sZCk7XG4gICAgICAkdGFyLnRhcmdldFBvaW50ID0gcHQ7XG4gICAgICBfdGhpcy5wb2ludHMucHVzaChwdCk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgZXZlbnRzIGZvciBNYWdlbGxhbi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgJGJvZHkgPSAkKCdodG1sLCBib2R5JyksXG4gICAgICAgIG9wdHMgPSB7XG4gICAgICAgICAgZHVyYXRpb246IF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRHVyYXRpb24sXG4gICAgICAgICAgZWFzaW5nOiAgIF90aGlzLm9wdGlvbnMuYW5pbWF0aW9uRWFzaW5nXG4gICAgICAgIH07XG4gICAgJCh3aW5kb3cpLm9uZSgnbG9hZCcsIGZ1bmN0aW9uKCl7XG4gICAgICBpZihfdGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgICAgaWYobG9jYXRpb24uaGFzaCl7XG4gICAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2MobG9jYXRpb24uaGFzaCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIF90aGlzLmNhbGNQb2ludHMoKTtcbiAgICAgIF90aGlzLl91cGRhdGVBY3RpdmUoKTtcbiAgICB9KTtcblxuICAgIHRoaXMuJGVsZW1lbnQub24oe1xuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLnJlZmxvdy5iaW5kKHRoaXMpLFxuICAgICAgJ3Njcm9sbG1lLnpmLnRyaWdnZXInOiB0aGlzLl91cGRhdGVBY3RpdmUuYmluZCh0aGlzKVxuICAgIH0pLm9uKCdjbGljay56Zi5tYWdlbGxhbicsICdhW2hyZWZePVwiI1wiXScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgYXJyaXZhbCAgID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hyZWYnKTtcbiAgICAgICAgX3RoaXMuc2Nyb2xsVG9Mb2MoYXJyaXZhbCk7XG4gICAgICB9KTtcbiAgICAkKHdpbmRvdykub24oJ3BvcHN0YXRlJywgZnVuY3Rpb24oZSkge1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5kZWVwTGlua2luZykge1xuICAgICAgICBfdGhpcy5zY3JvbGxUb0xvYyh3aW5kb3cubG9jYXRpb24uaGFzaCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRnVuY3Rpb24gdG8gc2Nyb2xsIHRvIGEgZ2l2ZW4gbG9jYXRpb24gb24gdGhlIHBhZ2UuXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBsb2MgLSBhIHByb3Blcmx5IGZvcm1hdHRlZCBqUXVlcnkgaWQgc2VsZWN0b3IuIEV4YW1wbGU6ICcjZm9vJ1xuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHNjcm9sbFRvTG9jKGxvYykge1xuICAgIC8vIERvIG5vdGhpbmcgaWYgdGFyZ2V0IGRvZXMgbm90IGV4aXN0IHRvIHByZXZlbnQgZXJyb3JzXG4gICAgaWYgKCEkKGxvYykubGVuZ3RoKSB7cmV0dXJuIGZhbHNlO31cbiAgICB0aGlzLl9pblRyYW5zaXRpb24gPSB0cnVlO1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHNjcm9sbFBvcyA9IE1hdGgucm91bmQoJChsb2MpLm9mZnNldCgpLnRvcCAtIHRoaXMub3B0aW9ucy50aHJlc2hvbGQgLyAyIC0gdGhpcy5vcHRpb25zLmJhck9mZnNldCk7XG5cbiAgICAkKCdodG1sLCBib2R5Jykuc3RvcCh0cnVlKS5hbmltYXRlKFxuICAgICAgeyBzY3JvbGxUb3A6IHNjcm9sbFBvcyB9LFxuICAgICAgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkR1cmF0aW9uLFxuICAgICAgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkVhc2luZyxcbiAgICAgIGZ1bmN0aW9uKCkge190aGlzLl9pblRyYW5zaXRpb24gPSBmYWxzZTsgX3RoaXMuX3VwZGF0ZUFjdGl2ZSgpfVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbHMgbmVjZXNzYXJ5IGZ1bmN0aW9ucyB0byB1cGRhdGUgTWFnZWxsYW4gdXBvbiBET00gY2hhbmdlXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgcmVmbG93KCkge1xuICAgIHRoaXMuY2FsY1BvaW50cygpO1xuICAgIHRoaXMuX3VwZGF0ZUFjdGl2ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHZpc2liaWxpdHkgb2YgYW4gYWN0aXZlIGxvY2F0aW9uIGxpbmssIGFuZCB1cGRhdGVzIHRoZSB1cmwgaGFzaCBmb3IgdGhlIHBhZ2UsIGlmIGRlZXBMaW5raW5nIGVuYWJsZWQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgTWFnZWxsYW4jdXBkYXRlXG4gICAqL1xuICBfdXBkYXRlQWN0aXZlKC8qZXZ0LCBlbGVtLCBzY3JvbGxQb3MqLykge1xuICAgIGlmKHRoaXMuX2luVHJhbnNpdGlvbikge3JldHVybjt9XG4gICAgdmFyIHdpblBvcyA9IC8qc2Nyb2xsUG9zIHx8Ki8gcGFyc2VJbnQod2luZG93LnBhZ2VZT2Zmc2V0LCAxMCksXG4gICAgICAgIGN1cklkeDtcblxuICAgIGlmKHdpblBvcyArIHRoaXMud2luSGVpZ2h0ID09PSB0aGlzLmRvY0hlaWdodCl7IGN1cklkeCA9IHRoaXMucG9pbnRzLmxlbmd0aCAtIDE7IH1cbiAgICBlbHNlIGlmKHdpblBvcyA8IHRoaXMucG9pbnRzWzBdKXsgY3VySWR4ID0gdW5kZWZpbmVkOyB9XG4gICAgZWxzZXtcbiAgICAgIHZhciBpc0Rvd24gPSB0aGlzLnNjcm9sbFBvcyA8IHdpblBvcyxcbiAgICAgICAgICBfdGhpcyA9IHRoaXMsXG4gICAgICAgICAgY3VyVmlzaWJsZSA9IHRoaXMucG9pbnRzLmZpbHRlcihmdW5jdGlvbihwLCBpKXtcbiAgICAgICAgICAgIHJldHVybiBpc0Rvd24gPyBwIC0gX3RoaXMub3B0aW9ucy5iYXJPZmZzZXQgPD0gd2luUG9zIDogcCAtIF90aGlzLm9wdGlvbnMuYmFyT2Zmc2V0IC0gX3RoaXMub3B0aW9ucy50aHJlc2hvbGQgPD0gd2luUG9zO1xuICAgICAgICAgIH0pO1xuICAgICAgY3VySWR4ID0gY3VyVmlzaWJsZS5sZW5ndGggPyBjdXJWaXNpYmxlLmxlbmd0aCAtIDEgOiAwO1xuICAgIH1cblxuICAgIHRoaXMuJGFjdGl2ZS5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuICAgIHRoaXMuJGFjdGl2ZSA9IHRoaXMuJGxpbmtzLmZpbHRlcignW2hyZWY9XCIjJyArIHRoaXMuJHRhcmdldHMuZXEoY3VySWR4KS5kYXRhKCdtYWdlbGxhbi10YXJnZXQnKSArICdcIl0nKS5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgIHZhciBoYXNoID0gXCJcIjtcbiAgICAgIGlmKGN1cklkeCAhPSB1bmRlZmluZWQpe1xuICAgICAgICBoYXNoID0gdGhpcy4kYWN0aXZlWzBdLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgfVxuICAgICAgaWYoaGFzaCAhPT0gd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgaWYod2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKXtcbiAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgbnVsbCwgaGFzaCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gaGFzaDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc2Nyb2xsUG9zID0gd2luUG9zO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gbWFnZWxsYW4gaXMgZmluaXNoZWQgdXBkYXRpbmcgdG8gdGhlIG5ldyBhY3RpdmUgZWxlbWVudC5cbiAgICAgKiBAZXZlbnQgTWFnZWxsYW4jdXBkYXRlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd1cGRhdGUuemYubWFnZWxsYW4nLCBbdGhpcy4kYWN0aXZlXSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgTWFnZWxsYW4gYW5kIHJlc2V0cyB0aGUgdXJsIG9mIHRoZSB3aW5kb3cuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRyaWdnZXIgLnpmLm1hZ2VsbGFuJylcbiAgICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5hY3RpdmVDbGFzc31gKS5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuYWN0aXZlQ2xhc3MpO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLmRlZXBMaW5raW5nKXtcbiAgICAgIHZhciBoYXNoID0gdGhpcy4kYWN0aXZlWzBdLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2gucmVwbGFjZShoYXNoLCAnJyk7XG4gICAgfVxuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cbi8qKlxuICogRGVmYXVsdCBzZXR0aW5ncyBmb3IgcGx1Z2luXG4gKi9cbk1hZ2VsbGFuLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQW1vdW50IG9mIHRpbWUsIGluIG1zLCB0aGUgYW5pbWF0ZWQgc2Nyb2xsaW5nIHNob3VsZCB0YWtlIGJldHdlZW4gbG9jYXRpb25zLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwMFxuICAgKi9cbiAgYW5pbWF0aW9uRHVyYXRpb246IDUwMCxcbiAgLyoqXG4gICAqIEFuaW1hdGlvbiBzdHlsZSB0byB1c2Ugd2hlbiBzY3JvbGxpbmcgYmV0d2VlbiBsb2NhdGlvbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2Vhc2UtaW4tb3V0J1xuICAgKi9cbiAgYW5pbWF0aW9uRWFzaW5nOiAnbGluZWFyJyxcbiAgLyoqXG4gICAqIE51bWJlciBvZiBwaXhlbHMgdG8gdXNlIGFzIGEgbWFya2VyIGZvciBsb2NhdGlvbiBjaGFuZ2VzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwXG4gICAqL1xuICB0aHJlc2hvbGQ6IDUwLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYWN0aXZlIGxvY2F0aW9ucyBsaW5rIG9uIHRoZSBtYWdlbGxhbiBjb250YWluZXIuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2FjdGl2ZSdcbiAgICovXG4gIGFjdGl2ZUNsYXNzOiAnYWN0aXZlJyxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgc2NyaXB0IHRvIG1hbmlwdWxhdGUgdGhlIHVybCBvZiB0aGUgY3VycmVudCBwYWdlLCBhbmQgaWYgc3VwcG9ydGVkLCBhbHRlciB0aGUgaGlzdG9yeS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBkZWVwTGlua2luZzogZmFsc2UsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgcGl4ZWxzIHRvIG9mZnNldCB0aGUgc2Nyb2xsIG9mIHRoZSBwYWdlIG9uIGl0ZW0gY2xpY2sgaWYgdXNpbmcgYSBzdGlja3kgbmF2IGJhci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyNVxuICAgKi9cbiAgYmFyT2Zmc2V0OiAwXG59XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihNYWdlbGxhbiwgJ01hZ2VsbGFuJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBPZmZDYW52YXMgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLm9mZmNhbnZhc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvblxuICovXG5cbmNsYXNzIE9mZkNhbnZhcyB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGFuIG9mZi1jYW52YXMgd3JhcHBlci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBPZmZDYW52YXMjaW5pdFxuICAgKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gaW5pdGlhbGl6ZS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBPZmZDYW52YXMuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcbiAgICB0aGlzLiRsYXN0VHJpZ2dlciA9ICQoKTtcbiAgICB0aGlzLiR0cmlnZ2VycyA9ICQoKTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ09mZkNhbnZhcycpXG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignT2ZmQ2FudmFzJywge1xuICAgICAgJ0VTQ0FQRSc6ICdjbG9zZSdcbiAgICB9KTtcblxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBvZmYtY2FudmFzIHdyYXBwZXIgYnkgYWRkaW5nIHRoZSBleGl0IG92ZXJsYXkgKGlmIG5lZWRlZCkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIGlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG5cbiAgICB0aGlzLiRlbGVtZW50LmFkZENsYXNzKGBpcy10cmFuc2l0aW9uLSR7dGhpcy5vcHRpb25zLnRyYW5zaXRpb259YCk7XG5cbiAgICAvLyBGaW5kIHRyaWdnZXJzIHRoYXQgYWZmZWN0IHRoaXMgZWxlbWVudCBhbmQgYWRkIGFyaWEtZXhwYW5kZWQgdG8gdGhlbVxuICAgIHRoaXMuJHRyaWdnZXJzID0gJChkb2N1bWVudClcbiAgICAgIC5maW5kKCdbZGF0YS1vcGVuPVwiJytpZCsnXCJdLCBbZGF0YS1jbG9zZT1cIicraWQrJ1wiXSwgW2RhdGEtdG9nZ2xlPVwiJytpZCsnXCJdJylcbiAgICAgIC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgJ2ZhbHNlJylcbiAgICAgIC5hdHRyKCdhcmlhLWNvbnRyb2xzJywgaWQpO1xuXG4gICAgLy8gQWRkIGFuIG92ZXJsYXkgb3ZlciB0aGUgY29udGVudCBpZiBuZWNlc3NhcnlcbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbnRlbnRPdmVybGF5ID09PSB0cnVlKSB7XG4gICAgICB2YXIgb3ZlcmxheSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgdmFyIG92ZXJsYXlQb3NpdGlvbiA9ICQodGhpcy4kZWxlbWVudCkuY3NzKFwicG9zaXRpb25cIikgPT09ICdmaXhlZCcgPyAnaXMtb3ZlcmxheS1maXhlZCcgOiAnaXMtb3ZlcmxheS1hYnNvbHV0ZSc7XG4gICAgICBvdmVybGF5LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAnanMtb2ZmLWNhbnZhcy1vdmVybGF5ICcgKyBvdmVybGF5UG9zaXRpb24pO1xuICAgICAgdGhpcy4kb3ZlcmxheSA9ICQob3ZlcmxheSk7XG4gICAgICBpZihvdmVybGF5UG9zaXRpb24gPT09ICdpcy1vdmVybGF5LWZpeGVkJykge1xuICAgICAgICAkKCdib2R5JykuYXBwZW5kKHRoaXMuJG92ZXJsYXkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5zaWJsaW5ncygnW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XScpLmFwcGVuZCh0aGlzLiRvdmVybGF5KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLm9wdGlvbnMuaXNSZXZlYWxlZCA9IHRoaXMub3B0aW9ucy5pc1JldmVhbGVkIHx8IG5ldyBSZWdFeHAodGhpcy5vcHRpb25zLnJldmVhbENsYXNzLCAnZycpLnRlc3QodGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5pc1JldmVhbGVkID09PSB0cnVlKSB7XG4gICAgICB0aGlzLm9wdGlvbnMucmV2ZWFsT24gPSB0aGlzLm9wdGlvbnMucmV2ZWFsT24gfHwgdGhpcy4kZWxlbWVudFswXS5jbGFzc05hbWUubWF0Y2goLyhyZXZlYWwtZm9yLW1lZGl1bXxyZXZlYWwtZm9yLWxhcmdlKS9nKVswXS5zcGxpdCgnLScpWzJdO1xuICAgICAgdGhpcy5fc2V0TVFDaGVja2VyKCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5vcHRpb25zLnRyYW5zaXRpb25UaW1lID09PSB0cnVlKSB7XG4gICAgICB0aGlzLm9wdGlvbnMudHJhbnNpdGlvblRpbWUgPSBwYXJzZUZsb2F0KHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKCQoJ1tkYXRhLW9mZi1jYW52YXNdJylbMF0pLnRyYW5zaXRpb25EdXJhdGlvbikgKiAxMDAwO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIHRvIHRoZSBvZmYtY2FudmFzIHdyYXBwZXIgYW5kIHRoZSBleGl0IG92ZXJsYXkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnRyaWdnZXIgLnpmLm9mZmNhbnZhcycpLm9uKHtcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpLFxuICAgICAgJ3RvZ2dsZS56Zi50cmlnZ2VyJzogdGhpcy50b2dnbGUuYmluZCh0aGlzKSxcbiAgICAgICdrZXlkb3duLnpmLm9mZmNhbnZhcyc6IHRoaXMuX2hhbmRsZUtleWJvYXJkLmJpbmQodGhpcylcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrID09PSB0cnVlKSB7XG4gICAgICB2YXIgJHRhcmdldCA9IHRoaXMub3B0aW9ucy5jb250ZW50T3ZlcmxheSA/IHRoaXMuJG92ZXJsYXkgOiAkKCdbZGF0YS1vZmYtY2FudmFzLWNvbnRlbnRdJyk7XG4gICAgICAkdGFyZ2V0Lm9uKHsnY2xpY2suemYub2ZmY2FudmFzJzogdGhpcy5jbG9zZS5iaW5kKHRoaXMpfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEFwcGxpZXMgZXZlbnQgbGlzdGVuZXIgZm9yIGVsZW1lbnRzIHRoYXQgd2lsbCByZXZlYWwgYXQgY2VydGFpbiBicmVha3BvaW50cy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRNUUNoZWNrZXIoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QoX3RoaXMub3B0aW9ucy5yZXZlYWxPbikpIHtcbiAgICAgICAgX3RoaXMucmV2ZWFsKHRydWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgX3RoaXMucmV2ZWFsKGZhbHNlKTtcbiAgICAgIH1cbiAgICB9KS5vbmUoJ2xvYWQuemYub2ZmY2FudmFzJywgZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QoX3RoaXMub3B0aW9ucy5yZXZlYWxPbikpIHtcbiAgICAgICAgX3RoaXMucmV2ZWFsKHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgdGhlIHJldmVhbGluZy9oaWRpbmcgdGhlIG9mZi1jYW52YXMgYXQgYnJlYWtwb2ludHMsIG5vdCB0aGUgc2FtZSBhcyBvcGVuLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzUmV2ZWFsZWQgLSB0cnVlIGlmIGVsZW1lbnQgc2hvdWxkIGJlIHJldmVhbGVkLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHJldmVhbChpc1JldmVhbGVkKSB7XG4gICAgdmFyICRjbG9zZXIgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLWNsb3NlXScpO1xuICAgIGlmIChpc1JldmVhbGVkKSB7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB0aGlzLmlzUmV2ZWFsZWQgPSB0cnVlO1xuICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuICAgICAgdGhpcy4kZWxlbWVudC5vZmYoJ29wZW4uemYudHJpZ2dlciB0b2dnbGUuemYudHJpZ2dlcicpO1xuICAgICAgaWYgKCRjbG9zZXIubGVuZ3RoKSB7ICRjbG9zZXIuaGlkZSgpOyB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaXNSZXZlYWxlZCA9IGZhbHNlO1xuICAgICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICAgJ29wZW4uemYudHJpZ2dlcic6IHRoaXMub3Blbi5iaW5kKHRoaXMpLFxuICAgICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpXG4gICAgICB9KTtcbiAgICAgIGlmICgkY2xvc2VyLmxlbmd0aCkge1xuICAgICAgICAkY2xvc2VyLnNob3coKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU3RvcHMgc2Nyb2xsaW5nIG9mIHRoZSBib2R5IHdoZW4gb2ZmY2FudmFzIGlzIG9wZW4gb24gbW9iaWxlIFNhZmFyaSBhbmQgb3RoZXIgdHJvdWJsZXNvbWUgYnJvd3NlcnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc3RvcFNjcm9sbGluZyhldmVudCkge1xuICBcdHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgb2ZmLWNhbnZhcyBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtPYmplY3R9IGV2ZW50IC0gRXZlbnQgb2JqZWN0IHBhc3NlZCBmcm9tIGxpc3RlbmVyLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gdHJpZ2dlciAtIGVsZW1lbnQgdGhhdCB0cmlnZ2VyZWQgdGhlIG9mZi1jYW52YXMgdG8gb3Blbi5cbiAgICogQGZpcmVzIE9mZkNhbnZhcyNvcGVuZWRcbiAgICovXG4gIG9wZW4oZXZlbnQsIHRyaWdnZXIpIHtcbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpIHx8IHRoaXMuaXNSZXZlYWxlZCkgeyByZXR1cm47IH1cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgaWYgKHRyaWdnZXIpIHtcbiAgICAgIHRoaXMuJGxhc3RUcmlnZ2VyID0gdHJpZ2dlcjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmZvcmNlVG8gPT09ICd0b3AnKSB7XG4gICAgICB3aW5kb3cuc2Nyb2xsVG8oMCwgMCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZm9yY2VUbyA9PT0gJ2JvdHRvbScpIHtcbiAgICAgIHdpbmRvdy5zY3JvbGxUbygwLGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBvZmYtY2FudmFzIG1lbnUgb3BlbnMuXG4gICAgICogQGV2ZW50IE9mZkNhbnZhcyNvcGVuZWRcbiAgICAgKi9cbiAgICBfdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnaXMtb3BlbicpXG5cbiAgICB0aGlzLiR0cmlnZ2Vycy5hdHRyKCdhcmlhLWV4cGFuZGVkJywgJ3RydWUnKTtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJylcbiAgICAgICAgLnRyaWdnZXIoJ29wZW5lZC56Zi5vZmZjYW52YXMnKTtcblxuICAgIC8vIElmIGBjb250ZW50U2Nyb2xsYCBpcyBzZXQgdG8gZmFsc2UsIGFkZCBjbGFzcyBhbmQgZGlzYWJsZSBzY3JvbGxpbmcgb24gdG91Y2ggZGV2aWNlcy5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbnRlbnRTY3JvbGwgPT09IGZhbHNlKSB7XG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2lzLW9mZi1jYW52YXMtb3BlbicpLm9uKCd0b3VjaG1vdmUnLCB0aGlzLl9zdG9wU2Nyb2xsaW5nKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNvbnRlbnRPdmVybGF5ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdpcy12aXNpYmxlJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jbG9zZU9uQ2xpY2sgPT09IHRydWUgJiYgdGhpcy5vcHRpb25zLmNvbnRlbnRPdmVybGF5ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRvdmVybGF5LmFkZENsYXNzKCdpcy1jbG9zYWJsZScpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b0ZvY3VzID09PSB0cnVlKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uZShGb3VuZGF0aW9uLnRyYW5zaXRpb25lbmQodGhpcy4kZWxlbWVudCksIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy4kZWxlbWVudC5maW5kKCdhLCBidXR0b24nKS5lcSgwKS5mb2N1cygpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFwRm9jdXMgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuc2libGluZ3MoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5hdHRyKCd0YWJpbmRleCcsICctMScpO1xuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC50cmFwRm9jdXModGhpcy4kZWxlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENsb3NlcyB0aGUgb2ZmLWNhbnZhcyBtZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBvcHRpb25hbCBjYiB0byBmaXJlIGFmdGVyIGNsb3N1cmUuXG4gICAqIEBmaXJlcyBPZmZDYW52YXMjY2xvc2VkXG4gICAqL1xuICBjbG9zZShjYikge1xuICAgIGlmICghdGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpIHx8IHRoaXMuaXNSZXZlYWxlZCkgeyByZXR1cm47IH1cblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBfdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcygnaXMtb3BlbicpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsICd0cnVlJylcbiAgICAgIC8qKlxuICAgICAgICogRmlyZXMgd2hlbiB0aGUgb2ZmLWNhbnZhcyBtZW51IG9wZW5zLlxuICAgICAgICogQGV2ZW50IE9mZkNhbnZhcyNjbG9zZWRcbiAgICAgICAqL1xuICAgICAgICAudHJpZ2dlcignY2xvc2VkLnpmLm9mZmNhbnZhcycpO1xuXG4gICAgLy8gSWYgYGNvbnRlbnRTY3JvbGxgIGlzIHNldCB0byBmYWxzZSwgcmVtb3ZlIGNsYXNzIGFuZCByZS1lbmFibGUgc2Nyb2xsaW5nIG9uIHRvdWNoIGRldmljZXMuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jb250ZW50U2Nyb2xsID09PSBmYWxzZSkge1xuICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdpcy1vZmYtY2FudmFzLW9wZW4nKS5vZmYoJ3RvdWNobW92ZScsIHRoaXMuX3N0b3BTY3JvbGxpbmcpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkucmVtb3ZlQ2xhc3MoJ2lzLXZpc2libGUnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayA9PT0gdHJ1ZSAmJiB0aGlzLm9wdGlvbnMuY29udGVudE92ZXJsYXkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkucmVtb3ZlQ2xhc3MoJ2lzLWNsb3NhYmxlJyk7XG4gICAgfVxuXG4gICAgdGhpcy4kdHJpZ2dlcnMuYXR0cignYXJpYS1leHBhbmRlZCcsICdmYWxzZScpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy50cmFwRm9jdXMgPT09IHRydWUpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuc2libGluZ3MoJ1tkYXRhLW9mZi1jYW52YXMtY29udGVudF0nKS5yZW1vdmVBdHRyKCd0YWJpbmRleCcpO1xuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWxlYXNlRm9jdXModGhpcy4kZWxlbWVudCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIG9mZi1jYW52YXMgbWVudSBvcGVuIG9yIGNsb3NlZC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBldmVudCAtIEV2ZW50IG9iamVjdCBwYXNzZWQgZnJvbSBsaXN0ZW5lci5cbiAgICogQHBhcmFtIHtqUXVlcnl9IHRyaWdnZXIgLSBlbGVtZW50IHRoYXQgdHJpZ2dlcmVkIHRoZSBvZmYtY2FudmFzIHRvIG9wZW4uXG4gICAqL1xuICB0b2dnbGUoZXZlbnQsIHRyaWdnZXIpIHtcbiAgICBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnaXMtb3BlbicpKSB7XG4gICAgICB0aGlzLmNsb3NlKGV2ZW50LCB0cmlnZ2VyKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLm9wZW4oZXZlbnQsIHRyaWdnZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGVzIGtleWJvYXJkIGlucHV0IHdoZW4gZGV0ZWN0ZWQuIFdoZW4gdGhlIGVzY2FwZSBrZXkgaXMgcHJlc3NlZCwgdGhlIG9mZi1jYW52YXMgbWVudSBjbG9zZXMsIGFuZCBmb2N1cyBpcyByZXN0b3JlZCB0byB0aGUgZWxlbWVudCB0aGF0IG9wZW5lZCB0aGUgbWVudS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaGFuZGxlS2V5Ym9hcmQoZSkge1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdPZmZDYW52YXMnLCB7XG4gICAgICBjbG9zZTogKCkgPT4ge1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgIHRoaXMuJGxhc3RUcmlnZ2VyLmZvY3VzKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSxcbiAgICAgIGhhbmRsZWQ6ICgpID0+IHtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBvZmZjYW52YXMgcGx1Z2luLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5jbG9zZSgpO1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudHJpZ2dlciAuemYub2ZmY2FudmFzJyk7XG4gICAgdGhpcy4kb3ZlcmxheS5vZmYoJy56Zi5vZmZjYW52YXMnKTtcblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5PZmZDYW52YXMuZGVmYXVsdHMgPSB7XG4gIC8qKlxuICAgKiBBbGxvdyB0aGUgdXNlciB0byBjbGljayBvdXRzaWRlIG9mIHRoZSBtZW51IHRvIGNsb3NlIGl0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsb3NlT25DbGljazogdHJ1ZSxcblxuICAvKipcbiAgICogQWRkcyBhbiBvdmVybGF5IG9uIHRvcCBvZiBgW2RhdGEtb2ZmLWNhbnZhcy1jb250ZW50XWAuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY29udGVudE92ZXJsYXk6IHRydWUsXG5cbiAgLyoqXG4gICAqIEVuYWJsZS9kaXNhYmxlIHNjcm9sbGluZyBvZiB0aGUgbWFpbiBjb250ZW50IHdoZW4gYW4gb2ZmIGNhbnZhcyBwYW5lbCBpcyBvcGVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNvbnRlbnRTY3JvbGw6IHRydWUsXG5cbiAgLyoqXG4gICAqIEFtb3VudCBvZiB0aW1lIGluIG1zIHRoZSBvcGVuIGFuZCBjbG9zZSB0cmFuc2l0aW9uIHJlcXVpcmVzLiBJZiBub25lIHNlbGVjdGVkLCBwdWxscyBmcm9tIGJvZHkgc3R5bGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTAwXG4gICAqL1xuICB0cmFuc2l0aW9uVGltZTogMCxcblxuICAvKipcbiAgICogVHlwZSBvZiB0cmFuc2l0aW9uIGZvciB0aGUgb2ZmY2FudmFzIG1lbnUuIE9wdGlvbnMgYXJlICdwdXNoJywgJ2RldGFjaGVkJyBvciAnc2xpZGUnLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHB1c2hcbiAgICovXG4gIHRyYW5zaXRpb246ICdwdXNoJyxcblxuICAvKipcbiAgICogRm9yY2UgdGhlIHBhZ2UgdG8gc2Nyb2xsIHRvIHRvcCBvciBib3R0b20gb24gb3Blbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0b3BcbiAgICovXG4gIGZvcmNlVG86IG51bGwsXG5cbiAgLyoqXG4gICAqIEFsbG93IHRoZSBvZmZjYW52YXMgdG8gcmVtYWluIG9wZW4gZm9yIGNlcnRhaW4gYnJlYWtwb2ludHMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGlzUmV2ZWFsZWQ6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBCcmVha3BvaW50IGF0IHdoaWNoIHRvIHJldmVhbC4gSlMgd2lsbCB1c2UgYSBSZWdFeHAgdG8gdGFyZ2V0IHN0YW5kYXJkIGNsYXNzZXMsIGlmIGNoYW5naW5nIGNsYXNzbmFtZXMsIHBhc3MgeW91ciBjbGFzcyB3aXRoIHRoZSBgcmV2ZWFsQ2xhc3NgIG9wdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSByZXZlYWwtZm9yLWxhcmdlXG4gICAqL1xuICByZXZlYWxPbjogbnVsbCxcblxuICAvKipcbiAgICogRm9yY2UgZm9jdXMgdG8gdGhlIG9mZmNhbnZhcyBvbiBvcGVuLiBJZiB0cnVlLCB3aWxsIGZvY3VzIHRoZSBvcGVuaW5nIHRyaWdnZXIgb24gY2xvc2UuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgYXV0b0ZvY3VzOiB0cnVlLFxuXG4gIC8qKlxuICAgKiBDbGFzcyB1c2VkIHRvIGZvcmNlIGFuIG9mZmNhbnZhcyB0byByZW1haW4gb3Blbi4gRm91bmRhdGlvbiBkZWZhdWx0cyBmb3IgdGhpcyBhcmUgYHJldmVhbC1mb3ItbGFyZ2VgICYgYHJldmVhbC1mb3ItbWVkaXVtYC5cbiAgICogQG9wdGlvblxuICAgKiBUT0RPIGltcHJvdmUgdGhlIHJlZ2V4IHRlc3RpbmcgZm9yIHRoaXMuXG4gICAqIEBleGFtcGxlIHJldmVhbC1mb3ItbGFyZ2VcbiAgICovXG4gIHJldmVhbENsYXNzOiAncmV2ZWFsLWZvci0nLFxuXG4gIC8qKlxuICAgKiBUcmlnZ2VycyBvcHRpb25hbCBmb2N1cyB0cmFwcGluZyB3aGVuIG9wZW5pbmcgYW4gb2ZmY2FudmFzLiBTZXRzIHRhYmluZGV4IG9mIFtkYXRhLW9mZi1jYW52YXMtY29udGVudF0gdG8gLTEgZm9yIGFjY2Vzc2liaWxpdHkgcHVycG9zZXMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgdHJhcEZvY3VzOiBmYWxzZVxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oT2ZmQ2FudmFzLCAnT2ZmQ2FudmFzJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBPcmJpdCBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ub3JiaXRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwubW90aW9uXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXJcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudG91Y2hcbiAqL1xuXG5jbGFzcyBPcmJpdCB7XG4gIC8qKlxuICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYW4gb3JiaXQgY2Fyb3VzZWwuXG4gICogQGNsYXNzXG4gICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhbiBPcmJpdCBDYXJvdXNlbC5cbiAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpe1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBPcmJpdC5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnT3JiaXQnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdPcmJpdCcsIHtcbiAgICAgICdsdHInOiB7XG4gICAgICAgICdBUlJPV19SSUdIVCc6ICduZXh0JyxcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnXG4gICAgICB9LFxuICAgICAgJ3J0bCc6IHtcbiAgICAgICAgJ0FSUk9XX0xFRlQnOiAnbmV4dCcsXG4gICAgICAgICdBUlJPV19SSUdIVCc6ICdwcmV2aW91cydcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAqIEluaXRpYWxpemVzIHRoZSBwbHVnaW4gYnkgY3JlYXRpbmcgalF1ZXJ5IGNvbGxlY3Rpb25zLCBzZXR0aW5nIGF0dHJpYnV0ZXMsIGFuZCBzdGFydGluZyB0aGUgYW5pbWF0aW9uLlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9pbml0KCkge1xuICAgIC8vIEBUT0RPOiBjb25zaWRlciBkaXNjdXNzaW9uIG9uIFBSICM5Mjc4IGFib3V0IERPTSBwb2xsdXRpb24gYnkgY2hhbmdlU2xpZGVcbiAgICB0aGlzLl9yZXNldCgpO1xuXG4gICAgdGhpcy4kd3JhcHBlciA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLmNvbnRhaW5lckNsYXNzfWApO1xuICAgIHRoaXMuJHNsaWRlcyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCk7XG5cbiAgICB2YXIgJGltYWdlcyA9IHRoaXMuJGVsZW1lbnQuZmluZCgnaW1nJyksXG4gICAgICAgIGluaXRBY3RpdmUgPSB0aGlzLiRzbGlkZXMuZmlsdGVyKCcuaXMtYWN0aXZlJyksXG4gICAgICAgIGlkID0gdGhpcy4kZWxlbWVudFswXS5pZCB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdvcmJpdCcpO1xuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKHtcbiAgICAgICdkYXRhLXJlc2l6ZSc6IGlkLFxuICAgICAgJ2lkJzogaWRcbiAgICB9KTtcblxuICAgIGlmICghaW5pdEFjdGl2ZS5sZW5ndGgpIHtcbiAgICAgIHRoaXMuJHNsaWRlcy5lcSgwKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMudXNlTVVJKSB7XG4gICAgICB0aGlzLiRzbGlkZXMuYWRkQ2xhc3MoJ25vLW1vdGlvbnVpJyk7XG4gICAgfVxuXG4gICAgaWYgKCRpbWFnZXMubGVuZ3RoKSB7XG4gICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKCRpbWFnZXMsIHRoaXMuX3ByZXBhcmVGb3JPcmJpdC5iaW5kKHRoaXMpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcHJlcGFyZUZvck9yYml0KCk7Ly9oZWhlXG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICB0aGlzLl9sb2FkQnVsbGV0cygpO1xuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hdXRvUGxheSAmJiB0aGlzLiRzbGlkZXMubGVuZ3RoID4gMSkge1xuICAgICAgdGhpcy5nZW9TeW5jKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hY2Nlc3NpYmxlKSB7IC8vIGFsbG93IHdyYXBwZXIgdG8gYmUgZm9jdXNhYmxlIHRvIGVuYWJsZSBhcnJvdyBuYXZpZ2F0aW9uXG4gICAgICB0aGlzLiR3cmFwcGVyLmF0dHIoJ3RhYmluZGV4JywgMCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogQ3JlYXRlcyBhIGpRdWVyeSBjb2xsZWN0aW9uIG9mIGJ1bGxldHMsIGlmIHRoZXkgYXJlIGJlaW5nIHVzZWQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX2xvYWRCdWxsZXRzKCkge1xuICAgIHRoaXMuJGJ1bGxldHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5ib3hPZkJ1bGxldHN9YCkuZmluZCgnYnV0dG9uJyk7XG4gIH1cblxuICAvKipcbiAgKiBTZXRzIGEgYHRpbWVyYCBvYmplY3Qgb24gdGhlIG9yYml0LCBhbmQgc3RhcnRzIHRoZSBjb3VudGVyIGZvciB0aGUgbmV4dCBzbGlkZS5cbiAgKiBAZnVuY3Rpb25cbiAgKi9cbiAgZ2VvU3luYygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMudGltZXIgPSBuZXcgRm91bmRhdGlvbi5UaW1lcihcbiAgICAgIHRoaXMuJGVsZW1lbnQsXG4gICAgICB7XG4gICAgICAgIGR1cmF0aW9uOiB0aGlzLm9wdGlvbnMudGltZXJEZWxheSxcbiAgICAgICAgaW5maW5pdGU6IGZhbHNlXG4gICAgICB9LFxuICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgfSk7XG4gICAgdGhpcy50aW1lci5zdGFydCgpO1xuICB9XG5cbiAgLyoqXG4gICogU2V0cyB3cmFwcGVyIGFuZCBzbGlkZSBoZWlnaHRzIGZvciB0aGUgb3JiaXQuXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKi9cbiAgX3ByZXBhcmVGb3JPcmJpdCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3NldFdyYXBwZXJIZWlnaHQoKTtcbiAgfVxuXG4gIC8qKlxuICAqIENhbHVsYXRlcyB0aGUgaGVpZ2h0IG9mIGVhY2ggc2xpZGUgaW4gdGhlIGNvbGxlY3Rpb24sIGFuZCB1c2VzIHRoZSB0YWxsZXN0IG9uZSBmb3IgdGhlIHdyYXBwZXIgaGVpZ2h0LlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICogQHBhcmFtIHtGdW5jdGlvbn0gY2IgLSBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGZpcmUgd2hlbiBjb21wbGV0ZS5cbiAgKi9cbiAgX3NldFdyYXBwZXJIZWlnaHQoY2IpIHsvL3Jld3JpdGUgdGhpcyB0byBgZm9yYCBsb29wXG4gICAgdmFyIG1heCA9IDAsIHRlbXAsIGNvdW50ZXIgPSAwLCBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRzbGlkZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIHRlbXAgPSB0aGlzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcbiAgICAgICQodGhpcykuYXR0cignZGF0YS1zbGlkZScsIGNvdW50ZXIpO1xuXG4gICAgICBpZiAoX3RoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKVswXSAhPT0gX3RoaXMuJHNsaWRlcy5lcShjb3VudGVyKVswXSkgey8vaWYgbm90IHRoZSBhY3RpdmUgc2xpZGUsIHNldCBjc3MgcG9zaXRpb24gYW5kIGRpc3BsYXkgcHJvcGVydHlcbiAgICAgICAgJCh0aGlzKS5jc3Moeydwb3NpdGlvbic6ICdyZWxhdGl2ZScsICdkaXNwbGF5JzogJ25vbmUnfSk7XG4gICAgICB9XG4gICAgICBtYXggPSB0ZW1wID4gbWF4ID8gdGVtcCA6IG1heDtcbiAgICAgIGNvdW50ZXIrKztcbiAgICB9KTtcblxuICAgIGlmIChjb3VudGVyID09PSB0aGlzLiRzbGlkZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLiR3cmFwcGVyLmNzcyh7J2hlaWdodCc6IG1heH0pOyAvL29ubHkgY2hhbmdlIHRoZSB3cmFwcGVyIGhlaWdodCBwcm9wZXJ0eSBvbmNlLlxuICAgICAgaWYoY2IpIHtjYihtYXgpO30gLy9maXJlIGNhbGxiYWNrIHdpdGggbWF4IGhlaWdodCBkaW1lbnNpb24uXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICogU2V0cyB0aGUgbWF4LWhlaWdodCBvZiBlYWNoIHNsaWRlLlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICovXG4gIF9zZXRTbGlkZUhlaWdodChoZWlnaHQpIHtcbiAgICB0aGlzLiRzbGlkZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICQodGhpcykuY3NzKCdtYXgtaGVpZ2h0JywgaGVpZ2h0KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIHRvIGJhc2ljYWxseSBldmVyeXRoaW5nIHdpdGhpbiB0aGUgZWxlbWVudC5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcHJpdmF0ZVxuICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgIC8vKipOb3cgdXNpbmcgY3VzdG9tIGV2ZW50IC0gdGhhbmtzIHRvOioqXG4gICAgLy8qKiAgICAgIFlvaGFpIEFyYXJhdCBvZiBUb3JvbnRvICAgICAgKipcbiAgICAvLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgIC8vXG4gICAgdGhpcy4kZWxlbWVudC5vZmYoJy5yZXNpemVtZS56Zi50cmlnZ2VyJykub24oe1xuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiB0aGlzLl9wcmVwYXJlRm9yT3JiaXQuYmluZCh0aGlzKVxuICAgIH0pXG4gICAgaWYgKHRoaXMuJHNsaWRlcy5sZW5ndGggPiAxKSB7XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3dpcGUpIHtcbiAgICAgICAgdGhpcy4kc2xpZGVzLm9mZignc3dpcGVsZWZ0LnpmLm9yYml0IHN3aXBlcmlnaHQuemYub3JiaXQnKVxuICAgICAgICAub24oJ3N3aXBlbGVmdC56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZSh0cnVlKTtcbiAgICAgICAgfSkub24oJ3N3aXBlcmlnaHQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoZmFsc2UpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIC8vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkpIHtcbiAgICAgICAgdGhpcy4kc2xpZGVzLm9uKCdjbGljay56Zi5vcmJpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF90aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicsIF90aGlzLiRlbGVtZW50LmRhdGEoJ2NsaWNrZWRPbicpID8gZmFsc2UgOiB0cnVlKTtcbiAgICAgICAgICBfdGhpcy50aW1lcltfdGhpcy4kZWxlbWVudC5kYXRhKCdjbGlja2VkT24nKSA/ICdwYXVzZScgOiAnc3RhcnQnXSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnBhdXNlT25Ib3Zlcikge1xuICAgICAgICAgIHRoaXMuJGVsZW1lbnQub24oJ21vdXNlZW50ZXIuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLnRpbWVyLnBhdXNlKCk7XG4gICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUuemYub3JiaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICghX3RoaXMuJGVsZW1lbnQuZGF0YSgnY2xpY2tlZE9uJykpIHtcbiAgICAgICAgICAgICAgX3RoaXMudGltZXIuc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLm5hdkJ1dHRvbnMpIHtcbiAgICAgICAgdmFyICRjb250cm9scyA9IHRoaXMuJGVsZW1lbnQuZmluZChgLiR7dGhpcy5vcHRpb25zLm5leHRDbGFzc30sIC4ke3RoaXMub3B0aW9ucy5wcmV2Q2xhc3N9YCk7XG4gICAgICAgICRjb250cm9scy5hdHRyKCd0YWJpbmRleCcsIDApXG4gICAgICAgIC8vYWxzbyBuZWVkIHRvIGhhbmRsZSBlbnRlci9yZXR1cm4gYW5kIHNwYWNlYmFyIGtleSBwcmVzc2VzXG4gICAgICAgIC5vbignY2xpY2suemYub3JiaXQgdG91Y2hlbmQuemYub3JiaXQnLCBmdW5jdGlvbihlKXtcblx0ICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoJCh0aGlzKS5oYXNDbGFzcyhfdGhpcy5vcHRpb25zLm5leHRDbGFzcykpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5idWxsZXRzKSB7XG4gICAgICAgIHRoaXMuJGJ1bGxldHMub24oJ2NsaWNrLnpmLm9yYml0IHRvdWNoZW5kLnpmLm9yYml0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKC9pcy1hY3RpdmUvZy50ZXN0KHRoaXMuY2xhc3NOYW1lKSkgeyByZXR1cm4gZmFsc2U7IH0vL2lmIHRoaXMgaXMgYWN0aXZlLCBraWNrIG91dCBvZiBmdW5jdGlvbi5cbiAgICAgICAgICB2YXIgaWR4ID0gJCh0aGlzKS5kYXRhKCdzbGlkZScpLFxuICAgICAgICAgIGx0ciA9IGlkeCA+IF90aGlzLiRzbGlkZXMuZmlsdGVyKCcuaXMtYWN0aXZlJykuZGF0YSgnc2xpZGUnKSxcbiAgICAgICAgICAkc2xpZGUgPSBfdGhpcy4kc2xpZGVzLmVxKGlkeCk7XG5cbiAgICAgICAgICBfdGhpcy5jaGFuZ2VTbGlkZShsdHIsICRzbGlkZSwgaWR4KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYWNjZXNzaWJsZSkge1xuICAgICAgICB0aGlzLiR3cmFwcGVyLmFkZCh0aGlzLiRidWxsZXRzKS5vbigna2V5ZG93bi56Zi5vcmJpdCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAvLyBoYW5kbGUga2V5Ym9hcmQgZXZlbnQgd2l0aCBrZXlib2FyZCB1dGlsXG4gICAgICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5oYW5kbGVLZXkoZSwgJ09yYml0Jywge1xuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIF90aGlzLmNoYW5nZVNsaWRlKHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgX3RoaXMuY2hhbmdlU2xpZGUoZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkgeyAvLyBpZiBidWxsZXQgaXMgZm9jdXNlZCwgbWFrZSBzdXJlIGZvY3VzIG1vdmVzXG4gICAgICAgICAgICAgIGlmICgkKGUudGFyZ2V0KS5pcyhfdGhpcy4kYnVsbGV0cykpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy4kYnVsbGV0cy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5mb2N1cygpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldHMgT3JiaXQgc28gaXQgY2FuIGJlIHJlaW5pdGlhbGl6ZWRcbiAgICovXG4gIF9yZXNldCgpIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiB0aGVyZSBhcmUgbm8gc2xpZGVzIChmaXJzdCBydW4pXG4gICAgaWYgKHR5cGVvZiB0aGlzLiRzbGlkZXMgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAodGhpcy4kc2xpZGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgIC8vIFJlbW92ZSBvbGQgZXZlbnRzXG4gICAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLm9yYml0JykuZmluZCgnKicpLm9mZignLnpmLm9yYml0JylcblxuICAgICAgLy8gUmVzdGFydCB0aW1lciBpZiBhdXRvUGxheSBpcyBlbmFibGVkXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmF1dG9QbGF5KSB7XG4gICAgICAgIHRoaXMudGltZXIucmVzdGFydCgpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXNldCBhbGwgc2xpZGRlc1xuICAgICAgdGhpcy4kc2xpZGVzLmVhY2goZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgJChlbCkucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1hY3RpdmUgaXMtaW4nKVxuICAgICAgICAgIC5yZW1vdmVBdHRyKCdhcmlhLWxpdmUnKVxuICAgICAgICAgIC5oaWRlKCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gU2hvdyB0aGUgZmlyc3Qgc2xpZGVcbiAgICAgIHRoaXMuJHNsaWRlcy5maXJzdCgpLmFkZENsYXNzKCdpcy1hY3RpdmUnKS5zaG93KCk7XG5cbiAgICAgIC8vIFRyaWdnZXJzIHdoZW4gdGhlIHNsaWRlIGhhcyBmaW5pc2hlZCBhbmltYXRpbmdcbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignc2xpZGVjaGFuZ2UuemYub3JiaXQnLCBbdGhpcy4kc2xpZGVzLmZpcnN0KCldKTtcblxuICAgICAgLy8gU2VsZWN0IGZpcnN0IGJ1bGxldCBpZiBidWxsZXRzIGFyZSBwcmVzZW50XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlQnVsbGV0cygwKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgKiBDaGFuZ2VzIHRoZSBjdXJyZW50IHNsaWRlIHRvIGEgbmV3IG9uZS5cbiAgKiBAZnVuY3Rpb25cbiAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzTFRSIC0gZmxhZyBpZiB0aGUgc2xpZGUgc2hvdWxkIG1vdmUgbGVmdCB0byByaWdodC5cbiAgKiBAcGFyYW0ge2pRdWVyeX0gY2hvc2VuU2xpZGUgLSB0aGUgalF1ZXJ5IGVsZW1lbnQgb2YgdGhlIHNsaWRlIHRvIHNob3cgbmV4dCwgaWYgb25lIGlzIHNlbGVjdGVkLlxuICAqIEBwYXJhbSB7TnVtYmVyfSBpZHggLSB0aGUgaW5kZXggb2YgdGhlIG5ldyBzbGlkZSBpbiBpdHMgY29sbGVjdGlvbiwgaWYgb25lIGNob3Nlbi5cbiAgKiBAZmlyZXMgT3JiaXQjc2xpZGVjaGFuZ2VcbiAgKi9cbiAgY2hhbmdlU2xpZGUoaXNMVFIsIGNob3NlblNsaWRlLCBpZHgpIHtcbiAgICBpZiAoIXRoaXMuJHNsaWRlcykge3JldHVybjsgfSAvLyBEb24ndCBmcmVhayBvdXQgaWYgd2UncmUgaW4gdGhlIG1pZGRsZSBvZiBjbGVhbnVwXG4gICAgdmFyICRjdXJTbGlkZSA9IHRoaXMuJHNsaWRlcy5maWx0ZXIoJy5pcy1hY3RpdmUnKS5lcSgwKTtcblxuICAgIGlmICgvbXVpL2cudGVzdCgkY3VyU2xpZGVbMF0uY2xhc3NOYW1lKSkgeyByZXR1cm4gZmFsc2U7IH0gLy9pZiB0aGUgc2xpZGUgaXMgY3VycmVudGx5IGFuaW1hdGluZywga2ljayBvdXQgb2YgdGhlIGZ1bmN0aW9uXG5cbiAgICB2YXIgJGZpcnN0U2xpZGUgPSB0aGlzLiRzbGlkZXMuZmlyc3QoKSxcbiAgICAkbGFzdFNsaWRlID0gdGhpcy4kc2xpZGVzLmxhc3QoKSxcbiAgICBkaXJJbiA9IGlzTFRSID8gJ1JpZ2h0JyA6ICdMZWZ0JyxcbiAgICBkaXJPdXQgPSBpc0xUUiA/ICdMZWZ0JyA6ICdSaWdodCcsXG4gICAgX3RoaXMgPSB0aGlzLFxuICAgICRuZXdTbGlkZTtcblxuICAgIGlmICghY2hvc2VuU2xpZGUpIHsgLy9tb3N0IG9mIHRoZSB0aW1lLCB0aGlzIHdpbGwgYmUgYXV0byBwbGF5ZWQgb3IgY2xpY2tlZCBmcm9tIHRoZSBuYXZCdXR0b25zLlxuICAgICAgJG5ld1NsaWRlID0gaXNMVFIgPyAvL2lmIHdyYXBwaW5nIGVuYWJsZWQsIGNoZWNrIHRvIHNlZSBpZiB0aGVyZSBpcyBhIGBuZXh0YCBvciBgcHJldmAgc2libGluZywgaWYgbm90LCBzZWxlY3QgdGhlIGZpcnN0IG9yIGxhc3Qgc2xpZGUgdG8gZmlsbCBpbi4gaWYgd3JhcHBpbmcgbm90IGVuYWJsZWQsIGF0dGVtcHQgdG8gc2VsZWN0IGBuZXh0YCBvciBgcHJldmAsIGlmIHRoZXJlJ3Mgbm90aGluZyB0aGVyZSwgdGhlIGZ1bmN0aW9uIHdpbGwga2ljayBvdXQgb24gbmV4dCBzdGVwLiBDUkFaWSBORVNURUQgVEVSTkFSSUVTISEhISFcbiAgICAgICh0aGlzLm9wdGlvbnMuaW5maW5pdGVXcmFwID8gJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApLmxlbmd0aCA/ICRjdXJTbGlkZS5uZXh0KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKSA6ICRmaXJzdFNsaWRlIDogJGN1clNsaWRlLm5leHQoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApKS8vcGljayBuZXh0IHNsaWRlIGlmIG1vdmluZyBsZWZ0IHRvIHJpZ2h0XG4gICAgICA6XG4gICAgICAodGhpcy5vcHRpb25zLmluZmluaXRlV3JhcCA/ICRjdXJTbGlkZS5wcmV2KGAuJHt0aGlzLm9wdGlvbnMuc2xpZGVDbGFzc31gKS5sZW5ndGggPyAkY3VyU2xpZGUucHJldihgLiR7dGhpcy5vcHRpb25zLnNsaWRlQ2xhc3N9YCkgOiAkbGFzdFNsaWRlIDogJGN1clNsaWRlLnByZXYoYC4ke3RoaXMub3B0aW9ucy5zbGlkZUNsYXNzfWApKTsvL3BpY2sgcHJldiBzbGlkZSBpZiBtb3ZpbmcgcmlnaHQgdG8gbGVmdFxuICAgIH0gZWxzZSB7XG4gICAgICAkbmV3U2xpZGUgPSBjaG9zZW5TbGlkZTtcbiAgICB9XG5cbiAgICBpZiAoJG5ld1NsaWRlLmxlbmd0aCkge1xuICAgICAgLyoqXG4gICAgICAqIFRyaWdnZXJzIGJlZm9yZSB0aGUgbmV4dCBzbGlkZSBzdGFydHMgYW5pbWF0aW5nIGluIGFuZCBvbmx5IGlmIGEgbmV4dCBzbGlkZSBoYXMgYmVlbiBmb3VuZC5cbiAgICAgICogQGV2ZW50IE9yYml0I2JlZm9yZXNsaWRlY2hhbmdlXG4gICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdiZWZvcmVzbGlkZWNoYW5nZS56Zi5vcmJpdCcsIFskY3VyU2xpZGUsICRuZXdTbGlkZV0pO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmJ1bGxldHMpIHtcbiAgICAgICAgaWR4ID0gaWR4IHx8IHRoaXMuJHNsaWRlcy5pbmRleCgkbmV3U2xpZGUpOyAvL2dyYWIgaW5kZXggdG8gdXBkYXRlIGJ1bGxldHNcbiAgICAgICAgdGhpcy5fdXBkYXRlQnVsbGV0cyhpZHgpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnVzZU1VSSAmJiAhdGhpcy4kZWxlbWVudC5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbihcbiAgICAgICAgICAkbmV3U2xpZGUuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpLmNzcyh7J3Bvc2l0aW9uJzogJ2Fic29sdXRlJywgJ3RvcCc6IDB9KSxcbiAgICAgICAgICB0aGlzLm9wdGlvbnNbYGFuaW1JbkZyb20ke2RpcklufWBdLFxuICAgICAgICAgIGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAkbmV3U2xpZGUuY3NzKHsncG9zaXRpb24nOiAncmVsYXRpdmUnLCAnZGlzcGxheSc6ICdibG9jayd9KVxuICAgICAgICAgICAgLmF0dHIoJ2FyaWEtbGl2ZScsICdwb2xpdGUnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZU91dChcbiAgICAgICAgICAkY3VyU2xpZGUucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpLFxuICAgICAgICAgIHRoaXMub3B0aW9uc1tgYW5pbU91dFRvJHtkaXJPdXR9YF0sXG4gICAgICAgICAgZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICRjdXJTbGlkZS5yZW1vdmVBdHRyKCdhcmlhLWxpdmUnKTtcbiAgICAgICAgICAgIGlmKF90aGlzLm9wdGlvbnMuYXV0b1BsYXkgJiYgIV90aGlzLnRpbWVyLmlzUGF1c2VkKXtcbiAgICAgICAgICAgICAgX3RoaXMudGltZXIucmVzdGFydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9kbyBzdHVmZj9cbiAgICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRjdXJTbGlkZS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlIGlzLWluJykucmVtb3ZlQXR0cignYXJpYS1saXZlJykuaGlkZSgpO1xuICAgICAgICAkbmV3U2xpZGUuYWRkQ2xhc3MoJ2lzLWFjdGl2ZSBpcy1pbicpLmF0dHIoJ2FyaWEtbGl2ZScsICdwb2xpdGUnKS5zaG93KCk7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXV0b1BsYXkgJiYgIXRoaXMudGltZXIuaXNQYXVzZWQpIHtcbiAgICAgICAgICB0aGlzLnRpbWVyLnJlc3RhcnQoKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIC8qKlxuICAgICogVHJpZ2dlcnMgd2hlbiB0aGUgc2xpZGUgaGFzIGZpbmlzaGVkIGFuaW1hdGluZyBpbi5cbiAgICAqIEBldmVudCBPcmJpdCNzbGlkZWNoYW5nZVxuICAgICovXG4gICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3NsaWRlY2hhbmdlLnpmLm9yYml0JywgWyRuZXdTbGlkZV0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAqIFVwZGF0ZXMgdGhlIGFjdGl2ZSBzdGF0ZSBvZiB0aGUgYnVsbGV0cywgaWYgZGlzcGxheWVkLlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIHRoZSBpbmRleCBvZiB0aGUgY3VycmVudCBzbGlkZS5cbiAgKi9cbiAgX3VwZGF0ZUJ1bGxldHMoaWR4KSB7XG4gICAgdmFyICRvbGRCdWxsZXQgPSB0aGlzLiRlbGVtZW50LmZpbmQoYC4ke3RoaXMub3B0aW9ucy5ib3hPZkJ1bGxldHN9YClcbiAgICAuZmluZCgnLmlzLWFjdGl2ZScpLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKS5ibHVyKCksXG4gICAgc3BhbiA9ICRvbGRCdWxsZXQuZmluZCgnc3BhbjpsYXN0JykuZGV0YWNoKCksXG4gICAgJG5ld0J1bGxldCA9IHRoaXMuJGJ1bGxldHMuZXEoaWR4KS5hZGRDbGFzcygnaXMtYWN0aXZlJykuYXBwZW5kKHNwYW4pO1xuICB9XG5cbiAgLyoqXG4gICogRGVzdHJveXMgdGhlIGNhcm91c2VsIGFuZCBoaWRlcyB0aGUgZWxlbWVudC5cbiAgKiBAZnVuY3Rpb25cbiAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLm9yYml0JykuZmluZCgnKicpLm9mZignLnpmLm9yYml0JykuZW5kKCkuaGlkZSgpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5PcmJpdC5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICogVGVsbHMgdGhlIEpTIHRvIGxvb2sgZm9yIGFuZCBsb2FkQnVsbGV0cy5cbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBidWxsZXRzOiB0cnVlLFxuICAvKipcbiAgKiBUZWxscyB0aGUgSlMgdG8gYXBwbHkgZXZlbnQgbGlzdGVuZXJzIHRvIG5hdiBidXR0b25zXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgbmF2QnV0dG9uczogdHJ1ZSxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnc2xpZGUtaW4tcmlnaHQnXG4gICovXG4gIGFuaW1JbkZyb21SaWdodDogJ3NsaWRlLWluLXJpZ2h0JyxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnc2xpZGUtb3V0LXJpZ2h0J1xuICAqL1xuICBhbmltT3V0VG9SaWdodDogJ3NsaWRlLW91dC1yaWdodCcsXG4gIC8qKlxuICAqIG1vdGlvbi11aSBhbmltYXRpb24gY2xhc3MgdG8gYXBwbHlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgJ3NsaWRlLWluLWxlZnQnXG4gICpcbiAgKi9cbiAgYW5pbUluRnJvbUxlZnQ6ICdzbGlkZS1pbi1sZWZ0JyxcbiAgLyoqXG4gICogbW90aW9uLXVpIGFuaW1hdGlvbiBjbGFzcyB0byBhcHBseVxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnc2xpZGUtb3V0LWxlZnQnXG4gICovXG4gIGFuaW1PdXRUb0xlZnQ6ICdzbGlkZS1vdXQtbGVmdCcsXG4gIC8qKlxuICAqIEFsbG93cyBPcmJpdCB0byBhdXRvbWF0aWNhbGx5IGFuaW1hdGUgb24gcGFnZSBsb2FkLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIGF1dG9QbGF5OiB0cnVlLFxuICAvKipcbiAgKiBBbW91bnQgb2YgdGltZSwgaW4gbXMsIGJldHdlZW4gc2xpZGUgdHJhbnNpdGlvbnNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgNTAwMFxuICAqL1xuICB0aW1lckRlbGF5OiA1MDAwLFxuICAvKipcbiAgKiBBbGxvd3MgT3JiaXQgdG8gaW5maW5pdGVseSBsb29wIHRocm91Z2ggdGhlIHNsaWRlc1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIGluZmluaXRlV3JhcDogdHJ1ZSxcbiAgLyoqXG4gICogQWxsb3dzIHRoZSBPcmJpdCBzbGlkZXMgdG8gYmluZCB0byBzd2lwZSBldmVudHMgZm9yIG1vYmlsZSwgcmVxdWlyZXMgYW4gYWRkaXRpb25hbCB1dGlsIGxpYnJhcnlcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgdHJ1ZVxuICAqL1xuICBzd2lwZTogdHJ1ZSxcbiAgLyoqXG4gICogQWxsb3dzIHRoZSB0aW1pbmcgZnVuY3Rpb24gdG8gcGF1c2UgYW5pbWF0aW9uIG9uIGhvdmVyLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIHBhdXNlT25Ib3ZlcjogdHJ1ZSxcbiAgLyoqXG4gICogQWxsb3dzIE9yYml0IHRvIGJpbmQga2V5Ym9hcmQgZXZlbnRzIHRvIHRoZSBzbGlkZXIsIHRvIGFuaW1hdGUgZnJhbWVzIHdpdGggYXJyb3cga2V5c1xuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSB0cnVlXG4gICovXG4gIGFjY2Vzc2libGU6IHRydWUsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGNvbnRhaW5lciBvZiBPcmJpdFxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtY29udGFpbmVyJ1xuICAqL1xuICBjb250YWluZXJDbGFzczogJ29yYml0LWNvbnRhaW5lcicsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gaW5kaXZpZHVhbCBzbGlkZXMuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1zbGlkZSdcbiAgKi9cbiAgc2xpZGVDbGFzczogJ29yYml0LXNsaWRlJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYnVsbGV0IGNvbnRhaW5lci4gWW91J3JlIHdlbGNvbWUuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1idWxsZXRzJ1xuICAqL1xuICBib3hPZkJ1bGxldHM6ICdvcmJpdC1idWxsZXRzJyxcbiAgLyoqXG4gICogQ2xhc3MgYXBwbGllZCB0byB0aGUgYG5leHRgIG5hdmlnYXRpb24gYnV0dG9uLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnb3JiaXQtbmV4dCdcbiAgKi9cbiAgbmV4dENsYXNzOiAnb3JiaXQtbmV4dCcsXG4gIC8qKlxuICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGBwcmV2aW91c2AgbmF2aWdhdGlvbiBidXR0b24uXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlICdvcmJpdC1wcmV2aW91cydcbiAgKi9cbiAgcHJldkNsYXNzOiAnb3JiaXQtcHJldmlvdXMnLFxuICAvKipcbiAgKiBCb29sZWFuIHRvIGZsYWcgdGhlIGpzIHRvIHVzZSBtb3Rpb24gdWkgY2xhc3NlcyBvciBub3QuIERlZmF1bHQgdG8gdHJ1ZSBmb3IgYmFja3dhcmRzIGNvbXBhdGFiaWxpdHkuXG4gICogQG9wdGlvblxuICAqIEBleGFtcGxlIHRydWVcbiAgKi9cbiAgdXNlTVVJOiB0cnVlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oT3JiaXQsICdPcmJpdCcpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmVzcG9uc2l2ZU1lbnUgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnJlc3BvbnNpdmVNZW51XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuYWNjb3JkaW9uTWVudVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5kcmlsbGRvd25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwuZHJvcGRvd24tbWVudVxuICovXG5cbmNsYXNzIFJlc3BvbnNpdmVNZW51IHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSByZXNwb25zaXZlIG1lbnUuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZU1lbnUjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIGEgZHJvcGRvd24gbWVudS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgIHRoaXMucnVsZXMgPSB0aGlzLiRlbGVtZW50LmRhdGEoJ3Jlc3BvbnNpdmUtbWVudScpO1xuICAgIHRoaXMuY3VycmVudE1xID0gbnVsbDtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4gPSBudWxsO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIHRoaXMuX2V2ZW50cygpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnUmVzcG9uc2l2ZU1lbnUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgTWVudSBieSBwYXJzaW5nIHRoZSBjbGFzc2VzIGZyb20gdGhlICdkYXRhLVJlc3BvbnNpdmVNZW51JyBhdHRyaWJ1dGUgb24gdGhlIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgLy8gVGhlIGZpcnN0IHRpbWUgYW4gSW50ZXJjaGFuZ2UgcGx1Z2luIGlzIGluaXRpYWxpemVkLCB0aGlzLnJ1bGVzIGlzIGNvbnZlcnRlZCBmcm9tIGEgc3RyaW5nIG9mIFwiY2xhc3Nlc1wiIHRvIGFuIG9iamVjdCBvZiBydWxlc1xuICAgIGlmICh0eXBlb2YgdGhpcy5ydWxlcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGxldCBydWxlc1RyZWUgPSB7fTtcblxuICAgICAgLy8gUGFyc2UgcnVsZXMgZnJvbSBcImNsYXNzZXNcIiBwdWxsZWQgZnJvbSBkYXRhIGF0dHJpYnV0ZVxuICAgICAgbGV0IHJ1bGVzID0gdGhpcy5ydWxlcy5zcGxpdCgnICcpO1xuXG4gICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZXZlcnkgcnVsZSBmb3VuZFxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBydWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsZXQgcnVsZSA9IHJ1bGVzW2ldLnNwbGl0KCctJyk7XG4gICAgICAgIGxldCBydWxlU2l6ZSA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMF0gOiAnc21hbGwnO1xuICAgICAgICBsZXQgcnVsZVBsdWdpbiA9IHJ1bGUubGVuZ3RoID4gMSA/IHJ1bGVbMV0gOiBydWxlWzBdO1xuXG4gICAgICAgIGlmIChNZW51UGx1Z2luc1tydWxlUGx1Z2luXSAhPT0gbnVsbCkge1xuICAgICAgICAgIHJ1bGVzVHJlZVtydWxlU2l6ZV0gPSBNZW51UGx1Z2luc1tydWxlUGx1Z2luXTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLnJ1bGVzID0gcnVsZXNUcmVlO1xuICAgIH1cblxuICAgIGlmICghJC5pc0VtcHR5T2JqZWN0KHRoaXMucnVsZXMpKSB7XG4gICAgICB0aGlzLl9jaGVja01lZGlhUXVlcmllcygpO1xuICAgIH1cbiAgICAvLyBBZGQgZGF0YS1tdXRhdGUgc2luY2UgY2hpbGRyZW4gbWF5IG5lZWQgaXQuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdkYXRhLW11dGF0ZScsICh0aGlzLiRlbGVtZW50LmF0dHIoJ2RhdGEtbXV0YXRlJykgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAncmVzcG9uc2l2ZS1tZW51JykpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIHRoZSBNZW51LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICQod2luZG93KS5vbignY2hhbmdlZC56Zi5tZWRpYXF1ZXJ5JywgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5fY2hlY2tNZWRpYVF1ZXJpZXMoKTtcbiAgICB9KTtcbiAgICAvLyAkKHdpbmRvdykub24oJ3Jlc2l6ZS56Zi5SZXNwb25zaXZlTWVudScsIGZ1bmN0aW9uKCkge1xuICAgIC8vICAgX3RoaXMuX2NoZWNrTWVkaWFRdWVyaWVzKCk7XG4gICAgLy8gfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIHRoZSBjdXJyZW50IHNjcmVlbiB3aWR0aCBhZ2FpbnN0IGF2YWlsYWJsZSBtZWRpYSBxdWVyaWVzLiBJZiB0aGUgbWVkaWEgcXVlcnkgaGFzIGNoYW5nZWQsIGFuZCB0aGUgcGx1Z2luIG5lZWRlZCBoYXMgY2hhbmdlZCwgdGhlIHBsdWdpbnMgd2lsbCBzd2FwIG91dC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfY2hlY2tNZWRpYVF1ZXJpZXMoKSB7XG4gICAgdmFyIG1hdGNoZWRNcSwgX3RoaXMgPSB0aGlzO1xuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIHJ1bGUgYW5kIGZpbmQgdGhlIGxhc3QgbWF0Y2hpbmcgcnVsZVxuICAgICQuZWFjaCh0aGlzLnJ1bGVzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdChrZXkpKSB7XG4gICAgICAgIG1hdGNoZWRNcSA9IGtleTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIE5vIG1hdGNoPyBObyBkaWNlXG4gICAgaWYgKCFtYXRjaGVkTXEpIHJldHVybjtcblxuICAgIC8vIFBsdWdpbiBhbHJlYWR5IGluaXRpYWxpemVkPyBXZSBnb29kXG4gICAgaWYgKHRoaXMuY3VycmVudFBsdWdpbiBpbnN0YW5jZW9mIHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5wbHVnaW4pIHJldHVybjtcblxuICAgIC8vIFJlbW92ZSBleGlzdGluZyBwbHVnaW4tc3BlY2lmaWMgQ1NTIGNsYXNzZXNcbiAgICAkLmVhY2goTWVudVBsdWdpbnMsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIF90aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHZhbHVlLmNzc0NsYXNzKTtcbiAgICB9KTtcblxuICAgIC8vIEFkZCB0aGUgQ1NTIGNsYXNzIGZvciB0aGUgbmV3IHBsdWdpblxuICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5ydWxlc1ttYXRjaGVkTXFdLmNzc0NsYXNzKTtcblxuICAgIC8vIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiB0aGUgbmV3IHBsdWdpblxuICAgIGlmICh0aGlzLmN1cnJlbnRQbHVnaW4pIHRoaXMuY3VycmVudFBsdWdpbi5kZXN0cm95KCk7XG4gICAgdGhpcy5jdXJyZW50UGx1Z2luID0gbmV3IHRoaXMucnVsZXNbbWF0Y2hlZE1xXS5wbHVnaW4odGhpcy4kZWxlbWVudCwge30pO1xuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIHRoZSBpbnN0YW5jZSBvZiB0aGUgY3VycmVudCBwbHVnaW4gb24gdGhpcyBlbGVtZW50LCBhcyB3ZWxsIGFzIHRoZSB3aW5kb3cgcmVzaXplIGhhbmRsZXIgdGhhdCBzd2l0Y2hlcyB0aGUgcGx1Z2lucyBvdXQuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLmN1cnJlbnRQbHVnaW4uZGVzdHJveSgpO1xuICAgICQod2luZG93KS5vZmYoJy56Zi5SZXNwb25zaXZlTWVudScpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5SZXNwb25zaXZlTWVudS5kZWZhdWx0cyA9IHt9O1xuXG4vLyBUaGUgcGx1Z2luIG1hdGNoZXMgdGhlIHBsdWdpbiBjbGFzc2VzIHdpdGggdGhlc2UgcGx1Z2luIGluc3RhbmNlcy5cbnZhciBNZW51UGx1Z2lucyA9IHtcbiAgZHJvcGRvd246IHtcbiAgICBjc3NDbGFzczogJ2Ryb3Bkb3duJyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnNbJ2Ryb3Bkb3duLW1lbnUnXSB8fCBudWxsXG4gIH0sXG4gZHJpbGxkb3duOiB7XG4gICAgY3NzQ2xhc3M6ICdkcmlsbGRvd24nLFxuICAgIHBsdWdpbjogRm91bmRhdGlvbi5fcGx1Z2luc1snZHJpbGxkb3duJ10gfHwgbnVsbFxuICB9LFxuICBhY2NvcmRpb246IHtcbiAgICBjc3NDbGFzczogJ2FjY29yZGlvbi1tZW51JyxcbiAgICBwbHVnaW46IEZvdW5kYXRpb24uX3BsdWdpbnNbJ2FjY29yZGlvbi1tZW51J10gfHwgbnVsbFxuICB9XG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oUmVzcG9uc2l2ZU1lbnUsICdSZXNwb25zaXZlTWVudScpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogUmVzcG9uc2l2ZVRvZ2dsZSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmVzcG9uc2l2ZVRvZ2dsZVxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKi9cblxuY2xhc3MgUmVzcG9uc2l2ZVRvZ2dsZSB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIFRhYiBCYXIuXG4gICAqIEBjbGFzc1xuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZVRvZ2dsZSNpbml0XG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBhdHRhY2ggdGFiIGJhciBmdW5jdGlvbmFsaXR5IHRvLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFJlc3BvbnNpdmVUb2dnbGUuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1Jlc3BvbnNpdmVUb2dnbGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgdGFiIGJhciBieSBmaW5kaW5nIHRoZSB0YXJnZXQgZWxlbWVudCwgdG9nZ2xpbmcgZWxlbWVudCwgYW5kIHJ1bm5pbmcgdXBkYXRlKCkuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyIHRhcmdldElEID0gdGhpcy4kZWxlbWVudC5kYXRhKCdyZXNwb25zaXZlLXRvZ2dsZScpO1xuICAgIGlmICghdGFyZ2V0SUQpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1lvdXIgdGFiIGJhciBuZWVkcyBhbiBJRCBvZiBhIE1lbnUgYXMgdGhlIHZhbHVlIG9mIGRhdGEtdGFiLWJhci4nKTtcbiAgICB9XG5cbiAgICB0aGlzLiR0YXJnZXRNZW51ID0gJChgIyR7dGFyZ2V0SUR9YCk7XG4gICAgdGhpcy4kdG9nZ2xlciA9IHRoaXMuJGVsZW1lbnQuZmluZCgnW2RhdGEtdG9nZ2xlXScpO1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCB0aGlzLm9wdGlvbnMsIHRoaXMuJHRhcmdldE1lbnUuZGF0YSgpKTtcblxuICAgIC8vIElmIHRoZXkgd2VyZSBzZXQsIHBhcnNlIHRoZSBhbmltYXRpb24gY2xhc3Nlc1xuICAgIGlmKHRoaXMub3B0aW9ucy5hbmltYXRlKSB7XG4gICAgICBsZXQgaW5wdXQgPSB0aGlzLm9wdGlvbnMuYW5pbWF0ZS5zcGxpdCgnICcpO1xuXG4gICAgICB0aGlzLmFuaW1hdGlvbkluID0gaW5wdXRbMF07XG4gICAgICB0aGlzLmFuaW1hdGlvbk91dCA9IGlucHV0WzFdIHx8IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5fdXBkYXRlKCk7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBuZWNlc3NhcnkgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSB0YWIgYmFyIHRvIHdvcmsuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy5fdXBkYXRlTXFIYW5kbGVyID0gdGhpcy5fdXBkYXRlLmJpbmQodGhpcyk7XG5cbiAgICAkKHdpbmRvdykub24oJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3VwZGF0ZU1xSGFuZGxlcik7XG5cbiAgICB0aGlzLiR0b2dnbGVyLm9uKCdjbGljay56Zi5yZXNwb25zaXZlVG9nZ2xlJywgdGhpcy50b2dnbGVNZW51LmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGUgY3VycmVudCBtZWRpYSBxdWVyeSB0byBkZXRlcm1pbmUgaWYgdGhlIHRhYiBiYXIgc2hvdWxkIGJlIHZpc2libGUgb3IgaGlkZGVuLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF91cGRhdGUoKSB7XG4gICAgLy8gTW9iaWxlXG4gICAgaWYgKCFGb3VuZGF0aW9uLk1lZGlhUXVlcnkuYXRMZWFzdCh0aGlzLm9wdGlvbnMuaGlkZUZvcikpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuc2hvdygpO1xuICAgICAgdGhpcy4kdGFyZ2V0TWVudS5oaWRlKCk7XG4gICAgfVxuXG4gICAgLy8gRGVza3RvcFxuICAgIGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5oaWRlKCk7XG4gICAgICB0aGlzLiR0YXJnZXRNZW51LnNob3coKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgZWxlbWVudCBhdHRhY2hlZCB0byB0aGUgdGFiIGJhci4gVGhlIHRvZ2dsZSBvbmx5IGhhcHBlbnMgaWYgdGhlIHNjcmVlbiBpcyBzbWFsbCBlbm91Z2ggdG8gYWxsb3cgaXQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmVzcG9uc2l2ZVRvZ2dsZSN0b2dnbGVkXG4gICAqL1xuICB0b2dnbGVNZW51KCkge1xuICAgIGlmICghRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmF0TGVhc3QodGhpcy5vcHRpb25zLmhpZGVGb3IpKSB7XG4gICAgICBpZih0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgICBpZiAodGhpcy4kdGFyZ2V0TWVudS5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJHRhcmdldE1lbnUsIHRoaXMuYW5pbWF0aW9uSW4sICgpID0+IHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgZWxlbWVudCBhdHRhY2hlZCB0byB0aGUgdGFiIGJhciB0b2dnbGVzLlxuICAgICAgICAgICAgICogQGV2ZW50IFJlc3BvbnNpdmVUb2dnbGUjdG9nZ2xlZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3RvZ2dsZWQuemYucmVzcG9uc2l2ZVRvZ2dsZScpO1xuICAgICAgICAgICAgdGhpcy4kdGFyZ2V0TWVudS5maW5kKCdbZGF0YS1tdXRhdGVdJykudHJpZ2dlckhhbmRsZXIoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJHRhcmdldE1lbnUsIHRoaXMuYW5pbWF0aW9uT3V0LCAoKSA9PiB7XG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGVsZW1lbnQgYXR0YWNoZWQgdG8gdGhlIHRhYiBiYXIgdG9nZ2xlcy5cbiAgICAgICAgICAgICAqIEBldmVudCBSZXNwb25zaXZlVG9nZ2xlI3RvZ2dsZWRcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd0b2dnbGVkLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuJHRhcmdldE1lbnUudG9nZ2xlKDApO1xuICAgICAgICB0aGlzLiR0YXJnZXRNZW51LmZpbmQoJ1tkYXRhLW11dGF0ZV0nKS50cmlnZ2VyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJyk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGVsZW1lbnQgYXR0YWNoZWQgdG8gdGhlIHRhYiBiYXIgdG9nZ2xlcy5cbiAgICAgICAgICogQGV2ZW50IFJlc3BvbnNpdmVUb2dnbGUjdG9nZ2xlZFxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCd0b2dnbGVkLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcbiAgICB0aGlzLiR0b2dnbGVyLm9mZignLnpmLnJlc3BvbnNpdmVUb2dnbGUnKTtcblxuICAgICQod2luZG93KS5vZmYoJ2NoYW5nZWQuemYubWVkaWFxdWVyeScsIHRoaXMuX3VwZGF0ZU1xSGFuZGxlcik7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuUmVzcG9uc2l2ZVRvZ2dsZS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIFRoZSBicmVha3BvaW50IGFmdGVyIHdoaWNoIHRoZSBtZW51IGlzIGFsd2F5cyBzaG93biwgYW5kIHRoZSB0YWIgYmFyIGlzIGhpZGRlbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnbWVkaXVtJ1xuICAgKi9cbiAgaGlkZUZvcjogJ21lZGl1bScsXG5cbiAgLyoqXG4gICAqIFRvIGRlY2lkZSBpZiB0aGUgdG9nZ2xlIHNob3VsZCBiZSBhbmltYXRlZCBvciBub3QuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGFuaW1hdGU6IGZhbHNlXG59O1xuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oUmVzcG9uc2l2ZVRvZ2dsZSwgJ1Jlc3BvbnNpdmVUb2dnbGUnKTtcblxufShqUXVlcnkpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFJldmVhbCBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24ucmV2ZWFsXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC50cmlnZ2Vyc1xuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1vdGlvbiBpZiB1c2luZyBhbmltYXRpb25zXG4gKi9cblxuY2xhc3MgUmV2ZWFsIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgUmV2ZWFsLlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIHVzZSBmb3IgdGhlIG1vZGFsLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIG9wdGlvbmFsIHBhcmFtZXRlcnMuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFJldmVhbC5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1JldmVhbCcpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQucmVnaXN0ZXIoJ1JldmVhbCcsIHtcbiAgICAgICdFTlRFUic6ICdvcGVuJyxcbiAgICAgICdTUEFDRSc6ICdvcGVuJyxcbiAgICAgICdFU0NBUEUnOiAnY2xvc2UnLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBtb2RhbCBieSBhZGRpbmcgdGhlIG92ZXJsYXkgYW5kIGNsb3NlIGJ1dHRvbnMsIChpZiBzZWxlY3RlZCkuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB0aGlzLmlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdpZCcpO1xuICAgIHRoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICB0aGlzLmNhY2hlZCA9IHttcTogRm91bmRhdGlvbi5NZWRpYVF1ZXJ5LmN1cnJlbnR9O1xuICAgIHRoaXMuaXNNb2JpbGUgPSBtb2JpbGVTbmlmZigpO1xuXG4gICAgdGhpcy4kYW5jaG9yID0gJChgW2RhdGEtb3Blbj1cIiR7dGhpcy5pZH1cIl1gKS5sZW5ndGggPyAkKGBbZGF0YS1vcGVuPVwiJHt0aGlzLmlkfVwiXWApIDogJChgW2RhdGEtdG9nZ2xlPVwiJHt0aGlzLmlkfVwiXWApO1xuICAgIHRoaXMuJGFuY2hvci5hdHRyKHtcbiAgICAgICdhcmlhLWNvbnRyb2xzJzogdGhpcy5pZCxcbiAgICAgICdhcmlhLWhhc3BvcHVwJzogdHJ1ZSxcbiAgICAgICd0YWJpbmRleCc6IDBcbiAgICB9KTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbiB8fCB0aGlzLiRlbGVtZW50Lmhhc0NsYXNzKCdmdWxsJykpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5mdWxsU2NyZWVuID0gdHJ1ZTtcbiAgICAgIHRoaXMub3B0aW9ucy5vdmVybGF5ID0gZmFsc2U7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSAmJiAhdGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheSA9IHRoaXMuX21ha2VPdmVybGF5KHRoaXMuaWQpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQuYXR0cih7XG4gICAgICAgICdyb2xlJzogJ2RpYWxvZycsXG4gICAgICAgICdhcmlhLWhpZGRlbic6IHRydWUsXG4gICAgICAgICdkYXRhLXlldGktYm94JzogdGhpcy5pZCxcbiAgICAgICAgJ2RhdGEtcmVzaXplJzogdGhpcy5pZFxuICAgIH0pO1xuXG4gICAgaWYodGhpcy4kb3ZlcmxheSkge1xuICAgICAgdGhpcy4kZWxlbWVudC5kZXRhY2goKS5hcHBlbmRUbyh0aGlzLiRvdmVybGF5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5kZXRhY2goKS5hcHBlbmRUbygkKHRoaXMub3B0aW9ucy5hcHBlbmRUbykpO1xuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcygnd2l0aG91dC1vdmVybGF5Jyk7XG4gICAgfVxuICAgIHRoaXMuX2V2ZW50cygpO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmsgJiYgd2luZG93LmxvY2F0aW9uLmhhc2ggPT09ICggYCMke3RoaXMuaWR9YCkpIHtcbiAgICAgICQod2luZG93KS5vbmUoJ2xvYWQuemYucmV2ZWFsJywgdGhpcy5vcGVuLmJpbmQodGhpcykpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG92ZXJsYXkgZGl2IHRvIGRpc3BsYXkgYmVoaW5kIHRoZSBtb2RhbC5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9tYWtlT3ZlcmxheSgpIHtcbiAgICByZXR1cm4gJCgnPGRpdj48L2Rpdj4nKVxuICAgICAgLmFkZENsYXNzKCdyZXZlYWwtb3ZlcmxheScpXG4gICAgICAuYXBwZW5kVG8odGhpcy5vcHRpb25zLmFwcGVuZFRvKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHBvc2l0aW9uIG9mIG1vZGFsXG4gICAqIFRPRE86ICBGaWd1cmUgb3V0IGlmIHdlIGFjdHVhbGx5IG5lZWQgdG8gY2FjaGUgdGhlc2UgdmFsdWVzIG9yIGlmIGl0IGRvZXNuJ3QgbWF0dGVyXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfdXBkYXRlUG9zaXRpb24oKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy4kZWxlbWVudC5vdXRlcldpZHRoKCk7XG4gICAgdmFyIG91dGVyV2lkdGggPSAkKHdpbmRvdykud2lkdGgoKTtcbiAgICB2YXIgaGVpZ2h0ID0gdGhpcy4kZWxlbWVudC5vdXRlckhlaWdodCgpO1xuICAgIHZhciBvdXRlckhlaWdodCA9ICQod2luZG93KS5oZWlnaHQoKTtcbiAgICB2YXIgbGVmdCwgdG9wO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuaE9mZnNldCA9PT0gJ2F1dG8nKSB7XG4gICAgICBsZWZ0ID0gcGFyc2VJbnQoKG91dGVyV2lkdGggLSB3aWR0aCkgLyAyLCAxMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxlZnQgPSBwYXJzZUludCh0aGlzLm9wdGlvbnMuaE9mZnNldCwgMTApO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnZPZmZzZXQgPT09ICdhdXRvJykge1xuICAgICAgaWYgKGhlaWdodCA+IG91dGVySGVpZ2h0KSB7XG4gICAgICAgIHRvcCA9IHBhcnNlSW50KE1hdGgubWluKDEwMCwgb3V0ZXJIZWlnaHQgLyAxMCksIDEwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRvcCA9IHBhcnNlSW50KChvdXRlckhlaWdodCAtIGhlaWdodCkgLyA0LCAxMCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRvcCA9IHBhcnNlSW50KHRoaXMub3B0aW9ucy52T2Zmc2V0LCAxMCk7XG4gICAgfVxuICAgIHRoaXMuJGVsZW1lbnQuY3NzKHt0b3A6IHRvcCArICdweCd9KTtcbiAgICAvLyBvbmx5IHdvcnJ5IGFib3V0IGxlZnQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBvdmVybGF5IG9yIHdlIGhhdmVhICBob3Jpem9udGFsIG9mZnNldCxcbiAgICAvLyBvdGhlcndpc2Ugd2UncmUgcGVyZmVjdGx5IGluIHRoZSBtaWRkbGVcbiAgICBpZighdGhpcy4kb3ZlcmxheSB8fCAodGhpcy5vcHRpb25zLmhPZmZzZXQgIT09ICdhdXRvJykpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtsZWZ0OiBsZWZ0ICsgJ3B4J30pO1xuICAgICAgdGhpcy4kZWxlbWVudC5jc3Moe21hcmdpbjogJzBweCd9KTtcbiAgICB9XG5cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgbW9kYWwuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9uKHtcbiAgICAgICdvcGVuLnpmLnRyaWdnZXInOiB0aGlzLm9wZW4uYmluZCh0aGlzKSxcbiAgICAgICdjbG9zZS56Zi50cmlnZ2VyJzogKGV2ZW50LCAkZWxlbWVudCkgPT4ge1xuICAgICAgICBpZiAoKGV2ZW50LnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0pIHx8XG4gICAgICAgICAgICAoJChldmVudC50YXJnZXQpLnBhcmVudHMoJ1tkYXRhLWNsb3NhYmxlXScpWzBdID09PSAkZWxlbWVudCkpIHsgLy8gb25seSBjbG9zZSByZXZlYWwgd2hlbiBpdCdzIGV4cGxpY2l0bHkgY2FsbGVkXG4gICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UuYXBwbHkodGhpcyk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgJ3Jlc2l6ZW1lLnpmLnRyaWdnZXInOiBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuX3VwZGF0ZVBvc2l0aW9uKCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAodGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy4kYW5jaG9yLm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgaWYgKGUud2hpY2ggPT09IDEzIHx8IGUud2hpY2ggPT09IDMyKSB7XG4gICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgX3RoaXMub3BlbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25DbGljayAmJiB0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgdGhpcy4kb3ZlcmxheS5vZmYoJy56Zi5yZXZlYWwnKS5vbignY2xpY2suemYucmV2ZWFsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpZiAoZS50YXJnZXQgPT09IF90aGlzLiRlbGVtZW50WzBdIHx8XG4gICAgICAgICAgJC5jb250YWlucyhfdGhpcy4kZWxlbWVudFswXSwgZS50YXJnZXQpIHx8XG4gICAgICAgICAgICAhJC5jb250YWlucyhkb2N1bWVudCwgZS50YXJnZXQpKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgICQod2luZG93KS5vbihgcG9wc3RhdGUuemYucmV2ZWFsOiR7dGhpcy5pZH1gLCB0aGlzLl9oYW5kbGVTdGF0ZS5iaW5kKHRoaXMpKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlcyBtb2RhbCBtZXRob2RzIG9uIGJhY2svZm9yd2FyZCBidXR0b24gY2xpY2tzIG9yIGFueSBvdGhlciBldmVudCB0aGF0IHRyaWdnZXJzIHBvcHN0YXRlLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2hhbmRsZVN0YXRlKGUpIHtcbiAgICBpZih3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gKCAnIycgKyB0aGlzLmlkKSAmJiAhdGhpcy5pc0FjdGl2ZSl7IHRoaXMub3BlbigpOyB9XG4gICAgZWxzZXsgdGhpcy5jbG9zZSgpOyB9XG4gIH1cblxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgbW9kYWwgY29udHJvbGxlZCBieSBgdGhpcy4kYW5jaG9yYCwgYW5kIGNsb3NlcyBhbGwgb3RoZXJzIGJ5IGRlZmF1bHQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAZmlyZXMgUmV2ZWFsI2Nsb3NlbWVcbiAgICogQGZpcmVzIFJldmVhbCNvcGVuXG4gICAqL1xuICBvcGVuKCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgIHZhciBoYXNoID0gYCMke3RoaXMuaWR9YDtcblxuICAgICAgaWYgKHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSkge1xuICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgbnVsbCwgaGFzaCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IGhhc2g7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IHRydWU7XG5cbiAgICAvLyBNYWtlIGVsZW1lbnRzIGludmlzaWJsZSwgYnV0IHJlbW92ZSBkaXNwbGF5OiBub25lIHNvIHdlIGNhbiBnZXQgc2l6ZSBhbmQgcG9zaXRpb25pbmdcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAgIC5jc3MoeyAndmlzaWJpbGl0eSc6ICdoaWRkZW4nIH0pXG4gICAgICAgIC5zaG93KClcbiAgICAgICAgLnNjcm9sbFRvcCgwKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuY3NzKHsndmlzaWJpbGl0eSc6ICdoaWRkZW4nfSkuc2hvdygpO1xuICAgIH1cblxuICAgIHRoaXMuX3VwZGF0ZVBvc2l0aW9uKCk7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuaGlkZSgpXG4gICAgICAuY3NzKHsgJ3Zpc2liaWxpdHknOiAnJyB9KTtcblxuICAgIGlmKHRoaXMuJG92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJG92ZXJsYXkuY3NzKHsndmlzaWJpbGl0eSc6ICcnfSkuaGlkZSgpO1xuICAgICAgaWYodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnZmFzdCcpKSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ2Zhc3QnKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy4kZWxlbWVudC5oYXNDbGFzcygnc2xvdycpKSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuYWRkQ2xhc3MoJ3Nsb3cnKTtcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGlmICghdGhpcy5vcHRpb25zLm11bHRpcGxlT3BlbmVkKSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGltbWVkaWF0ZWx5IGJlZm9yZSB0aGUgbW9kYWwgb3BlbnMuXG4gICAgICAgKiBDbG9zZXMgYW55IG90aGVyIG1vZGFscyB0aGF0IGFyZSBjdXJyZW50bHkgb3BlblxuICAgICAgICogQGV2ZW50IFJldmVhbCNjbG9zZW1lXG4gICAgICAgKi9cbiAgICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignY2xvc2VtZS56Zi5yZXZlYWwnLCB0aGlzLmlkKTtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgZnVuY3Rpb24gYWRkUmV2ZWFsT3BlbkNsYXNzZXMoKSB7XG4gICAgICBpZiAoX3RoaXMuaXNNb2JpbGUpIHtcbiAgICAgICAgaWYoIV90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zKSB7XG4gICAgICAgICAgX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MgPSB3aW5kb3cucGFnZVlPZmZzZXQ7XG4gICAgICAgIH1cbiAgICAgICAgJCgnaHRtbCwgYm9keScpLmFkZENsYXNzKCdpcy1yZXZlYWwtb3BlbicpO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICQoJ2JvZHknKS5hZGRDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gTW90aW9uIFVJIG1ldGhvZCBvZiByZXZlYWxcbiAgICBpZiAodGhpcy5vcHRpb25zLmFuaW1hdGlvbkluKSB7XG4gICAgICBmdW5jdGlvbiBhZnRlckFuaW1hdGlvbigpe1xuICAgICAgICBfdGhpcy4kZWxlbWVudFxuICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlLFxuICAgICAgICAgICAgJ3RhYmluZGV4JzogLTFcbiAgICAgICAgICB9KVxuICAgICAgICAgIC5mb2N1cygpO1xuICAgICAgICBhZGRSZXZlYWxPcGVuQ2xhc3NlcygpO1xuICAgICAgICBGb3VuZGF0aW9uLktleWJvYXJkLnRyYXBGb2N1cyhfdGhpcy4kZWxlbWVudCk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgICAgRm91bmRhdGlvbi5Nb3Rpb24uYW5pbWF0ZUluKHRoaXMuJG92ZXJsYXksICdmYWRlLWluJyk7XG4gICAgICB9XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlSW4odGhpcy4kZWxlbWVudCwgdGhpcy5vcHRpb25zLmFuaW1hdGlvbkluLCAoKSA9PiB7XG4gICAgICAgIGlmKHRoaXMuJGVsZW1lbnQpIHsgLy8gcHJvdGVjdCBhZ2FpbnN0IG9iamVjdCBoYXZpbmcgYmVlbiByZW1vdmVkXG4gICAgICAgICAgdGhpcy5mb2N1c2FibGVFbGVtZW50cyA9IEZvdW5kYXRpb24uS2V5Ym9hcmQuZmluZEZvY3VzYWJsZSh0aGlzLiRlbGVtZW50KTtcbiAgICAgICAgICBhZnRlckFuaW1hdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8galF1ZXJ5IG1ldGhvZCBvZiByZXZlYWxcbiAgICBlbHNlIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICB0aGlzLiRvdmVybGF5LnNob3coMCk7XG4gICAgICB9XG4gICAgICB0aGlzLiRlbGVtZW50LnNob3codGhpcy5vcHRpb25zLnNob3dEZWxheSk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGFjY2Vzc2liaWxpdHlcbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAuYXR0cih7XG4gICAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlLFxuICAgICAgICAndGFiaW5kZXgnOiAtMVxuICAgICAgfSlcbiAgICAgIC5mb2N1cygpO1xuICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQudHJhcEZvY3VzKHRoaXMuJGVsZW1lbnQpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgd2hlbiB0aGUgbW9kYWwgaGFzIHN1Y2Nlc3NmdWxseSBvcGVuZWQuXG4gICAgICogQGV2ZW50IFJldmVhbCNvcGVuXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdvcGVuLnpmLnJldmVhbCcpO1xuXG4gICAgYWRkUmV2ZWFsT3BlbkNsYXNzZXMoKTtcblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5fZXh0cmFIYW5kbGVycygpO1xuICAgIH0sIDApO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXh0cmEgZXZlbnQgaGFuZGxlcnMgZm9yIHRoZSBib2R5IGFuZCB3aW5kb3cgaWYgbmVjZXNzYXJ5LlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V4dHJhSGFuZGxlcnMoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICBpZighdGhpcy4kZWxlbWVudCkgeyByZXR1cm47IH0gLy8gSWYgd2UncmUgaW4gdGhlIG1pZGRsZSBvZiBjbGVhbnVwLCBkb24ndCBmcmVhayBvdXRcbiAgICB0aGlzLmZvY3VzYWJsZUVsZW1lbnRzID0gRm91bmRhdGlvbi5LZXlib2FyZC5maW5kRm9jdXNhYmxlKHRoaXMuJGVsZW1lbnQpO1xuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMub3ZlcmxheSAmJiB0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrICYmICF0aGlzLm9wdGlvbnMuZnVsbFNjcmVlbikge1xuICAgICAgJCgnYm9keScpLm9uKCdjbGljay56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmIChlLnRhcmdldCA9PT0gX3RoaXMuJGVsZW1lbnRbMF0gfHxcbiAgICAgICAgICAkLmNvbnRhaW5zKF90aGlzLiRlbGVtZW50WzBdLCBlLnRhcmdldCkgfHxcbiAgICAgICAgICAgICEkLmNvbnRhaW5zKGRvY3VtZW50LCBlLnRhcmdldCkpIHsgcmV0dXJuOyB9XG4gICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICQod2luZG93KS5vbigna2V5ZG93bi56Zi5yZXZlYWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdSZXZlYWwnLCB7XG4gICAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuY2xvc2VPbkVzYykge1xuICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIGxvY2sgZm9jdXMgd2l0aGluIG1vZGFsIHdoaWxlIHRhYmJpbmdcbiAgICB0aGlzLiRlbGVtZW50Lm9uKCdrZXlkb3duLnpmLnJldmVhbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHZhciAkdGFyZ2V0ID0gJCh0aGlzKTtcbiAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdSZXZlYWwnLCB7XG4gICAgICAgIG9wZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5maW5kKCc6Zm9jdXMnKS5pcyhfdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1jbG9zZV0nKSkpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IC8vIHNldCBmb2N1cyBiYWNrIHRvIGFuY2hvciBpZiBjbG9zZSBidXR0b24gaGFzIGJlZW4gYWN0aXZhdGVkXG4gICAgICAgICAgICAgIF90aGlzLiRhbmNob3IuZm9jdXMoKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJHRhcmdldC5pcyhfdGhpcy5mb2N1c2FibGVFbGVtZW50cykpIHsgLy8gZG9udCd0IHRyaWdnZXIgaWYgYWN1YWwgZWxlbWVudCBoYXMgZm9jdXMgKGkuZS4gaW5wdXRzLCBsaW5rcywgLi4uKVxuICAgICAgICAgICAgX3RoaXMub3BlbigpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICAgICAgIF90aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICBfdGhpcy4kYW5jaG9yLmZvY3VzKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBoYW5kbGVkOiBmdW5jdGlvbihwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgIGlmIChwcmV2ZW50RGVmYXVsdCkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBtb2RhbC5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBmaXJlcyBSZXZlYWwjY2xvc2VkXG4gICAqL1xuICBjbG9zZSgpIHtcbiAgICBpZiAoIXRoaXMuaXNBY3RpdmUgfHwgIXRoaXMuJGVsZW1lbnQuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vIE1vdGlvbiBVSSBtZXRob2Qgb2YgaGlkaW5nXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hbmltYXRpb25PdXQpIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMub3ZlcmxheSkge1xuICAgICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJG92ZXJsYXksICdmYWRlLW91dCcsIGZpbmlzaFVwKTtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBmaW5pc2hVcCgpO1xuICAgICAgfVxuXG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJGVsZW1lbnQsIHRoaXMub3B0aW9ucy5hbmltYXRpb25PdXQpO1xuICAgIH1cbiAgICAvLyBqUXVlcnkgbWV0aG9kIG9mIGhpZGluZ1xuICAgIGVsc2Uge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5vdmVybGF5KSB7XG4gICAgICAgIHRoaXMuJG92ZXJsYXkuaGlkZSgwLCBmaW5pc2hVcCk7XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgZmluaXNoVXAoKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy4kZWxlbWVudC5oaWRlKHRoaXMub3B0aW9ucy5oaWRlRGVsYXkpO1xuICAgIH1cblxuICAgIC8vIENvbmRpdGlvbmFscyB0byByZW1vdmUgZXh0cmEgZXZlbnQgbGlzdGVuZXJzIGFkZGVkIG9uIG9wZW5cbiAgICBpZiAodGhpcy5vcHRpb25zLmNsb3NlT25Fc2MpIHtcbiAgICAgICQod2luZG93KS5vZmYoJ2tleWRvd24uemYucmV2ZWFsJyk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMub3ZlcmxheSAmJiB0aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrKSB7XG4gICAgICAkKCdib2R5Jykub2ZmKCdjbGljay56Zi5yZXZlYWwnKTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9mZigna2V5ZG93bi56Zi5yZXZlYWwnKTtcblxuICAgIGZ1bmN0aW9uIGZpbmlzaFVwKCkge1xuICAgICAgaWYgKF90aGlzLmlzTW9iaWxlKSB7XG4gICAgICAgICQoJ2h0bWwsIGJvZHknKS5yZW1vdmVDbGFzcygnaXMtcmV2ZWFsLW9wZW4nKTtcbiAgICAgICAgaWYoX3RoaXMub3JpZ2luYWxTY3JvbGxQb3MpIHtcbiAgICAgICAgICAkKCdib2R5Jykuc2Nyb2xsVG9wKF90aGlzLm9yaWdpbmFsU2Nyb2xsUG9zKTtcbiAgICAgICAgICBfdGhpcy5vcmlnaW5hbFNjcm9sbFBvcyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2lzLXJldmVhbC1vcGVuJyk7XG4gICAgICB9XG5cblxuICAgICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWxlYXNlRm9jdXMoX3RoaXMuJGVsZW1lbnQpO1xuXG4gICAgICBfdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWhpZGRlbicsIHRydWUpO1xuXG4gICAgICAvKipcbiAgICAgICogRmlyZXMgd2hlbiB0aGUgbW9kYWwgaXMgZG9uZSBjbG9zaW5nLlxuICAgICAgKiBAZXZlbnQgUmV2ZWFsI2Nsb3NlZFxuICAgICAgKi9cbiAgICAgIF90aGlzLiRlbGVtZW50LnRyaWdnZXIoJ2Nsb3NlZC56Zi5yZXZlYWwnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAqIFJlc2V0cyB0aGUgbW9kYWwgY29udGVudFxuICAgICogVGhpcyBwcmV2ZW50cyBhIHJ1bm5pbmcgdmlkZW8gdG8ga2VlcCBnb2luZyBpbiB0aGUgYmFja2dyb3VuZFxuICAgICovXG4gICAgaWYgKHRoaXMub3B0aW9ucy5yZXNldE9uQ2xvc2UpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuaHRtbCh0aGlzLiRlbGVtZW50Lmh0bWwoKSk7XG4gICAgfVxuXG4gICAgdGhpcy5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICBpZiAoX3RoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgIGlmICh3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUpIHtcbiAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSgnJywgZG9jdW1lbnQudGl0bGUsIHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoYCMke3RoaXMuaWR9YCwgJycpKTtcbiAgICAgICB9IGVsc2Uge1xuICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnJztcbiAgICAgICB9XG4gICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBvcGVuL2Nsb3NlZCBzdGF0ZSBvZiBhIG1vZGFsLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIHRvZ2dsZSgpIHtcbiAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIGEgbW9kYWwuXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgZGVzdHJveSgpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLm92ZXJsYXkpIHtcbiAgICAgIHRoaXMuJGVsZW1lbnQuYXBwZW5kVG8oJCh0aGlzLm9wdGlvbnMuYXBwZW5kVG8pKTsgLy8gbW92ZSAkZWxlbWVudCBvdXRzaWRlIG9mICRvdmVybGF5IHRvIHByZXZlbnQgZXJyb3IgdW5yZWdpc3RlclBsdWdpbigpXG4gICAgICB0aGlzLiRvdmVybGF5LmhpZGUoKS5vZmYoKS5yZW1vdmUoKTtcbiAgICB9XG4gICAgdGhpcy4kZWxlbWVudC5oaWRlKCkub2ZmKCk7XG4gICAgdGhpcy4kYW5jaG9yLm9mZignLnpmJyk7XG4gICAgJCh3aW5kb3cpLm9mZihgLnpmLnJldmVhbDoke3RoaXMuaWR9YCk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH07XG59XG5cblJldmVhbC5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIE1vdGlvbi1VSSBjbGFzcyB0byB1c2UgZm9yIGFuaW1hdGVkIGVsZW1lbnRzLiBJZiBub25lIHVzZWQsIGRlZmF1bHRzIHRvIHNpbXBsZSBzaG93L2hpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3NsaWRlLWluLWxlZnQnXG4gICAqL1xuICBhbmltYXRpb25JbjogJycsXG4gIC8qKlxuICAgKiBNb3Rpb24tVUkgY2xhc3MgdG8gdXNlIGZvciBhbmltYXRlZCBlbGVtZW50cy4gSWYgbm9uZSB1c2VkLCBkZWZhdWx0cyB0byBzaW1wbGUgc2hvdy9oaWRlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdzbGlkZS1vdXQtcmlnaHQnXG4gICAqL1xuICBhbmltYXRpb25PdXQ6ICcnLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBvcGVuaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgc2hvd0RlbGF5OiAwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIHRvIGRlbGF5IHRoZSBjbG9zaW5nIG9mIGEgbW9kYWwgYWZ0ZXIgYSBjbGljayBpZiBubyBhbmltYXRpb24gdXNlZC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgaGlkZURlbGF5OiAwLFxuICAvKipcbiAgICogQWxsb3dzIGEgY2xpY2sgb24gdGhlIGJvZHkvb3ZlcmxheSB0byBjbG9zZSB0aGUgbW9kYWwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkNsaWNrOiB0cnVlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBjbG9zZSBpZiB0aGUgdXNlciBwcmVzc2VzIHRoZSBgRVNDQVBFYCBrZXkuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgY2xvc2VPbkVzYzogdHJ1ZSxcbiAgLyoqXG4gICAqIElmIHRydWUsIGFsbG93cyBtdWx0aXBsZSBtb2RhbHMgdG8gYmUgZGlzcGxheWVkIGF0IG9uY2UuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIG11bHRpcGxlT3BlbmVkOiBmYWxzZSxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSBtb2RhbCBzaG91bGQgcHVzaCBkb3duIGZyb20gdGhlIHRvcCBvZiB0aGUgc2NyZWVuLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGF1dG9cbiAgICovXG4gIHZPZmZzZXQ6ICdhdXRvJyxcbiAgLyoqXG4gICAqIERpc3RhbmNlLCBpbiBwaXhlbHMsIHRoZSBtb2RhbCBzaG91bGQgcHVzaCBpbiBmcm9tIHRoZSBzaWRlIG9mIHRoZSBzY3JlZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgYXV0b1xuICAgKi9cbiAgaE9mZnNldDogJ2F1dG8nLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBiZSBmdWxsc2NyZWVuLCBjb21wbGV0ZWx5IGJsb2NraW5nIG91dCB0aGUgcmVzdCBvZiB0aGUgdmlldy4gSlMgY2hlY2tzIGZvciB0aGlzIGFzIHdlbGwuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGZ1bGxTY3JlZW46IGZhbHNlLFxuICAvKipcbiAgICogUGVyY2VudGFnZSBvZiBzY3JlZW4gaGVpZ2h0IHRoZSBtb2RhbCBzaG91bGQgcHVzaCB1cCBmcm9tIHRoZSBib3R0b20gb2YgdGhlIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTBcbiAgICovXG4gIGJ0bU9mZnNldFBjdDogMTAsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIG1vZGFsIHRvIGdlbmVyYXRlIGFuIG92ZXJsYXkgZGl2LCB3aGljaCB3aWxsIGNvdmVyIHRoZSB2aWV3IHdoZW4gbW9kYWwgb3BlbnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgb3ZlcmxheTogdHJ1ZSxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgbW9kYWwgdG8gcmVtb3ZlIGFuZCByZWluamVjdCBtYXJrdXAgb24gY2xvc2UuIFNob3VsZCBiZSB0cnVlIGlmIHVzaW5nIHZpZGVvIGVsZW1lbnRzIHcvbyB1c2luZyBwcm92aWRlcidzIGFwaSwgb3RoZXJ3aXNlLCB2aWRlb3Mgd2lsbCBjb250aW51ZSB0byBwbGF5IGluIHRoZSBiYWNrZ3JvdW5kLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICByZXNldE9uQ2xvc2U6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBhbHRlciB0aGUgdXJsIG9uIG9wZW4vY2xvc2UsIGFuZCBhbGxvd3MgdGhlIHVzZSBvZiB0aGUgYGJhY2tgIGJ1dHRvbiB0byBjbG9zZSBtb2RhbHMuIEFMU08sIGFsbG93cyBhIG1vZGFsIHRvIGF1dG8tbWFuaWFjYWxseSBvcGVuIG9uIHBhZ2UgbG9hZCBJRiB0aGUgaGFzaCA9PT0gdGhlIG1vZGFsJ3MgdXNlci1zZXQgaWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRlZXBMaW5rOiBmYWxzZSxcbiAgICAvKipcbiAgICogQWxsb3dzIHRoZSBtb2RhbCB0byBhcHBlbmQgdG8gY3VzdG9tIGRpdi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYXBwZW5kVG86IFwiYm9keVwiXG5cbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihSZXZlYWwsICdSZXZlYWwnKTtcblxuZnVuY3Rpb24gaVBob25lU25pZmYoKSB7XG4gIHJldHVybiAvaVAoYWR8aG9uZXxvZCkuKk9TLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50KTtcbn1cblxuZnVuY3Rpb24gYW5kcm9pZFNuaWZmKCkge1xuICByZXR1cm4gL0FuZHJvaWQvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpO1xufVxuXG5mdW5jdGlvbiBtb2JpbGVTbmlmZigpIHtcbiAgcmV0dXJuIGlQaG9uZVNuaWZmKCkgfHwgYW5kcm9pZFNuaWZmKCk7XG59XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBTbGlkZXIgbW9kdWxlLlxuICogQG1vZHVsZSBmb3VuZGF0aW9uLnNsaWRlclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwua2V5Ym9hcmRcbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudG91Y2hcbiAqL1xuXG5jbGFzcyBTbGlkZXIge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHNsaWRlciBjb250cm9sLlxuICAgKiBAY2xhc3NcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIG1ha2UgaW50byBhIHNsaWRlciBjb250cm9sLlxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE92ZXJyaWRlcyB0byB0aGUgZGVmYXVsdCBwbHVnaW4gc2V0dGluZ3MuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgdGhpcy4kZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5vcHRpb25zID0gJC5leHRlbmQoe30sIFNsaWRlci5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnU2xpZGVyJyk7XG4gICAgRm91bmRhdGlvbi5LZXlib2FyZC5yZWdpc3RlcignU2xpZGVyJywge1xuICAgICAgJ2x0cic6IHtcbiAgICAgICAgJ0FSUk9XX1JJR0hUJzogJ2luY3JlYXNlJyxcbiAgICAgICAgJ0FSUk9XX1VQJzogJ2luY3JlYXNlJyxcbiAgICAgICAgJ0FSUk9XX0RPV04nOiAnZGVjcmVhc2UnLFxuICAgICAgICAnQVJST1dfTEVGVCc6ICdkZWNyZWFzZScsXG4gICAgICAgICdTSElGVF9BUlJPV19SSUdIVCc6ICdpbmNyZWFzZV9mYXN0JyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX1VQJzogJ2luY3JlYXNlX2Zhc3QnLFxuICAgICAgICAnU0hJRlRfQVJST1dfRE9XTic6ICdkZWNyZWFzZV9mYXN0JyxcbiAgICAgICAgJ1NISUZUX0FSUk9XX0xFRlQnOiAnZGVjcmVhc2VfZmFzdCdcbiAgICAgIH0sXG4gICAgICAncnRsJzoge1xuICAgICAgICAnQVJST1dfTEVGVCc6ICdpbmNyZWFzZScsXG4gICAgICAgICdBUlJPV19SSUdIVCc6ICdkZWNyZWFzZScsXG4gICAgICAgICdTSElGVF9BUlJPV19MRUZUJzogJ2luY3JlYXNlX2Zhc3QnLFxuICAgICAgICAnU0hJRlRfQVJST1dfUklHSFQnOiAnZGVjcmVhc2VfZmFzdCdcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWxpemVzIHRoZSBwbHVnaW4gYnkgcmVhZGluZy9zZXR0aW5nIGF0dHJpYnV0ZXMsIGNyZWF0aW5nIGNvbGxlY3Rpb25zIGFuZCBzZXR0aW5nIHRoZSBpbml0aWFsIHBvc2l0aW9uIG9mIHRoZSBoYW5kbGUocykuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdGhpcy5pbnB1dHMgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ2lucHV0Jyk7XG4gICAgdGhpcy5oYW5kbGVzID0gdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1zbGlkZXItaGFuZGxlXScpO1xuXG4gICAgdGhpcy4kaGFuZGxlID0gdGhpcy5oYW5kbGVzLmVxKDApO1xuICAgIHRoaXMuJGlucHV0ID0gdGhpcy5pbnB1dHMubGVuZ3RoID8gdGhpcy5pbnB1dHMuZXEoMCkgOiAkKGAjJHt0aGlzLiRoYW5kbGUuYXR0cignYXJpYS1jb250cm9scycpfWApO1xuICAgIHRoaXMuJGZpbGwgPSB0aGlzLiRlbGVtZW50LmZpbmQoJ1tkYXRhLXNsaWRlci1maWxsXScpLmNzcyh0aGlzLm9wdGlvbnMudmVydGljYWwgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsIDApO1xuXG4gICAgdmFyIGlzRGJsID0gZmFsc2UsXG4gICAgICAgIF90aGlzID0gdGhpcztcbiAgICBpZiAodGhpcy5vcHRpb25zLmRpc2FibGVkIHx8IHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3ModGhpcy5vcHRpb25zLmRpc2FibGVkQ2xhc3MpKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuZGlzYWJsZWQgPSB0cnVlO1xuICAgICAgdGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMuZGlzYWJsZWRDbGFzcyk7XG4gICAgfVxuICAgIGlmICghdGhpcy5pbnB1dHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLmlucHV0cyA9ICQoKS5hZGQodGhpcy4kaW5wdXQpO1xuICAgICAgdGhpcy5vcHRpb25zLmJpbmRpbmcgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3NldEluaXRBdHRyKDApO1xuXG4gICAgaWYgKHRoaXMuaGFuZGxlc1sxXSkge1xuICAgICAgdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuJGhhbmRsZTIgPSB0aGlzLmhhbmRsZXMuZXEoMSk7XG4gICAgICB0aGlzLiRpbnB1dDIgPSB0aGlzLmlucHV0cy5sZW5ndGggPiAxID8gdGhpcy5pbnB1dHMuZXEoMSkgOiAkKGAjJHt0aGlzLiRoYW5kbGUyLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKTtcblxuICAgICAgaWYgKCF0aGlzLmlucHV0c1sxXSkge1xuICAgICAgICB0aGlzLmlucHV0cyA9IHRoaXMuaW5wdXRzLmFkZCh0aGlzLiRpbnB1dDIpO1xuICAgICAgfVxuICAgICAgaXNEYmwgPSB0cnVlO1xuXG4gICAgICAvLyB0aGlzLiRoYW5kbGUudHJpZ2dlckhhbmRsZXIoJ2NsaWNrLnpmLnNsaWRlcicpO1xuICAgICAgdGhpcy5fc2V0SW5pdEF0dHIoMSk7XG4gICAgfVxuXG4gICAgLy8gU2V0IGhhbmRsZSBwb3NpdGlvbnNcbiAgICB0aGlzLnNldEhhbmRsZXMoKTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgc2V0SGFuZGxlcygpIHtcbiAgICBpZih0aGlzLmhhbmRsZXNbMV0pIHtcbiAgICAgIHRoaXMuX3NldEhhbmRsZVBvcyh0aGlzLiRoYW5kbGUsIHRoaXMuaW5wdXRzLmVxKDApLnZhbCgpLCB0cnVlLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuX3NldEhhbmRsZVBvcyh0aGlzLiRoYW5kbGUyLCB0aGlzLmlucHV0cy5lcSgxKS52YWwoKSwgdHJ1ZSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc2V0SGFuZGxlUG9zKHRoaXMuJGhhbmRsZSwgdGhpcy5pbnB1dHMuZXEoMCkudmFsKCksIHRydWUpO1xuICAgIH1cbiAgfVxuXG4gIF9yZWZsb3coKSB7XG4gICAgdGhpcy5zZXRIYW5kbGVzKCk7XG4gIH1cbiAgLyoqXG4gICogQGZ1bmN0aW9uXG4gICogQHByaXZhdGVcbiAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgLSBmbG9hdGluZyBwb2ludCAodGhlIHZhbHVlKSB0byBiZSB0cmFuc2Zvcm1lZCB1c2luZyB0byBhIHJlbGF0aXZlIHBvc2l0aW9uIG9uIHRoZSBzbGlkZXIgKHRoZSBpbnZlcnNlIG9mIF92YWx1ZSlcbiAgKi9cbiAgX3BjdE9mQmFyKHZhbHVlKSB7XG4gICAgdmFyIHBjdE9mQmFyID0gcGVyY2VudCh2YWx1ZSAtIHRoaXMub3B0aW9ucy5zdGFydCwgdGhpcy5vcHRpb25zLmVuZCAtIHRoaXMub3B0aW9ucy5zdGFydClcblxuICAgIHN3aXRjaCh0aGlzLm9wdGlvbnMucG9zaXRpb25WYWx1ZUZ1bmN0aW9uKSB7XG4gICAgY2FzZSBcInBvd1wiOlxuICAgICAgcGN0T2ZCYXIgPSB0aGlzLl9sb2dUcmFuc2Zvcm0ocGN0T2ZCYXIpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcImxvZ1wiOlxuICAgICAgcGN0T2ZCYXIgPSB0aGlzLl9wb3dUcmFuc2Zvcm0ocGN0T2ZCYXIpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBjdE9mQmFyLnRvRml4ZWQoMilcbiAgfVxuXG4gIC8qKlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICogQHBhcmFtIHtOdW1iZXJ9IHBjdE9mQmFyIC0gZmxvYXRpbmcgcG9pbnQsIHRoZSByZWxhdGl2ZSBwb3NpdGlvbiBvZiB0aGUgc2xpZGVyICh0eXBpY2FsbHkgYmV0d2VlbiAwLTEpIHRvIGJlIHRyYW5zZm9ybWVkIHRvIGEgdmFsdWVcbiAgKi9cbiAgX3ZhbHVlKHBjdE9mQmFyKSB7XG4gICAgc3dpdGNoKHRoaXMub3B0aW9ucy5wb3NpdGlvblZhbHVlRnVuY3Rpb24pIHtcbiAgICBjYXNlIFwicG93XCI6XG4gICAgICBwY3RPZkJhciA9IHRoaXMuX3Bvd1RyYW5zZm9ybShwY3RPZkJhcik7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwibG9nXCI6XG4gICAgICBwY3RPZkJhciA9IHRoaXMuX2xvZ1RyYW5zZm9ybShwY3RPZkJhcik7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgdmFyIHZhbHVlID0gKHRoaXMub3B0aW9ucy5lbmQgLSB0aGlzLm9wdGlvbnMuc3RhcnQpICogcGN0T2ZCYXIgKyB0aGlzLm9wdGlvbnMuc3RhcnQ7XG5cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8qKlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIC0gZmxvYXRpbmcgcG9pbnQgKHR5cGljYWxseSBiZXR3ZWVuIDAtMSkgdG8gYmUgdHJhbnNmb3JtZWQgdXNpbmcgdGhlIGxvZyBmdW5jdGlvblxuICAqL1xuICBfbG9nVHJhbnNmb3JtKHZhbHVlKSB7XG4gICAgcmV0dXJuIGJhc2VMb2codGhpcy5vcHRpb25zLm5vbkxpbmVhckJhc2UsICgodmFsdWUqKHRoaXMub3B0aW9ucy5ub25MaW5lYXJCYXNlLTEpKSsxKSlcbiAgfVxuXG4gIC8qKlxuICAqIEBmdW5jdGlvblxuICAqIEBwcml2YXRlXG4gICogQHBhcmFtIHtOdW1iZXJ9IHZhbHVlIC0gZmxvYXRpbmcgcG9pbnQgKHR5cGljYWxseSBiZXR3ZWVuIDAtMSkgdG8gYmUgdHJhbnNmb3JtZWQgdXNpbmcgdGhlIHBvd2VyIGZ1bmN0aW9uXG4gICovXG4gIF9wb3dUcmFuc2Zvcm0odmFsdWUpIHtcbiAgICByZXR1cm4gKE1hdGgucG93KHRoaXMub3B0aW9ucy5ub25MaW5lYXJCYXNlLCB2YWx1ZSkgLSAxKSAvICh0aGlzLm9wdGlvbnMubm9uTGluZWFyQmFzZSAtIDEpXG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgcG9zaXRpb24gb2YgdGhlIHNlbGVjdGVkIGhhbmRsZSBhbmQgZmlsbCBiYXIuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhuZGwgLSB0aGUgc2VsZWN0ZWQgaGFuZGxlIHRvIG1vdmUuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBsb2NhdGlvbiAtIGZsb2F0aW5nIHBvaW50IGJldHdlZW4gdGhlIHN0YXJ0IGFuZCBlbmQgdmFsdWVzIG9mIHRoZSBzbGlkZXIgYmFyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGZpcmUgb24gY29tcGxldGlvbi5cbiAgICogQGZpcmVzIFNsaWRlciNtb3ZlZFxuICAgKiBAZmlyZXMgU2xpZGVyI2NoYW5nZWRcbiAgICovXG4gIF9zZXRIYW5kbGVQb3MoJGhuZGwsIGxvY2F0aW9uLCBub0ludmVydCwgY2IpIHtcbiAgICAvLyBkb24ndCBtb3ZlIGlmIHRoZSBzbGlkZXIgaGFzIGJlZW4gZGlzYWJsZWQgc2luY2UgaXRzIGluaXRpYWxpemF0aW9uXG4gICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3ModGhpcy5vcHRpb25zLmRpc2FibGVkQ2xhc3MpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vbWlnaHQgbmVlZCB0byBhbHRlciB0aGF0IHNsaWdodGx5IGZvciBiYXJzIHRoYXQgd2lsbCBoYXZlIG9kZCBudW1iZXIgc2VsZWN0aW9ucy5cbiAgICBsb2NhdGlvbiA9IHBhcnNlRmxvYXQobG9jYXRpb24pOy8vb24gaW5wdXQgY2hhbmdlIGV2ZW50cywgY29udmVydCBzdHJpbmcgdG8gbnVtYmVyLi4uZ3J1bWJsZS5cblxuICAgIC8vIHByZXZlbnQgc2xpZGVyIGZyb20gcnVubmluZyBvdXQgb2YgYm91bmRzLCBpZiB2YWx1ZSBleGNlZWRzIHRoZSBsaW1pdHMgc2V0IHRocm91Z2ggb3B0aW9ucywgb3ZlcnJpZGUgdGhlIHZhbHVlIHRvIG1pbi9tYXhcbiAgICBpZiAobG9jYXRpb24gPCB0aGlzLm9wdGlvbnMuc3RhcnQpIHsgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuc3RhcnQ7IH1cbiAgICBlbHNlIGlmIChsb2NhdGlvbiA+IHRoaXMub3B0aW9ucy5lbmQpIHsgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuZW5kOyB9XG5cbiAgICB2YXIgaXNEYmwgPSB0aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQ7XG5cbiAgICBpZiAoaXNEYmwpIHsgLy90aGlzIGJsb2NrIGlzIHRvIHByZXZlbnQgMiBoYW5kbGVzIGZyb20gY3Jvc3NpbmcgZWFjaG90aGVyLiBDb3VsZC9zaG91bGQgYmUgaW1wcm92ZWQuXG4gICAgICBpZiAodGhpcy5oYW5kbGVzLmluZGV4KCRobmRsKSA9PT0gMCkge1xuICAgICAgICB2YXIgaDJWYWwgPSBwYXJzZUZsb2F0KHRoaXMuJGhhbmRsZTIuYXR0cignYXJpYS12YWx1ZW5vdycpKTtcbiAgICAgICAgbG9jYXRpb24gPSBsb2NhdGlvbiA+PSBoMlZhbCA/IGgyVmFsIC0gdGhpcy5vcHRpb25zLnN0ZXAgOiBsb2NhdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBoMVZhbCA9IHBhcnNlRmxvYXQodGhpcy4kaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnKSk7XG4gICAgICAgIGxvY2F0aW9uID0gbG9jYXRpb24gPD0gaDFWYWwgPyBoMVZhbCArIHRoaXMub3B0aW9ucy5zdGVwIDogbG9jYXRpb247XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy90aGlzIGlzIGZvciBzaW5nbGUtaGFuZGxlZCB2ZXJ0aWNhbCBzbGlkZXJzLCBpdCBhZGp1c3RzIHRoZSB2YWx1ZSB0byBhY2NvdW50IGZvciB0aGUgc2xpZGVyIGJlaW5nIFwidXBzaWRlLWRvd25cIlxuICAgIC8vZm9yIGNsaWNrIGFuZCBkcmFnIGV2ZW50cywgaXQncyB3ZWlyZCBkdWUgdG8gdGhlIHNjYWxlKC0xLCAxKSBjc3MgcHJvcGVydHlcbiAgICBpZiAodGhpcy5vcHRpb25zLnZlcnRpY2FsICYmICFub0ludmVydCkge1xuICAgICAgbG9jYXRpb24gPSB0aGlzLm9wdGlvbnMuZW5kIC0gbG9jYXRpb247XG4gICAgfVxuXG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgdmVydCA9IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCxcbiAgICAgICAgaE9yVyA9IHZlcnQgPyAnaGVpZ2h0JyA6ICd3aWR0aCcsXG4gICAgICAgIGxPclQgPSB2ZXJ0ID8gJ3RvcCcgOiAnbGVmdCcsXG4gICAgICAgIGhhbmRsZURpbSA9ICRobmRsWzBdLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpW2hPclddLFxuICAgICAgICBlbGVtRGltID0gdGhpcy4kZWxlbWVudFswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtoT3JXXSxcbiAgICAgICAgLy9wZXJjZW50YWdlIG9mIGJhciBtaW4vbWF4IHZhbHVlIGJhc2VkIG9uIGNsaWNrIG9yIGRyYWcgcG9pbnRcbiAgICAgICAgcGN0T2ZCYXIgPSB0aGlzLl9wY3RPZkJhcihsb2NhdGlvbiksXG4gICAgICAgIC8vbnVtYmVyIG9mIGFjdHVhbCBwaXhlbHMgdG8gc2hpZnQgdGhlIGhhbmRsZSwgYmFzZWQgb24gdGhlIHBlcmNlbnRhZ2Ugb2J0YWluZWQgYWJvdmVcbiAgICAgICAgcHhUb01vdmUgPSAoZWxlbURpbSAtIGhhbmRsZURpbSkgKiBwY3RPZkJhcixcbiAgICAgICAgLy9wZXJjZW50YWdlIG9mIGJhciB0byBzaGlmdCB0aGUgaGFuZGxlXG4gICAgICAgIG1vdmVtZW50ID0gKHBlcmNlbnQocHhUb01vdmUsIGVsZW1EaW0pICogMTAwKS50b0ZpeGVkKHRoaXMub3B0aW9ucy5kZWNpbWFsKTtcbiAgICAgICAgLy9maXhpbmcgdGhlIGRlY2ltYWwgdmFsdWUgZm9yIHRoZSBsb2NhdGlvbiBudW1iZXIsIGlzIHBhc3NlZCB0byBvdGhlciBtZXRob2RzIGFzIGEgZml4ZWQgZmxvYXRpbmctcG9pbnQgdmFsdWVcbiAgICAgICAgbG9jYXRpb24gPSBwYXJzZUZsb2F0KGxvY2F0aW9uLnRvRml4ZWQodGhpcy5vcHRpb25zLmRlY2ltYWwpKTtcbiAgICAgICAgLy8gZGVjbGFyZSBlbXB0eSBvYmplY3QgZm9yIGNzcyBhZGp1c3RtZW50cywgb25seSB1c2VkIHdpdGggMiBoYW5kbGVkLXNsaWRlcnNcbiAgICB2YXIgY3NzID0ge307XG5cbiAgICB0aGlzLl9zZXRWYWx1ZXMoJGhuZGwsIGxvY2F0aW9uKTtcblxuICAgIC8vIFRPRE8gdXBkYXRlIHRvIGNhbGN1bGF0ZSBiYXNlZCBvbiB2YWx1ZXMgc2V0IHRvIHJlc3BlY3RpdmUgaW5wdXRzPz9cbiAgICBpZiAoaXNEYmwpIHtcbiAgICAgIHZhciBpc0xlZnRIbmRsID0gdGhpcy5oYW5kbGVzLmluZGV4KCRobmRsKSA9PT0gMCxcbiAgICAgICAgICAvL2VtcHR5IHZhcmlhYmxlLCB3aWxsIGJlIHVzZWQgZm9yIG1pbi1oZWlnaHQvd2lkdGggZm9yIGZpbGwgYmFyXG4gICAgICAgICAgZGltLFxuICAgICAgICAgIC8vcGVyY2VudGFnZSB3L2ggb2YgdGhlIGhhbmRsZSBjb21wYXJlZCB0byB0aGUgc2xpZGVyIGJhclxuICAgICAgICAgIGhhbmRsZVBjdCA9ICB+fihwZXJjZW50KGhhbmRsZURpbSwgZWxlbURpbSkgKiAxMDApO1xuICAgICAgLy9pZiBsZWZ0IGhhbmRsZSwgdGhlIG1hdGggaXMgc2xpZ2h0bHkgZGlmZmVyZW50IHRoYW4gaWYgaXQncyB0aGUgcmlnaHQgaGFuZGxlLCBhbmQgdGhlIGxlZnQvdG9wIHByb3BlcnR5IG5lZWRzIHRvIGJlIGNoYW5nZWQgZm9yIHRoZSBmaWxsIGJhclxuICAgICAgaWYgKGlzTGVmdEhuZGwpIHtcbiAgICAgICAgLy9sZWZ0IG9yIHRvcCBwZXJjZW50YWdlIHZhbHVlIHRvIGFwcGx5IHRvIHRoZSBmaWxsIGJhci5cbiAgICAgICAgY3NzW2xPclRdID0gYCR7bW92ZW1lbnR9JWA7XG4gICAgICAgIC8vY2FsY3VsYXRlIHRoZSBuZXcgbWluLWhlaWdodC93aWR0aCBmb3IgdGhlIGZpbGwgYmFyLlxuICAgICAgICBkaW0gPSBwYXJzZUZsb2F0KHRoaXMuJGhhbmRsZTJbMF0uc3R5bGVbbE9yVF0pIC0gbW92ZW1lbnQgKyBoYW5kbGVQY3Q7XG4gICAgICAgIC8vdGhpcyBjYWxsYmFjayBpcyBuZWNlc3NhcnkgdG8gcHJldmVudCBlcnJvcnMgYW5kIGFsbG93IHRoZSBwcm9wZXIgcGxhY2VtZW50IGFuZCBpbml0aWFsaXphdGlvbiBvZiBhIDItaGFuZGxlZCBzbGlkZXJcbiAgICAgICAgLy9wbHVzLCBpdCBtZWFucyB3ZSBkb24ndCBjYXJlIGlmICdkaW0nIGlzTmFOIG9uIGluaXQsIGl0IHdvbid0IGJlIGluIHRoZSBmdXR1cmUuXG4gICAgICAgIGlmIChjYiAmJiB0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIHsgY2IoKTsgfS8vdGhpcyBpcyBvbmx5IG5lZWRlZCBmb3IgdGhlIGluaXRpYWxpemF0aW9uIG9mIDIgaGFuZGxlZCBzbGlkZXJzXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvL2p1c3QgY2FjaGluZyB0aGUgdmFsdWUgb2YgdGhlIGxlZnQvYm90dG9tIGhhbmRsZSdzIGxlZnQvdG9wIHByb3BlcnR5XG4gICAgICAgIHZhciBoYW5kbGVQb3MgPSBwYXJzZUZsb2F0KHRoaXMuJGhhbmRsZVswXS5zdHlsZVtsT3JUXSk7XG4gICAgICAgIC8vY2FsY3VsYXRlIHRoZSBuZXcgbWluLWhlaWdodC93aWR0aCBmb3IgdGhlIGZpbGwgYmFyLiBVc2UgaXNOYU4gdG8gcHJldmVudCBmYWxzZSBwb3NpdGl2ZXMgZm9yIG51bWJlcnMgPD0gMFxuICAgICAgICAvL2Jhc2VkIG9uIHRoZSBwZXJjZW50YWdlIG9mIG1vdmVtZW50IG9mIHRoZSBoYW5kbGUgYmVpbmcgbWFuaXB1bGF0ZWQsIGxlc3MgdGhlIG9wcG9zaW5nIGhhbmRsZSdzIGxlZnQvdG9wIHBvc2l0aW9uLCBwbHVzIHRoZSBwZXJjZW50YWdlIHcvaCBvZiB0aGUgaGFuZGxlIGl0c2VsZlxuICAgICAgICBkaW0gPSBtb3ZlbWVudCAtIChpc05hTihoYW5kbGVQb3MpID8gKHRoaXMub3B0aW9ucy5pbml0aWFsU3RhcnQgLSB0aGlzLm9wdGlvbnMuc3RhcnQpLygodGhpcy5vcHRpb25zLmVuZC10aGlzLm9wdGlvbnMuc3RhcnQpLzEwMCkgOiBoYW5kbGVQb3MpICsgaGFuZGxlUGN0O1xuICAgICAgfVxuICAgICAgLy8gYXNzaWduIHRoZSBtaW4taGVpZ2h0L3dpZHRoIHRvIG91ciBjc3Mgb2JqZWN0XG4gICAgICBjc3NbYG1pbi0ke2hPcld9YF0gPSBgJHtkaW19JWA7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vbmUoJ2ZpbmlzaGVkLnpmLmFuaW1hdGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICAgICAqIEZpcmVzIHdoZW4gdGhlIGhhbmRsZSBpcyBkb25lIG1vdmluZy5cbiAgICAgICAgICAgICAgICAgICAgICogQGV2ZW50IFNsaWRlciNtb3ZlZFxuICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuJGVsZW1lbnQudHJpZ2dlcignbW92ZWQuemYuc2xpZGVyJywgWyRobmRsXSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAvL2JlY2F1c2Ugd2UgZG9uJ3Qga25vdyBleGFjdGx5IGhvdyB0aGUgaGFuZGxlIHdpbGwgYmUgbW92ZWQsIGNoZWNrIHRoZSBhbW91bnQgb2YgdGltZSBpdCBzaG91bGQgdGFrZSB0byBtb3ZlLlxuICAgIHZhciBtb3ZlVGltZSA9IHRoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnKSA/IDEwMDAvNjAgOiB0aGlzLm9wdGlvbnMubW92ZVRpbWU7XG5cbiAgICBGb3VuZGF0aW9uLk1vdmUobW92ZVRpbWUsICRobmRsLCBmdW5jdGlvbigpIHtcbiAgICAgIC8vIGFkanVzdGluZyB0aGUgbGVmdC90b3AgcHJvcGVydHkgb2YgdGhlIGhhbmRsZSwgYmFzZWQgb24gdGhlIHBlcmNlbnRhZ2UgY2FsY3VsYXRlZCBhYm92ZVxuICAgICAgLy8gaWYgbW92ZW1lbnQgaXNOYU4sIHRoYXQgaXMgYmVjYXVzZSB0aGUgc2xpZGVyIGlzIGhpZGRlbiBhbmQgd2UgY2Fubm90IGRldGVybWluZSBoYW5kbGUgd2lkdGgsXG4gICAgICAvLyBmYWxsIGJhY2sgdG8gbmV4dCBiZXN0IGd1ZXNzLlxuICAgICAgaWYgKGlzTmFOKG1vdmVtZW50KSkge1xuICAgICAgICAkaG5kbC5jc3MobE9yVCwgYCR7cGN0T2ZCYXIgKiAxMDB9JWApO1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgICRobmRsLmNzcyhsT3JULCBgJHttb3ZlbWVudH0lYCk7XG4gICAgICB9XG5cbiAgICAgIGlmICghX3RoaXMub3B0aW9ucy5kb3VibGVTaWRlZCkge1xuICAgICAgICAvL2lmIHNpbmdsZS1oYW5kbGVkLCBhIHNpbXBsZSBtZXRob2QgdG8gZXhwYW5kIHRoZSBmaWxsIGJhclxuICAgICAgICBfdGhpcy4kZmlsbC5jc3MoaE9yVywgYCR7cGN0T2ZCYXIgKiAxMDB9JWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy9vdGhlcndpc2UsIHVzZSB0aGUgY3NzIG9iamVjdCB3ZSBjcmVhdGVkIGFib3ZlXG4gICAgICAgIF90aGlzLiRmaWxsLmNzcyhjc3MpO1xuICAgICAgfVxuICAgIH0pO1xuXG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSB2YWx1ZSBoYXMgbm90IGJlZW4gY2hhbmdlIGZvciBhIGdpdmVuIHRpbWUuXG4gICAgICogQGV2ZW50IFNsaWRlciNjaGFuZ2VkXG4gICAgICovXG4gICAgY2xlYXJUaW1lb3V0KF90aGlzLnRpbWVvdXQpO1xuICAgIF90aGlzLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICBfdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjaGFuZ2VkLnpmLnNsaWRlcicsIFskaG5kbF0pO1xuICAgIH0sIF90aGlzLm9wdGlvbnMuY2hhbmdlZERlbGF5KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBpbml0aWFsIGF0dHJpYnV0ZSBmb3IgdGhlIHNsaWRlciBlbGVtZW50LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGlkeCAtIGluZGV4IG9mIHRoZSBjdXJyZW50IGhhbmRsZS9pbnB1dCB0byB1c2UuXG4gICAqL1xuICBfc2V0SW5pdEF0dHIoaWR4KSB7XG4gICAgdmFyIGluaXRWYWwgPSAoaWR4ID09PSAwID8gdGhpcy5vcHRpb25zLmluaXRpYWxTdGFydCA6IHRoaXMub3B0aW9ucy5pbml0aWFsRW5kKVxuICAgIHZhciBpZCA9IHRoaXMuaW5wdXRzLmVxKGlkeCkuYXR0cignaWQnKSB8fCBGb3VuZGF0aW9uLkdldFlvRGlnaXRzKDYsICdzbGlkZXInKTtcbiAgICB0aGlzLmlucHV0cy5lcShpZHgpLmF0dHIoe1xuICAgICAgJ2lkJzogaWQsXG4gICAgICAnbWF4JzogdGhpcy5vcHRpb25zLmVuZCxcbiAgICAgICdtaW4nOiB0aGlzLm9wdGlvbnMuc3RhcnQsXG4gICAgICAnc3RlcCc6IHRoaXMub3B0aW9ucy5zdGVwXG4gICAgfSk7XG4gICAgdGhpcy5pbnB1dHMuZXEoaWR4KS52YWwoaW5pdFZhbCk7XG4gICAgdGhpcy5oYW5kbGVzLmVxKGlkeCkuYXR0cih7XG4gICAgICAncm9sZSc6ICdzbGlkZXInLFxuICAgICAgJ2FyaWEtY29udHJvbHMnOiBpZCxcbiAgICAgICdhcmlhLXZhbHVlbWF4JzogdGhpcy5vcHRpb25zLmVuZCxcbiAgICAgICdhcmlhLXZhbHVlbWluJzogdGhpcy5vcHRpb25zLnN0YXJ0LFxuICAgICAgJ2FyaWEtdmFsdWVub3cnOiBpbml0VmFsLFxuICAgICAgJ2FyaWEtb3JpZW50YXRpb24nOiB0aGlzLm9wdGlvbnMudmVydGljYWwgPyAndmVydGljYWwnIDogJ2hvcml6b250YWwnLFxuICAgICAgJ3RhYmluZGV4JzogMFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGlucHV0IGFuZCBgYXJpYS12YWx1ZW5vd2AgdmFsdWVzIGZvciB0aGUgc2xpZGVyIGVsZW1lbnQuXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhhbmRsZSAtIHRoZSBjdXJyZW50bHkgc2VsZWN0ZWQgaGFuZGxlLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsIC0gZmxvYXRpbmcgcG9pbnQgb2YgdGhlIG5ldyB2YWx1ZS5cbiAgICovXG4gIF9zZXRWYWx1ZXMoJGhhbmRsZSwgdmFsKSB7XG4gICAgdmFyIGlkeCA9IHRoaXMub3B0aW9ucy5kb3VibGVTaWRlZCA/IHRoaXMuaGFuZGxlcy5pbmRleCgkaGFuZGxlKSA6IDA7XG4gICAgdGhpcy5pbnB1dHMuZXEoaWR4KS52YWwodmFsKTtcbiAgICAkaGFuZGxlLmF0dHIoJ2FyaWEtdmFsdWVub3cnLCB2YWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhhbmRsZXMgZXZlbnRzIG9uIHRoZSBzbGlkZXIgZWxlbWVudC5cbiAgICogQ2FsY3VsYXRlcyB0aGUgbmV3IGxvY2F0aW9uIG9mIHRoZSBjdXJyZW50IGhhbmRsZS5cbiAgICogSWYgdGhlcmUgYXJlIHR3byBoYW5kbGVzIGFuZCB0aGUgYmFyIHdhcyBjbGlja2VkLCBpdCBkZXRlcm1pbmVzIHdoaWNoIGhhbmRsZSB0byBtb3ZlLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtPYmplY3R9IGUgLSB0aGUgYGV2ZW50YCBvYmplY3QgcGFzc2VkIGZyb20gdGhlIGxpc3RlbmVyLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJGhhbmRsZSAtIHRoZSBjdXJyZW50IGhhbmRsZSB0byBjYWxjdWxhdGUgZm9yLCBpZiBzZWxlY3RlZC5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHZhbCAtIGZsb2F0aW5nIHBvaW50IG51bWJlciBmb3IgdGhlIG5ldyB2YWx1ZSBvZiB0aGUgc2xpZGVyLlxuICAgKiBUT0RPIGNsZWFuIHRoaXMgdXAsIHRoZXJlJ3MgYSBsb3Qgb2YgcmVwZWF0ZWQgY29kZSBiZXR3ZWVuIHRoaXMgYW5kIHRoZSBfc2V0SGFuZGxlUG9zIGZuLlxuICAgKi9cbiAgX2hhbmRsZUV2ZW50KGUsICRoYW5kbGUsIHZhbCkge1xuICAgIHZhciB2YWx1ZSwgaGFzVmFsO1xuICAgIGlmICghdmFsKSB7Ly9jbGljayBvciBkcmFnIGV2ZW50c1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgICB2ZXJ0aWNhbCA9IHRoaXMub3B0aW9ucy52ZXJ0aWNhbCxcbiAgICAgICAgICBwYXJhbSA9IHZlcnRpY2FsID8gJ2hlaWdodCcgOiAnd2lkdGgnLFxuICAgICAgICAgIGRpcmVjdGlvbiA9IHZlcnRpY2FsID8gJ3RvcCcgOiAnbGVmdCcsXG4gICAgICAgICAgZXZlbnRPZmZzZXQgPSB2ZXJ0aWNhbCA/IGUucGFnZVkgOiBlLnBhZ2VYLFxuICAgICAgICAgIGhhbGZPZkhhbmRsZSA9IHRoaXMuJGhhbmRsZVswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVtwYXJhbV0gLyAyLFxuICAgICAgICAgIGJhckRpbSA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClbcGFyYW1dLFxuICAgICAgICAgIHdpbmRvd1Njcm9sbCA9IHZlcnRpY2FsID8gJCh3aW5kb3cpLnNjcm9sbFRvcCgpIDogJCh3aW5kb3cpLnNjcm9sbExlZnQoKTtcblxuXG4gICAgICB2YXIgZWxlbU9mZnNldCA9IHRoaXMuJGVsZW1lbnQub2Zmc2V0KClbZGlyZWN0aW9uXTtcblxuICAgICAgLy8gdG91Y2ggZXZlbnRzIGVtdWxhdGVkIGJ5IHRoZSB0b3VjaCB1dGlsIGdpdmUgcG9zaXRpb24gcmVsYXRpdmUgdG8gc2NyZWVuLCBhZGQgd2luZG93LnNjcm9sbCB0byBldmVudCBjb29yZGluYXRlcy4uLlxuICAgICAgLy8gYmVzdCB3YXkgdG8gZ3Vlc3MgdGhpcyBpcyBzaW11bGF0ZWQgaXMgaWYgY2xpZW50WSA9PSBwYWdlWVxuICAgICAgaWYgKGUuY2xpZW50WSA9PT0gZS5wYWdlWSkgeyBldmVudE9mZnNldCA9IGV2ZW50T2Zmc2V0ICsgd2luZG93U2Nyb2xsOyB9XG4gICAgICB2YXIgZXZlbnRGcm9tQmFyID0gZXZlbnRPZmZzZXQgLSBlbGVtT2Zmc2V0O1xuICAgICAgdmFyIGJhclhZO1xuICAgICAgaWYgKGV2ZW50RnJvbUJhciA8IDApIHtcbiAgICAgICAgYmFyWFkgPSAwO1xuICAgICAgfSBlbHNlIGlmIChldmVudEZyb21CYXIgPiBiYXJEaW0pIHtcbiAgICAgICAgYmFyWFkgPSBiYXJEaW07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBiYXJYWSA9IGV2ZW50RnJvbUJhcjtcbiAgICAgIH1cbiAgICAgIHZhciBvZmZzZXRQY3QgPSBwZXJjZW50KGJhclhZLCBiYXJEaW0pO1xuXG4gICAgICB2YWx1ZSA9IHRoaXMuX3ZhbHVlKG9mZnNldFBjdCk7XG5cbiAgICAgIC8vIHR1cm4gZXZlcnl0aGluZyBhcm91bmQgZm9yIFJUTCwgeWF5IG1hdGghXG4gICAgICBpZiAoRm91bmRhdGlvbi5ydGwoKSAmJiAhdGhpcy5vcHRpb25zLnZlcnRpY2FsKSB7dmFsdWUgPSB0aGlzLm9wdGlvbnMuZW5kIC0gdmFsdWU7fVxuXG4gICAgICB2YWx1ZSA9IF90aGlzLl9hZGp1c3RWYWx1ZShudWxsLCB2YWx1ZSk7XG4gICAgICAvL2Jvb2xlYW4gZmxhZyBmb3IgdGhlIHNldEhhbmRsZVBvcyBmbiwgc3BlY2lmaWNhbGx5IGZvciB2ZXJ0aWNhbCBzbGlkZXJzXG4gICAgICBoYXNWYWwgPSBmYWxzZTtcblxuICAgICAgaWYgKCEkaGFuZGxlKSB7Ly9maWd1cmUgb3V0IHdoaWNoIGhhbmRsZSBpdCBpcywgcGFzcyBpdCB0byB0aGUgbmV4dCBmdW5jdGlvbi5cbiAgICAgICAgdmFyIGZpcnN0SG5kbFBvcyA9IGFic1Bvc2l0aW9uKHRoaXMuJGhhbmRsZSwgZGlyZWN0aW9uLCBiYXJYWSwgcGFyYW0pLFxuICAgICAgICAgICAgc2VjbmRIbmRsUG9zID0gYWJzUG9zaXRpb24odGhpcy4kaGFuZGxlMiwgZGlyZWN0aW9uLCBiYXJYWSwgcGFyYW0pO1xuICAgICAgICAgICAgJGhhbmRsZSA9IGZpcnN0SG5kbFBvcyA8PSBzZWNuZEhuZGxQb3MgPyB0aGlzLiRoYW5kbGUgOiB0aGlzLiRoYW5kbGUyO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIHsvL2NoYW5nZSBldmVudCBvbiBpbnB1dFxuICAgICAgdmFsdWUgPSB0aGlzLl9hZGp1c3RWYWx1ZShudWxsLCB2YWwpO1xuICAgICAgaGFzVmFsID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9zZXRIYW5kbGVQb3MoJGhhbmRsZSwgdmFsdWUsIGhhc1ZhbCk7XG4gIH1cblxuICAvKipcbiAgICogQWRqdXN0ZXMgdmFsdWUgZm9yIGhhbmRsZSBpbiByZWdhcmQgdG8gc3RlcCB2YWx1ZS4gcmV0dXJucyBhZGp1c3RlZCB2YWx1ZVxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtqUXVlcnl9ICRoYW5kbGUgLSB0aGUgc2VsZWN0ZWQgaGFuZGxlLlxuICAgKiBAcGFyYW0ge051bWJlcn0gdmFsdWUgLSB2YWx1ZSB0byBhZGp1c3QuIHVzZWQgaWYgJGhhbmRsZSBpcyBmYWxzeVxuICAgKi9cbiAgX2FkanVzdFZhbHVlKCRoYW5kbGUsIHZhbHVlKSB7XG4gICAgdmFyIHZhbCxcbiAgICAgIHN0ZXAgPSB0aGlzLm9wdGlvbnMuc3RlcCxcbiAgICAgIGRpdiA9IHBhcnNlRmxvYXQoc3RlcC8yKSxcbiAgICAgIGxlZnQsIHByZXZfdmFsLCBuZXh0X3ZhbDtcbiAgICBpZiAoISEkaGFuZGxlKSB7XG4gICAgICB2YWwgPSBwYXJzZUZsb2F0KCRoYW5kbGUuYXR0cignYXJpYS12YWx1ZW5vdycpKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB2YWwgPSB2YWx1ZTtcbiAgICB9XG4gICAgbGVmdCA9IHZhbCAlIHN0ZXA7XG4gICAgcHJldl92YWwgPSB2YWwgLSBsZWZ0O1xuICAgIG5leHRfdmFsID0gcHJldl92YWwgKyBzdGVwO1xuICAgIGlmIChsZWZ0ID09PSAwKSB7XG4gICAgICByZXR1cm4gdmFsO1xuICAgIH1cbiAgICB2YWwgPSB2YWwgPj0gcHJldl92YWwgKyBkaXYgPyBuZXh0X3ZhbCA6IHByZXZfdmFsO1xuICAgIHJldHVybiB2YWw7XG4gIH1cblxuICAvKipcbiAgICogQWRkcyBldmVudCBsaXN0ZW5lcnMgdG8gdGhlIHNsaWRlciBlbGVtZW50cy5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuX2V2ZW50c0ZvckhhbmRsZSh0aGlzLiRoYW5kbGUpO1xuICAgIGlmKHRoaXMuaGFuZGxlc1sxXSkge1xuICAgICAgdGhpcy5fZXZlbnRzRm9ySGFuZGxlKHRoaXMuJGhhbmRsZTIpO1xuICAgIH1cbiAgfVxuXG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgbGlzdGVuZXJzIGEgcGFydGljdWxhciBoYW5kbGVcbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkaGFuZGxlIC0gdGhlIGN1cnJlbnQgaGFuZGxlIHRvIGFwcGx5IGxpc3RlbmVycyB0by5cbiAgICovXG4gIF9ldmVudHNGb3JIYW5kbGUoJGhhbmRsZSkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIGN1ckhhbmRsZSxcbiAgICAgICAgdGltZXI7XG5cbiAgICAgIHRoaXMuaW5wdXRzLm9mZignY2hhbmdlLnpmLnNsaWRlcicpLm9uKCdjaGFuZ2UuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICB2YXIgaWR4ID0gX3RoaXMuaW5wdXRzLmluZGV4KCQodGhpcykpO1xuICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSwgX3RoaXMuaGFuZGxlcy5lcShpZHgpLCAkKHRoaXMpLnZhbCgpKTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNsaWNrU2VsZWN0KSB7XG4gICAgICAgIHRoaXMuJGVsZW1lbnQub2ZmKCdjbGljay56Zi5zbGlkZXInKS5vbignY2xpY2suemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgIGlmIChfdGhpcy4kZWxlbWVudC5kYXRhKCdkcmFnZ2luZycpKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgICAgaWYgKCEkKGUudGFyZ2V0KS5pcygnW2RhdGEtc2xpZGVyLWhhbmRsZV0nKSkge1xuICAgICAgICAgICAgaWYgKF90aGlzLm9wdGlvbnMuZG91YmxlU2lkZWQpIHtcbiAgICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIF90aGlzLiRoYW5kbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmRyYWdnYWJsZSkge1xuICAgICAgdGhpcy5oYW5kbGVzLmFkZFRvdWNoKCk7XG5cbiAgICAgIHZhciAkYm9keSA9ICQoJ2JvZHknKTtcbiAgICAgICRoYW5kbGVcbiAgICAgICAgLm9mZignbW91c2Vkb3duLnpmLnNsaWRlcicpXG4gICAgICAgIC5vbignbW91c2Vkb3duLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAkaGFuZGxlLmFkZENsYXNzKCdpcy1kcmFnZ2luZycpO1xuICAgICAgICAgIF90aGlzLiRmaWxsLmFkZENsYXNzKCdpcy1kcmFnZ2luZycpOy8vXG4gICAgICAgICAgX3RoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnLCB0cnVlKTtcblxuICAgICAgICAgIGN1ckhhbmRsZSA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcblxuICAgICAgICAgICRib2R5Lm9uKCdtb3VzZW1vdmUuemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgX3RoaXMuX2hhbmRsZUV2ZW50KGUsIGN1ckhhbmRsZSk7XG5cbiAgICAgICAgICB9KS5vbignbW91c2V1cC56Zi5zbGlkZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBfdGhpcy5faGFuZGxlRXZlbnQoZSwgY3VySGFuZGxlKTtcblxuICAgICAgICAgICAgJGhhbmRsZS5yZW1vdmVDbGFzcygnaXMtZHJhZ2dpbmcnKTtcbiAgICAgICAgICAgIF90aGlzLiRmaWxsLnJlbW92ZUNsYXNzKCdpcy1kcmFnZ2luZycpO1xuICAgICAgICAgICAgX3RoaXMuJGVsZW1lbnQuZGF0YSgnZHJhZ2dpbmcnLCBmYWxzZSk7XG5cbiAgICAgICAgICAgICRib2R5Lm9mZignbW91c2Vtb3ZlLnpmLnNsaWRlciBtb3VzZXVwLnpmLnNsaWRlcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgfSlcbiAgICAgIC8vIHByZXZlbnQgZXZlbnRzIHRyaWdnZXJlZCBieSB0b3VjaFxuICAgICAgLm9uKCdzZWxlY3RzdGFydC56Zi5zbGlkZXIgdG91Y2htb3ZlLnpmLnNsaWRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgJGhhbmRsZS5vZmYoJ2tleWRvd24uemYuc2xpZGVyJykub24oJ2tleWRvd24uemYuc2xpZGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIF8kaGFuZGxlID0gJCh0aGlzKSxcbiAgICAgICAgICBpZHggPSBfdGhpcy5vcHRpb25zLmRvdWJsZVNpZGVkID8gX3RoaXMuaGFuZGxlcy5pbmRleChfJGhhbmRsZSkgOiAwLFxuICAgICAgICAgIG9sZFZhbHVlID0gcGFyc2VGbG9hdChfdGhpcy5pbnB1dHMuZXEoaWR4KS52YWwoKSksXG4gICAgICAgICAgbmV3VmFsdWU7XG5cbiAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdTbGlkZXInLCB7XG4gICAgICAgIGRlY3JlYXNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZXdWYWx1ZSA9IG9sZFZhbHVlIC0gX3RoaXMub3B0aW9ucy5zdGVwO1xuICAgICAgICB9LFxuICAgICAgICBpbmNyZWFzZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSArIF90aGlzLm9wdGlvbnMuc3RlcDtcbiAgICAgICAgfSxcbiAgICAgICAgZGVjcmVhc2VfZmFzdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBvbGRWYWx1ZSAtIF90aGlzLm9wdGlvbnMuc3RlcCAqIDEwO1xuICAgICAgICB9LFxuICAgICAgICBpbmNyZWFzZV9mYXN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBuZXdWYWx1ZSA9IG9sZFZhbHVlICsgX3RoaXMub3B0aW9ucy5zdGVwICogMTA7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkgeyAvLyBvbmx5IHNldCBoYW5kbGUgcG9zIHdoZW4gZXZlbnQgd2FzIGhhbmRsZWQgc3BlY2lhbGx5XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIF90aGlzLl9zZXRIYW5kbGVQb3MoXyRoYW5kbGUsIG5ld1ZhbHVlLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvKmlmIChuZXdWYWx1ZSkgeyAvLyBpZiBwcmVzc2VkIGtleSBoYXMgc3BlY2lhbCBmdW5jdGlvbiwgdXBkYXRlIHZhbHVlXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgX3RoaXMuX3NldEhhbmRsZVBvcyhfJGhhbmRsZSwgbmV3VmFsdWUpO1xuICAgICAgfSovXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgdGhlIHNsaWRlciBwbHVnaW4uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuaGFuZGxlcy5vZmYoJy56Zi5zbGlkZXInKTtcbiAgICB0aGlzLmlucHV0cy5vZmYoJy56Zi5zbGlkZXInKTtcbiAgICB0aGlzLiRlbGVtZW50Lm9mZignLnpmLnNsaWRlcicpO1xuXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dCk7XG5cbiAgICBGb3VuZGF0aW9uLnVucmVnaXN0ZXJQbHVnaW4odGhpcyk7XG4gIH1cbn1cblxuU2xpZGVyLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogTWluaW11bSB2YWx1ZSBmb3IgdGhlIHNsaWRlciBzY2FsZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAwXG4gICAqL1xuICBzdGFydDogMCxcbiAgLyoqXG4gICAqIE1heGltdW0gdmFsdWUgZm9yIHRoZSBzbGlkZXIgc2NhbGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTAwXG4gICAqL1xuICBlbmQ6IDEwMCxcbiAgLyoqXG4gICAqIE1pbmltdW0gdmFsdWUgY2hhbmdlIHBlciBjaGFuZ2UgZXZlbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMVxuICAgKi9cbiAgc3RlcDogMSxcbiAgLyoqXG4gICAqIFZhbHVlIGF0IHdoaWNoIHRoZSBoYW5kbGUvaW5wdXQgKihsZWZ0IGhhbmRsZS9maXJzdCBpbnB1dCkqIHNob3VsZCBiZSBzZXQgdG8gb24gaW5pdGlhbGl6YXRpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMFxuICAgKi9cbiAgaW5pdGlhbFN0YXJ0OiAwLFxuICAvKipcbiAgICogVmFsdWUgYXQgd2hpY2ggdGhlIHJpZ2h0IGhhbmRsZS9zZWNvbmQgaW5wdXQgc2hvdWxkIGJlIHNldCB0byBvbiBpbml0aWFsaXphdGlvbi5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMDBcbiAgICovXG4gIGluaXRpYWxFbmQ6IDEwMCxcbiAgLyoqXG4gICAqIEFsbG93cyB0aGUgaW5wdXQgdG8gYmUgbG9jYXRlZCBvdXRzaWRlIHRoZSBjb250YWluZXIgYW5kIHZpc2libGUuIFNldCB0byBieSB0aGUgSlNcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgYmluZGluZzogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHVzZXIgdG8gY2xpY2svdGFwIG9uIHRoZSBzbGlkZXIgYmFyIHRvIHNlbGVjdCBhIHZhbHVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIHRydWVcbiAgICovXG4gIGNsaWNrU2VsZWN0OiB0cnVlLFxuICAvKipcbiAgICogU2V0IHRvIHRydWUgYW5kIHVzZSB0aGUgYHZlcnRpY2FsYCBjbGFzcyB0byBjaGFuZ2UgYWxpZ25tZW50IHRvIHZlcnRpY2FsLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICB2ZXJ0aWNhbDogZmFsc2UsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHVzZXIgdG8gZHJhZyB0aGUgc2xpZGVyIGhhbmRsZShzKSB0byBzZWxlY3QgYSB2YWx1ZS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBkcmFnZ2FibGU6IHRydWUsXG4gIC8qKlxuICAgKiBEaXNhYmxlcyB0aGUgc2xpZGVyIGFuZCBwcmV2ZW50cyBldmVudCBsaXN0ZW5lcnMgZnJvbSBiZWluZyBhcHBsaWVkLiBEb3VibGUgY2hlY2tlZCBieSBKUyB3aXRoIGBkaXNhYmxlZENsYXNzYC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGlzYWJsZWQ6IGZhbHNlLFxuICAvKipcbiAgICogQWxsb3dzIHRoZSB1c2Ugb2YgdHdvIGhhbmRsZXMuIERvdWJsZSBjaGVja2VkIGJ5IHRoZSBKUy4gQ2hhbmdlcyBzb21lIGxvZ2ljIGhhbmRsaW5nLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBkb3VibGVTaWRlZDogZmFsc2UsXG4gIC8qKlxuICAgKiBQb3RlbnRpYWwgZnV0dXJlIGZlYXR1cmUuXG4gICAqL1xuICAvLyBzdGVwczogMTAwLFxuICAvKipcbiAgICogTnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzIHRoZSBwbHVnaW4gc2hvdWxkIGdvIHRvIGZvciBmbG9hdGluZyBwb2ludCBwcmVjaXNpb24uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMlxuICAgKi9cbiAgZGVjaW1hbDogMixcbiAgLyoqXG4gICAqIFRpbWUgZGVsYXkgZm9yIGRyYWdnZWQgZWxlbWVudHMuXG4gICAqL1xuICAvLyBkcmFnRGVsYXk6IDAsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgdG8gYW5pbWF0ZSB0aGUgbW92ZW1lbnQgb2YgYSBzbGlkZXIgaGFuZGxlIGlmIHVzZXIgY2xpY2tzL3RhcHMgb24gdGhlIGJhci4gTmVlZHMgdG8gYmUgbWFudWFsbHkgc2V0IGlmIHVwZGF0aW5nIHRoZSB0cmFuc2l0aW9uIHRpbWUgaW4gdGhlIFNhc3Mgc2V0dGluZ3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMjAwXG4gICAqL1xuICBtb3ZlVGltZTogMjAwLC8vdXBkYXRlIHRoaXMgaWYgY2hhbmdpbmcgdGhlIHRyYW5zaXRpb24gdGltZSBpbiB0aGUgc2Fzc1xuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBkaXNhYmxlZCBzbGlkZXJzLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdkaXNhYmxlZCdcbiAgICovXG4gIGRpc2FibGVkQ2xhc3M6ICdkaXNhYmxlZCcsXG4gIC8qKlxuICAgKiBXaWxsIGludmVydCB0aGUgZGVmYXVsdCBsYXlvdXQgZm9yIGEgdmVydGljYWw8c3BhbiBkYXRhLXRvb2x0aXAgdGl0bGU9XCJ3aG8gd291bGQgZG8gdGhpcz8/P1wiPiA8L3NwYW4+c2xpZGVyLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBpbnZlcnRWZXJ0aWNhbDogZmFsc2UsXG4gIC8qKlxuICAgKiBNaWxsaXNlY29uZHMgYmVmb3JlIHRoZSBgY2hhbmdlZC56Zi1zbGlkZXJgIGV2ZW50IGlzIHRyaWdnZXJlZCBhZnRlciB2YWx1ZSBjaGFuZ2UuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgNTAwXG4gICAqL1xuICBjaGFuZ2VkRGVsYXk6IDUwMCxcbiAgLyoqXG4gICogQmFzZXZhbHVlIGZvciBub24tbGluZWFyIHNsaWRlcnNcbiAgKiBAb3B0aW9uXG4gICogQGV4YW1wbGUgNVxuICAqL1xuICBub25MaW5lYXJCYXNlOiA1LFxuICAvKipcbiAgKiBCYXNldmFsdWUgZm9yIG5vbi1saW5lYXIgc2xpZGVycywgcG9zc2libGUgdmFsdWVzIGFyZTogJ2xpbmVhcicsICdwb3cnICYgJ2xvZycuIFBvdyBhbmQgTG9nIHVzZSB0aGUgbm9uTGluZWFyQmFzZSBzZXR0aW5nLlxuICAqIEBvcHRpb25cbiAgKiBAZXhhbXBsZSAnbGluZWFyJ1xuICAqL1xuICBwb3NpdGlvblZhbHVlRnVuY3Rpb246ICdsaW5lYXInLFxufTtcblxuZnVuY3Rpb24gcGVyY2VudChmcmFjLCBudW0pIHtcbiAgcmV0dXJuIChmcmFjIC8gbnVtKTtcbn1cbmZ1bmN0aW9uIGFic1Bvc2l0aW9uKCRoYW5kbGUsIGRpciwgY2xpY2tQb3MsIHBhcmFtKSB7XG4gIHJldHVybiBNYXRoLmFicygoJGhhbmRsZS5wb3NpdGlvbigpW2Rpcl0gKyAoJGhhbmRsZVtwYXJhbV0oKSAvIDIpKSAtIGNsaWNrUG9zKTtcbn1cbmZ1bmN0aW9uIGJhc2VMb2coYmFzZSwgdmFsdWUpIHtcbiAgcmV0dXJuIE1hdGgubG9nKHZhbHVlKS9NYXRoLmxvZyhiYXNlKVxufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oU2xpZGVyLCAnU2xpZGVyJyk7XG5cbn0oalF1ZXJ5KTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4hZnVuY3Rpb24oJCkge1xuXG4vKipcbiAqIFN0aWNreSBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24uc3RpY2t5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLm1lZGlhUXVlcnlcbiAqL1xuXG5jbGFzcyBTdGlja3kge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBhIHN0aWNreSB0aGluZy5cbiAgICogQGNsYXNzXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSBlbGVtZW50IC0galF1ZXJ5IG9iamVjdCB0byBtYWtlIHN0aWNreS5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBvcHRpb25zIG9iamVjdCBwYXNzZWQgd2hlbiBjcmVhdGluZyB0aGUgZWxlbWVudCBwcm9ncmFtbWF0aWNhbGx5LlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBTdGlja3kuZGVmYXVsdHMsIHRoaXMuJGVsZW1lbnQuZGF0YSgpLCBvcHRpb25zKTtcblxuICAgIHRoaXMuX2luaXQoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1N0aWNreScpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBzdGlja3kgZWxlbWVudCBieSBhZGRpbmcgY2xhc3NlcywgZ2V0dGluZy9zZXR0aW5nIGRpbWVuc2lvbnMsIGJyZWFrcG9pbnRzIGFuZCBhdHRyaWJ1dGVzXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2luaXQoKSB7XG4gICAgdmFyICRwYXJlbnQgPSB0aGlzLiRlbGVtZW50LnBhcmVudCgnW2RhdGEtc3RpY2t5LWNvbnRhaW5lcl0nKSxcbiAgICAgICAgaWQgPSB0aGlzLiRlbGVtZW50WzBdLmlkIHx8IEZvdW5kYXRpb24uR2V0WW9EaWdpdHMoNiwgJ3N0aWNreScpLFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAoISRwYXJlbnQubGVuZ3RoKSB7XG4gICAgICB0aGlzLndhc1dyYXBwZWQgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLiRjb250YWluZXIgPSAkcGFyZW50Lmxlbmd0aCA/ICRwYXJlbnQgOiAkKHRoaXMub3B0aW9ucy5jb250YWluZXIpLndyYXBJbm5lcih0aGlzLiRlbGVtZW50KTtcbiAgICB0aGlzLiRjb250YWluZXIuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmNvbnRhaW5lckNsYXNzKTtcblxuICAgIHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnN0aWNreUNsYXNzKVxuICAgICAgICAgICAgICAgICAuYXR0cih7J2RhdGEtcmVzaXplJzogaWR9KTtcblxuICAgIHRoaXMuc2Nyb2xsQ291bnQgPSB0aGlzLm9wdGlvbnMuY2hlY2tFdmVyeTtcbiAgICB0aGlzLmlzU3R1Y2sgPSBmYWxzZTtcbiAgICAkKHdpbmRvdykub25lKCdsb2FkLnpmLnN0aWNreScsIGZ1bmN0aW9uKCl7XG4gICAgICAvL1dlIGNhbGN1bGF0ZSB0aGUgY29udGFpbmVyIGhlaWdodCB0byBoYXZlIGNvcnJlY3QgdmFsdWVzIGZvciBhbmNob3IgcG9pbnRzIG9mZnNldCBjYWxjdWxhdGlvbi5cbiAgICAgIF90aGlzLmNvbnRhaW5lckhlaWdodCA9IF90aGlzLiRlbGVtZW50LmNzcyhcImRpc3BsYXlcIikgPT0gXCJub25lXCIgPyAwIDogX3RoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgX3RoaXMuJGNvbnRhaW5lci5jc3MoJ2hlaWdodCcsIF90aGlzLmNvbnRhaW5lckhlaWdodCk7XG4gICAgICBfdGhpcy5lbGVtSGVpZ2h0ID0gX3RoaXMuY29udGFpbmVySGVpZ2h0O1xuICAgICAgaWYoX3RoaXMub3B0aW9ucy5hbmNob3IgIT09ICcnKXtcbiAgICAgICAgX3RoaXMuJGFuY2hvciA9ICQoJyMnICsgX3RoaXMub3B0aW9ucy5hbmNob3IpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIF90aGlzLl9wYXJzZVBvaW50cygpO1xuICAgICAgfVxuXG4gICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNjcm9sbCA9IHdpbmRvdy5wYWdlWU9mZnNldDtcbiAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHNjcm9sbCk7XG4gICAgICAgIC8vVW5zdGljayB0aGUgZWxlbWVudCB3aWxsIGVuc3VyZSB0aGF0IHByb3BlciBjbGFzc2VzIGFyZSBzZXQuXG4gICAgICAgIGlmICghX3RoaXMuaXNTdHVjaykge1xuICAgICAgICAgIF90aGlzLl9yZW1vdmVTdGlja3koKHNjcm9sbCA+PSBfdGhpcy50b3BQb2ludCkgPyBmYWxzZSA6IHRydWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIF90aGlzLl9ldmVudHMoaWQuc3BsaXQoJy0nKS5yZXZlcnNlKCkuam9pbignLScpKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtdWx0aXBsZSBlbGVtZW50cyBhcyBhbmNob3JzLCBjYWxjdWxhdGVzIHRoZSB0b3AgYW5kIGJvdHRvbSBwaXhlbCB2YWx1ZXMgdGhlIHN0aWNreSB0aGluZyBzaG91bGQgc3RpY2sgYW5kIHVuc3RpY2sgb24uXG4gICAqIEBmdW5jdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3BhcnNlUG9pbnRzKCkge1xuICAgIHZhciB0b3AgPSB0aGlzLm9wdGlvbnMudG9wQW5jaG9yID09IFwiXCIgPyAxIDogdGhpcy5vcHRpb25zLnRvcEFuY2hvcixcbiAgICAgICAgYnRtID0gdGhpcy5vcHRpb25zLmJ0bUFuY2hvcj09IFwiXCIgPyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IDogdGhpcy5vcHRpb25zLmJ0bUFuY2hvcixcbiAgICAgICAgcHRzID0gW3RvcCwgYnRtXSxcbiAgICAgICAgYnJlYWtzID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHB0cy5sZW5ndGg7IGkgPCBsZW4gJiYgcHRzW2ldOyBpKyspIHtcbiAgICAgIHZhciBwdDtcbiAgICAgIGlmICh0eXBlb2YgcHRzW2ldID09PSAnbnVtYmVyJykge1xuICAgICAgICBwdCA9IHB0c1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwbGFjZSA9IHB0c1tpXS5zcGxpdCgnOicpLFxuICAgICAgICAgICAgYW5jaG9yID0gJChgIyR7cGxhY2VbMF19YCk7XG5cbiAgICAgICAgcHQgPSBhbmNob3Iub2Zmc2V0KCkudG9wO1xuICAgICAgICBpZiAocGxhY2VbMV0gJiYgcGxhY2VbMV0udG9Mb3dlckNhc2UoKSA9PT0gJ2JvdHRvbScpIHtcbiAgICAgICAgICBwdCArPSBhbmNob3JbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVha3NbaV0gPSBwdDtcbiAgICB9XG5cblxuICAgIHRoaXMucG9pbnRzID0gYnJlYWtzO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGV2ZW50IGhhbmRsZXJzIGZvciB0aGUgc2Nyb2xsaW5nIGVsZW1lbnQuXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpZCAtIHBzdWVkby1yYW5kb20gaWQgZm9yIHVuaXF1ZSBzY3JvbGwgZXZlbnQgbGlzdGVuZXIuXG4gICAqL1xuICBfZXZlbnRzKGlkKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcyxcbiAgICAgICAgc2Nyb2xsTGlzdGVuZXIgPSB0aGlzLnNjcm9sbExpc3RlbmVyID0gYHNjcm9sbC56Zi4ke2lkfWA7XG4gICAgaWYgKHRoaXMuaXNPbikgeyByZXR1cm47IH1cbiAgICBpZiAodGhpcy5jYW5TdGljaykge1xuICAgICAgdGhpcy5pc09uID0gdHJ1ZTtcbiAgICAgICQod2luZG93KS5vZmYoc2Nyb2xsTGlzdGVuZXIpXG4gICAgICAgICAgICAgICAub24oc2Nyb2xsTGlzdGVuZXIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgaWYgKF90aGlzLnNjcm9sbENvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQgPSBfdGhpcy5vcHRpb25zLmNoZWNrRXZlcnk7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuX3NldFNpemVzKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2NhbGMoZmFsc2UsIHdpbmRvdy5wYWdlWU9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgX3RoaXMuc2Nyb2xsQ291bnQtLTtcbiAgICAgICAgICAgICAgICAgICBfdGhpcy5fY2FsYyhmYWxzZSwgd2luZG93LnBhZ2VZT2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50Lm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpXG4gICAgICAgICAgICAgICAgIC5vbigncmVzaXplbWUuemYudHJpZ2dlcicsIGZ1bmN0aW9uKGUsIGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICBfdGhpcy5fc2V0U2l6ZXMoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9jYWxjKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLmNhblN0aWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFfdGhpcy5pc09uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fZXZlbnRzKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX3RoaXMuaXNPbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9wYXVzZUxpc3RlbmVycyhzY3JvbGxMaXN0ZW5lcik7XG4gICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgZXZlbnQgaGFuZGxlcnMgZm9yIHNjcm9sbCBhbmQgY2hhbmdlIGV2ZW50cyBvbiBhbmNob3IuXG4gICAqIEBmaXJlcyBTdGlja3kjcGF1c2VcbiAgICogQHBhcmFtIHtTdHJpbmd9IHNjcm9sbExpc3RlbmVyIC0gdW5pcXVlLCBuYW1lc3BhY2VkIHNjcm9sbCBsaXN0ZW5lciBhdHRhY2hlZCB0byBgd2luZG93YFxuICAgKi9cbiAgX3BhdXNlTGlzdGVuZXJzKHNjcm9sbExpc3RlbmVyKSB7XG4gICAgdGhpcy5pc09uID0gZmFsc2U7XG4gICAgJCh3aW5kb3cpLm9mZihzY3JvbGxMaXN0ZW5lcik7XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaXMgcGF1c2VkIGR1ZSB0byByZXNpemUgZXZlbnQgc2hyaW5raW5nIHRoZSB2aWV3LlxuICAgICAqIEBldmVudCBTdGlja3kjcGF1c2VcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgICB0aGlzLiRlbGVtZW50LnRyaWdnZXIoJ3BhdXNlLnpmLnN0aWNreScpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBvbiBldmVyeSBgc2Nyb2xsYCBldmVudCBhbmQgb24gYF9pbml0YFxuICAgKiBmaXJlcyBmdW5jdGlvbnMgYmFzZWQgb24gYm9vbGVhbnMgYW5kIGNhY2hlZCB2YWx1ZXNcbiAgICogQHBhcmFtIHtCb29sZWFufSBjaGVja1NpemVzIC0gdHJ1ZSBpZiBwbHVnaW4gc2hvdWxkIHJlY2FsY3VsYXRlIHNpemVzIGFuZCBicmVha3BvaW50cy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IHNjcm9sbCAtIGN1cnJlbnQgc2Nyb2xsIHBvc2l0aW9uIHBhc3NlZCBmcm9tIHNjcm9sbCBldmVudCBjYiBmdW5jdGlvbi4gSWYgbm90IHBhc3NlZCwgZGVmYXVsdHMgdG8gYHdpbmRvdy5wYWdlWU9mZnNldGAuXG4gICAqL1xuICBfY2FsYyhjaGVja1NpemVzLCBzY3JvbGwpIHtcbiAgICBpZiAoY2hlY2tTaXplcykgeyB0aGlzLl9zZXRTaXplcygpOyB9XG5cbiAgICBpZiAoIXRoaXMuY2FuU3RpY2spIHtcbiAgICAgIGlmICh0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgdGhpcy5fcmVtb3ZlU3RpY2t5KHRydWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghc2Nyb2xsKSB7IHNjcm9sbCA9IHdpbmRvdy5wYWdlWU9mZnNldDsgfVxuXG4gICAgaWYgKHNjcm9sbCA+PSB0aGlzLnRvcFBvaW50KSB7XG4gICAgICBpZiAoc2Nyb2xsIDw9IHRoaXMuYm90dG9tUG9pbnQpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzU3R1Y2spIHtcbiAgICAgICAgICB0aGlzLl9zZXRTdGlja3koKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICAgIHRoaXMuX3JlbW92ZVN0aWNreShmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHRoaXMuaXNTdHVjaykge1xuICAgICAgICB0aGlzLl9yZW1vdmVTdGlja3kodHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENhdXNlcyB0aGUgJGVsZW1lbnQgdG8gYmVjb21lIHN0dWNrLlxuICAgKiBBZGRzIGBwb3NpdGlvbjogZml4ZWQ7YCwgYW5kIGhlbHBlciBjbGFzc2VzLlxuICAgKiBAZmlyZXMgU3RpY2t5I3N0dWNrdG9cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0U3RpY2t5KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIHN0aWNrVG8gPSB0aGlzLm9wdGlvbnMuc3RpY2tUbyxcbiAgICAgICAgbXJnbiA9IHN0aWNrVG8gPT09ICd0b3AnID8gJ21hcmdpblRvcCcgOiAnbWFyZ2luQm90dG9tJyxcbiAgICAgICAgbm90U3R1Y2tUbyA9IHN0aWNrVG8gPT09ICd0b3AnID8gJ2JvdHRvbScgOiAndG9wJyxcbiAgICAgICAgY3NzID0ge307XG5cbiAgICBjc3NbbXJnbl0gPSBgJHt0aGlzLm9wdGlvbnNbbXJnbl19ZW1gO1xuICAgIGNzc1tzdGlja1RvXSA9IDA7XG4gICAgY3NzW25vdFN0dWNrVG9dID0gJ2F1dG8nO1xuICAgIHRoaXMuaXNTdHVjayA9IHRydWU7XG4gICAgdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyhgaXMtYW5jaG9yZWQgaXMtYXQtJHtub3RTdHVja1RvfWApXG4gICAgICAgICAgICAgICAgIC5hZGRDbGFzcyhgaXMtc3R1Y2sgaXMtYXQtJHtzdGlja1RvfWApXG4gICAgICAgICAgICAgICAgIC5jc3MoY3NzKVxuICAgICAgICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgJGVsZW1lbnQgaGFzIGJlY29tZSBgcG9zaXRpb246IGZpeGVkO2BcbiAgICAgICAgICAgICAgICAgICogTmFtZXNwYWNlZCB0byBgdG9wYCBvciBgYm90dG9tYCwgZS5nLiBgc3RpY2t5LnpmLnN0dWNrdG86dG9wYFxuICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU3RpY2t5I3N0dWNrdG9cbiAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgIC50cmlnZ2VyKGBzdGlja3kuemYuc3R1Y2t0bzoke3N0aWNrVG99YCk7XG4gICAgdGhpcy4kZWxlbWVudC5vbihcInRyYW5zaXRpb25lbmQgd2Via2l0VHJhbnNpdGlvbkVuZCBvVHJhbnNpdGlvbkVuZCBvdHJhbnNpdGlvbmVuZCBNU1RyYW5zaXRpb25FbmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5fc2V0U2l6ZXMoKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYXVzZXMgdGhlICRlbGVtZW50IHRvIGJlY29tZSB1bnN0dWNrLlxuICAgKiBSZW1vdmVzIGBwb3NpdGlvbjogZml4ZWQ7YCwgYW5kIGhlbHBlciBjbGFzc2VzLlxuICAgKiBBZGRzIG90aGVyIGhlbHBlciBjbGFzc2VzLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IGlzVG9wIC0gdGVsbHMgdGhlIGZ1bmN0aW9uIGlmIHRoZSAkZWxlbWVudCBzaG91bGQgYW5jaG9yIHRvIHRoZSB0b3Agb3IgYm90dG9tIG9mIGl0cyAkYW5jaG9yIGVsZW1lbnQuXG4gICAqIEBmaXJlcyBTdGlja3kjdW5zdHVja2Zyb21cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZW1vdmVTdGlja3koaXNUb3ApIHtcbiAgICB2YXIgc3RpY2tUbyA9IHRoaXMub3B0aW9ucy5zdGlja1RvLFxuICAgICAgICBzdGlja1RvVG9wID0gc3RpY2tUbyA9PT0gJ3RvcCcsXG4gICAgICAgIGNzcyA9IHt9LFxuICAgICAgICBhbmNob3JQdCA9ICh0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIC0gdGhpcy5wb2ludHNbMF0gOiB0aGlzLmFuY2hvckhlaWdodCkgLSB0aGlzLmVsZW1IZWlnaHQsXG4gICAgICAgIG1yZ24gPSBzdGlja1RvVG9wID8gJ21hcmdpblRvcCcgOiAnbWFyZ2luQm90dG9tJyxcbiAgICAgICAgbm90U3R1Y2tUbyA9IHN0aWNrVG9Ub3AgPyAnYm90dG9tJyA6ICd0b3AnLFxuICAgICAgICB0b3BPckJvdHRvbSA9IGlzVG9wID8gJ3RvcCcgOiAnYm90dG9tJztcblxuICAgIGNzc1ttcmduXSA9IDA7XG5cbiAgICBjc3NbJ2JvdHRvbSddID0gJ2F1dG8nO1xuICAgIGlmKGlzVG9wKSB7XG4gICAgICBjc3NbJ3RvcCddID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgY3NzWyd0b3AnXSA9IGFuY2hvclB0O1xuICAgIH1cblxuICAgIHRoaXMuaXNTdHVjayA9IGZhbHNlO1xuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYGlzLXN0dWNrIGlzLWF0LSR7c3RpY2tUb31gKVxuICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoYGlzLWFuY2hvcmVkIGlzLWF0LSR7dG9wT3JCb3R0b219YClcbiAgICAgICAgICAgICAgICAgLmNzcyhjc3MpXG4gICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSAkZWxlbWVudCBoYXMgYmVjb21lIGFuY2hvcmVkLlxuICAgICAgICAgICAgICAgICAgKiBOYW1lc3BhY2VkIHRvIGB0b3BgIG9yIGBib3R0b21gLCBlLmcuIGBzdGlja3kuemYudW5zdHVja2Zyb206Ym90dG9tYFxuICAgICAgICAgICAgICAgICAgKiBAZXZlbnQgU3RpY2t5I3Vuc3R1Y2tmcm9tXG4gICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgICAudHJpZ2dlcihgc3RpY2t5LnpmLnVuc3R1Y2tmcm9tOiR7dG9wT3JCb3R0b219YCk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgJGVsZW1lbnQgYW5kICRjb250YWluZXIgc2l6ZXMgZm9yIHBsdWdpbi5cbiAgICogQ2FsbHMgYF9zZXRCcmVha1BvaW50c2AuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNiIC0gb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdG8gZmlyZSBvbiBjb21wbGV0aW9uIG9mIGBfc2V0QnJlYWtQb2ludHNgLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldFNpemVzKGNiKSB7XG4gICAgdGhpcy5jYW5TdGljayA9IEZvdW5kYXRpb24uTWVkaWFRdWVyeS5pcyh0aGlzLm9wdGlvbnMuc3RpY2t5T24pO1xuICAgIGlmICghdGhpcy5jYW5TdGljaykge1xuICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9XG4gICAgfVxuICAgIHZhciBfdGhpcyA9IHRoaXMsXG4gICAgICAgIG5ld0VsZW1XaWR0aCA9IHRoaXMuJGNvbnRhaW5lclswXS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS53aWR0aCxcbiAgICAgICAgY29tcCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHRoaXMuJGNvbnRhaW5lclswXSksXG4gICAgICAgIHBkbmdsID0gcGFyc2VJbnQoY29tcFsncGFkZGluZy1sZWZ0J10sIDEwKSxcbiAgICAgICAgcGRuZ3IgPSBwYXJzZUludChjb21wWydwYWRkaW5nLXJpZ2h0J10sIDEwKTtcblxuICAgIGlmICh0aGlzLiRhbmNob3IgJiYgdGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy5hbmNob3JIZWlnaHQgPSB0aGlzLiRhbmNob3JbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9wYXJzZVBvaW50cygpO1xuICAgIH1cblxuICAgIHRoaXMuJGVsZW1lbnQuY3NzKHtcbiAgICAgICdtYXgtd2lkdGgnOiBgJHtuZXdFbGVtV2lkdGggLSBwZG5nbCAtIHBkbmdyfXB4YFxuICAgIH0pO1xuXG4gICAgdmFyIG5ld0NvbnRhaW5lckhlaWdodCA9IHRoaXMuJGVsZW1lbnRbMF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0IHx8IHRoaXMuY29udGFpbmVySGVpZ2h0O1xuICAgIGlmICh0aGlzLiRlbGVtZW50LmNzcyhcImRpc3BsYXlcIikgPT0gXCJub25lXCIpIHtcbiAgICAgIG5ld0NvbnRhaW5lckhlaWdodCA9IDA7XG4gICAgfVxuICAgIHRoaXMuY29udGFpbmVySGVpZ2h0ID0gbmV3Q29udGFpbmVySGVpZ2h0O1xuICAgIHRoaXMuJGNvbnRhaW5lci5jc3Moe1xuICAgICAgaGVpZ2h0OiBuZXdDb250YWluZXJIZWlnaHRcbiAgICB9KTtcbiAgICB0aGlzLmVsZW1IZWlnaHQgPSBuZXdDb250YWluZXJIZWlnaHQ7XG5cbiAgICBpZiAoIXRoaXMuaXNTdHVjaykge1xuICAgICAgaWYgKHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3MoJ2lzLWF0LWJvdHRvbScpKSB7XG4gICAgICAgIHZhciBhbmNob3JQdCA9ICh0aGlzLnBvaW50cyA/IHRoaXMucG9pbnRzWzFdIC0gdGhpcy4kY29udGFpbmVyLm9mZnNldCgpLnRvcCA6IHRoaXMuYW5jaG9ySGVpZ2h0KSAtIHRoaXMuZWxlbUhlaWdodDtcbiAgICAgICAgdGhpcy4kZWxlbWVudC5jc3MoJ3RvcCcsIGFuY2hvclB0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9zZXRCcmVha1BvaW50cyhuZXdDb250YWluZXJIZWlnaHQsIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKGNiICYmIHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgeyBjYigpOyB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgdXBwZXIgYW5kIGxvd2VyIGJyZWFrcG9pbnRzIGZvciB0aGUgZWxlbWVudCB0byBiZWNvbWUgc3RpY2t5L3Vuc3RpY2t5LlxuICAgKiBAcGFyYW0ge051bWJlcn0gZWxlbUhlaWdodCAtIHB4IHZhbHVlIGZvciBzdGlja3kuJGVsZW1lbnQgaGVpZ2h0LCBjYWxjdWxhdGVkIGJ5IGBfc2V0U2l6ZXNgLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYiAtIG9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBjb21wbGV0aW9uLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX3NldEJyZWFrUG9pbnRzKGVsZW1IZWlnaHQsIGNiKSB7XG4gICAgaWYgKCF0aGlzLmNhblN0aWNrKSB7XG4gICAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgICAgIGVsc2UgeyByZXR1cm4gZmFsc2U7IH1cbiAgICB9XG4gICAgdmFyIG1Ub3AgPSBlbUNhbGModGhpcy5vcHRpb25zLm1hcmdpblRvcCksXG4gICAgICAgIG1CdG0gPSBlbUNhbGModGhpcy5vcHRpb25zLm1hcmdpbkJvdHRvbSksXG4gICAgICAgIHRvcFBvaW50ID0gdGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1swXSA6IHRoaXMuJGFuY2hvci5vZmZzZXQoKS50b3AsXG4gICAgICAgIGJvdHRvbVBvaW50ID0gdGhpcy5wb2ludHMgPyB0aGlzLnBvaW50c1sxXSA6IHRvcFBvaW50ICsgdGhpcy5hbmNob3JIZWlnaHQsXG4gICAgICAgIC8vIHRvcFBvaW50ID0gdGhpcy4kYW5jaG9yLm9mZnNldCgpLnRvcCB8fCB0aGlzLnBvaW50c1swXSxcbiAgICAgICAgLy8gYm90dG9tUG9pbnQgPSB0b3BQb2ludCArIHRoaXMuYW5jaG9ySGVpZ2h0IHx8IHRoaXMucG9pbnRzWzFdLFxuICAgICAgICB3aW5IZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLnN0aWNrVG8gPT09ICd0b3AnKSB7XG4gICAgICB0b3BQb2ludCAtPSBtVG9wO1xuICAgICAgYm90dG9tUG9pbnQgLT0gKGVsZW1IZWlnaHQgKyBtVG9wKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5zdGlja1RvID09PSAnYm90dG9tJykge1xuICAgICAgdG9wUG9pbnQgLT0gKHdpbkhlaWdodCAtIChlbGVtSGVpZ2h0ICsgbUJ0bSkpO1xuICAgICAgYm90dG9tUG9pbnQgLT0gKHdpbkhlaWdodCAtIG1CdG0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvL3RoaXMgd291bGQgYmUgdGhlIHN0aWNrVG86IGJvdGggb3B0aW9uLi4uIHRyaWNreVxuICAgIH1cblxuICAgIHRoaXMudG9wUG9pbnQgPSB0b3BQb2ludDtcbiAgICB0aGlzLmJvdHRvbVBvaW50ID0gYm90dG9tUG9pbnQ7XG5cbiAgICBpZiAoY2IgJiYgdHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSB7IGNiKCk7IH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgY3VycmVudCBzdGlja3kgZWxlbWVudC5cbiAgICogUmVzZXRzIHRoZSBlbGVtZW50IHRvIHRoZSB0b3AgcG9zaXRpb24gZmlyc3QuXG4gICAqIFJlbW92ZXMgZXZlbnQgbGlzdGVuZXJzLCBKUy1hZGRlZCBjc3MgcHJvcGVydGllcyBhbmQgY2xhc3NlcywgYW5kIHVud3JhcHMgdGhlICRlbGVtZW50IGlmIHRoZSBKUyBhZGRlZCB0aGUgJGNvbnRhaW5lci5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuX3JlbW92ZVN0aWNreSh0cnVlKTtcblxuICAgIHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3MoYCR7dGhpcy5vcHRpb25zLnN0aWNreUNsYXNzfSBpcy1hbmNob3JlZCBpcy1hdC10b3BgKVxuICAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnLFxuICAgICAgICAgICAgICAgICAgIHRvcDogJycsXG4gICAgICAgICAgICAgICAgICAgYm90dG9tOiAnJyxcbiAgICAgICAgICAgICAgICAgICAnbWF4LXdpZHRoJzogJydcbiAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgLm9mZigncmVzaXplbWUuemYudHJpZ2dlcicpO1xuICAgIGlmICh0aGlzLiRhbmNob3IgJiYgdGhpcy4kYW5jaG9yLmxlbmd0aCkge1xuICAgICAgdGhpcy4kYW5jaG9yLm9mZignY2hhbmdlLnpmLnN0aWNreScpO1xuICAgIH1cbiAgICAkKHdpbmRvdykub2ZmKHRoaXMuc2Nyb2xsTGlzdGVuZXIpO1xuXG4gICAgaWYgKHRoaXMud2FzV3JhcHBlZCkge1xuICAgICAgdGhpcy4kZWxlbWVudC51bndyYXAoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kY29udGFpbmVyLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5jb250YWluZXJDbGFzcylcbiAgICAgICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6ICcnXG4gICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICB9XG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblN0aWNreS5kZWZhdWx0cyA9IHtcbiAgLyoqXG4gICAqIEN1c3RvbWl6YWJsZSBjb250YWluZXIgdGVtcGxhdGUuIEFkZCB5b3VyIG93biBjbGFzc2VzIGZvciBzdHlsaW5nIGFuZCBzaXppbmcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJyZsdDtkaXYgZGF0YS1zdGlja3ktY29udGFpbmVyIGNsYXNzPVwic21hbGwtNiBjb2x1bW5zXCImZ3Q7Jmx0Oy9kaXYmZ3Q7J1xuICAgKi9cbiAgY29udGFpbmVyOiAnPGRpdiBkYXRhLXN0aWNreS1jb250YWluZXI+PC9kaXY+JyxcbiAgLyoqXG4gICAqIExvY2F0aW9uIGluIHRoZSB2aWV3IHRoZSBlbGVtZW50IHN0aWNrcyB0by5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9wJ1xuICAgKi9cbiAgc3RpY2tUbzogJ3RvcCcsXG4gIC8qKlxuICAgKiBJZiBhbmNob3JlZCB0byBhIHNpbmdsZSBlbGVtZW50LCB0aGUgaWQgb2YgdGhhdCBlbGVtZW50LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQnXG4gICAqL1xuICBhbmNob3I6ICcnLFxuICAvKipcbiAgICogSWYgdXNpbmcgbW9yZSB0aGFuIG9uZSBlbGVtZW50IGFzIGFuY2hvciBwb2ludHMsIHRoZSBpZCBvZiB0aGUgdG9wIGFuY2hvci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnZXhhbXBsZUlkOnRvcCdcbiAgICovXG4gIHRvcEFuY2hvcjogJycsXG4gIC8qKlxuICAgKiBJZiB1c2luZyBtb3JlIHRoYW4gb25lIGVsZW1lbnQgYXMgYW5jaG9yIHBvaW50cywgdGhlIGlkIG9mIHRoZSBib3R0b20gYW5jaG9yLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdleGFtcGxlSWQ6Ym90dG9tJ1xuICAgKi9cbiAgYnRtQW5jaG9yOiAnJyxcbiAgLyoqXG4gICAqIE1hcmdpbiwgaW4gYGVtYCdzIHRvIGFwcGx5IHRvIHRoZSB0b3Agb2YgdGhlIGVsZW1lbnQgd2hlbiBpdCBiZWNvbWVzIHN0aWNreS5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxXG4gICAqL1xuICBtYXJnaW5Ub3A6IDEsXG4gIC8qKlxuICAgKiBNYXJnaW4sIGluIGBlbWAncyB0byBhcHBseSB0byB0aGUgYm90dG9tIG9mIHRoZSBlbGVtZW50IHdoZW4gaXQgYmVjb21lcyBzdGlja3kuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMVxuICAgKi9cbiAgbWFyZ2luQm90dG9tOiAxLFxuICAvKipcbiAgICogQnJlYWtwb2ludCBzdHJpbmcgdGhhdCBpcyB0aGUgbWluaW11bSBzY3JlZW4gc2l6ZSBhbiBlbGVtZW50IHNob3VsZCBiZWNvbWUgc3RpY2t5LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdtZWRpdW0nXG4gICAqL1xuICBzdGlja3lPbjogJ21lZGl1bScsXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHN0aWNreSBlbGVtZW50LCBhbmQgcmVtb3ZlZCBvbiBkZXN0cnVjdGlvbi4gRm91bmRhdGlvbiBkZWZhdWx0cyB0byBgc3RpY2t5YC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc3RpY2t5J1xuICAgKi9cbiAgc3RpY2t5Q2xhc3M6ICdzdGlja3knLFxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBzdGlja3kgY29udGFpbmVyLiBGb3VuZGF0aW9uIGRlZmF1bHRzIHRvIGBzdGlja3ktY29udGFpbmVyYC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnc3RpY2t5LWNvbnRhaW5lcidcbiAgICovXG4gIGNvbnRhaW5lckNsYXNzOiAnc3RpY2t5LWNvbnRhaW5lcicsXG4gIC8qKlxuICAgKiBOdW1iZXIgb2Ygc2Nyb2xsIGV2ZW50cyBiZXR3ZWVuIHRoZSBwbHVnaW4ncyByZWNhbGN1bGF0aW5nIHN0aWNreSBwb2ludHMuIFNldHRpbmcgaXQgdG8gYDBgIHdpbGwgY2F1c2UgaXQgdG8gcmVjYWxjIGV2ZXJ5IHNjcm9sbCBldmVudCwgc2V0dGluZyBpdCB0byBgLTFgIHdpbGwgcHJldmVudCByZWNhbGMgb24gc2Nyb2xsLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDUwXG4gICAqL1xuICBjaGVja0V2ZXJ5OiAtMVxufTtcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gdG8gY2FsY3VsYXRlIGVtIHZhbHVlc1xuICogQHBhcmFtIE51bWJlciB7ZW19IC0gbnVtYmVyIG9mIGVtJ3MgdG8gY2FsY3VsYXRlIGludG8gcGl4ZWxzXG4gKi9cbmZ1bmN0aW9uIGVtQ2FsYyhlbSkge1xuICByZXR1cm4gcGFyc2VJbnQod2luZG93LmdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQuYm9keSwgbnVsbCkuZm9udFNpemUsIDEwKSAqIGVtO1xufVxuXG4vLyBXaW5kb3cgZXhwb3J0c1xuRm91bmRhdGlvbi5wbHVnaW4oU3RpY2t5LCAnU3RpY2t5Jyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUYWJzIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50YWJzXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmtleWJvYXJkXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRpbWVyQW5kSW1hZ2VMb2FkZXIgaWYgdGFicyBjb250YWluIGltYWdlc1xuICovXG5cbmNsYXNzIFRhYnMge1xuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiB0YWJzLlxuICAgKiBAY2xhc3NcbiAgICogQGZpcmVzIFRhYnMjaW5pdFxuICAgKiBAcGFyYW0ge2pRdWVyeX0gZWxlbWVudCAtIGpRdWVyeSBvYmplY3QgdG8gbWFrZSBpbnRvIHRhYnMuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gT3ZlcnJpZGVzIHRvIHRoZSBkZWZhdWx0IHBsdWdpbiBzZXR0aW5ncy5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLiRlbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCh7fSwgVGFicy5kZWZhdWx0cywgdGhpcy4kZWxlbWVudC5kYXRhKCksIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5faW5pdCgpO1xuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1RhYnMnKTtcbiAgICBGb3VuZGF0aW9uLktleWJvYXJkLnJlZ2lzdGVyKCdUYWJzJywge1xuICAgICAgJ0VOVEVSJzogJ29wZW4nLFxuICAgICAgJ1NQQUNFJzogJ29wZW4nLFxuICAgICAgJ0FSUk9XX1JJR0hUJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX1VQJzogJ3ByZXZpb3VzJyxcbiAgICAgICdBUlJPV19ET1dOJzogJ25leHQnLFxuICAgICAgJ0FSUk9XX0xFRlQnOiAncHJldmlvdXMnXG4gICAgICAvLyAnVEFCJzogJ25leHQnLFxuICAgICAgLy8gJ1NISUZUX1RBQic6ICdwcmV2aW91cydcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgdGFicyBieSBzaG93aW5nIGFuZCBmb2N1c2luZyAoaWYgYXV0b0ZvY3VzPXRydWUpIHRoZSBwcmVzZXQgYWN0aXZlIHRhYi5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9pbml0KCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoeydyb2xlJzogJ3RhYmxpc3QnfSk7XG4gICAgdGhpcy4kdGFiVGl0bGVzID0gdGhpcy4kZWxlbWVudC5maW5kKGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWApO1xuICAgIHRoaXMuJHRhYkNvbnRlbnQgPSAkKGBbZGF0YS10YWJzLWNvbnRlbnQ9XCIke3RoaXMuJGVsZW1lbnRbMF0uaWR9XCJdYCk7XG5cbiAgICB0aGlzLiR0YWJUaXRsZXMuZWFjaChmdW5jdGlvbigpe1xuICAgICAgdmFyICRlbGVtID0gJCh0aGlzKSxcbiAgICAgICAgICAkbGluayA9ICRlbGVtLmZpbmQoJ2EnKSxcbiAgICAgICAgICBpc0FjdGl2ZSA9ICRlbGVtLmhhc0NsYXNzKGAke190aGlzLm9wdGlvbnMubGlua0FjdGl2ZUNsYXNzfWApLFxuICAgICAgICAgIGhhc2ggPSAkbGlua1swXS5oYXNoLnNsaWNlKDEpLFxuICAgICAgICAgIGxpbmtJZCA9ICRsaW5rWzBdLmlkID8gJGxpbmtbMF0uaWQgOiBgJHtoYXNofS1sYWJlbGAsXG4gICAgICAgICAgJHRhYkNvbnRlbnQgPSAkKGAjJHtoYXNofWApO1xuXG4gICAgICAkZWxlbS5hdHRyKHsncm9sZSc6ICdwcmVzZW50YXRpb24nfSk7XG5cbiAgICAgICRsaW5rLmF0dHIoe1xuICAgICAgICAncm9sZSc6ICd0YWInLFxuICAgICAgICAnYXJpYS1jb250cm9scyc6IGhhc2gsXG4gICAgICAgICdhcmlhLXNlbGVjdGVkJzogaXNBY3RpdmUsXG4gICAgICAgICdpZCc6IGxpbmtJZFxuICAgICAgfSk7XG5cbiAgICAgICR0YWJDb250ZW50LmF0dHIoe1xuICAgICAgICAncm9sZSc6ICd0YWJwYW5lbCcsXG4gICAgICAgICdhcmlhLWhpZGRlbic6ICFpc0FjdGl2ZSxcbiAgICAgICAgJ2FyaWEtbGFiZWxsZWRieSc6IGxpbmtJZFxuICAgICAgfSk7XG5cbiAgICAgIGlmKGlzQWN0aXZlICYmIF90aGlzLm9wdGlvbnMuYXV0b0ZvY3VzKXtcbiAgICAgICAgJCh3aW5kb3cpLmxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoeyBzY3JvbGxUb3A6ICRlbGVtLm9mZnNldCgpLnRvcCB9LCBfdGhpcy5vcHRpb25zLmRlZXBMaW5rU211ZGdlRGVsYXksICgpID0+IHtcbiAgICAgICAgICAgICRsaW5rLmZvY3VzKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvL3VzZSBicm93c2VyIHRvIG9wZW4gYSB0YWIsIGlmIGl0IGV4aXN0cyBpbiB0aGlzIHRhYnNldFxuICAgICAgaWYgKF90aGlzLm9wdGlvbnMuZGVlcExpbmspIHtcbiAgICAgICAgdmFyIGFuY2hvciA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICAvL25lZWQgYSBoYXNoIGFuZCBhIHJlbGV2YW50IGFuY2hvciBpbiB0aGlzIHRhYnNldFxuICAgICAgICBpZihhbmNob3IubGVuZ3RoKSB7XG4gICAgICAgICAgdmFyICRsaW5rID0gJGVsZW0uZmluZCgnW2hyZWY9XCInK2FuY2hvcisnXCJdJyk7XG4gICAgICAgICAgaWYgKCRsaW5rLmxlbmd0aCkge1xuICAgICAgICAgICAgX3RoaXMuc2VsZWN0VGFiKCQoYW5jaG9yKSk7XG5cbiAgICAgICAgICAgIC8vcm9sbCB1cCBhIGxpdHRsZSB0byBzaG93IHRoZSB0aXRsZXNcbiAgICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLmRlZXBMaW5rU211ZGdlKSB7XG4gICAgICAgICAgICAgICQod2luZG93KS5sb2FkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBvZmZzZXQgPSAkZWxlbS5vZmZzZXQoKTtcbiAgICAgICAgICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7IHNjcm9sbFRvcDogb2Zmc2V0LnRvcCB9LCBfdGhpcy5vcHRpb25zLmRlZXBMaW5rU211ZGdlRGVsYXkpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICogRmlyZXMgd2hlbiB0aGUgenBsdWdpbiBoYXMgZGVlcGxpbmtlZCBhdCBwYWdlbG9hZFxuICAgICAgICAgICAgICAqIEBldmVudCBUYWJzI2RlZXBsaW5rXG4gICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgJGVsZW0udHJpZ2dlcignZGVlcGxpbmsuemYudGFicycsIFskbGluaywgJChhbmNob3IpXSk7XG4gICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYodGhpcy5vcHRpb25zLm1hdGNoSGVpZ2h0KSB7XG4gICAgICB2YXIgJGltYWdlcyA9IHRoaXMuJHRhYkNvbnRlbnQuZmluZCgnaW1nJyk7XG5cbiAgICAgIGlmICgkaW1hZ2VzLmxlbmd0aCkge1xuICAgICAgICBGb3VuZGF0aW9uLm9uSW1hZ2VzTG9hZGVkKCRpbWFnZXMsIHRoaXMuX3NldEhlaWdodC5iaW5kKHRoaXMpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3NldEhlaWdodCgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIGl0ZW1zIHdpdGhpbiB0aGUgdGFicy5cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9ldmVudHMoKSB7XG4gICAgdGhpcy5fYWRkS2V5SGFuZGxlcigpO1xuICAgIHRoaXMuX2FkZENsaWNrSGFuZGxlcigpO1xuICAgIHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciA9IG51bGw7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLm1hdGNoSGVpZ2h0KSB7XG4gICAgICB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIgPSB0aGlzLl9zZXRIZWlnaHQuYmluZCh0aGlzKTtcblxuICAgICAgJCh3aW5kb3cpLm9uKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGNsaWNrIGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkQ2xpY2tIYW5kbGVyKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub2ZmKCdjbGljay56Zi50YWJzJylcbiAgICAgIC5vbignY2xpY2suemYudGFicycsIGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWAsIGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJCh0aGlzKSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGRzIGtleWJvYXJkIGV2ZW50IGhhbmRsZXJzIGZvciBpdGVtcyB3aXRoaW4gdGhlIHRhYnMuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYWRkS2V5SGFuZGxlcigpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdGhpcy4kdGFiVGl0bGVzLm9mZigna2V5ZG93bi56Zi50YWJzJykub24oJ2tleWRvd24uemYudGFicycsIGZ1bmN0aW9uKGUpe1xuICAgICAgaWYgKGUud2hpY2ggPT09IDkpIHJldHVybjtcblxuXG4gICAgICB2YXIgJGVsZW1lbnQgPSAkKHRoaXMpLFxuICAgICAgICAkZWxlbWVudHMgPSAkZWxlbWVudC5wYXJlbnQoJ3VsJykuY2hpbGRyZW4oJ2xpJyksXG4gICAgICAgICRwcmV2RWxlbWVudCxcbiAgICAgICAgJG5leHRFbGVtZW50O1xuXG4gICAgICAkZWxlbWVudHMuZWFjaChmdW5jdGlvbihpKSB7XG4gICAgICAgIGlmICgkKHRoaXMpLmlzKCRlbGVtZW50KSkge1xuICAgICAgICAgIGlmIChfdGhpcy5vcHRpb25zLndyYXBPbktleXMpIHtcbiAgICAgICAgICAgICRwcmV2RWxlbWVudCA9IGkgPT09IDAgPyAkZWxlbWVudHMubGFzdCgpIDogJGVsZW1lbnRzLmVxKGktMSk7XG4gICAgICAgICAgICAkbmV4dEVsZW1lbnQgPSBpID09PSAkZWxlbWVudHMubGVuZ3RoIC0xID8gJGVsZW1lbnRzLmZpcnN0KCkgOiAkZWxlbWVudHMuZXEoaSsxKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHByZXZFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWF4KDAsIGktMSkpO1xuICAgICAgICAgICAgJG5leHRFbGVtZW50ID0gJGVsZW1lbnRzLmVxKE1hdGgubWluKGkrMSwgJGVsZW1lbnRzLmxlbmd0aC0xKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIGhhbmRsZSBrZXlib2FyZCBldmVudCB3aXRoIGtleWJvYXJkIHV0aWxcbiAgICAgIEZvdW5kYXRpb24uS2V5Ym9hcmQuaGFuZGxlS2V5KGUsICdUYWJzJywge1xuICAgICAgICBvcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkZWxlbWVudC5maW5kKCdbcm9sZT1cInRhYlwiXScpLmZvY3VzKCk7XG4gICAgICAgICAgX3RoaXMuX2hhbmRsZVRhYkNoYW5nZSgkZWxlbWVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIHByZXZpb3VzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAkcHJldkVsZW1lbnQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKS5mb2N1cygpO1xuICAgICAgICAgIF90aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJHByZXZFbGVtZW50KTtcbiAgICAgICAgfSxcbiAgICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgJG5leHRFbGVtZW50LmZpbmQoJ1tyb2xlPVwidGFiXCJdJykuZm9jdXMoKTtcbiAgICAgICAgICBfdGhpcy5faGFuZGxlVGFiQ2hhbmdlKCRuZXh0RWxlbWVudCk7XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgdGFiIGAkdGFyZ2V0Q29udGVudGAgZGVmaW5lZCBieSBgJHRhcmdldGAuIENvbGxhcHNlcyBhY3RpdmUgdGFiLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFRhYiB0byBvcGVuLlxuICAgKiBAZmlyZXMgVGFicyNjaGFuZ2VcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBfaGFuZGxlVGFiQ2hhbmdlKCR0YXJnZXQpIHtcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGZvciBhY3RpdmUgY2xhc3Mgb24gdGFyZ2V0LiBDb2xsYXBzZSBpZiBleGlzdHMuXG4gICAgICovXG4gICAgaWYgKCR0YXJnZXQuaGFzQ2xhc3MoYCR7dGhpcy5vcHRpb25zLmxpbmtBY3RpdmVDbGFzc31gKSkge1xuICAgICAgICBpZih0aGlzLm9wdGlvbnMuYWN0aXZlQ29sbGFwc2UpIHtcbiAgICAgICAgICAgIHRoaXMuX2NvbGxhcHNlVGFiKCR0YXJnZXQpO1xuXG4gICAgICAgICAgIC8qKlxuICAgICAgICAgICAgKiBGaXJlcyB3aGVuIHRoZSB6cGx1Z2luIGhhcyBzdWNjZXNzZnVsbHkgY29sbGFwc2VkIHRhYnMuXG4gICAgICAgICAgICAqIEBldmVudCBUYWJzI2NvbGxhcHNlXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjb2xsYXBzZS56Zi50YWJzJywgWyR0YXJnZXRdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyICRvbGRUYWIgPSB0aGlzLiRlbGVtZW50LlxuICAgICAgICAgIGZpbmQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9LiR7dGhpcy5vcHRpb25zLmxpbmtBY3RpdmVDbGFzc31gKSxcbiAgICAgICAgICAkdGFiTGluayA9ICR0YXJnZXQuZmluZCgnW3JvbGU9XCJ0YWJcIl0nKSxcbiAgICAgICAgICBoYXNoID0gJHRhYkxpbmtbMF0uaGFzaCxcbiAgICAgICAgICAkdGFyZ2V0Q29udGVudCA9IHRoaXMuJHRhYkNvbnRlbnQuZmluZChoYXNoKTtcblxuICAgIC8vY2xvc2Ugb2xkIHRhYlxuICAgIHRoaXMuX2NvbGxhcHNlVGFiKCRvbGRUYWIpO1xuXG4gICAgLy9vcGVuIG5ldyB0YWJcbiAgICB0aGlzLl9vcGVuVGFiKCR0YXJnZXQpO1xuXG4gICAgLy9laXRoZXIgcmVwbGFjZSBvciB1cGRhdGUgYnJvd3NlciBoaXN0b3J5XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWVwTGluaykge1xuICAgICAgdmFyIGFuY2hvciA9ICR0YXJnZXQuZmluZCgnYScpLmF0dHIoJ2hyZWYnKTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy51cGRhdGVIaXN0b3J5KSB7XG4gICAgICAgIGhpc3RvcnkucHVzaFN0YXRlKHt9LCAnJywgYW5jaG9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhpc3RvcnkucmVwbGFjZVN0YXRlKHt9LCAnJywgYW5jaG9yKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGaXJlcyB3aGVuIHRoZSBwbHVnaW4gaGFzIHN1Y2Nlc3NmdWxseSBjaGFuZ2VkIHRhYnMuXG4gICAgICogQGV2ZW50IFRhYnMjY2hhbmdlXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjaGFuZ2UuemYudGFicycsIFskdGFyZ2V0LCAkdGFyZ2V0Q29udGVudF0pO1xuXG4gICAgLy9maXJlIHRvIGNoaWxkcmVuIGEgbXV0YXRpb24gZXZlbnRcbiAgICAkdGFyZ2V0Q29udGVudC5maW5kKFwiW2RhdGEtbXV0YXRlXVwiKS50cmlnZ2VyKFwibXV0YXRlbWUuemYudHJpZ2dlclwiKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBPcGVucyB0aGUgdGFiIGAkdGFyZ2V0Q29udGVudGAgZGVmaW5lZCBieSBgJHRhcmdldGAuXG4gICAqIEBwYXJhbSB7alF1ZXJ5fSAkdGFyZ2V0IC0gVGFiIHRvIE9wZW4uXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgX29wZW5UYWIoJHRhcmdldCkge1xuICAgICAgdmFyICR0YWJMaW5rID0gJHRhcmdldC5maW5kKCdbcm9sZT1cInRhYlwiXScpLFxuICAgICAgICAgIGhhc2ggPSAkdGFiTGlua1swXS5oYXNoLFxuICAgICAgICAgICR0YXJnZXRDb250ZW50ID0gdGhpcy4kdGFiQ29udGVudC5maW5kKGhhc2gpO1xuXG4gICAgICAkdGFyZ2V0LmFkZENsYXNzKGAke3RoaXMub3B0aW9ucy5saW5rQWN0aXZlQ2xhc3N9YCk7XG5cbiAgICAgICR0YWJMaW5rLmF0dHIoeydhcmlhLXNlbGVjdGVkJzogJ3RydWUnfSk7XG5cbiAgICAgICR0YXJnZXRDb250ZW50XG4gICAgICAgIC5hZGRDbGFzcyhgJHt0aGlzLm9wdGlvbnMucGFuZWxBY3RpdmVDbGFzc31gKVxuICAgICAgICAuYXR0cih7J2FyaWEtaGlkZGVuJzogJ2ZhbHNlJ30pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxhcHNlcyBgJHRhcmdldENvbnRlbnRgIGRlZmluZWQgYnkgYCR0YXJnZXRgLlxuICAgKiBAcGFyYW0ge2pRdWVyeX0gJHRhcmdldCAtIFRhYiB0byBPcGVuLlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIF9jb2xsYXBzZVRhYigkdGFyZ2V0KSB7XG4gICAgdmFyICR0YXJnZXRfYW5jaG9yID0gJHRhcmdldFxuICAgICAgLnJlbW92ZUNsYXNzKGAke3RoaXMub3B0aW9ucy5saW5rQWN0aXZlQ2xhc3N9YClcbiAgICAgIC5maW5kKCdbcm9sZT1cInRhYlwiXScpXG4gICAgICAuYXR0cih7ICdhcmlhLXNlbGVjdGVkJzogJ2ZhbHNlJyB9KTtcblxuICAgICQoYCMkeyR0YXJnZXRfYW5jaG9yLmF0dHIoJ2FyaWEtY29udHJvbHMnKX1gKVxuICAgICAgLnJlbW92ZUNsYXNzKGAke3RoaXMub3B0aW9ucy5wYW5lbEFjdGl2ZUNsYXNzfWApXG4gICAgICAuYXR0cih7ICdhcmlhLWhpZGRlbic6ICd0cnVlJyB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWMgbWV0aG9kIGZvciBzZWxlY3RpbmcgYSBjb250ZW50IHBhbmUgdG8gZGlzcGxheS5cbiAgICogQHBhcmFtIHtqUXVlcnkgfCBTdHJpbmd9IGVsZW0gLSBqUXVlcnkgb2JqZWN0IG9yIHN0cmluZyBvZiB0aGUgaWQgb2YgdGhlIHBhbmUgdG8gZGlzcGxheS5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBzZWxlY3RUYWIoZWxlbSkge1xuICAgIHZhciBpZFN0cjtcblxuICAgIGlmICh0eXBlb2YgZWxlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGlkU3RyID0gZWxlbVswXS5pZDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWRTdHIgPSBlbGVtO1xuICAgIH1cblxuICAgIGlmIChpZFN0ci5pbmRleE9mKCcjJykgPCAwKSB7XG4gICAgICBpZFN0ciA9IGAjJHtpZFN0cn1gO1xuICAgIH1cblxuICAgIHZhciAkdGFyZ2V0ID0gdGhpcy4kdGFiVGl0bGVzLmZpbmQoYFtocmVmPVwiJHtpZFN0cn1cIl1gKS5wYXJlbnQoYC4ke3RoaXMub3B0aW9ucy5saW5rQ2xhc3N9YCk7XG5cbiAgICB0aGlzLl9oYW5kbGVUYWJDaGFuZ2UoJHRhcmdldCk7XG4gIH07XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBoZWlnaHQgb2YgZWFjaCBwYW5lbCB0byB0aGUgaGVpZ2h0IG9mIHRoZSB0YWxsZXN0IHBhbmVsLlxuICAgKiBJZiBlbmFibGVkIGluIG9wdGlvbnMsIGdldHMgY2FsbGVkIG9uIG1lZGlhIHF1ZXJ5IGNoYW5nZS5cbiAgICogSWYgbG9hZGluZyBjb250ZW50IHZpYSBleHRlcm5hbCBzb3VyY2UsIGNhbiBiZSBjYWxsZWQgZGlyZWN0bHkgb3Igd2l0aCBfcmVmbG93LlxuICAgKiBAZnVuY3Rpb25cbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9zZXRIZWlnaHQoKSB7XG4gICAgdmFyIG1heCA9IDA7XG4gICAgdGhpcy4kdGFiQ29udGVudFxuICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5wYW5lbENsYXNzfWApXG4gICAgICAuY3NzKCdoZWlnaHQnLCAnJylcbiAgICAgIC5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcGFuZWwgPSAkKHRoaXMpLFxuICAgICAgICAgICAgaXNBY3RpdmUgPSBwYW5lbC5oYXNDbGFzcyhgJHt0aGlzLm9wdGlvbnMucGFuZWxBY3RpdmVDbGFzc31gKTtcblxuICAgICAgICBpZiAoIWlzQWN0aXZlKSB7XG4gICAgICAgICAgcGFuZWwuY3NzKHsndmlzaWJpbGl0eSc6ICdoaWRkZW4nLCAnZGlzcGxheSc6ICdibG9jayd9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0ZW1wID0gdGhpcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG5cbiAgICAgICAgaWYgKCFpc0FjdGl2ZSkge1xuICAgICAgICAgIHBhbmVsLmNzcyh7XG4gICAgICAgICAgICAndmlzaWJpbGl0eSc6ICcnLFxuICAgICAgICAgICAgJ2Rpc3BsYXknOiAnJ1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgbWF4ID0gdGVtcCA+IG1heCA/IHRlbXAgOiBtYXg7XG4gICAgICB9KVxuICAgICAgLmNzcygnaGVpZ2h0JywgYCR7bWF4fXB4YCk7XG4gIH1cblxuICAvKipcbiAgICogRGVzdHJveXMgYW4gaW5zdGFuY2Ugb2YgYW4gdGFicy5cbiAgICogQGZpcmVzIFRhYnMjZGVzdHJveWVkXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnRcbiAgICAgIC5maW5kKGAuJHt0aGlzLm9wdGlvbnMubGlua0NsYXNzfWApXG4gICAgICAub2ZmKCcuemYudGFicycpLmhpZGUoKS5lbmQoKVxuICAgICAgLmZpbmQoYC4ke3RoaXMub3B0aW9ucy5wYW5lbENsYXNzfWApXG4gICAgICAuaGlkZSgpO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5tYXRjaEhlaWdodCkge1xuICAgICAgaWYgKHRoaXMuX3NldEhlaWdodE1xSGFuZGxlciAhPSBudWxsKSB7XG4gICAgICAgICAkKHdpbmRvdykub2ZmKCdjaGFuZ2VkLnpmLm1lZGlhcXVlcnknLCB0aGlzLl9zZXRIZWlnaHRNcUhhbmRsZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5UYWJzLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogQWxsb3dzIHRoZSB3aW5kb3cgdG8gc2Nyb2xsIHRvIGNvbnRlbnQgb2YgcGFuZSBzcGVjaWZpZWQgYnkgaGFzaCBhbmNob3JcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSBmYWxzZVxuICAgKi9cbiAgZGVlcExpbms6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBZGp1c3QgdGhlIGRlZXAgbGluayBzY3JvbGwgdG8gbWFrZSBzdXJlIHRoZSB0b3Agb2YgdGhlIHRhYiBwYW5lbCBpcyB2aXNpYmxlXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRlZXBMaW5rU211ZGdlOiBmYWxzZSxcblxuICAvKipcbiAgICogQW5pbWF0aW9uIHRpbWUgKG1zKSBmb3IgdGhlIGRlZXAgbGluayBhZGp1c3RtZW50XG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMzAwXG4gICAqL1xuICBkZWVwTGlua1NtdWRnZURlbGF5OiAzMDAsXG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgYnJvd3NlciBoaXN0b3J5IHdpdGggdGhlIG9wZW4gdGFiXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIHVwZGF0ZUhpc3Rvcnk6IGZhbHNlLFxuXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHdpbmRvdyB0byBzY3JvbGwgdG8gY29udGVudCBvZiBhY3RpdmUgcGFuZSBvbiBsb2FkIGlmIHNldCB0byB0cnVlLlxuICAgKiBOb3QgcmVjb21tZW5kZWQgaWYgbW9yZSB0aGFuIG9uZSB0YWIgcGFuZWwgcGVyIHBhZ2UuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGF1dG9Gb2N1czogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFsbG93cyBrZXlib2FyZCBpbnB1dCB0byAnd3JhcCcgYXJvdW5kIHRoZSB0YWIgbGlua3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgdHJ1ZVxuICAgKi9cbiAgd3JhcE9uS2V5czogdHJ1ZSxcblxuICAvKipcbiAgICogQWxsb3dzIHRoZSB0YWIgY29udGVudCBwYW5lcyB0byBtYXRjaCBoZWlnaHRzIGlmIHNldCB0byB0cnVlLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBtYXRjaEhlaWdodDogZmFsc2UsXG5cbiAgLyoqXG4gICAqIEFsbG93cyBhY3RpdmUgdGFicyB0byBjb2xsYXBzZSB3aGVuIGNsaWNrZWQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGFjdGl2ZUNvbGxhcHNlOiBmYWxzZSxcblxuICAvKipcbiAgICogQ2xhc3MgYXBwbGllZCB0byBgbGlgJ3MgaW4gdGFiIGxpbmsgbGlzdC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndGFicy10aXRsZSdcbiAgICovXG4gIGxpbmtDbGFzczogJ3RhYnMtdGl0bGUnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBhY3RpdmUgYGxpYCBpbiB0YWIgbGluayBsaXN0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdpcy1hY3RpdmUnXG4gICAqL1xuICBsaW5rQWN0aXZlQ2xhc3M6ICdpcy1hY3RpdmUnLFxuXG4gIC8qKlxuICAgKiBDbGFzcyBhcHBsaWVkIHRvIHRoZSBjb250ZW50IGNvbnRhaW5lcnMuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3RhYnMtcGFuZWwnXG4gICAqL1xuICBwYW5lbENsYXNzOiAndGFicy1wYW5lbCcsXG5cbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIGFjdGl2ZSBjb250ZW50IGNvbnRhaW5lci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAnaXMtYWN0aXZlJ1xuICAgKi9cbiAgcGFuZWxBY3RpdmVDbGFzczogJ2lzLWFjdGl2ZSdcbn07XG5cbi8vIFdpbmRvdyBleHBvcnRzXG5Gb3VuZGF0aW9uLnBsdWdpbihUYWJzLCAnVGFicycpO1xuXG59KGpRdWVyeSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbiFmdW5jdGlvbigkKSB7XG5cbi8qKlxuICogVG9nZ2xlciBtb2R1bGUuXG4gKiBAbW9kdWxlIGZvdW5kYXRpb24udG9nZ2xlclxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tb3Rpb25cbiAqIEByZXF1aXJlcyBmb3VuZGF0aW9uLnV0aWwudHJpZ2dlcnNcbiAqL1xuXG5jbGFzcyBUb2dnbGVyIHtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgVG9nZ2xlci5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBUb2dnbGVyI2luaXRcbiAgICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGFkZCB0aGUgdHJpZ2dlciB0by5cbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBPdmVycmlkZXMgdG8gdGhlIGRlZmF1bHQgcGx1Z2luIHNldHRpbmdzLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBUb2dnbGVyLmRlZmF1bHRzLCBlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG4gICAgdGhpcy5jbGFzc05hbWUgPSAnJztcblxuICAgIHRoaXMuX2luaXQoKTtcbiAgICB0aGlzLl9ldmVudHMoKTtcblxuICAgIEZvdW5kYXRpb24ucmVnaXN0ZXJQbHVnaW4odGhpcywgJ1RvZ2dsZXInKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgVG9nZ2xlciBwbHVnaW4gYnkgcGFyc2luZyB0aGUgdG9nZ2xlIGNsYXNzIGZyb20gZGF0YS10b2dnbGVyLCBvciBhbmltYXRpb24gY2xhc3NlcyBmcm9tIGRhdGEtYW5pbWF0ZS5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgaW5wdXQ7XG4gICAgLy8gUGFyc2UgYW5pbWF0aW9uIGNsYXNzZXMgaWYgdGhleSB3ZXJlIHNldFxuICAgIGlmICh0aGlzLm9wdGlvbnMuYW5pbWF0ZSkge1xuICAgICAgaW5wdXQgPSB0aGlzLm9wdGlvbnMuYW5pbWF0ZS5zcGxpdCgnICcpO1xuXG4gICAgICB0aGlzLmFuaW1hdGlvbkluID0gaW5wdXRbMF07XG4gICAgICB0aGlzLmFuaW1hdGlvbk91dCA9IGlucHV0WzFdIHx8IG51bGw7XG4gICAgfVxuICAgIC8vIE90aGVyd2lzZSwgcGFyc2UgdG9nZ2xlIGNsYXNzXG4gICAgZWxzZSB7XG4gICAgICBpbnB1dCA9IHRoaXMuJGVsZW1lbnQuZGF0YSgndG9nZ2xlcicpO1xuICAgICAgLy8gQWxsb3cgZm9yIGEgLiBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSBzdHJpbmdcbiAgICAgIHRoaXMuY2xhc3NOYW1lID0gaW5wdXRbMF0gPT09ICcuJyA/IGlucHV0LnNsaWNlKDEpIDogaW5wdXQ7XG4gICAgfVxuXG4gICAgLy8gQWRkIEFSSUEgYXR0cmlidXRlcyB0byB0cmlnZ2Vyc1xuICAgIHZhciBpZCA9IHRoaXMuJGVsZW1lbnRbMF0uaWQ7XG4gICAgJChgW2RhdGEtb3Blbj1cIiR7aWR9XCJdLCBbZGF0YS1jbG9zZT1cIiR7aWR9XCJdLCBbZGF0YS10b2dnbGU9XCIke2lkfVwiXWApXG4gICAgICAuYXR0cignYXJpYS1jb250cm9scycsIGlkKTtcbiAgICAvLyBJZiB0aGUgdGFyZ2V0IGlzIGhpZGRlbiwgYWRkIGFyaWEtaGlkZGVuXG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWV4cGFuZGVkJywgdGhpcy4kZWxlbWVudC5pcygnOmhpZGRlbicpID8gZmFsc2UgOiB0cnVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBldmVudHMgZm9yIHRoZSB0b2dnbGUgdHJpZ2dlci5cbiAgICogQGZ1bmN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfZXZlbnRzKCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCd0b2dnbGUuemYudHJpZ2dlcicpLm9uKCd0b2dnbGUuemYudHJpZ2dlcicsIHRoaXMudG9nZ2xlLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvZ2dsZXMgdGhlIHRhcmdldCBjbGFzcyBvbiB0aGUgdGFyZ2V0IGVsZW1lbnQuIEFuIGV2ZW50IGlzIGZpcmVkIGZyb20gdGhlIG9yaWdpbmFsIHRyaWdnZXIgZGVwZW5kaW5nIG9uIGlmIHRoZSByZXN1bHRhbnQgc3RhdGUgd2FzIFwib25cIiBvciBcIm9mZlwiLlxuICAgKiBAZnVuY3Rpb25cbiAgICogQGZpcmVzIFRvZ2dsZXIjb25cbiAgICogQGZpcmVzIFRvZ2dsZXIjb2ZmXG4gICAqL1xuICB0b2dnbGUoKSB7XG4gICAgdGhpc1sgdGhpcy5vcHRpb25zLmFuaW1hdGUgPyAnX3RvZ2dsZUFuaW1hdGUnIDogJ190b2dnbGVDbGFzcyddKCk7XG4gIH1cblxuICBfdG9nZ2xlQ2xhc3MoKSB7XG4gICAgdGhpcy4kZWxlbWVudC50b2dnbGVDbGFzcyh0aGlzLmNsYXNzTmFtZSk7XG5cbiAgICB2YXIgaXNPbiA9IHRoaXMuJGVsZW1lbnQuaGFzQ2xhc3ModGhpcy5jbGFzc05hbWUpO1xuICAgIGlmIChpc09uKSB7XG4gICAgICAvKipcbiAgICAgICAqIEZpcmVzIGlmIHRoZSB0YXJnZXQgZWxlbWVudCBoYXMgdGhlIGNsYXNzIGFmdGVyIGEgdG9nZ2xlLlxuICAgICAgICogQGV2ZW50IFRvZ2dsZXIjb25cbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdvbi56Zi50b2dnbGVyJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLyoqXG4gICAgICAgKiBGaXJlcyBpZiB0aGUgdGFyZ2V0IGVsZW1lbnQgZG9lcyBub3QgaGF2ZSB0aGUgY2xhc3MgYWZ0ZXIgYSB0b2dnbGUuXG4gICAgICAgKiBAZXZlbnQgVG9nZ2xlciNvZmZcbiAgICAgICAqL1xuICAgICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdvZmYuemYudG9nZ2xlcicpO1xuICAgIH1cblxuICAgIHRoaXMuX3VwZGF0ZUFSSUEoaXNPbik7XG4gICAgdGhpcy4kZWxlbWVudC5maW5kKCdbZGF0YS1tdXRhdGVdJykudHJpZ2dlcignbXV0YXRlbWUuemYudHJpZ2dlcicpO1xuICB9XG5cbiAgX3RvZ2dsZUFuaW1hdGUoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGlmICh0aGlzLiRlbGVtZW50LmlzKCc6aGlkZGVuJykpIHtcbiAgICAgIEZvdW5kYXRpb24uTW90aW9uLmFuaW1hdGVJbih0aGlzLiRlbGVtZW50LCB0aGlzLmFuaW1hdGlvbkluLCBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuX3VwZGF0ZUFSSUEodHJ1ZSk7XG4gICAgICAgIHRoaXMudHJpZ2dlcignb24uemYudG9nZ2xlcicpO1xuICAgICAgICB0aGlzLmZpbmQoJ1tkYXRhLW11dGF0ZV0nKS50cmlnZ2VyKCdtdXRhdGVtZS56Zi50cmlnZ2VyJyk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBGb3VuZGF0aW9uLk1vdGlvbi5hbmltYXRlT3V0KHRoaXMuJGVsZW1lbnQsIHRoaXMuYW5pbWF0aW9uT3V0LCBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuX3VwZGF0ZUFSSUEoZmFsc2UpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ29mZi56Zi50b2dnbGVyJyk7XG4gICAgICAgIHRoaXMuZmluZCgnW2RhdGEtbXV0YXRlXScpLnRyaWdnZXIoJ211dGF0ZW1lLnpmLnRyaWdnZXInKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIF91cGRhdGVBUklBKGlzT24pIHtcbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoJ2FyaWEtZXhwYW5kZWQnLCBpc09uID8gdHJ1ZSA6IGZhbHNlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXN0cm95cyB0aGUgaW5zdGFuY2Ugb2YgVG9nZ2xlciBvbiB0aGUgZWxlbWVudC5cbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBkZXN0cm95KCkge1xuICAgIHRoaXMuJGVsZW1lbnQub2ZmKCcuemYudG9nZ2xlcicpO1xuICAgIEZvdW5kYXRpb24udW5yZWdpc3RlclBsdWdpbih0aGlzKTtcbiAgfVxufVxuXG5Ub2dnbGVyLmRlZmF1bHRzID0ge1xuICAvKipcbiAgICogVGVsbHMgdGhlIHBsdWdpbiBpZiB0aGUgZWxlbWVudCBzaG91bGQgYW5pbWF0ZWQgd2hlbiB0b2dnbGVkLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIGZhbHNlXG4gICAqL1xuICBhbmltYXRlOiBmYWxzZVxufTtcblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRvZ2dsZXIsICdUb2dnbGVyJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuIWZ1bmN0aW9uKCQpIHtcblxuLyoqXG4gKiBUb29sdGlwIG1vZHVsZS5cbiAqIEBtb2R1bGUgZm91bmRhdGlvbi50b29sdGlwXG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLmJveFxuICogQHJlcXVpcmVzIGZvdW5kYXRpb24udXRpbC5tZWRpYVF1ZXJ5XG4gKiBAcmVxdWlyZXMgZm91bmRhdGlvbi51dGlsLnRyaWdnZXJzXG4gKi9cblxuY2xhc3MgVG9vbHRpcCB7XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IGluc3RhbmNlIG9mIGEgVG9vbHRpcC5cbiAgICogQGNsYXNzXG4gICAqIEBmaXJlcyBUb29sdGlwI2luaXRcbiAgICogQHBhcmFtIHtqUXVlcnl9IGVsZW1lbnQgLSBqUXVlcnkgb2JqZWN0IHRvIGF0dGFjaCBhIHRvb2x0aXAgdG8uXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gb2JqZWN0IHRvIGV4dGVuZCB0aGUgZGVmYXVsdCBjb25maWd1cmF0aW9uLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZWxlbWVudCwgb3B0aW9ucykge1xuICAgIHRoaXMuJGVsZW1lbnQgPSBlbGVtZW50O1xuICAgIHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKHt9LCBUb29sdGlwLmRlZmF1bHRzLCB0aGlzLiRlbGVtZW50LmRhdGEoKSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG4gICAgdGhpcy5pc0NsaWNrID0gZmFsc2U7XG4gICAgdGhpcy5faW5pdCgpO1xuXG4gICAgRm91bmRhdGlvbi5yZWdpc3RlclBsdWdpbih0aGlzLCAnVG9vbHRpcCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSB0b29sdGlwIGJ5IHNldHRpbmcgdGhlIGNyZWF0aW5nIHRoZSB0aXAgZWxlbWVudCwgYWRkaW5nIGl0J3MgdGV4dCwgc2V0dGluZyBwcml2YXRlIHZhcmlhYmxlcyBhbmQgc2V0dGluZyBhdHRyaWJ1dGVzIG9uIHRoZSBhbmNob3IuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfaW5pdCgpIHtcbiAgICB2YXIgZWxlbUlkID0gdGhpcy4kZWxlbWVudC5hdHRyKCdhcmlhLWRlc2NyaWJlZGJ5JykgfHwgRm91bmRhdGlvbi5HZXRZb0RpZ2l0cyg2LCAndG9vbHRpcCcpO1xuXG4gICAgdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MgPSB0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzcyB8fCB0aGlzLl9nZXRQb3NpdGlvbkNsYXNzKHRoaXMuJGVsZW1lbnQpO1xuICAgIHRoaXMub3B0aW9ucy50aXBUZXh0ID0gdGhpcy5vcHRpb25zLnRpcFRleHQgfHwgdGhpcy4kZWxlbWVudC5hdHRyKCd0aXRsZScpO1xuICAgIHRoaXMudGVtcGxhdGUgPSB0aGlzLm9wdGlvbnMudGVtcGxhdGUgPyAkKHRoaXMub3B0aW9ucy50ZW1wbGF0ZSkgOiB0aGlzLl9idWlsZFRlbXBsYXRlKGVsZW1JZCk7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmFsbG93SHRtbCkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuICAgICAgICAuaHRtbCh0aGlzLm9wdGlvbnMudGlwVGV4dClcbiAgICAgICAgLmhpZGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5hcHBlbmRUbyhkb2N1bWVudC5ib2R5KVxuICAgICAgICAudGV4dCh0aGlzLm9wdGlvbnMudGlwVGV4dClcbiAgICAgICAgLmhpZGUoKTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbGVtZW50LmF0dHIoe1xuICAgICAgJ3RpdGxlJzogJycsXG4gICAgICAnYXJpYS1kZXNjcmliZWRieSc6IGVsZW1JZCxcbiAgICAgICdkYXRhLXlldGktYm94JzogZWxlbUlkLFxuICAgICAgJ2RhdGEtdG9nZ2xlJzogZWxlbUlkLFxuICAgICAgJ2RhdGEtcmVzaXplJzogZWxlbUlkXG4gICAgfSkuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnRyaWdnZXJDbGFzcyk7XG5cbiAgICAvL2hlbHBlciB2YXJpYWJsZXMgdG8gdHJhY2sgbW92ZW1lbnQgb24gY29sbGlzaW9uc1xuICAgIHRoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgIHRoaXMuY291bnRlciA9IDQ7XG4gICAgdGhpcy5jbGFzc0NoYW5nZWQgPSBmYWxzZTtcblxuICAgIHRoaXMuX2V2ZW50cygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdyYWJzIHRoZSBjdXJyZW50IHBvc2l0aW9uaW5nIGNsYXNzLCBpZiBwcmVzZW50LCBhbmQgcmV0dXJucyB0aGUgdmFsdWUgb3IgYW4gZW1wdHkgc3RyaW5nLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2dldFBvc2l0aW9uQ2xhc3MoZWxlbWVudCkge1xuICAgIGlmICghZWxlbWVudCkgeyByZXR1cm4gJyc7IH1cbiAgICAvLyB2YXIgcG9zaXRpb24gPSBlbGVtZW50LmF0dHIoJ2NsYXNzJykubWF0Y2goL3RvcHxsZWZ0fHJpZ2h0L2cpO1xuICAgIHZhciBwb3NpdGlvbiA9IGVsZW1lbnRbMF0uY2xhc3NOYW1lLm1hdGNoKC9cXGIodG9wfGxlZnR8cmlnaHQpXFxiL2cpO1xuICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uID8gcG9zaXRpb25bMF0gOiAnJztcbiAgICByZXR1cm4gcG9zaXRpb247XG4gIH07XG4gIC8qKlxuICAgKiBidWlsZHMgdGhlIHRvb2x0aXAgZWxlbWVudCwgYWRkcyBhdHRyaWJ1dGVzLCBhbmQgcmV0dXJucyB0aGUgdGVtcGxhdGUuXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfYnVpbGRUZW1wbGF0ZShpZCkge1xuICAgIHZhciB0ZW1wbGF0ZUNsYXNzZXMgPSAoYCR7dGhpcy5vcHRpb25zLnRvb2x0aXBDbGFzc30gJHt0aGlzLm9wdGlvbnMucG9zaXRpb25DbGFzc30gJHt0aGlzLm9wdGlvbnMudGVtcGxhdGVDbGFzc2VzfWApLnRyaW0oKTtcbiAgICB2YXIgJHRlbXBsYXRlID0gICQoJzxkaXY+PC9kaXY+JykuYWRkQ2xhc3ModGVtcGxhdGVDbGFzc2VzKS5hdHRyKHtcbiAgICAgICdyb2xlJzogJ3Rvb2x0aXAnLFxuICAgICAgJ2FyaWEtaGlkZGVuJzogdHJ1ZSxcbiAgICAgICdkYXRhLWlzLWFjdGl2ZSc6IGZhbHNlLFxuICAgICAgJ2RhdGEtaXMtZm9jdXMnOiBmYWxzZSxcbiAgICAgICdpZCc6IGlkXG4gICAgfSk7XG4gICAgcmV0dXJuICR0ZW1wbGF0ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGlmIGEgY29sbGlzaW9uIGV2ZW50IGlzIGRldGVjdGVkLlxuICAgKiBAcGFyYW0ge1N0cmluZ30gcG9zaXRpb24gLSBwb3NpdGlvbmluZyBjbGFzcyB0byB0cnlcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9yZXBvc2l0aW9uKHBvc2l0aW9uKSB7XG4gICAgdGhpcy51c2VkUG9zaXRpb25zLnB1c2gocG9zaXRpb24gPyBwb3NpdGlvbiA6ICdib3R0b20nKTtcblxuICAgIC8vZGVmYXVsdCwgdHJ5IHN3aXRjaGluZyB0byBvcHBvc2l0ZSBzaWRlXG4gICAgaWYgKCFwb3NpdGlvbiAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ3RvcCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUuYWRkQ2xhc3MoJ3RvcCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ2xlZnQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigncmlnaHQnKSA8IDApKSB7XG4gICAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZUNsYXNzKHBvc2l0aW9uKVxuICAgICAgICAgIC5hZGRDbGFzcygncmlnaHQnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAncmlnaHQnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignbGVmdCcpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pXG4gICAgICAgICAgLmFkZENsYXNzKCdsZWZ0Jyk7XG4gICAgfVxuXG4gICAgLy9pZiBkZWZhdWx0IGNoYW5nZSBkaWRuJ3Qgd29yaywgdHJ5IGJvdHRvbSBvciBsZWZ0IGZpcnN0XG4gICAgZWxzZSBpZiAoIXBvc2l0aW9uICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZigndG9wJykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5hZGRDbGFzcygnbGVmdCcpO1xuICAgIH0gZWxzZSBpZiAocG9zaXRpb24gPT09ICd0b3AnICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPiAtMSkgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdsZWZ0JykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbilcbiAgICAgICAgICAuYWRkQ2xhc3MoJ2xlZnQnKTtcbiAgICB9IGVsc2UgaWYgKHBvc2l0aW9uID09PSAnbGVmdCcgJiYgKHRoaXMudXNlZFBvc2l0aW9ucy5pbmRleE9mKCdyaWdodCcpID4gLTEpICYmICh0aGlzLnVzZWRQb3NpdGlvbnMuaW5kZXhPZignYm90dG9tJykgPCAwKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfSBlbHNlIGlmIChwb3NpdGlvbiA9PT0gJ3JpZ2h0JyAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2xlZnQnKSA+IC0xKSAmJiAodGhpcy51c2VkUG9zaXRpb25zLmluZGV4T2YoJ2JvdHRvbScpIDwgMCkpIHtcbiAgICAgIHRoaXMudGVtcGxhdGUucmVtb3ZlQ2xhc3MocG9zaXRpb24pO1xuICAgIH1cbiAgICAvL2lmIG5vdGhpbmcgY2xlYXJlZCwgc2V0IHRvIGJvdHRvbVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5yZW1vdmVDbGFzcyhwb3NpdGlvbik7XG4gICAgfVxuICAgIHRoaXMuY2xhc3NDaGFuZ2VkID0gdHJ1ZTtcbiAgICB0aGlzLmNvdW50ZXItLTtcbiAgfVxuXG4gIC8qKlxuICAgKiBzZXRzIHRoZSBwb3NpdGlvbiBjbGFzcyBvZiBhbiBlbGVtZW50IGFuZCByZWN1cnNpdmVseSBjYWxscyBpdHNlbGYgdW50aWwgdGhlcmUgYXJlIG5vIG1vcmUgcG9zc2libGUgcG9zaXRpb25zIHRvIGF0dGVtcHQsIG9yIHRoZSB0b29sdGlwIGVsZW1lbnQgaXMgbm8gbG9uZ2VyIGNvbGxpZGluZy5cbiAgICogaWYgdGhlIHRvb2x0aXAgaXMgbGFyZ2VyIHRoYW4gdGhlIHNjcmVlbiB3aWR0aCwgZGVmYXVsdCB0byBmdWxsIHdpZHRoIC0gYW55IHVzZXIgc2VsZWN0ZWQgbWFyZ2luXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBfc2V0UG9zaXRpb24oKSB7XG4gICAgdmFyIHBvc2l0aW9uID0gdGhpcy5fZ2V0UG9zaXRpb25DbGFzcyh0aGlzLnRlbXBsYXRlKSxcbiAgICAgICAgJHRpcERpbXMgPSBGb3VuZGF0aW9uLkJveC5HZXREaW1lbnNpb25zKHRoaXMudGVtcGxhdGUpLFxuICAgICAgICAkYW5jaG9yRGltcyA9IEZvdW5kYXRpb24uQm94LkdldERpbWVuc2lvbnModGhpcy4kZWxlbWVudCksXG4gICAgICAgIGRpcmVjdGlvbiA9IChwb3NpdGlvbiA9PT0gJ2xlZnQnID8gJ2xlZnQnIDogKChwb3NpdGlvbiA9PT0gJ3JpZ2h0JykgPyAnbGVmdCcgOiAndG9wJykpLFxuICAgICAgICBwYXJhbSA9IChkaXJlY3Rpb24gPT09ICd0b3AnKSA/ICdoZWlnaHQnIDogJ3dpZHRoJyxcbiAgICAgICAgb2Zmc2V0ID0gKHBhcmFtID09PSAnaGVpZ2h0JykgPyB0aGlzLm9wdGlvbnMudk9mZnNldCA6IHRoaXMub3B0aW9ucy5oT2Zmc2V0LFxuICAgICAgICBfdGhpcyA9IHRoaXM7XG5cbiAgICBpZiAoKCR0aXBEaW1zLndpZHRoID49ICR0aXBEaW1zLndpbmRvd0RpbXMud2lkdGgpIHx8ICghdGhpcy5jb3VudGVyICYmICFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMudGVtcGxhdGUpKSkge1xuICAgICAgdGhpcy50ZW1wbGF0ZS5vZmZzZXQoRm91bmRhdGlvbi5Cb3guR2V0T2Zmc2V0cyh0aGlzLnRlbXBsYXRlLCB0aGlzLiRlbGVtZW50LCAnY2VudGVyIGJvdHRvbScsIHRoaXMub3B0aW9ucy52T2Zmc2V0LCB0aGlzLm9wdGlvbnMuaE9mZnNldCwgdHJ1ZSkpLmNzcyh7XG4gICAgICAvLyB0aGlzLiRlbGVtZW50Lm9mZnNldChGb3VuZGF0aW9uLkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwgJ2NlbnRlciBib3R0b20nLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQsIHRydWUpKS5jc3Moe1xuICAgICAgICAnd2lkdGgnOiAkYW5jaG9yRGltcy53aW5kb3dEaW1zLndpZHRoIC0gKHRoaXMub3B0aW9ucy5oT2Zmc2V0ICogMiksXG4gICAgICAgICdoZWlnaHQnOiAnYXV0bydcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMudGVtcGxhdGUub2Zmc2V0KEZvdW5kYXRpb24uQm94LkdldE9mZnNldHModGhpcy50ZW1wbGF0ZSwgdGhpcy4kZWxlbWVudCwnY2VudGVyICcgKyAocG9zaXRpb24gfHwgJ2JvdHRvbScpLCB0aGlzLm9wdGlvbnMudk9mZnNldCwgdGhpcy5vcHRpb25zLmhPZmZzZXQpKTtcblxuICAgIHdoaWxlKCFGb3VuZGF0aW9uLkJveC5JbU5vdFRvdWNoaW5nWW91KHRoaXMudGVtcGxhdGUpICYmIHRoaXMuY291bnRlcikge1xuICAgICAgdGhpcy5fcmVwb3NpdGlvbihwb3NpdGlvbik7XG4gICAgICB0aGlzLl9zZXRQb3NpdGlvbigpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiByZXZlYWxzIHRoZSB0b29sdGlwLCBhbmQgZmlyZXMgYW4gZXZlbnQgdG8gY2xvc2UgYW55IG90aGVyIG9wZW4gdG9vbHRpcHMgb24gdGhlIHBhZ2VcbiAgICogQGZpcmVzIFRvb2x0aXAjY2xvc2VtZVxuICAgKiBAZmlyZXMgVG9vbHRpcCNzaG93XG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgc2hvdygpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zLnNob3dPbiAhPT0gJ2FsbCcgJiYgIUZvdW5kYXRpb24uTWVkaWFRdWVyeS5pcyh0aGlzLm9wdGlvbnMuc2hvd09uKSkge1xuICAgICAgLy8gY29uc29sZS5lcnJvcignVGhlIHNjcmVlbiBpcyB0b28gc21hbGwgdG8gZGlzcGxheSB0aGlzIHRvb2x0aXAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMudGVtcGxhdGUuY3NzKCd2aXNpYmlsaXR5JywgJ2hpZGRlbicpLnNob3coKTtcbiAgICB0aGlzLl9zZXRQb3NpdGlvbigpO1xuXG4gICAgLyoqXG4gICAgICogRmlyZXMgdG8gY2xvc2UgYWxsIG90aGVyIG9wZW4gdG9vbHRpcHMgb24gdGhlIHBhZ2VcbiAgICAgKiBAZXZlbnQgQ2xvc2VtZSN0b29sdGlwXG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdjbG9zZW1lLnpmLnRvb2x0aXAnLCB0aGlzLnRlbXBsYXRlLmF0dHIoJ2lkJykpO1xuXG5cbiAgICB0aGlzLnRlbXBsYXRlLmF0dHIoe1xuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogdHJ1ZSxcbiAgICAgICdhcmlhLWhpZGRlbic6IGZhbHNlXG4gICAgfSk7XG4gICAgX3RoaXMuaXNBY3RpdmUgPSB0cnVlO1xuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMudGVtcGxhdGUpO1xuICAgIHRoaXMudGVtcGxhdGUuc3RvcCgpLmhpZGUoKS5jc3MoJ3Zpc2liaWxpdHknLCAnJykuZmFkZUluKHRoaXMub3B0aW9ucy5mYWRlSW5EdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG4gICAgICAvL21heWJlIGRvIHN0dWZmP1xuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIEZpcmVzIHdoZW4gdGhlIHRvb2x0aXAgaXMgc2hvd25cbiAgICAgKiBAZXZlbnQgVG9vbHRpcCNzaG93XG4gICAgICovXG4gICAgdGhpcy4kZWxlbWVudC50cmlnZ2VyKCdzaG93LnpmLnRvb2x0aXAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBIaWRlcyB0aGUgY3VycmVudCB0b29sdGlwLCBhbmQgcmVzZXRzIHRoZSBwb3NpdGlvbmluZyBjbGFzcyBpZiBpdCB3YXMgY2hhbmdlZCBkdWUgdG8gY29sbGlzaW9uXG4gICAqIEBmaXJlcyBUb29sdGlwI2hpZGVcbiAgICogQGZ1bmN0aW9uXG4gICAqL1xuICBoaWRlKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdoaWRpbmcnLCB0aGlzLiRlbGVtZW50LmRhdGEoJ3lldGktYm94JykpO1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy50ZW1wbGF0ZS5zdG9wKCkuYXR0cih7XG4gICAgICAnYXJpYS1oaWRkZW4nOiB0cnVlLFxuICAgICAgJ2RhdGEtaXMtYWN0aXZlJzogZmFsc2VcbiAgICB9KS5mYWRlT3V0KHRoaXMub3B0aW9ucy5mYWRlT3V0RHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuICAgICAgX3RoaXMuaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgIGlmIChfdGhpcy5jbGFzc0NoYW5nZWQpIHtcbiAgICAgICAgX3RoaXMudGVtcGxhdGVcbiAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoX3RoaXMuX2dldFBvc2l0aW9uQ2xhc3MoX3RoaXMudGVtcGxhdGUpKVxuICAgICAgICAgICAgIC5hZGRDbGFzcyhfdGhpcy5vcHRpb25zLnBvc2l0aW9uQ2xhc3MpO1xuXG4gICAgICAgX3RoaXMudXNlZFBvc2l0aW9ucyA9IFtdO1xuICAgICAgIF90aGlzLmNvdW50ZXIgPSA0O1xuICAgICAgIF90aGlzLmNsYXNzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8qKlxuICAgICAqIGZpcmVzIHdoZW4gdGhlIHRvb2x0aXAgaXMgaGlkZGVuXG4gICAgICogQGV2ZW50IFRvb2x0aXAjaGlkZVxuICAgICAqL1xuICAgIHRoaXMuJGVsZW1lbnQudHJpZ2dlcignaGlkZS56Zi50b29sdGlwJyk7XG4gIH1cblxuICAvKipcbiAgICogYWRkcyBldmVudCBsaXN0ZW5lcnMgZm9yIHRoZSB0b29sdGlwIGFuZCBpdHMgYW5jaG9yXG4gICAqIFRPRE8gY29tYmluZSBzb21lIG9mIHRoZSBsaXN0ZW5lcnMgbGlrZSBmb2N1cyBhbmQgbW91c2VlbnRlciwgZXRjLlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgX2V2ZW50cygpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciAkdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlO1xuICAgIHZhciBpc0ZvY3VzID0gZmFsc2U7XG5cbiAgICBpZiAoIXRoaXMub3B0aW9ucy5kaXNhYmxlSG92ZXIpIHtcblxuICAgICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9uKCdtb3VzZWVudGVyLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGlmICghX3RoaXMuaXNBY3RpdmUpIHtcbiAgICAgICAgICBfdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgICB9LCBfdGhpcy5vcHRpb25zLmhvdmVyRGVsYXkpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLm9uKCdtb3VzZWxlYXZlLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChfdGhpcy50aW1lb3V0KTtcbiAgICAgICAgaWYgKCFpc0ZvY3VzIHx8IChfdGhpcy5pc0NsaWNrICYmICFfdGhpcy5vcHRpb25zLmNsaWNrT3BlbikpIHtcbiAgICAgICAgICBfdGhpcy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2xpY2tPcGVuKSB7XG4gICAgICB0aGlzLiRlbGVtZW50Lm9uKCdtb3VzZWRvd24uemYudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgaWYgKF90aGlzLmlzQ2xpY2spIHtcbiAgICAgICAgICAvL190aGlzLmhpZGUoKTtcbiAgICAgICAgICAvLyBfdGhpcy5pc0NsaWNrID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgX3RoaXMuaXNDbGljayA9IHRydWU7XG4gICAgICAgICAgaWYgKChfdGhpcy5vcHRpb25zLmRpc2FibGVIb3ZlciB8fCAhX3RoaXMuJGVsZW1lbnQuYXR0cigndGFiaW5kZXgnKSkgJiYgIV90aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgICBfdGhpcy5zaG93KCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4kZWxlbWVudC5vbignbW91c2Vkb3duLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgIF90aGlzLmlzQ2xpY2sgPSB0cnVlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLm9wdGlvbnMuZGlzYWJsZUZvclRvdWNoKSB7XG4gICAgICB0aGlzLiRlbGVtZW50XG4gICAgICAub24oJ3RhcC56Zi50b29sdGlwIHRvdWNoZW5kLnpmLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIF90aGlzLmlzQWN0aXZlID8gX3RoaXMuaGlkZSgpIDogX3RoaXMuc2hvdygpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgdGhpcy4kZWxlbWVudC5vbih7XG4gICAgICAvLyAndG9nZ2xlLnpmLnRyaWdnZXInOiB0aGlzLnRvZ2dsZS5iaW5kKHRoaXMpLFxuICAgICAgLy8gJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmhpZGUuYmluZCh0aGlzKVxuICAgICAgJ2Nsb3NlLnpmLnRyaWdnZXInOiB0aGlzLmhpZGUuYmluZCh0aGlzKVxuICAgIH0pO1xuXG4gICAgdGhpcy4kZWxlbWVudFxuICAgICAgLm9uKCdmb2N1cy56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpc0ZvY3VzID0gdHJ1ZTtcbiAgICAgICAgaWYgKF90aGlzLmlzQ2xpY2spIHtcbiAgICAgICAgICAvLyBJZiB3ZSdyZSBub3Qgc2hvd2luZyBvcGVuIG9uIGNsaWNrcywgd2UgbmVlZCB0byBwcmV0ZW5kIGEgY2xpY2stbGF1bmNoZWQgZm9jdXMgaXNuJ3RcbiAgICAgICAgICAvLyBhIHJlYWwgZm9jdXMsIG90aGVyd2lzZSBvbiBob3ZlciBhbmQgY29tZSBiYWNrIHdlIGdldCBiYWQgYmVoYXZpb3JcbiAgICAgICAgICBpZighX3RoaXMub3B0aW9ucy5jbGlja09wZW4pIHsgaXNGb2N1cyA9IGZhbHNlOyB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIF90aGlzLnNob3coKTtcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgLm9uKCdmb2N1c291dC56Zi50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBpc0ZvY3VzID0gZmFsc2U7XG4gICAgICAgIF90aGlzLmlzQ2xpY2sgPSBmYWxzZTtcbiAgICAgICAgX3RoaXMuaGlkZSgpO1xuICAgICAgfSlcblxuICAgICAgLm9uKCdyZXNpemVtZS56Zi50cmlnZ2VyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChfdGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIF90aGlzLl9zZXRQb3NpdGlvbigpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBhZGRzIGEgdG9nZ2xlIG1ldGhvZCwgaW4gYWRkaXRpb24gdG8gdGhlIHN0YXRpYyBzaG93KCkgJiBoaWRlKCkgZnVuY3Rpb25zXG4gICAqIEBmdW5jdGlvblxuICAgKi9cbiAgdG9nZ2xlKCkge1xuICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICB0aGlzLmhpZGUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zaG93KCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERlc3Ryb3lzIGFuIGluc3RhbmNlIG9mIHRvb2x0aXAsIHJlbW92ZXMgdGVtcGxhdGUgZWxlbWVudCBmcm9tIHRoZSB2aWV3LlxuICAgKiBAZnVuY3Rpb25cbiAgICovXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy4kZWxlbWVudC5hdHRyKCd0aXRsZScsIHRoaXMudGVtcGxhdGUudGV4dCgpKVxuICAgICAgICAgICAgICAgICAub2ZmKCcuemYudHJpZ2dlciAuemYudG9vbHRpcCcpXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGFzLXRpcCB0b3AgcmlnaHQgbGVmdCcpXG4gICAgICAgICAgICAgICAgIC5yZW1vdmVBdHRyKCdhcmlhLWRlc2NyaWJlZGJ5IGFyaWEtaGFzcG9wdXAgZGF0YS1kaXNhYmxlLWhvdmVyIGRhdGEtcmVzaXplIGRhdGEtdG9nZ2xlIGRhdGEtdG9vbHRpcCBkYXRhLXlldGktYm94Jyk7XG5cbiAgICB0aGlzLnRlbXBsYXRlLnJlbW92ZSgpO1xuXG4gICAgRm91bmRhdGlvbi51bnJlZ2lzdGVyUGx1Z2luKHRoaXMpO1xuICB9XG59XG5cblRvb2x0aXAuZGVmYXVsdHMgPSB7XG4gIGRpc2FibGVGb3JUb3VjaDogZmFsc2UsXG4gIC8qKlxuICAgKiBUaW1lLCBpbiBtcywgYmVmb3JlIGEgdG9vbHRpcCBzaG91bGQgb3BlbiBvbiBob3Zlci5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAyMDBcbiAgICovXG4gIGhvdmVyRGVsYXk6IDIwMCxcbiAgLyoqXG4gICAqIFRpbWUsIGluIG1zLCBhIHRvb2x0aXAgc2hvdWxkIHRha2UgdG8gZmFkZSBpbnRvIHZpZXcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTUwXG4gICAqL1xuICBmYWRlSW5EdXJhdGlvbjogMTUwLFxuICAvKipcbiAgICogVGltZSwgaW4gbXMsIGEgdG9vbHRpcCBzaG91bGQgdGFrZSB0byBmYWRlIG91dCBvZiB2aWV3LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlIDE1MFxuICAgKi9cbiAgZmFkZU91dER1cmF0aW9uOiAxNTAsXG4gIC8qKlxuICAgKiBEaXNhYmxlcyBob3ZlciBldmVudHMgZnJvbSBvcGVuaW5nIHRoZSB0b29sdGlwIGlmIHNldCB0byB0cnVlXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGRpc2FibGVIb3ZlcjogZmFsc2UsXG4gIC8qKlxuICAgKiBPcHRpb25hbCBhZGR0aW9uYWwgY2xhc3NlcyB0byBhcHBseSB0byB0aGUgdG9vbHRpcCB0ZW1wbGF0ZSBvbiBpbml0LlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICdteS1jb29sLXRpcC1jbGFzcydcbiAgICovXG4gIHRlbXBsYXRlQ2xhc3NlczogJycsXG4gIC8qKlxuICAgKiBOb24tb3B0aW9uYWwgY2xhc3MgYWRkZWQgdG8gdG9vbHRpcCB0ZW1wbGF0ZXMuIEZvdW5kYXRpb24gZGVmYXVsdCBpcyAndG9vbHRpcCcuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3Rvb2x0aXAnXG4gICAqL1xuICB0b29sdGlwQ2xhc3M6ICd0b29sdGlwJyxcbiAgLyoqXG4gICAqIENsYXNzIGFwcGxpZWQgdG8gdGhlIHRvb2x0aXAgYW5jaG9yIGVsZW1lbnQuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ2hhcy10aXAnXG4gICAqL1xuICB0cmlnZ2VyQ2xhc3M6ICdoYXMtdGlwJyxcbiAgLyoqXG4gICAqIE1pbmltdW0gYnJlYWtwb2ludCBzaXplIGF0IHdoaWNoIHRvIG9wZW4gdGhlIHRvb2x0aXAuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ3NtYWxsJ1xuICAgKi9cbiAgc2hvd09uOiAnc21hbGwnLFxuICAvKipcbiAgICogQ3VzdG9tIHRlbXBsYXRlIHRvIGJlIHVzZWQgdG8gZ2VuZXJhdGUgbWFya3VwIGZvciB0b29sdGlwLlxuICAgKiBAb3B0aW9uXG4gICAqIEBleGFtcGxlICcmbHQ7ZGl2IGNsYXNzPVwidG9vbHRpcFwiJmd0OyZsdDsvZGl2Jmd0OydcbiAgICovXG4gIHRlbXBsYXRlOiAnJyxcbiAgLyoqXG4gICAqIFRleHQgZGlzcGxheWVkIGluIHRoZSB0b29sdGlwIHRlbXBsYXRlIG9uIG9wZW4uXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgJ1NvbWUgY29vbCBzcGFjZSBmYWN0IGhlcmUuJ1xuICAgKi9cbiAgdGlwVGV4dDogJycsXG4gIHRvdWNoQ2xvc2VUZXh0OiAnVGFwIHRvIGNsb3NlLicsXG4gIC8qKlxuICAgKiBBbGxvd3MgdGhlIHRvb2x0aXAgdG8gcmVtYWluIG9wZW4gaWYgdHJpZ2dlcmVkIHdpdGggYSBjbGljayBvciB0b3VjaCBldmVudC5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSB0cnVlXG4gICAqL1xuICBjbGlja09wZW46IHRydWUsXG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIHBvc2l0aW9uaW5nIGNsYXNzZXMsIHNldCBieSB0aGUgSlNcbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAndG9wJ1xuICAgKi9cbiAgcG9zaXRpb25DbGFzczogJycsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgdGVtcGxhdGUgc2hvdWxkIHB1c2ggYXdheSBmcm9tIHRoZSBhbmNob3Igb24gdGhlIFkgYXhpcy5cbiAgICogQG9wdGlvblxuICAgKiBAZXhhbXBsZSAxMFxuICAgKi9cbiAgdk9mZnNldDogMTAsXG4gIC8qKlxuICAgKiBEaXN0YW5jZSwgaW4gcGl4ZWxzLCB0aGUgdGVtcGxhdGUgc2hvdWxkIHB1c2ggYXdheSBmcm9tIHRoZSBhbmNob3Igb24gdGhlIFggYXhpcywgaWYgYWxpZ25lZCB0byBhIHNpZGUuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgMTJcbiAgICovXG4gIGhPZmZzZXQ6IDEyLFxuICAgIC8qKlxuICAgKiBBbGxvdyBIVE1MIGluIHRvb2x0aXAuIFdhcm5pbmc6IElmIHlvdSBhcmUgbG9hZGluZyB1c2VyLWdlbmVyYXRlZCBjb250ZW50IGludG8gdG9vbHRpcHMsXG4gICAqIGFsbG93aW5nIEhUTUwgbWF5IG9wZW4geW91cnNlbGYgdXAgdG8gWFNTIGF0dGFja3MuXG4gICAqIEBvcHRpb25cbiAgICogQGV4YW1wbGUgZmFsc2VcbiAgICovXG4gIGFsbG93SHRtbDogZmFsc2Vcbn07XG5cbi8qKlxuICogVE9ETyB1dGlsaXplIHJlc2l6ZSBldmVudCB0cmlnZ2VyXG4gKi9cblxuLy8gV2luZG93IGV4cG9ydHNcbkZvdW5kYXRpb24ucGx1Z2luKFRvb2x0aXAsICdUb29sdGlwJyk7XG5cbn0oalF1ZXJ5KTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gUG9seWZpbGwgZm9yIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuKGZ1bmN0aW9uKCkge1xuICBpZiAoIURhdGUubm93KVxuICAgIERhdGUubm93ID0gZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICB2YXIgdmVuZG9ycyA9IFsnd2Via2l0JywgJ21veiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICF3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lOyArK2kpIHtcbiAgICAgIHZhciB2cCA9IHZlbmRvcnNbaV07XG4gICAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93W3ZwKydSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9ICh3aW5kb3dbdnArJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHx8IHdpbmRvd1t2cCsnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10pO1xuICB9XG4gIGlmICgvaVAoYWR8aG9uZXxvZCkuKk9TIDYvLnRlc3Qod2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQpXG4gICAgfHwgIXdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgIXdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSkge1xuICAgIHZhciBsYXN0VGltZSA9IDA7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgbmV4dFRpbWUgPSBNYXRoLm1heChsYXN0VGltZSArIDE2LCBub3cpO1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2sobGFzdFRpbWUgPSBuZXh0VGltZSk7IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRUaW1lIC0gbm93KTtcbiAgICB9O1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSA9IGNsZWFyVGltZW91dDtcbiAgfVxufSkoKTtcblxudmFyIGluaXRDbGFzc2VzICAgPSBbJ211aS1lbnRlcicsICdtdWktbGVhdmUnXTtcbnZhciBhY3RpdmVDbGFzc2VzID0gWydtdWktZW50ZXItYWN0aXZlJywgJ211aS1sZWF2ZS1hY3RpdmUnXTtcblxuLy8gRmluZCB0aGUgcmlnaHQgXCJ0cmFuc2l0aW9uZW5kXCIgZXZlbnQgZm9yIHRoaXMgYnJvd3NlclxudmFyIGVuZEV2ZW50ID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgdHJhbnNpdGlvbnMgPSB7XG4gICAgJ3RyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgJ1dlYmtpdFRyYW5zaXRpb24nOiAnd2Via2l0VHJhbnNpdGlvbkVuZCcsXG4gICAgJ01velRyYW5zaXRpb24nOiAndHJhbnNpdGlvbmVuZCcsXG4gICAgJ09UcmFuc2l0aW9uJzogJ290cmFuc2l0aW9uZW5kJ1xuICB9XG4gIHZhciBlbGVtID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gIGZvciAodmFyIHQgaW4gdHJhbnNpdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIGVsZW0uc3R5bGVbdF0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICByZXR1cm4gdHJhbnNpdGlvbnNbdF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59KSgpO1xuXG5mdW5jdGlvbiBhbmltYXRlKGlzSW4sIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpIHtcbiAgZWxlbWVudCA9ICQoZWxlbWVudCkuZXEoMCk7XG5cbiAgaWYgKCFlbGVtZW50Lmxlbmd0aCkgcmV0dXJuO1xuXG4gIGlmIChlbmRFdmVudCA9PT0gbnVsbCkge1xuICAgIGlzSW4gPyBlbGVtZW50LnNob3coKSA6IGVsZW1lbnQuaGlkZSgpO1xuICAgIGNiKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGluaXRDbGFzcyA9IGlzSW4gPyBpbml0Q2xhc3Nlc1swXSA6IGluaXRDbGFzc2VzWzFdO1xuICB2YXIgYWN0aXZlQ2xhc3MgPSBpc0luID8gYWN0aXZlQ2xhc3Nlc1swXSA6IGFjdGl2ZUNsYXNzZXNbMV07XG5cbiAgLy8gU2V0IHVwIHRoZSBhbmltYXRpb25cbiAgcmVzZXQoKTtcbiAgZWxlbWVudC5hZGRDbGFzcyhhbmltYXRpb24pO1xuICBlbGVtZW50LmNzcygndHJhbnNpdGlvbicsICdub25lJyk7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBlbGVtZW50LmFkZENsYXNzKGluaXRDbGFzcyk7XG4gICAgaWYgKGlzSW4pIGVsZW1lbnQuc2hvdygpO1xuICB9KTtcblxuICAvLyBTdGFydCB0aGUgYW5pbWF0aW9uXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcbiAgICBlbGVtZW50WzBdLm9mZnNldFdpZHRoO1xuICAgIGVsZW1lbnQuY3NzKCd0cmFuc2l0aW9uJywgJycpO1xuICAgIGVsZW1lbnQuYWRkQ2xhc3MoYWN0aXZlQ2xhc3MpO1xuICB9KTtcblxuICAvLyBDbGVhbiB1cCB0aGUgYW5pbWF0aW9uIHdoZW4gaXQgZmluaXNoZXNcbiAgZWxlbWVudC5vbmUoJ3RyYW5zaXRpb25lbmQnLCBmaW5pc2gpO1xuXG4gIC8vIEhpZGVzIHRoZSBlbGVtZW50IChmb3Igb3V0IGFuaW1hdGlvbnMpLCByZXNldHMgdGhlIGVsZW1lbnQsIGFuZCBydW5zIGEgY2FsbGJhY2tcbiAgZnVuY3Rpb24gZmluaXNoKCkge1xuICAgIGlmICghaXNJbikgZWxlbWVudC5oaWRlKCk7XG4gICAgcmVzZXQoKTtcbiAgICBpZiAoY2IpIGNiLmFwcGx5KGVsZW1lbnQpO1xuICB9XG5cbiAgLy8gUmVzZXRzIHRyYW5zaXRpb25zIGFuZCByZW1vdmVzIG1vdGlvbi1zcGVjaWZpYyBjbGFzc2VzXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGVsZW1lbnRbMF0uc3R5bGUudHJhbnNpdGlvbkR1cmF0aW9uID0gMDtcbiAgICBlbGVtZW50LnJlbW92ZUNsYXNzKGluaXRDbGFzcyArICcgJyArIGFjdGl2ZUNsYXNzICsgJyAnICsgYW5pbWF0aW9uKTtcbiAgfVxufVxuXG52YXIgTW90aW9uVUkgPSB7XG4gIGFuaW1hdGVJbjogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUodHJ1ZSwgZWxlbWVudCwgYW5pbWF0aW9uLCBjYik7XG4gIH0sXG5cbiAgYW5pbWF0ZU91dDogZnVuY3Rpb24oZWxlbWVudCwgYW5pbWF0aW9uLCBjYikge1xuICAgIGFuaW1hdGUoZmFsc2UsIGVsZW1lbnQsIGFuaW1hdGlvbiwgY2IpO1xuICB9XG59XG4iLCJqUXVlcnkoZG9jdW1lbnQpLmZvdW5kYXRpb24oKTtcbiIsIi8vIEpveXJpZGUgZGVtb1xuJCgnI3N0YXJ0LWpyJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICQoZG9jdW1lbnQpLmZvdW5kYXRpb24oJ2pveXJpZGUnLCdzdGFydCcpO1xufSk7IiwiIiwiJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24gKCkge1xuICAgIHZhciB2aWRlb3MgPSAkKCdpZnJhbWVbc3JjKj1cInZpbWVvLmNvbVwiXSwgaWZyYW1lW3NyYyo9XCJ5b3V0dWJlLmNvbVwiXScpO1xuXG4gICAgdmlkZW9zLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZWwgPSAkKHRoaXMpO1xuICAgICAgICBlbC53cmFwKCc8ZGl2IGNsYXNzPVwicmVzcG9uc2l2ZS1lbWJlZCB3aWRlc2NyZWVuXCIvPicpO1xuICAgIH0pO1xufSk7XG4iLCIkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScpLmNsaWNrKGZ1bmN0aW9uKCkge1xuICBpZiAobG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sICcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCAnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyAnXScpO1xuICAgIGlmICh0YXJnZXQubGVuZ3RoKSB7XG4gICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgIHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuICAgICAgfSwgMTAwMCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59KTsiLCJcbiQod2luZG93KS5iaW5kKCcgbG9hZCByZXNpemUgb3JpZW50YXRpb25DaGFuZ2UgJywgZnVuY3Rpb24gKCkge1xuICAgdmFyIGZvb3RlciA9ICQoXCIjZm9vdGVyLWNvbnRhaW5lclwiKTtcbiAgIHZhciBwb3MgPSBmb290ZXIucG9zaXRpb24oKTtcbiAgIHZhciBoZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCk7XG4gICBoZWlnaHQgPSBoZWlnaHQgLSBwb3MudG9wO1xuICAgaGVpZ2h0ID0gaGVpZ2h0IC0gZm9vdGVyLmhlaWdodCgpIC0xO1xuXG4gICBmdW5jdGlvbiBzdGlja3lGb290ZXIoKSB7XG4gICAgIGZvb3Rlci5jc3Moe1xuICAgICAgICAgJ21hcmdpbi10b3AnOiBoZWlnaHQgKyAncHgnXG4gICAgIH0pO1xuICAgfVxuXG4gICBpZiAoaGVpZ2h0ID4gMCkge1xuICAgICBzdGlja3lGb290ZXIoKTtcbiAgIH1cbn0pO1xuIl19
