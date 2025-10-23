import * as BABYLON from 'babylonjs';
import { GridMaterial } from 'babylonjs-materials';

export interface AvatarPanelProps {
    mintedAddress: string;
    color: string;
    texture: string;
    background: string;
    secondaryColor: string;
    modelUrl?: string | null;
    lightIntensity: number;
}

export interface SceneReferences {
    scene: BABYLON.Scene | null;
    camera: BABYLON.ArcRotateCamera | null;
    shadowGenerator: BABYLON.ShadowGenerator | null;
    gridMaterial: GridMaterial | null;
    ground: BABYLON.Mesh | null;
    model: BABYLON.AbstractMesh | null;
    meshMaterial: BABYLON.StandardMaterial | null;
}

export interface CameraSettings {
    alpha: number;
    beta: number;
    radius: number;
    position: BABYLON.Vector3;
}