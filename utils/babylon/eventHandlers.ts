import * as BABYLON from 'babylonjs';
import { SceneReferences } from '../types';

export type MousePosition = { x: number; y: number };

export function setupModelRotationHandlers(
    canvas: HTMLCanvasElement,
    refs: SceneReferences,
    isDragging: boolean,
    setIsDragging: (isDragging: boolean) => void,
    previousPosition: MousePosition,
    setPreviousPosition: (position: MousePosition) => void
): () => void {
    const handleMouseDown = (event: MouseEvent): void => {
        event.preventDefault();
        if (event.button === 0) {
            setIsDragging(true);
            setPreviousPosition({
                x: event.clientX,
                y: event.clientY,
            });
        }
    };

    const handleMouseMove = (event: MouseEvent): void => {
        event.preventDefault();
        if (isDragging && refs.model) {
            const deltaX = event.clientX - previousPosition.x;
            const deltaY = event.clientY - previousPosition.y;
            refs.model.rotation.y += deltaX * 0.005;
            refs.model.rotation.x += deltaY * 0.005;
            setPreviousPosition({
                x: event.clientX,
                y: event.clientY,
            });
        }
    };

    const handleMouseUp = (): void => {
        setIsDragging(false);
    };

    const handleMouseLeave = (): void => {
        setIsDragging(false);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.style.touchAction = 'none';

    // Return cleanup function
    return () => {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
}

export function setupZoomHandler(
    canvas: HTMLCanvasElement,
    camera: BABYLON.ArcRotateCamera | null,
    onZoomUpdate?: (radius: number) => void
): () => void {
    const handleMouseWheel = (event: WheelEvent): void => {
        event.preventDefault();
        if (!camera) return;
        
        const zoomSpeed = 0.002;  // Reduced zoom speed
        const delta = event.deltaY * zoomSpeed;

        const minZoom = 1;
        const maxZoom = 20;

        let newRadius = camera.radius - delta;
        newRadius = Math.max(minZoom, Math.min(maxZoom, newRadius));
        camera.radius = newRadius;
        
        if (onZoomUpdate) {
            onZoomUpdate(camera.radius);
        }
    };

    canvas.addEventListener('wheel', handleMouseWheel);

    // Return cleanup function
    return () => {
        canvas.removeEventListener('wheel', handleMouseWheel);
    };
}