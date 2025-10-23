import * as BABYLON from 'babylonjs';

export function setupLighting(
    scene: BABYLON.Scene,
    secondaryColor: string,
    lightIntensity: number
): {
    hemisphericLight: BABYLON.HemisphericLight;
    directionalLight: BABYLON.DirectionalLight;
    directionalLight2: BABYLON.DirectionalLight;
    shadowGenerator: BABYLON.ShadowGenerator;
} {
    // Set hemispheric lighting
    const hemisphericLight = new BABYLON.HemisphericLight('light1', BABYLON.Vector3.Up(), scene);
    hemisphericLight.diffuse = BABYLON.Color3.FromHexString(secondaryColor);
    hemisphericLight.specular = BABYLON.Color3.White();

    // Add a directional light for better definition
    const directionalLight = new BABYLON.DirectionalLight(
        'dirLight',
        new BABYLON.Vector3(1, -1, -1),
        scene
    );
    directionalLight.diffuse = BABYLON.Color3.FromHexString("#FFFACD"); // Soft warm yellow color
    directionalLight.specular = BABYLON.Color3.White();
    directionalLight.intensity = lightIntensity;

    // Add a second directional light 
    const directionalLight2 = new BABYLON.DirectionalLight(
        'dirLight2', // Fixed: unique name to avoid conflict
        new BABYLON.Vector3(-1, 1, 1),
        scene
    );
    directionalLight2.specular = BABYLON.Color3.White();
    directionalLight2.intensity = (lightIntensity/3);

    // Add Soft Shadows
    const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight);

    return {
        hemisphericLight,
        directionalLight,
        directionalLight2,
        shadowGenerator
    };
}

export function updateLightIntensity(
    directionalLight: BABYLON.DirectionalLight,
    directionalLight2: BABYLON.DirectionalLight,
    intensity: number
): void {
    directionalLight.intensity = intensity;
    directionalLight2.intensity = intensity / 3;
}