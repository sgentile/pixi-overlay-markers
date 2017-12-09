// // pixi-overlay-markers
// // version: 0.0.1
// // author: Steve Gentile <steven.gentile@gmail.com>
// // license: MIT

(function(root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define(["exports", "leaflet", "pixi.js", "pixiOverlay.js"], factory);
  } else if (typeof exports === "object") {
    // CommonJS
    module.exports = factory(
      require("leaflet"),
      require("pixi.js"),
      require("pixiOverlay.js")
    );
  } else {
    // Browser globals
    if (typeof window.L === "undefined") {
      throw new Error("Leaflet must be loaded first");
    }
    if (typeof window.PIXI === "undefined") {
      throw new Error("Pixi.js must be loaded first");
    }
    if (typeof window.L.PixiOverlay === "undefined") {
      throw new Error("PixiOverlay.js must be loaded first");
    }
    root.PixiOverlayWrapper = factory(
      window.L,
      window.PIXI,
      window.L.PixiOverlay
    );
  }
})(this, function(L, PIXI, pixiOverlay) {
  let defaultOptions = {
    invScaleBase: .5,
    minScale: 0,
    maxScale: 40,
    defaultTint: 0xff0000
  }
  function PixiOverlayWrapper(map, resources, options) {
    this.options = Object.assign(defaultOptions, options || {});
    this.rootContainer = new PIXI.Container(); //there shall be only one
    this.map = map;
    this.resources = resources;
    this.loader = new PIXI.loaders.Loader();
    this.textures = [];    
    Object.keys(this.resources).forEach(key => {
      this.loader.add(key, this.resources[key]);
    });    
    this.loader.load((loader, resources) => {
      Object.keys(this.resources).forEach(key => {
        this.textures.push(resources[key].texture);        
      });
    });


    this.pixiLayer = (() => {
      return L.pixiOverlay(utils => {
        //this is the draw function
        const zoom = map.getZoom();
        const renderer = utils.getRenderer();
        const project = utils.latLngToLayerPoint;
        const scale = utils.getScale();
  
        // loop through and children and execute their drawing functions
        // children will be added later in the createLayer() function above
      
        this.rootContainer.children.forEach(childContainer => {
                // execute each child container's draw function, making "this" the container itself
                // the draw function above will then have access to whatever zoom and scale are currently being drawn
                childContainer._myDrawFunc.call(childContainer, this.map, zoom, renderer, project, scale);
        });
        // final render of everything in the root container
        // rootContainer is the same object as if you did utils.getContainer()
        this._render = () => {          
          this.map.invalidateSize();
          this.map.fitBounds(this.map.getBounds());
          renderer.render(this.rootContainer);
        };
        renderer.render(this.rootContainer);
      }, this.rootContainer);	
    })();
    this.pixiLayer.addTo(map);



    this.createLayer = (id, data, createShapeCallback) => {
      const layer = new PIXI.Container();
      const textures = this.textures;
      // hold the objects here.
      layer._myDataShapes = [];
      data.forEach(point => {
          let sprite;
          if (createShapeCallback) {
            sprite = createShapeCallback(point, textures);
          } else {                        
            sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
            sprite.tint = this.options.defaultTint;
            //sprite.width = 100;
            //sprite.height = 100;            
          }
          layer._myDataShapes.push({ point, sprite });
      })

      // attach a custom draw function callback for each container
      layer._myDrawFunc = (map, zoom, renderer, project, scale) => {
          let firstDraw = true,
              prevZoom = true,
              frame = null,
              focus = null;
              //invScale = .5 / scale;
              // minScale = 10,
              // maxScale = 25;

              var invScale = this.options.invScaleBase / scale;
              var minScale = this.options.minScale;
              var maxScale = this.options.maxScale;

            layer._myDataShapes.forEach(dataShape => {
              const point = dataShape.point;
              const sprite = dataShape.sprite;

              const coords = [point.lat, point.lon];
              const newPosition = project(coords);
              sprite.x = newPosition.x; // etc
              sprite.y = newPosition.y;
              //shape.alpha = .8;
              sprite.anchor.set(0.5, 0.5);                
              if (invScale < minScale) {
                  invScale = minScale;
              }
              else if (invScale > maxScale) {
                  invScale = maxScale;
              }
              console.log(invScale);
              sprite.scale.set(invScale);

              layer.addChild(sprite);
          })

          renderer.render(layer);
      }
      layer._myId = id;
      // add the child layer to the main container
      // the next time a draw function is triggered, this will be rendered automatically
      
      this.rootContainer.addChild(layer);
      return layer;
    }

    this.removeLayer = (id) => {
      this.rootContainer.children.forEach(childContainer => {
        if (childContainer._myId === id) {
            // not sure if you have to call both, but at least remove it from the root container
            this.rootContainer.removeChild(childContainer);
            //childContainer.destroy();
            if(this._render){
                this._render();
            }
        }
      });
    }

    this.hasLayer = (id) => {
      return this.rootContainer.children.some(childContainer => childContainer._myId === id);
    }

		this.render = () => {
			if(this._render){
				this._render();
			}     			
    };

    this.create = function(markers) {
      

        var legend = document.querySelector('div.legend.geometry');
        var legendContent = legend.querySelector('.content');

        L.DomUtil.removeClass(legend, 'hide');
        legendContent.innerHTML = 'fetching records';
        

            L.DomUtil.removeClass(legend, 'hide');
            legendContent.innerHTML = markers.length + ' records';
            var markerSprites = [];
            var pixiLayer = (function () {
                var firstDraw = true;
                var prevZoom;
                // var colorScale = d3.scaleLinear()
                //     .domain([0, 50, 100])
                //     .range(["#c6233c", "#ffd300", "#008000"]);

                var frame = null;
                var focus = null;
                var pixiContainer = new PIXI.Container();
                var forceCanvas = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                return L.pixiOverlay(function (utils) {
                    var zoom = utils.getMap().getZoom();
                    if (frame) {
                        cancelAnimationFrame(frame);
                        frame = null;
                    }
                    var container = utils.getContainer();
                    var renderer = utils.getRenderer();
                    var project = utils.latLngToLayerPoint;
                    var scale = utils.getScale();
                    var invScale = 1 / scale;
                    var minScale = 48;
                    var maxScale = 512;
                    if (firstDraw) {
                        prevZoom = zoom;
                        markers.forEach(function (marker) {
                            var coords = project([marker.latitude, marker.longitude]);
                            var index = Math.floor(Math.random() * this.textures.length);
                            var markerSprite = new PIXI.Sprite(this.textures[index]);
                            markerSprite.buttonMode = true;
                            markerSprite.interactive = true;
                            markerSprite.alpha = .8;
                            markerSprite.on('mousedown', () => {
                                L.DomUtil.removeClass(legend, 'hide');
                                legendContent.innerHTML = marker.city || marker.label;
                            });
                            markerSprite.textureIndex = index;
                            markerSprite.x = coords.x;
                            markerSprite.y = coords.y;
                            markerSprite.anchor.set(0.5, 0.5);
                            //var tint = d3.color(colorScale(marker.avancement || Math.random() * 100)).rgb();
                            //markerSprite.tint = 256 * (tint.r * 256 + tint.g) + tint.b;
                            container.addChild(markerSprite);
                            markerSprites.push(markerSprite);
                            markerSprite.legend = marker.city || marker.label;
                        });
                    }
                    if (firstDraw || prevZoom !== zoom) {
                        markerSprites.forEach(function (markerSprite) {
                            if (firstDraw) {
                                if(invScale < minScale){
                                    invScale = minScale;
                                }
                                else if(invScale > maxScale){
                                    invScale = maxScale;
                                } 
                                markerSprite.scale.set(invScale);
                            } 
                            else {
                                markerSprite.currentScale = markerSprite.scale.x;
                                markerSprite.targetScale = invScale;
                            }
                        });
                    }


                    var start = null;
                    var delta = 250;
                    function animate(timestamp) {
                        var progress;
                        if (start === null) start = timestamp;
                        progress = timestamp - start;
                        var lambda = progress / delta;
                        if (lambda > 1) lambda = 1;
                        lambda = lambda * (0.4 + lambda * (2.2 + lambda * -1.6));
                        let val;
                        markerSprites.forEach(function (markerSprite) {
                            val = markerSprite.currentScale + lambda * (markerSprite.targetScale - markerSprite.currentScale);                                    
                            if(val < minScale){
                                val = minScale;
                            }
                            else if(val > maxScale){
                                val = maxScale;
                            } 
                            markerSprite.scale.set(val);
                        });
                        console.log('scale', val);
                        renderer.render(container);
                        if (progress < delta) {
                            frame = requestAnimationFrame(animate);
                        }
                    }
                    if (!firstDraw && prevZoom !== zoom) {
                        frame = requestAnimationFrame(animate);
                    }
                    firstDraw = false;
                    prevZoom = zoom;
                    renderer.render(container);
                }, pixiContainer, {
                        forceCanvas: forceCanvas
                    });
            })();

            pixiLayer.addTo(map);
        
    }
  }
  return PixiOverlayWrapper;
});