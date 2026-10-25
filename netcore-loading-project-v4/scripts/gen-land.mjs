import fs from "node:fs";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/land-110m.json", "utf8"));
const land = feature(topo, topo.objects.land);
const pts = [];
const step = 1.1; // degrees of latitude spacing
for (let lat = -58; lat <= 84; lat += step) {
  const stepLon = step / Math.max(Math.cos((lat * Math.PI) / 180), 0.18);
  for (let lon = -180; lon < 180; lon += stepLon) {
    if (geoContains(land, [lon, lat])) pts.push([+lon.toFixed(2), +lat.toFixed(2)]);
  }
}
fs.writeFileSync("src/landPoints.json", JSON.stringify(pts));
console.log(pts.length, "points");
