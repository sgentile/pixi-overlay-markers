import L from 'leaflet';
import * as PIXI from 'pixi.js';
import 'leaflet-pixi-overlay';

export default class PixiOverlayMarkers {

  constructor(map, resources, options) {
    const defaultOptions = {
      invScaleBase: 0.5,
      minScale: 0,
      maxScale: 5,
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
    const layer = new PIXI.Container();
    const textures = this.textures;
    // hold the objects here.

    layer._myDataShapes = [];
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      let sprite;
      if (createShapeCallback) {
        sprite = createShapeCallback(point, textures);
      } else {
        sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        sprite.tint = this.options.tint;
        sprite.opacity = this.options.opacity;
      }
      layer._myDataShapes.push({ point, sprite });
      layer.addChild(sprite);
    }

    // attach a custom draw function callback for each container
    layer._myDrawFunc = (map, zoom, renderer, project, scale) => {
      let invScale = this.options.invScaleBase / scale;
      const minScale = this.options.minScale;
      const maxScale = this.options.maxScale;

      for (let i = 0; i < layer._myDataShapes.length; i++) {
        const point = layer._myDataShapes[i].point;
        const sprite = layer._myDataShapes[i].sprite;

        const coords = [point.lat, point.lon];
        const newPosition = project(coords);
        sprite.x = newPosition.x;
        sprite.y = newPosition.y;
        sprite.anchor.set(0.5, 0.5);
        if (invScale < minScale) {
          invScale = minScale;
        } else if (invScale > maxScale) {
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
  }

  removeLayer(id) {
    this.rootContainer.children.forEach(childContainer => {
      if (childContainer._myId === id) {
        // not sure if you have to call both, but at least remove it from the root container
        this.rootContainer.removeChild(childContainer);
        // childContainer.destroy();
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

  convertColorToHex(color) {
    return parseInt(color.replace(/#/g, ""), 16);
  }
}