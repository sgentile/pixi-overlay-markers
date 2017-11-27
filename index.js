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
	
  function PixiOverlayWrapper(map, textures) {
    const rootContainer = new PIXI.Container();    
		const overlay = L.pixiOverlay(utils => {
			//this is the draw function
			const zoom = map.getZoom();
			const renderer = utils.getRenderer();
			const project = utils.latLngToLayerPoint;
			const scale = utils.getScale();

			// loop through and children and execute their drawing functions
					// children will be added later in the createLayer() function above
			rootContainer.children.forEach(childContainer => {
							// execute each child container's draw function, making "this" the container itself
							// the draw function above will then have access to whatever zoom and scale are currently being drawn
							childContainer._myDrawFunc.call(childContainer, map, zoom, renderer, project, scale);
			});
			// final render of everything in the root container
			// rootContainer is the same object as if you did utils.getContainer()
			this._render = () => {
				map.invalidateSize();
				map.fitBounds(map.getBounds());
				renderer.render(rootContainer);
			};
			renderer.render(rootContainer);
    }, rootContainer);	
    overlay.addTo(map);
    
    this.createLayer = (id, data, createShapeCallback) => {
      const container = new PIXI.Container();
      // hold the objects here.
      container._myDataShapes = [];
      data.forEach(point => {
          let shape;
          if (createShapeCallback) {
              shape = createShapeCallback(point);
          } else {
              shape = new PIXI.Sprite(this.textures['UNKNOWN_UNKNOWN']);
          }
          container._myDataShapes.push({ point, shape });
      })

      // attach a custom draw function callback for each container
      container._myDrawFunc = (map, zoom, renderer, project, scale) => {
          let firstDraw = true,
              prevZoom = true,
              frame = null,
              focus = null,
              invScale = .5 / scale,
              minScale = 0,
              maxScale = 25;

            container._myDataShapes.forEach(dataShape => {
              const point = dataShape.point;
              const shape = dataShape.shape;

              const coords = [point.lat, point.lon];
              const newPosition = project(coords);
              shape.x = newPosition.x; // etc
              shape.y = newPosition.y;
              //shape.alpha = .8;
              shape.anchor.set(0.5, 0.5);                
              if (invScale < minScale) {
                  invScale = minScale;
              }
              else if (invScale > maxScale) {
                  invScale = maxScale;
              }
              shape.scale.set(invScale);

              container.addChild(shape);
          })

          renderer.render(container);
      }
      container._myId = id;
      // add the child layer to the main container
      // the next time a draw function is triggered, this will be rendered automatically
      rootContainer.addChild(container);
    }

    this.removeLayer = (id) => {
      rootContainer.children.forEach(childContainer => {
        if (childContainer._myId === id) {
            // not sure if you have to call both, but at least remove it from the root container
            rootContainer.removeChild(childContainer);
            //childContainer.destroy();
            if(this._render){
                this._render();
            }
        }
      });
    }

    this.hasLayer = (id) => {
      return rootContainer.children.some(childContainer => childContainer._myId === id);
    }

		this.render = () => {
			if(this._render){
				this._render();
			}     			
    };
  }
  return PixiOverlayWrapper;
});