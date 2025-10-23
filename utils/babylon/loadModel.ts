import * as BABYLON from 'babylonjs';
import { SceneReferences } from '../types';
import { updateCameraForModel } from './setupCamera';

export function loadModel(
    scene: BABYLON.Scene,
    modelPath: string,
    refs: SceneReferences,
    onModelLoaded?: (mesh: BABYLON.AbstractMesh) => void
): void {
    BABYLON.SceneLoader.ImportMesh(
        '',
        '/models/',
        modelPath,
        scene,
        (meshes) => {
            if (meshes && meshes.length > 0) {
                // Dispose of the old model if it exists
                if (refs.model) {
                    refs.model.dispose();
                }
                
                const modelMesh = meshes[0];
                refs.model = modelMesh;
                modelMesh.receiveShadows = true; // Model receives shadows
                
                // Update camera position for the model
                if (refs.camera) {
                    updateCameraForModel(refs.camera, 1.8, refs.camera.radius);
                }
                
                // Create and apply material
                if (scene) {
                    const material = new BABYLON.StandardMaterial('meshMaterial', scene);
                    material.diffuseColor = BABYLON.Color3.FromHexString("#f5f5f5");
                    material.specularColor = BABYLON.Color3.Black();
                    refs.meshMaterial = material;
                    
                    if (modelMesh instanceof BABYLON.Mesh) {
                        modelMesh.material = material;
                        
                        // Add shadow casting
                        if (refs.shadowGenerator) {
                            refs.shadowGenerator.addShadowCaster(modelMesh, true);
                        }
                    }
                }
                
                // Call callback if provided
                if (onModelLoaded) {
                    onModelLoaded(modelMesh);
                }
            }
        },
        undefined,
        undefined,
        ".glb"
    );
}

export function updateModelColor(
    model: BABYLON.AbstractMesh | null,
    material: BABYLON.StandardMaterial | null,
    color: string
): void {
    if (material) {
        material.diffuseColor = BABYLON.Color3.FromHexString(color);
    }
}