export default class PixiOverlayMarkers {
    constructor(map: any, resources: any, options: any);
    createLayer(id: any, data: any, createShapeCallback: any): any;
    removeLayer(id: any): void;
    hasLayer(id: any): any;
    render(): void;
    convertColorToHex(color: any): number;
}
