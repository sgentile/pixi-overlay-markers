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
    minScale: 48,
    maxScale: 512,
    tint: 0xff0000,
    opacity: .7,
    forceCanvas: false
  }
  function PixiOverlayWrapper(map, resources, options) {
    this.options = Object.assign(defaultOptions, options || {});
    this.rootContainer = new PIXI.Container(); //there shall be only one
    this.map = map;
    this.resources = resources;
    this.loader = new PIXI.loaders.Loader();
    this.textures = {};    
    Object.keys(this.resources).forEach(key => {
      this.loader.add(key, this.resources[key]);
    });    
    this.loader.load((loader, resources) => {
      Object.keys(this.resources).forEach(key => {
        this.textures[key] = resources[key].texture;        
      });
    });


    this.pixiLayer = (() => {
      return L.pixiOverlay(utils => {
        //this is the draw function
        console.log('begin drawing...');
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
            console.log('_render done');                      
        };        
        setTimeout(() => {
            renderer.render(this.rootContainer);
            console.log('render done');
        });
      }, this.rootContainer, {
        forceCanvas: this.options.forceCanvas
      });	
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
            sprite.tint = this.options.tint;
            sprite.opacity = this.options.opacity;
          }
          layer._myDataShapes.push({ point, sprite });
      })

      // attach a custom draw function callback for each container
      layer._myDrawFunc = (map, zoom, renderer, project, scale) => {          
          let firstDraw = true,
              prevZoom = true,
              frame = null,
              focus = null,
              invScale = this.options.invScaleBase / scale,
              minScale = this.options.minScale,
              maxScale = this.options.maxScale;

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


    this.convertColorToHex = (color) => {
        return parseInt(color.replace(/#/g, ''), 16);
    }
  }
  return PixiOverlayWrapper;
});