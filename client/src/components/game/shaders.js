import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import glsl from "babel-plugin-glsl/macro";

export const WaveShaderMaterial = shaderMaterial(
    // Uniform
    {
        uTime: 0,
        uColor: new THREE.Color(0.0, 0.0, 0.0),
        uTexture: new THREE.Texture(),
        uOpacity: 1.0
    },
    // Vertex Shader
    glsl`
    precision mediump float;
 
    varying vec2 vUv;
    varying float vWave;

    uniform float uTime;

    #pragma glslify: snoise3 = require(glsl-noise/simplex/3d.glsl);

    void main() {
      vUv = uv;

      vec3 pos = position;
      float noiseFreq = 2.0;
      float noiseAmp = 0.4;
      vec3 noisePos = vec3(pos.x * noiseFreq + uTime, pos.y, pos.z);
      vWave = snoise3(noisePos) * noiseAmp;
      pos.z = pos.z + vWave;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);  
    }
  `,
    // Fragment Shader
    glsl`
    precision mediump float;

    uniform vec3 uColor;
    uniform float uTime;
    uniform sampler2D uTexture;
    uniform float uOpacity;

    varying vec2 vUv;
    varying float vWave;

    void main() {
      float wave = vWave * 0.2;
      vec3 texture = uColor * texture2D(uTexture, vUv + wave).rgb;
      gl_FragColor = vec4(texture, 0.8 * uOpacity); 
    }
  `
);

// export const SandShaderMaterial = shaderMaterial(
//     {
//         uTime: 0,
//     },
//     // Vertex Shader
//     glsl`
//     precision mediump float;
//
//     uniform float uTime;
//     uniform float uRadius;
//
//     void main() {
//       vec3 p = position;
//       float speed = 0.1;
//       float t = 1.3;
//       float displacement = speed * uTime;
//       float y = p.y - displacement - 0.5;
//       float r = mod(y, t) + 0.5 - t;
//       displacement = max(r, -0.5);
//       p.y += displacement;
//
//       gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
//
//       gl_PointSize = 3.0;
//     }
//   `,
//     // Fragment Shader
//     glsl`
//     precision mediump float;
//
//     void main() {
//         gl_FragColor = vec4(0.34, 0.53, 0.96, 1.0);
//     }
//   `
// )