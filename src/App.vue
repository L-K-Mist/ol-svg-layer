<template>
  <div
    id="chart-wrapper"
    class="chart-wrapper chart-layer"
    ref="chartWrapperDiv"
  >
    <div id="chart" ref="chartDiv"></div>
  </div>
  <div class="mouse-control" id="mouse-control"></div>
  <div></div>
</template>

<script setup>
import { onMounted, ref, defineExpose, defineEmits, nextTick } from "vue";

// OpenLayers
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { defaults as defaultControls } from "ol/control";
import { createStringXY } from "ol/coordinate";
import VectorLayer from "ol/layer/Vector";
import MousePosition from "ol/control/MousePosition";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import "ol/ol.css";
import { SVG } from "@svgdotjs/svg.js";

const chartDiv = ref(null);
let map = ref(null);

// The parent of the div the map is attached to.
// Fed to useSvgMapLayer for registering the svg dimensions.
const chartWrapperDiv = ref(null);

let tileLayer;

onMounted(() => {
  mountMap();
  nextTick(() => {
    // Paint operations go here.
  });
});

function mountMap() {
  const mousePositionControl = new MousePosition({
    projection: "EPSG:4326",
    coordinateFormat: createStringXY(4),
  });

  tileLayer = new TileLayer({
    source: new OSM(),
    zIndex: 0,
    opacity: 0.7,
  });

  // The base map used, with same projection as Podium.
  map.value = new Map({
    target: chartDiv.value,
    controls: defaultControls().extend([mousePositionControl]),
    projection: "EPSG:3857",
    // layers: [tileLayer],
    // allOverlays: true,
    view: new View({
      center: fromLonLat([0, 0]),
      projection: "EPSG:3857",
      zoom: 1,
    }),
  });

  const featureLayer = new VectorLayer({
    transparent: true,
    source: new VectorSource(),
    zIndex: 0,
  });

  map.value.addLayer(tileLayer);

  map.value.addLayer(featureLayer);
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
#chart-wrapper {
  position: relative;
  display: block;
  height: 80vh;
  margin: 0 80px;
  border: 1px dotted blue;
}

.svg-container {
  position: absolute;
  transform-origin: top left;
  z-index: 2;
}

/* REM A class like this is required by the useFunction */
.svg-viewport {
  /* position: absolute;
  top: 0; */
  width: 100%;
  height: 100%;
  /** Just couldn't get my center-circle to line up perfectly with the map-center-point
  puzzled all sorts of things, turns out it was because of using border below instad of outline.
  */
  /* outline: 2px dashed pink; */
  /* svg has special pointer-events beyond this: 
  https://css-tricks.com/almanac/properties/p/pointer-events/
  */
  pointer-events: none;
}

/* REM A class like this is required by the useFunction */
.inner-svg {
  width: 100%;
  height: 100%;
  /* Very useful overflow, gives us an infinite canvas that handles negative coords.
  In our case all geo-dots etc happen within this svg.
  Even though this svg starts in the geo-center ie bottom right of globe, 
  we can see geo-dots even in this svg's negative coords because overflow is visible.
  Similarly the masterSvg can display elements beyond its own bounds via the viewBox.
  For testing try `overflow: visible` on svg-viewport to see items visible even outside map bounds. */
  overflow: visible;
  transform-origin: center;
}

#chart {
  height: 100%;
  width: 100%;
}
</style>
