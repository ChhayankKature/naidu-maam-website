import { useEffect, useRef } from "react";
import * as THREE from "three";
import landPoints from "./landPoints.json";
import defaultConfig from "./netcore.config.js";
import "./NetworkGlobe.css";

const CITIES = [
  [40.7, -74.0], [34.0, -118.2], [19.4, -99.1], [-23.5, -46.6], [-34.6, -58.4],
  [51.5, -0.1], [48.9, 2.3], [52.5, 13.4], [55.8, 37.6], [41.0, 29.0],
  [30.0, 31.2], [6.5, 3.4], [-26.2, 28.0], [-1.3, 36.8], [25.2, 55.3],
  [19.1, 72.9], [28.6, 77.2], [13.1, 80.3], [1.35, 103.8], [22.3, 114.2],
  [31.2, 121.5], [39.9, 116.4], [35.7, 139.7], [37.6, 127.0], [-33.9, 151.2],
  [43.7, -79.4], [64.1, -21.9], [59.3, 18.1], [-12.0, -77.0], [4.7, -74.1]
];

const PAIRS = [
  [0, 5], [0, 1], [0, 3], [1, 22], [5, 15], [5, 10], [5, 20], [6, 11], [7, 8],
  [8, 21], [9, 14], [14, 19], [15, 18], [18, 24], [22, 24], [21, 22], [19, 22],
  [3, 12], [12, 13], [10, 14], [0, 28], [2, 0], [4, 5], [16, 8], [20, 1],
  [25, 5], [26, 0], [27, 17], [29, 6], [13, 15], [23, 1], [11, 3], [17, 12]
];

const toVec = (lat, lon, r = 1) => {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
};

const makeTexture = (draw) => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  draw(c.getContext("2d"));
  return new THREE.CanvasTexture(c);
};

const glowTexture = () =>
  makeTexture((g) => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.8)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });

const dotTexture = () =>
  makeTexture((g) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(32, 32, 20, 0, Math.PI * 2);
    g.fill();
  });

export default function NetworkGlobe({ config = defaultConfig }) {
  const mount = useRef(null);

  useEffect(() => {
    const { globe: G, arcs: A, holo: H } = config;
    const colors = G.colors;
    const el = mount.current;
    const cPrimary = new THREE.Color(colors.primary);
    const cSecondary = new THREE.Color(colors.secondary);
    const cAccent = new THREE.Color(colors.accent);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 0, 6);

    const rig = new THREE.Group();
    scene.add(rig);
    const tilt = new THREE.Group();
    tilt.rotation.x = G.tilt;
    tilt.rotation.z = -0.12;
    rig.add(tilt);
    const globe = new THREE.Group();
    tilt.add(globe);

    // shared time + resolution uniforms for every hologram shader
    const U = {
      uTime: { value: 0 },
      uPR: { value: 1 },
      uViewH: { value: 1 },
      uScan: { value: H.scanlines },
      uGap: { value: H.scanlineGap },
      uSweep: { value: H.sweep },
      uSweepSpeed: { value: H.sweepSpeed },
      uFlicker: { value: H.flicker }
    };

    // sizes given in CSS pixels, scaled by the pixel ratio on resize
    const pxMats = [];
    const pxPoints = (map, px, extra = {}) => {
      const m = new THREE.PointsMaterial({
        map, size: px, sizeAttenuation: false, transparent: true,
        depthWrite: false, alphaTest: 0.02, ...extra
      });
      pxMats.push([m, px]);
      return m;
    };

    const shaderCommon = `
      uniform float uTime, uPR, uViewH, uScan, uGap, uSweep, uSweepSpeed, uFlicker;
      float holo(float fragY, float opacity){
        float y = fragY / uPR;
        float scan = 1.0 - uScan * (0.5 + 0.5 * sin(y * 6.2831 / uGap - uTime * 2.2));
        float ny = fragY / (uPR * uViewH);
        float sweepY = fract(uTime * uSweepSpeed);
        float band = exp(-pow((ny - sweepY) * 9.0, 2.0));
        float fl = 1.0 - uFlicker * (0.5 + 0.5 * sin(uTime * 41.0) * sin(uTime * 13.0 + 1.7));
        return opacity * scan * fl * (1.0 + uSweep * 5.0 * band);
      }`;

    // occluder: hides the far side without painting anything
    const occluder = new THREE.Mesh(
      new THREE.SphereGeometry(0.995, 64, 64),
      new THREE.MeshBasicMaterial({ colorWrite: false })
    );
    occluder.renderOrder = -1;
    globe.add(occluder);

    // holographic body: tinted fresnel rim, scanlines through the glass
    const rimMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { ...U, uC1: { value: cPrimary }, uC2: { value: cSecondary } },
      vertexShader: `
        varying vec3 vN; varying vec3 vV; varying float vLat;
        void main(){
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vLat = position.y;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        ${shaderCommon}
        uniform vec3 uC1; uniform vec3 uC2;
        varying vec3 vN; varying vec3 vV; varying float vLat;
        void main(){
          float f = 1.0 - max(dot(vN, vV), 0.0);
          float rim = pow(f, 3.0) * 0.95 + pow(f, 8.0) * 0.9;
          float body = 0.05 + 0.07 * f;
          vec3 col = mix(uC2, uC1, smoothstep(-0.6, 0.9, vLat) * 0.6 + f * 0.5);
          float a = holo(gl_FragCoord.y, (rim + body) * 0.62);
          gl_FragColor = vec4(col, a);
        }`
    });
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.0, 96, 96), rimMat));

    // atmosphere halo
    globe.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.14, 64, 64),
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          uniforms: { uC: { value: cPrimary } },
          vertexShader: `
            varying vec3 vN; varying vec3 vV;
            void main(){
              vec4 mv = modelViewMatrix * vec4(position,1.0);
              vN = normalize(normalMatrix * normal);
              vV = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: `
            uniform vec3 uC;
            varying vec3 vN; varying vec3 vV;
            void main(){
              float f = pow(max(dot(-vN, vV), 0.0), 3.0);
              gl_FragColor = vec4(uC, f * 0.22);
            }`
        })
      )
    );

    // continents: shader dots with gradient, scanlines and limb brightening
    const landGeo = new THREE.BufferGeometry();
    const lp = new Float32Array(landPoints.length * 3);
    landPoints.forEach(([lon, lat], i) => {
      const v = toVec(lat, lon, 1.002);
      lp.set([v.x, v.y, v.z], i * 3);
    });
    landGeo.setAttribute("position", new THREE.BufferAttribute(lp, 3));

    const makeLand = (c1, c2, opacity, scale, pxScale) => {
      const m = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          ...U,
          uC1: { value: c1 }, uC2: { value: c2 },
          uOpacity: { value: opacity }, uPx: { value: G.landDotPx * pxScale }
        },
        vertexShader: `
          uniform float uPx, uPR;
          varying vec3 vN; varying vec3 vV; varying float vLat;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vN = normalize(normalMatrix * position);
            vV = normalize(-mv.xyz);
            vLat = position.y;
            gl_PointSize = uPx * uPR;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          ${shaderCommon}
          uniform vec3 uC1; uniform vec3 uC2; uniform float uOpacity;
          varying vec3 vN; varying vec3 vV; varying float vLat;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float dotA = smoothstep(0.5, 0.28, d);
            float facing = max(dot(normalize(vN), vV), 0.0);
            float limb = 0.55 + 0.9 * (1.0 - facing);
            vec3 col = mix(uC2, uC1, smoothstep(-0.8, 0.9, vLat));
            col = mix(col, vec3(1.0), 0.35 * facing);
            float a = holo(gl_FragCoord.y, uOpacity * dotA * limb);
            gl_FragColor = vec4(col, a);
          }`
      });
      const pts = new THREE.Points(landGeo, m);
      pts.scale.setScalar(scale);
      globe.add(pts);
      return pts;
    };
    makeLand(cPrimary, cSecondary, G.landOpacity, 1, 1);
    if (H.fringe > 0) makeLand(cAccent, cSecondary, H.fringe * 0.55, 1.012, 1.15);

    const dTex = dotTexture();
    const gTex = glowTexture();

    // ocean dot grid
    if (G.oceanDots) {
      const og = [];
      for (let lat = -80; lat <= 80; lat += 5)
        for (let lon = -180; lon < 180; lon += 5) og.push(toVec(lat, lon, 1.001));
      globe.add(
        new THREE.Points(
          new THREE.BufferGeometry().setFromPoints(og),
          pxPoints(dTex, 1.4, { color: cPrimary, opacity: 0.2 })
        )
      );
    }

    // graticule
    if (G.graticule) {
      const seg = [];
      for (let lat = -75; lat <= 75; lat += 15) {
        for (let lon = 0; lon < 360; lon += 4) {
          seg.push(toVec(lat, lon, 1.001), toVec(lat, lon + 4, 1.001));
        }
      }
      for (let lon = 0; lon < 360; lon += 15) {
        for (let lat = -88; lat < 88; lat += 4) {
          seg.push(toVec(lat, lon, 1.001), toVec(lat + 4, lon, 1.001));
        }
      }
      globe.add(
        new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(seg),
          new THREE.LineBasicMaterial({
            color: cPrimary, transparent: true, opacity: G.graticuleOpacity,
            depthWrite: false, blending: THREE.AdditiveBlending
          })
        )
      );
    }

    const arcsGroup = new THREE.Group();
    arcsGroup.visible = A.show;
    globe.add(arcsGroup);

    // city nodes
    const nodePos = new Float32Array(CITIES.length * 3);
    CITIES.forEach(([lat, lon], i) => {
      const v = toVec(lat, lon, 1.006);
      nodePos.set([v.x, v.y, v.z], i * 3);
    });
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
    arcsGroup.add(
      new THREE.Points(
        nodeGeo,
        pxPoints(gTex, A.nodePx * 4.2, { color: cPrimary, blending: THREE.AdditiveBlending })
      )
    );
    arcsGroup.add(
      new THREE.Points(nodeGeo, pxPoints(dTex, A.nodePx, { color: 0xffffff }))
    );

    // arcs
    const arcs = [];
    const SEG = 64;
    PAIRS.forEach(([a, b], idx) => {
      const va = toVec(CITIES[a][0], CITIES[a][1]).normalize();
      const vb = toVec(CITIES[b][0], CITIES[b][1]).normalize();
      const ang = va.angleTo(vb);
      const lift = (0.025 + ang * 0.09 + (idx % 4) * 0.012) * A.height;
      const pts = [];
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = va.clone().multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang))
          .add(vb.clone().multiplyScalar(Math.sin(t * ang) / Math.sin(ang)));
        p.normalize().multiplyScalar(1.004 + lift * Math.sin(Math.PI * t));
        pts.push(p);
      }
      arcsGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({
            color: idx % 3 === 0 ? cSecondary : cPrimary,
            transparent: true,
            opacity: A.opacity * (0.7 + (idx % 3) * 0.2),
            depthWrite: false,
            blending: THREE.AdditiveBlending
          })
        )
      );
      arcs.push({ pts, speed: 0.12 + (idx % 5) * 0.045, phase: (idx * 0.37) % 1 });
    });

    // travelling pulses
    const pulsePos = new Float32Array(arcs.length * 3);
    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(pulsePos, 3));
    const pulses = new THREE.Points(
      pulseGeo,
      pxPoints(gTex, 14, { color: cAccent, blending: THREE.AdditiveBlending })
    );
    pulses.visible = A.pulseSpeed > 0;
    arcsGroup.add(pulses);

    // floating specks
    if (G.specks > 0) {
      const specks = [];
      for (let i = 0; i < G.specks; i++) {
        specks.push(
          new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.1, Math.random() - 0.5)
            .normalize().multiplyScalar(1.05 + Math.random() * 0.45)
        );
      }
      globe.add(
        new THREE.Points(
          new THREE.BufferGeometry().setFromPoints(specks),
          pxPoints(dTex, 1.8, { color: cPrimary, opacity: 0.6 })
        )
      );
    }

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const pr = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
      U.uPR.value = pr;
      U.uViewH.value = h;
      pxMats.forEach(([m, px]) => (m.size = px * pr));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const halfH = 6 * Math.tan((camera.fov * Math.PI) / 360);
      const halfW = halfH * camera.aspect;
      const R = Math.min(G.radius, halfW * 1.05);
      rig.scale.setScalar(R);
      rig.position.y = halfH * (1 - 2 * G.topY) - R;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf;
    const timer = new THREE.Timer();
    const tmp = new THREE.Vector3();
    let nextGlitch = H.glitchEvery ? H.glitchEvery * (0.6 + Math.random() * 0.8) : Infinity;
    let glitchUntil = 0;

    const render = () => {
      timer.update();
      const dt = timer.getDelta();
      const t = timer.getElapsed();
      U.uTime.value = t;
      globe.rotation.y += dt * G.rotationSpeed;

      // small horizontal glitch with a flash of flicker
      if (t > nextGlitch) {
        glitchUntil = t + 0.14;
        nextGlitch = t + H.glitchEvery * (0.6 + Math.random() * 0.8);
      }
      if (t < glitchUntil) {
        rig.position.x = (Math.random() - 0.5) * 0.06;
        U.uFlicker.value = Math.min(1, H.flicker + 0.35);
      } else {
        rig.position.x = 0;
        U.uFlicker.value = H.flicker;
      }

      arcs.forEach((arc, i) => {
        const u = (arc.phase + t * arc.speed * A.pulseSpeed) % 1;
        const f = u * SEG;
        const i0 = Math.floor(f);
        const i1 = Math.min(i0 + 1, SEG);
        tmp.copy(arc.pts[i0]).lerp(arc.pts[i1], f - i0);
        pulsePos.set([tmp.x, tmp.y, tmp.z], i * 3);
      });
      pulseGeo.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [config]);

  const G0 = config.globe;
  return (
    <div
      className="globe-background"
      ref={mount}
      aria-hidden="true"
      style={{
        background: `radial-gradient(ellipse at 50% 85%, ${G0.colors.glow}24 0%, ${config.colors.background} 52%, #000 90%)`
      }}
    />
  );
}
