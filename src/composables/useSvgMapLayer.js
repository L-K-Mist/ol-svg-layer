import { ref, onMounted, nextTick } from "vue";

import Layer from "ol/layer/Layer";

import { transformExtent } from "ol/proj";
import "ol/ol.css";
import { SVG } from "@svgdotjs/svg.js";

// Mercator calcs convert between svg-pixels and latlon
import * as conversions from "latlon_to_xy";

let masterSvg, endOfWorldX;

// Outermost svg
const svgView = ref(null);
// Svg with top left corner as 0, 0 lonLat, to place features at correct location.
// Css sets over-flow visible, so that features with negative values .ie rest of the map,
// still show.
const innerSvg = ref(null);
// Lives inside innerSvg, just for the purpose of repeating for map's repeating x-axis.
const geoGroup = ref(null);

export default (chartWrapper, mapObject) => {
  onMounted(() => {
    masterSvg = SVG().addTo(chartWrapper.value).addClass("svg-viewport"); // Class is important because it sets 100% w h.
    const { height, width } = masterSvg.rbox();
    conversions.setupConversor(height, 0, 0, 0);
    // center-point is the anchor ie. represents innerSvg 0,0 AND lonLat 0,0
    const centerPoint = [width / 2, height / 2];

    innerSvg.value = SVG()
      .addTo(masterSvg)
      .attr({
        x: centerPoint[0],
        y: centerPoint[1],
        width,
        height,
      })
      .addClass("inner-svg");

    geoGroup.value = SVG()
      .attr({
        id: "geoGroup",
        x: 0,
        y: 0,
        width,
        height,
      })
      .addClass("inner-svg")
      .addTo(innerSvg.value);

    // Towards handling infinite x of map
    endOfWorldX = conversions.lonToX(360);
    const rightSet = innerSvg.value
      // .use is a special kind of copy, sort of like copy-by-reference
      // instead of copy-by-value.
      // ie all copies are totally in-sync, a change to geoGroup
      // instantly changes all.  Also lighter on browser than clones.
      .use(geoGroup.value)
      .attr({ x: endOfWorldX });
    const leftSet = innerSvg.value
      .use(geoGroup.value)
      .attr({ x: -endOfWorldX });

    svgView.value = masterSvg;
    nextTick().then(() => {
      addSvgLayerToMap(mapObject);
    });
  });

  function addSvgLayerToMap(map) {
    const svgLayer = new Layer({
      className: "ol-layer",
      transparent: true,
      zIndex: 50,
      // This is the render function Openlayers exposes to us.
      // it returns an html element for every frame,
      render: updateViewbox,
    });
    svgLayer.setZIndex(100);
    map.value.addLayer(svgLayer);
    nextTick(() => {
      map.value.addLayer(svgLayer);
      map.value.render();
      const layers = map.value.getLayers();
    });
  }
  let svgContainer = document.createElement("div");
  onMounted(() => {
    svgContainer.ownerDocument.importNode(masterSvg.node);
    svgContainer.appendChild(masterSvg.node);
  });
  function updateViewbox(frame) {
    svgContainer.style.width = frame.size[0] + "px";
    svgContainer.style.height = frame.size[1] + "px";
    svgContainer.style.zIndex = 100;

    // The given extent (from Openlayers) is a view extent for the map's view.
    // So every animation frame, during movement, we know the map-view's extent in
    // mercator coords.
    // Think of it as two points: The top-left and bottom-right.
    // Since it is a rectangle, those two points give the rectangle,
    // of the map-view in mercator coords.
    // The viewbox is similar to the extent, except it defines a rectangle,
    // slightly differently.  ie. Top-left corner for position; with width and height
    // for dimensions.
    // const { height, width } = masterSvg.rbox();
    const height = frame.size[0];
    const width = frame.size[1];

    // think of these conversions as "pixels from lonLat 0, 0" in meaning.
    const { lonToX, latToY } = conversions; // using conversion lib.
    // Also in Podium, regardless of svg-layer, whenever we want
    // to turn mercator map-coords to latlon,
    // we need to do a conversion using ol-transforms.
    const [minX, minY, maxX, maxY] = transformExtent(
      frame.extent,
      "EPSG:3857", // Swap these two for conversion the other way around.
      "EPSG:4326"
    );

    // Using 0, 0 as the common anchor.
    const [svgMinX, svgMinY, svgMaxX, svgMaxY] = [
      lonToX(minX) + width / 2,
      latToY(minY) + height / 2,
      lonToX(maxX) + width / 2,
      latToY(maxY) + height / 2,
    ];

    const svgWidth = svgMaxX - svgMinX;
    const svgHeight = Math.abs(svgMaxY - svgMinY); // Must always be positive.
    // First two items represent coords of top-left corner of viewbox.
    // Think of the viewbox as a camera inside the svg.
    // Just like the view-extents is a camera inside the map.

    masterSvg.viewbox(svgMinX, svgMaxY, svgWidth, svgHeight);

    const { x: innerX, width: innerWidth } = innerSvg.value.attr();
    // This gives us, the "infinite"X - had concern that since I'm roughly, jumping the
    // whole rectangle-of-three-frames to new x-positions,
    // that there would be a judder,
    // but tried and:
    // the eye doesn't catch the jump/swap at all.
    if (svgMinX > innerX) jumpRight(innerX);
    if (svgMinX < innerX - innerWidth / 2) jumpLeft(innerX);
    return svgContainer;
  }

  function jumpRight(innerX) {
    innerSvg.value.attr({
      x: innerX + endOfWorldX,
    });
  }

  function jumpLeft(innerX) {
    innerSvg.value.attr({
      x: innerX - endOfWorldX,
    });
  }

  return { svgView, geoGroup, conversions };
};
