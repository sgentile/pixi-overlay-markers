import L from 'leaflet';
import * as PIXI from 'pixi.js';
import 'leaflet-pixi-overlay';

export default class PixiOverlayMarkers {

  constructor(map, resources, options) {
    const defaultOptions = {
      invScaleBase: 0.5,
      minScale: 0,
      maxScale: 16,
      tint: 0xff0000,
      opacity: 0.7,
      forceCanvas: false,
    };
    this.rootContainer = new PIXI.Container();
    this.map = map;
    this.resources = resources;
    this.loader = new PIXI.loaders.Loader();
    this.textures = {};

    this.options = Object.assign(defaultOptions, options || {});

    // Load the resources
    Object.keys(this.resources).forEach(key => {
      this.loader.add(key, this.resources[key]);
    });
    this.loader.load((loader, res) => {
      Object.keys(this.resources).forEach(key => {
        this.textures[key] = res[key].texture;
      });
    });

    // Create the PixiOverlay
    this.pixiLayer = (() => {
      return new L.PixiOverlay(
        utils => {
          // this is the draw function
          const zoom = map.getZoom();
          const renderer = utils.getRenderer();
          this.renderer = renderer;
          const project = utils.latLngToLayerPoint;
          const scale = utils.getScale();

          // loop through and children and execute their drawing functions
          // children will be added later in the createLayer() function above

          for (let i = 0; i < this.rootContainer.children.length; i++) {
            const childContainer = this.rootContainer.children[i];
            /*
              execute each child container's draw function, making "this" the container itself
              the draw function above will then have access to whatever zoom and scale are
              currently being drawn
             */

            childContainer._myDrawFunc.call(
              childContainer,
              this.map,
              zoom,
              renderer,
              project,
              scale
            );
          }
          // final render of everything in the root container
          // rootContainer is the same object as if you did utils.getContainer()
          this._render = () => {
            this.map.invalidateSize();
            this.map.fitBounds(this.map.getBounds());
          };
          renderer.render(this.rootContainer);
        },
        this.rootContainer,
        {
          forceCanvas: this.options.forceCanvas,
        }
      );
    })();
    this.pixiLayer.addTo(map);
  }

  createLayer(id, data, createShapeCallback) {
    const childContainer = new PIXI.Container();
    childContainer._hasProjected = false;
    const textures = this.textures;
    // hold the objects here.

    childContainer._myDataShapes = [];
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      let sprite;
      if (createShapeCallback) {
        sprite = createShapeCallback(point, textures);
      } else {
        sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        sprite.tint = this.options.tint;
        sprite.alpha = this.options.opacity;
      }
      childContainer._myDataShapes.push({ point, sprite });
      childContainer.addChild(sprite);
    }

    // attach a custom draw function callback for each container
    childContainer._myDrawFunc = (map, zoom, renderer, project, scale) => {
      let invScale = this.options.invScaleBase / scale;
      const minScale = this.options.minScale;
      const maxScale = this.options.maxScale;

      for (let i = 0; i < childContainer._myDataShapes.length; i++) {
        const point = childContainer._myDataShapes[i].point;
        const sprite = childContainer._myDataShapes[i].sprite;

        
        if (!childContainer._hasProjected) {
          // by default execute only one time
          // expensive operation, only project if the markers have moved
          const coords = [point.lat, point.lon];
          const position = project(coords);
          sprite.x = position.x;
          sprite.y = position.y;          
        }

        sprite.anchor.set(0.5, 0.5);
        if (invScale < minScale) {
          invScale = minScale;
        } else if (invScale > maxScale) {
          invScale = maxScale;
        }
        sprite.scale.set(invScale);

        // callback to enable opportunities to apply transformations such as move
        if (sprite._runTransformation) {
          sprite._runTransformation(sprite, project, scale, invScale);
        } 
      }
      childContainer._hasProjected = true;
      renderer.render(childContainer);
    };
    childContainer._myId = id;
    // add the child layer to the main container
    // the next time a draw function is triggered, this will be rendered automatically

    this.rootContainer.addChild(childContainer);
    return childContainer;
  }

  removeLayer(id) {
    this.rootContainer.children.forEach(childContainer => {
      if (childContainer._myId === id) {
        // not sure if you have to call both, but at least remove it from the root container
        this.rootContainer.removeChild(childContainer);
        childContainer.destroy();
        if (this._render) {
          this._render();
        }
      }
    });
  }

  hasLayer(id) {
    return this.rootContainer.children.some(
      childContainer => childContainer._myId === id
    );
  }

  render() {
    if (this._render) {
      this._render();
    }
  }

  update() {
    this.pixiLayer._update();
  }

  convertColorToHex(color) {
    return parseInt(color.replace(/#/g, ""), 16);
  }
}