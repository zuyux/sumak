import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';

/**
 * Renders a 3D model (glb/gltf/fbx) to a square PNG image using Babylon.js (offscreen canvas).
 * @param modelUrl URL of the 3D model to render
 * @param size Size (width/height) of the output image in pixels (default: 512)
 * @param background Background color (default: '#000000')
 * @returns Promise<Blob> PNG image blob
 */
export async function renderModelToImage({
  modelUrl,
  size = 512,
  background = '#000000',
  lightIntensity = 11,
}: {
  modelUrl: string;
  size?: number;
  background?: string;
  lightIntensity?: number;
}): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    console.log('[renderModelToImage] Start', { modelUrl, size, background, lightIntensity });
    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.style.display = 'none';
    document.body.appendChild(canvas);

    let engine: BABYLON.Engine | null = null;
    let scene: BABYLON.Scene | null = null;
    try {
      engine = new BABYLON.Engine(canvas, true);
      scene = new BABYLON.Scene(engine);
      scene.clearColor = BABYLON.Color4.FromHexString(background);

  // Camera: 45-degree top-right looking at front
  const camera = new BABYLON.ArcRotateCamera('camera1', -Math.PI / 4, Math.PI / 3, 3.3, new BABYLON.Vector3(0, 0, 0), scene);
  camera.attachControl(canvas, false);

      // Light
      const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
      light.intensity = lightIntensity;

      // Load model
      console.log('[renderModelToImage] Importing mesh:', modelUrl);
      // Handle blob URLs correctly for Babylon.js loader
      let rootUrl = '';
      let filename = modelUrl;
      let pluginExtension: string | undefined = undefined;
      if (modelUrl.startsWith('blob:')) {
        rootUrl = '';
        filename = modelUrl;
        // Try to extract extension from the original file name in the blob URL (if available)
        // or fallback to .glb
        let ext = '.glb';
        const urlParts = modelUrl.split('.');
        if (urlParts.length > 1) {
          const possibleExt = urlParts[urlParts.length - 1].split(/[#?]/)[0];
          if (["glb", "gltf", "fbx", "obj"].includes(possibleExt.toLowerCase())) {
            ext = `.${possibleExt.toLowerCase()}`;
          }
        }
        pluginExtension = ext;
      } else if (modelUrl.startsWith('http')) {
        rootUrl = '';
        filename = modelUrl;
      } else {
        rootUrl = '/';
        filename = modelUrl;
      }
      console.log('[renderModelToImage] Using pluginExtension:', pluginExtension);
      BABYLON.SceneLoader.ImportMesh(
        '',
        rootUrl,
        filename,
        scene,
        function(meshes) {
          console.log('[renderModelToImage] Meshes loaded:', meshes);
          // Center and scale model
          const mesh = meshes[0];
          if (mesh) {
            // Compute bounding box center (Babylon.js BoundingInfo)
            let center = BABYLON.Vector3.Zero();
            if (mesh.getHierarchyBoundingVectors) {
              const bounds = mesh.getHierarchyBoundingVectors();
              center = bounds.min.add(bounds.max).scale(0.5);
            } else if (mesh.getBoundingInfo) {
              const boundingInfo = mesh.getBoundingInfo();
              if (boundingInfo && boundingInfo.boundingBox && boundingInfo.boundingBox.center) {
                center = boundingInfo.boundingBox.center;
              }
            }
            mesh.position = BABYLON.Vector3.Zero();
            mesh.scaling = new BABYLON.Vector3(1, 1, 1);
            // Move camera target to center
            camera.setTarget(center);
          } else {
            console.warn('[renderModelToImage] No mesh found in loaded model');
          }
          // Render once
          engine!.runRenderLoop(() => {
            scene!.render();
            // Wait a few frames for textures/materials
            setTimeout(() => {
              try {
                console.log('[renderModelToImage] Capturing canvas to PNG');
                const dataUrl = canvas.toDataURL('image/png');
                // Cleanup
                engine!.stopRenderLoop();
                engine!.dispose();
                canvas.remove();
                // Convert to Blob
                fetch(dataUrl)
                  .then(res => res.blob())
                  .then((blob) => {
                    console.log('[renderModelToImage] PNG Blob created', blob);
                    resolve(blob);
                  })
                  .catch((err) => {
                    console.error('[renderModelToImage] Error converting dataURL to Blob', err);
                    reject(err);
                  });
              } catch (e) {
                console.error('[renderModelToImage] Error capturing canvas', e);
                reject(e);
              }
            }, 300);
          });
        },
        undefined,
        function(scene, message) {
          console.error('[renderModelToImage] Model load error:', message);
          if (engine) engine.dispose();
          canvas.remove();
          reject(new Error(message));
        },
        pluginExtension
      );
    } catch (err) {
      console.error('[renderModelToImage] Unexpected error:', err);
      if (engine) engine.dispose();
      canvas.remove();
      reject(err);
    }
  });
}
