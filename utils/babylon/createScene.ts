import * as BABYLON from 'babylonjs';
import { SceneReferences } from '../types';

export function createScene(
    canvas: HTMLCanvasElement,
    backgroundColor: string
): { engine: BABYLON.Engine; scene: BABYLON.Scene } {
    // Create the Babylon.js engine and scene
    const engine = new BABYLON.Engine(canvas, true);
    const scene = new BABYLON.Scene(engine);

    // Set background color
    scene.clearColor = BABYLON.Color4.FromHexString(backgroundColor);

    return { engine, scene };
}

export function disposeScene(engine: BABYLON.Engine): void {
    engine.dispose();
}