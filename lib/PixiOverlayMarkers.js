'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('./utils');

var _leaflet = require('leaflet');

var L = _interopRequireWildcard(_leaflet);

var _pixi = require('pixi.js');

var PIXI = _interopRequireWildcard(_pixi);

require('leaflet-pixi-overlay');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PixiOverlayMarkers = function () {
  function PixiOverlayMarkers(map, resources, options) {
    var _this = this;

    _classCallCheck(this, PixiOverlayMarkers);

    this._name = (0, _utils.getLibName)();
    var defaultOptions = {
      invScaleBase: 0.5,
      minScale: 48,
      maxScale: 512,
      tint: 0xff0000,
      opacity: 0.7,
      forceCanvas: false
    };
    this.rootContainer = new PIXI.Container();
    this.map = map;
    this.resources = resources;
    this.loader = new PIXI.loaders.Loader();
    this.textures = {};

    this.options = Object.assign(defaultOptions, options || {});

    // Load the resources
    Object.keys(this.resources).forEach(function (key) {
      _this.loader.add(key, _this.resources[key]);
    });
    this.loader.load(function (loader, res) {
      Object.keys(_this.resources).forEach(function (key) {
        _this.textures[key] = res[key].texture;
      });
    });

    // Create the PixiOverlay
    this.pixiLayer = function () {
      return new L.PixiOverlay(function (utils) {
        // this is the draw function
        console.log("begin drawing...");
        var zoom = map.getZoom();
        var renderer = utils.getRenderer();
        _this.renderer = renderer;
        var project = utils.latLngToLayerPoint;
        var scale = utils.getScale();

        // loop through and children and execute their drawing functions
        // children will be added later in the createLayer() function above

        _this.rootContainer.children.forEach(function (childContainer) {
          /* 
            execute each child container's draw function, making "this" the container itself
            the draw function above will then have access to whatever zoom and scale are 
            currently being drawn
           */

          childContainer._myDrawFunc.call(childContainer, _this.map, zoom, renderer, project, scale);
        });
        // final render of everything in the root container
        // rootContainer is the same object as if you did utils.getContainer()
        _this._render = function () {
          _this.map.invalidateSize();
          _this.map.fitBounds(_this.map.getBounds());
        };
        setTimeout(function () {
          renderer.render(_this.rootContainer);
          console.log("render done");
        });
      }, _this.rootContainer, {
        forceCanvas: _this.options.forceCanvas
      });
    }();
    this.pixiLayer.addTo(map);
  }

  _createClass(PixiOverlayMarkers, [{
    key: 'createLayer',
    value: function createLayer(id, data, createShapeCallback) {
      var _this2 = this;

      var layer = new PIXI.Container();
      var textures = this.textures;
      // hold the objects here.

      layer._myDataShapes = [];
      data.forEach(function (point) {
        var sprite = void 0;
        if (createShapeCallback) {
          sprite = createShapeCallback(point, textures);
        } else {
          sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
          sprite.tint = _this2.options.tint;
          sprite.opacity = _this2.options.opacity;
        }
        layer._myDataShapes.push({ point: point, sprite: sprite });
      });

      // attach a custom draw function callback for each container
      layer._myDrawFunc = function (map, zoom, renderer, project, scale) {
        var invScale = _this2.options.invScaleBase / scale;
        var minScale = _this2.options.minScale;
        var maxScale = _this2.options.maxScale;

        layer._myDataShapes.forEach(function (dataShape) {
          var point = dataShape.point;
          var sprite = dataShape.sprite;

          var coords = [point.lat, point.lon];
          var newPosition = project(coords);
          sprite.x = newPosition.x;
          sprite.y = newPosition.y;
          sprite.anchor.set(0.5, 0.5);
          if (invScale < minScale) {
            invScale = minScale;
          } else if (invScale > maxScale) {
            invScale = maxScale;
          }
          sprite.scale.set(invScale);

          layer.addChild(sprite);
        });
        renderer.render(layer);
      };
      layer._myId = id;
      // add the child layer to the main container
      // the next time a draw function is triggered, this will be rendered automatically

      this.rootContainer.addChild(layer);
      return layer;
    }
  }, {
    key: 'removeLayer',
    value: function removeLayer(id) {
      var _this3 = this;

      this.rootContainer.children.forEach(function (childContainer) {
        if (childContainer._myId === id) {
          // not sure if you have to call both, but at least remove it from the root container
          _this3.rootContainer.removeChild(childContainer);
          // childContainer.destroy();
          if (_this3._render) {
            _this3._render();
          }
        }
      });
    }
  }, {
    key: 'hasLayer',
    value: function hasLayer(id) {
      return this.rootContainer.children.some(function (childContainer) {
        return childContainer._myId === id;
      });
    }
  }, {
    key: 'render',
    value: function render() {
      if (this._render) {
        this._render();
      }
    }
  }, {
    key: 'convertColorToHex',
    value: function convertColorToHex(color) {
      return parseInt(color.replace(/#/g, ""), 16);
    }
  }, {
    key: 'name',
    get: function get() {
      return this._name;
    }
  }]);

  return PixiOverlayMarkers;
}();

exports.default = PixiOverlayMarkers;
module.exports = exports['default'];