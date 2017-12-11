var leaflet_1 = require('leaflet');
var PIXI = require('pixi.js');
require('leaflet-pixi-overlay');
var PixiOverlayMarkers = (function () {
    function PixiOverlayMarkers(map, resources, options) {
        var _this = this;
        var defaultOptions = {
            invScaleBase: 0.5,
            minScale: 0,
            maxScale: 5,
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
        this.pixiLayer = (function () {
            return new leaflet_1["default"].PixiOverlay(function (utils) {
                // this is the draw function
                var zoom = map.getZoom();
                var renderer = utils.getRenderer();
                _this.renderer = renderer;
                var project = utils.latLngToLayerPoint;
                var scale = utils.getScale();
                // loop through and children and execute their drawing functions
                // children will be added later in the createLayer() function above
                for (var i = 0; i < _this.rootContainer.children.length; i++) {
                    var childContainer = _this.rootContainer.children[i];
                    /*
                      execute each child container's draw function, making "this" the container itself
                      the draw function above will then have access to whatever zoom and scale are
                      currently being drawn
                     */
                    childContainer._myDrawFunc.call(childContainer, _this.map, zoom, renderer, project, scale);
                }
                // final render of everything in the root container
                // rootContainer is the same object as if you did utils.getContainer()
                _this._render = function () {
                    _this.map.invalidateSize();
                    _this.map.fitBounds(_this.map.getBounds());
                };
                renderer.render(_this.rootContainer);
            }, _this.rootContainer, {
                forceCanvas: _this.options.forceCanvas
            });
        })();
        this.pixiLayer.addTo(map);
    }
    PixiOverlayMarkers.prototype.createLayer = function (id, data, createShapeCallback) {
        var _this = this;
        var layer = new PIXI.Container();
        var textures = this.textures;
        // hold the objects here.
        layer._myDataShapes = [];
        for (var i = 0; i < data.length; i++) {
            var point = data[i];
            var sprite = void 0;
            if (createShapeCallback) {
                sprite = createShapeCallback(point, textures);
            }
            else {
                sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
                sprite.tint = this.options.tint;
                sprite.opacity = this.options.opacity;
            }
            layer._myDataShapes.push({ point: point, sprite: sprite });
            layer.addChild(sprite);
        }
        // attach a custom draw function callback for each container
        layer._myDrawFunc = function (map, zoom, renderer, project, scale) {
            var invScale = _this.options.invScaleBase / scale;
            var minScale = _this.options.minScale;
            var maxScale = _this.options.maxScale;
            for (var i = 0; i < layer._myDataShapes.length; i++) {
                var point = layer._myDataShapes[i].point;
                var sprite = layer._myDataShapes[i].sprite;
                var coords = [point.lat, point.lon];
                var newPosition = project(coords);
                sprite.x = newPosition.x;
                sprite.y = newPosition.y;
                sprite.anchor.set(0.5, 0.5);
                if (invScale < minScale) {
                    invScale = minScale;
                }
                else if (invScale > maxScale) {
                    invScale = maxScale;
                }
                sprite.scale.set(invScale);
            }
            renderer.render(layer);
        };
        layer._myId = id;
        // add the child layer to the main container
        // the next time a draw function is triggered, this will be rendered automatically
        this.rootContainer.addChild(layer);
        return layer;
    };
    PixiOverlayMarkers.prototype.removeLayer = function (id) {
        var _this = this;
        this.rootContainer.children.forEach(function (childContainer) {
            if (childContainer._myId === id) {
                // not sure if you have to call both, but at least remove it from the root container
                _this.rootContainer.removeChild(childContainer);
                // childContainer.destroy();
                if (_this._render) {
                    _this._render();
                }
            }
        });
    };
    PixiOverlayMarkers.prototype.hasLayer = function (id) {
        return this.rootContainer.children.some(function (childContainer) { return childContainer._myId === id; });
    };
    PixiOverlayMarkers.prototype.render = function () {
        if (this._render) {
            this._render();
        }
    };
    PixiOverlayMarkers.prototype.convertColorToHex = function (color) {
        return parseInt(color.replace(/#/g, ""), 16);
    };
    return PixiOverlayMarkers;
})();
exports["default"] = PixiOverlayMarkers;
