import * as BABYLON from 'babylonjs';
import { GridMaterial } from 'babylonjs-materials';

export function setupGround(scene: BABYLON.Scene): {
    gridMaterial: GridMaterial;
    ground: BABYLON.Mesh;
} {
    // Create grid material
    const gridMaterial = new GridMaterial("gridMaterial", scene);
    gridMaterial.lineColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Thin gray lines
    gridMaterial.mainColor = new BABYLON.Color3(0.96, 0.96, 0.96); // Bold lines
    gridMaterial.gridRatio = 0.2; // Adjust for more or fewer major lines
    gridMaterial.backFaceCulling = false; // Ensure grid is visible from both sides

    // Create ground mesh
    const ground = BABYLON.MeshBuilder.CreateGround(
        "ground", 
        { width: 6, height: 6 }, 
        scene
    );
    ground.material = gridMaterial;
    ground.receiveShadows = true; // Ground can receive shadows

    return { gridMaterial, ground };
}