/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useRef, MutableRefObject } from 'react';
import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';
import { GridMaterial } from 'babylonjs-materials'; // Import GridMaterial directly - NEW IMPORT

interface CenterPanelProps {
    background: string;
    secondaryColor: string;
    modelUrl?: string | null;
    lightIntensity: number; 
}

export default function CenterPanel({
    background, secondaryColor,
    modelUrl, lightIntensity 
}: CenterPanelProps) {
    const mountRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<BABYLON.Scene | null>(null) as MutableRefObject<BABYLON.Scene | null>;
    const modelRef = useRef<BABYLON.AbstractMesh | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [previousMousePosition, setPreviousMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [meshMaterial, setMeshMaterial] = useState<BABYLON.StandardMaterial | null>(null);
    const cameraRef = useRef<BABYLON.ArcRotateCamera | null>(null); // Ref for camera
    const shadowGeneratorRef = useRef<BABYLON.ShadowGenerator | null>(null); // Ref for ShadowGenerator
    const gridMaterialRef = useRef<GridMaterial | null>(null); // Ref for GridMaterial - NEW
    const groundRef = useRef<BABYLON.Mesh | null>(null); // Ref for ground mesh - NEW

    // State variables - Debugging information (can be removed in production if not needed)
    const [cameraPositionState, setCameraPositionState] = useState<string>('0, 0, 0');
    const [cameraZoomState, setCameraZoomState] = useState<number>(2.4);
    const [currentLightIntensity, setCurrentLightIntensity] = useState<number>(lightIntensity); // State to track intensity for display

    // Hardcoded camera parameters in CenterPanel - No longer props
    const cameraAlpha = Math.PI / 4;
    const cameraBeta = Math.PI / 4;
    const cameraRadius = 3.3;
    const cameraPositionX = 0;
    const cameraPositionY = 0;
    const cameraPositionZ = 0;


    useEffect(() => {
        console.log("CenterPanel modelUrl:", modelUrl);
        if (!mountRef.current || typeof window === 'undefined') return;

        // Create the Babylon.js engine and scene (adapt to device pixel ratio)
        const engine = new BABYLON.Engine(mountRef.current, true, { adaptToDeviceRatio: true });
        const scene = new BABYLON.Scene(engine);
        sceneRef.current = scene;

        // Set background color
        scene.clearColor = BABYLON.Color4.FromHexString(background);

        // Create the camera with ArcRotateCamera - Hardcoded parameters
        const camera = new BABYLON.ArcRotateCamera('camera1', cameraAlpha, cameraBeta, cameraRadius, new BABYLON.Vector3(cameraPositionX, cameraPositionY, cameraPositionZ), scene);
        camera.attachControl(mountRef.current, true);
        cameraRef.current = camera;

        // Set lighting
        const light = new BABYLON.HemisphericLight('light1', BABYLON.Vector3.Up(), scene);
        light.diffuse = BABYLON.Color3.FromHexString(secondaryColor);
        light.specular = BABYLON.Color3.White();

        // Add a directional light for better definition
        const directionalLight = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(1, -1, -1), scene);
        directionalLight.intensity = lightIntensity;
        directionalLight.diffuse = BABYLON.Color3.FromHexString("#FFFACD"); // Soft warm yellow color for diffuse
        directionalLight.specular = BABYLON.Color3.White(); // Keep specular white or adjust as needed
        directionalLight.intensity = currentLightIntensity; // Initialize intensity from state
        directionalLight.intensity = lightIntensity; // Initialize intensity from prop

        // Add a second directional light 
        const directionalLight2 = new BABYLON.DirectionalLight('dirLight', new BABYLON.Vector3(-1, 1, 1), scene);
        directionalLight2.intensity = (lightIntensity/3);
        directionalLight2.specular = BABYLON.Color3.White(); // Keep specular white or adjust as needed
        directionalLight2.intensity = (currentLightIntensity/3); // Initialize intensity from state
        directionalLight2.intensity = (lightIntensity/3); // Initialize intensity from prop

        // Add Soft Shadows
        const shadowGenerator = new BABYLON.ShadowGenerator(1024, directionalLight); // 1024 is shadow map size
        shadowGeneratorRef.current = shadowGenerator; // Store shadow generator in ref

        // --- Floor Grid ---
        const gridMaterial = new GridMaterial("gridMaterial", scene); // Use the imported GridMaterial
        gridMaterialRef.current = gridMaterial; // Store grid material in ref
        
        // Theme-aware grid colors
        const isLightMode = background === '#f5f5f5';
        if (isLightMode) {
            // Light mode: light gray grid on white background
            gridMaterial.lineColor = new BABYLON.Color3(0.8, 0.8, 0.8); // Light gray lines
            gridMaterial.mainColor = new BABYLON.Color3(0.9, 0.9, 0.9); // Very light gray for main lines
        } else {
            // Dark mode: darker grid on dark background
            gridMaterial.lineColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Medium gray lines
            gridMaterial.mainColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Dark gray for main lines
        }
        
        gridMaterial.gridRatio = 0.2; // Adjust for more or fewer major lines
        gridMaterial.backFaceCulling = false; // Ensure grid is visible from both sides

        // Create ground mesh
        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);
        groundRef.current = ground; // Store ground mesh in ref
        ground.material = gridMaterial; // Apply grid material to ground
        ground.receiveShadows = true; // Ground can receive shadows

        // Function to update camera information (for debugging display)
        const updateCameraInfo = () => {
            if (cameraRef.current) {
                const currentCamera = cameraRef.current;
                const position = currentCamera.position;
                setCameraPositionState(`${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}`);
                setCameraZoomState(currentCamera.radius);
                setCurrentLightIntensity(directionalLight.intensity); 
            }
        };

        const loadModel = (modelPath: string) => {
            console.log('Loading model from:', modelPath);
            if (!sceneRef.current || !modelPath) return; 

            BABYLON.SceneLoader.ImportMesh('', modelPath, '', sceneRef.current, (meshes) => {
                if (meshes && meshes.length > 0) {
                    // Dispose of the old model if it exists
                    if (modelRef.current) {
                        modelRef.current.dispose();
                    }
                    modelRef.current = meshes[0];
                    modelRef.current.receiveShadows = true; // Model receives shadows

                    // --- Hardcoded Camera Positioning - FIXED ZOOM
                    const modelHeight = 1.8;
                    const cameraZ = 0.9;
                    const cameraY = modelHeight / 2;
                    const cameraX = 0;
                    const initialPosition = new BABYLON.Vector3(cameraX, cameraY, cameraRadius + cameraZ);
                    camera.setPosition(initialPosition);
                    camera.target = new BABYLON.Vector3(0, 0.9, 0);
                    camera.radius = cameraRadius; // HARDCODE RADIUS HERE, OVERRIDE ANY DYNAMIC CALCULATION
                    cameraRef.current = camera;

                    updateCameraInfo();

                    // Material application
                    if (!sceneRef.current) {
                        console.error("Scene not initialized, cannot create material.");
                        return;
                    }
                    const material = new BABYLON.StandardMaterial('meshMaterial', sceneRef.current);
                    material.diffuseColor = BABYLON.Color3.FromHexString("#f5f5f5");
                    material.specularColor = BABYLON.Color3.Black();
                    setMeshMaterial(material);

                    if (modelRef.current instanceof BABYLON.Mesh) {
                        modelRef.current.material = material;
                        shadowGeneratorRef.current?.addShadowCaster(modelRef.current, true); // Model casts shadows
                    }
                }
            }, undefined, undefined, ".glb");
        };

        // Load initial model
        loadModel(modelUrl || 'default.glb');

        // Single animation loop (remove duplicate)
        const rotationSpeed = 0.005;
        engine.runRenderLoop(() => {
            scene?.render();
            updateCameraInfo();
            if (cameraRef.current) {
                cameraRef.current.alpha += rotationSpeed;
                cameraRef.current.target = new BABYLON.Vector3(0, 0.9, 0);
            }
        });

        // Handle mouse events for drag functionality (rotation)
        const handleMouseDown = (event: MouseEvent) => {
            event.preventDefault();
            if (event.button === 0) {
                setIsDragging(true);
                setPreviousMousePosition({
                    x: event.clientX,
                    y: event.clientY,
                });
            }
        };

        const handleMouseMove = (event: MouseEvent) => {
            event.preventDefault();
            if (isDragging && modelRef.current) {
                const deltaX = event.clientX - previousMousePosition.x;
                const deltaY = event.clientY - previousMousePosition.y;
                modelRef.current.rotation.y += deltaX * 0.005;
                modelRef.current.rotation.x += deltaY * 0.005;
                setPreviousMousePosition({
                    x: event.clientX,
                    y: event.clientY,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        const handleMouseLeave = () => {
            setIsDragging(false);
        };

        // Remove mouse wheel zooming by not adding the wheel event listener
        // (Do not add: canvas.addEventListener('wheel', handleMouseWheel);)

        // Add event listeners (without wheel)
        const canvas = mountRef.current;
        if (canvas) {
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mouseup', handleMouseUp);
            canvas.addEventListener('mouseleave', handleMouseLeave);
            // Do NOT add wheel event
            canvas.style.touchAction = 'none';
        }

        // Disable zooming on the ArcRotateCamera
        if (cameraRef.current) {
            cameraRef.current.lowerRadiusLimit = cameraRef.current.radius;
            cameraRef.current.upperRadiusLimit = cameraRef.current.radius;
            cameraRef.current.pinchPrecision = 0; // disables pinch zoom on touch devices
            cameraRef.current.wheelPrecision = 0; // disables wheel zoom
        }

        // Resize listener
        const handleResize = () => engine.resize();
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            if (canvas) {
                canvas.removeEventListener('mousedown', handleMouseDown);
                canvas.removeEventListener('mousemove', handleMouseMove);
                canvas.removeEventListener('mouseup', handleMouseUp);
                canvas.removeEventListener('mouseleave', handleMouseLeave);
            }
            window.removeEventListener('resize', handleResize);
            engine.dispose();
        };
    }, [background, secondaryColor, modelUrl, lightIntensity]);

    useEffect(() => {
        if (modelRef.current && isDragging) {
            modelRef.current.rotation.y += 0;
            modelRef.current.rotation.x += 0;
        }
    }, [isDragging, previousMousePosition.x, previousMousePosition.y]);

    useEffect(() => {
        if (sceneRef.current) { // Ensure scene is initialized
            const directionalLight = sceneRef.current.getLightByName('dirLight') as BABYLON.DirectionalLight;
            if (directionalLight) {
                directionalLight.intensity = lightIntensity; // Update directional light intensity from prop
                setCurrentLightIntensity(lightIntensity); // Update state for debug display
            }
        }
    }, [lightIntensity]); // useEffect to respond to lightIntensity prop changes


    return (
        <main className="w-full max-w-[520px] md:max-w-[640px] lg:max-w-[720px] xl:max-w-[820px] aspect-square rounded-3xl z-10 mx-auto mt-6 md:mt-10">
            <canvas
                ref={mountRef}
                className="w-full h-full cursor-grab active:cursor-grabbing block rounded-2xl outline-none"
                onMouseDown={(e) => e.preventDefault()}
            />
            <div
                style={{
                    position: 'fixed',
                    bottom: '0px',
                    right: '0px',
                    backgroundColor: background,
                    color: background === '#f5f5f5' ? '#333' : 'white',
                    padding: '5px',
                    borderRadius: '5px',
                    fontSize: '12px',
                    textAlign: 'right',
                }}
                className='hidden md:flex space-x-4 select-none' 
            >
                <div>{cameraPositionState}</div>
                <div>{cameraZoomState.toFixed(2)}</div>
                <div>{currentLightIntensity.toFixed(2)}</div> 
                {meshMaterial && <div>{meshMaterial.diffuseColor.toHexString()}</div>}
            </div>
        </main>
    );
}