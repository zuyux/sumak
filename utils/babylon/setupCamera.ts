import * as BABYLON from 'babylonjs';
import { CameraSettings } from '../types';

export function setupCamera(
    scene: BABYLON.Scene,
    canvas: HTMLCanvasElement,
    settings: CameraSettings
): BABYLON.ArcRotateCamera {
    const { alpha, beta, radius, position } = settings;
    
    // Create the camera with ArcRotateCamera
    const camera = new BABYLON.ArcRotateCamera(
        'camera1',
        alpha,
        beta,
        radius,
        position,
        scene
    );
    
    // Attach camera controls to canvas
    camera.attachControl(canvas, true);
    
    return camera;
}

export function updateCameraForModel(
    camera: BABYLON.ArcRotateCamera,
    modelHeight: number,
    radius: number
): void {
    const cameraZ = 0.9;
    const cameraY = modelHeight / 2;
    const cameraX = 0;
    
    const initialPosition = new BABYLON.Vector3(cameraX, cameraY, radius + cameraZ);
    camera.setPosition(initialPosition);
    camera.target = new BABYLON.Vector3(0, 0.9, 0);
    camera.radius = radius; // Fixed radius
}