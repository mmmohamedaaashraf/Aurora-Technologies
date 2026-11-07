// Medical-scan hologram look for a skinned mixamo model + live skeleton overlay
export function holoMaterial(THREE, uniforms){
  const m = new THREE.MeshBasicMaterial({color:0x22d3ee, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide});
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRimN; varying vec3 vRimV; varying float vWY;')
      .replace('#include <fog_vertex>', `#include <fog_vertex>
        #if defined( USE_SKINNING ) || defined( USE_ENVMAP )
          vRimN = normalize( transformedNormal );
        #else
          vRimN = normalize( normalMatrix * normal );
        #endif
        vRimV = normalize( -mvPosition.xyz );
        vWY = ( modelMatrix * vec4( transformed, 1.0 ) ).y;`);
    // make sure transformedNormal exists when skinned (basic material computes it only with envmap/skinning)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRimN; varying vec3 vRimV; varying float vWY; uniform float uTime; uniform float uScan;')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float f = 1.0 - abs( dot( normalize(vRimN), normalize(vRimV) ) );
        float rim = pow( f, 2.4 );
        float lines = 0.5 + 0.5 * sin( vWY * 260.0 );
        float band = smoothstep( 0.10, 0.0, abs( vWY - uScan ) );
        vec3 base = mix( vec3(0.05,0.32,0.55), vec3(0.62,0.98,1.0), rim );
        float a = 0.05 + 0.85 * rim + 0.05 * lines * (0.3 + rim) + 0.35 * band;
        gl_FragColor = vec4( base * (0.6 + 0.6*band) + vec3(0.24,0.96,0.65) * band * 0.6, a );`);
  };
  return m;
}
export const SKEL = [
  ['Hips','Spine'],['Spine','Spine1'],['Spine1','Spine2'],['Spine2','Neck'],['Neck','Head'],
  ['Spine2','LeftShoulder'],['LeftShoulder','LeftArm'],['LeftArm','LeftForeArm'],['LeftForeArm','LeftHand'],
  ['Spine2','RightShoulder'],['RightShoulder','RightArm'],['RightArm','RightForeArm'],['RightForeArm','RightHand'],
  ['Hips','LeftUpLeg'],['LeftUpLeg','LeftLeg'],['LeftLeg','LeftFoot'],
  ['Hips','RightUpLeg'],['RightUpLeg','RightLeg'],['RightLeg','RightFoot']];
export const DOTS = ['Head','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftHand','RightHand','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg','LeftFoot','RightFoot','Neck'];
export function skeletonOverlay(THREE, bones){
  const g = new THREE.BufferGeometry(); const pos = new Float32Array(SKEL.length*6);
  g.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:0xeaf2ff, transparent:true, opacity:.75, depthTest:false}));
  lines.renderOrder = 5; lines.frustumCulled=false;
  const dotGeo = new THREE.SphereGeometry(.022,12,8);
  const dotMat = new THREE.MeshBasicMaterial({color:0x3df5a7, depthTest:false});
  const dots = DOTS.map(()=>{ const d=new THREE.Mesh(dotGeo,dotMat); d.renderOrder=6; return d; });
  const v=new THREE.Vector3();
  function update(parent){
    SKEL.forEach(([a,b],i)=>{ bones[a].getWorldPosition(v); parent.worldToLocal(v); pos.set([v.x,v.y,v.z], i*6); bones[b].getWorldPosition(v); parent.worldToLocal(v); pos.set([v.x,v.y,v.z], i*6+3); });
    g.attributes.position.needsUpdate = true;
    DOTS.forEach((k,i)=>{ bones[k].getWorldPosition(v); parent.worldToLocal(v); dots[i].position.copy(v); });
  }
  return {lines, dots, update};
}
