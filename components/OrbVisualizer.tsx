'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useMusicPlayer } from './MusicPlayerContext';
import * as THREE from 'three';

interface OrbVisualizerProps {
  externalAudioData?: Uint8Array | null;
}

const OrbVisualizer: React.FC<OrbVisualizerProps> = ({ 
  externalAudioData = null
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const circularCanvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const anomalyObjectRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const floatingParticlesRef = useRef<HTMLDivElement>(null);
  
  // Mouse/touch interaction states
  const mouseRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const rotationRef = useRef({ x: 0, y: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isGrabbing, setIsGrabbing] = useState(false);
  
  // Inertia system for smooth rotation
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastTimeRef = useRef(0);
  const dampingFactor = 0.95; // How quickly the inertia decays (0.95 = 5% decay per frame)
  const inertiaMultiplier = 0.8; // How much of the velocity to apply as inertia
  
  const { audioRef, isPlaying, currentAlbum } = useMusicPlayer();
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Settings based on requirements - use useMemo to prevent re-creation
  const settings = useMemo(() => ({
    rotationSpeed: 5.0,
    resolution: 69,
    distortion: 3.3,
    reactivity: 2.0,
    sensitivity: 5.0
  }), []);

  // Mouse/Touch interaction handlers
  const handleMouseDown = (event: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    isDraggingRef.current = true;
    setIsGrabbing(true);
    lastMouseRef.current = { x: clientX, y: clientY };
    lastTimeRef.current = performance.now();
    
    // Reset velocity when starting a new drag
    velocityRef.current = { x: 0, y: 0 };
    
    // Prevent default to avoid scrolling/zooming on touch devices
    event.preventDefault();
  };

  const handleMouseMove = (event: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    mouseRef.current = { x: clientX, y: clientY };

    if (isDraggingRef.current) {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;
      const deltaX = clientX - lastMouseRef.current.x;
      const deltaY = clientY - lastMouseRef.current.y;
      
      // Apply rotation with sensitivity
      const sensitivity = 0.01;
      rotationRef.current.x += deltaY * sensitivity;
      rotationRef.current.y += deltaX * sensitivity;
      
      // Calculate velocity for inertia (pixels per millisecond)
      if (deltaTime > 0) {
        velocityRef.current.x = deltaY / deltaTime;
        velocityRef.current.y = deltaX / deltaTime;
      }
      
      lastMouseRef.current = { x: clientX, y: clientY };
      lastTimeRef.current = currentTime;
      event.preventDefault();
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsGrabbing(false);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsGrabbing(false);
    isDraggingRef.current = false;
  };


  // Initialize floating particles
  useEffect(() => {
    if (!floatingParticlesRef.current) return;

    const container = floatingParticlesRef.current;
    const numParticles = 1000;
    
    // Clear any existing particles
    container.innerHTML = '';
    
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const centerX = windowWidth / 2;
    const centerY = windowHeight / 2;

    const particles: Array<{
      element: HTMLDivElement;
      x: number;
      y: number;
      speed: number;
      angle: number;
      angleSpeed: number;
      amplitude: number;
      size: number;
      pulseSpeed: number;
      pulsePhase: number;
    }> = [];

    for (let i = 0; i < numParticles; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = '1.5px';
      particle.style.height = '1.5px';
      particle.style.backgroundColor = `rgba(255, ${Math.floor(Math.random() * 100) + 78}, ${Math.floor(Math.random() * 100) + 66}, ${Math.random() * 0.5 + 0.2})`;
      particle.style.borderRadius = '50%';
      particle.style.pointerEvents = 'none';

      // Create hollow area in center
      const minDistance = 200;
      const maxDistance = Math.max(windowWidth, windowHeight) * 0.8;
      const angle = Math.random() * Math.PI * 2;
      const distanceFactor = Math.sqrt(Math.random());
      const distance = minDistance + distanceFactor * (maxDistance - minDistance);

      const x = Math.cos(angle) * distance + centerX;
      const y = Math.sin(angle) * distance + centerY;

      particle.style.left = x + 'px';
      particle.style.top = y + 'px';

      const particleObj = {
        element: particle,
        x: x,
        y: y,
        speed: Math.random() * 0.5 + 0.1,
        angle: Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() - 0.5) * 0.02,
        amplitude: Math.random() * 50 + 20,
        size: 1.5,
        pulseSpeed: Math.random() * 0.04 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2
      };

      particles.push(particleObj);
      container.appendChild(particle);
    }

    // Animate particles
    let time = 0;
    const animateParticles = () => {
      time += 0.01;

      particles.forEach((particle) => {
        particle.angle += particle.angleSpeed;

        const orbitX = centerX + Math.cos(particle.angle) * particle.amplitude;
        const orbitY = centerY + Math.sin(particle.angle) * particle.amplitude;

        const noiseX = Math.sin(time * particle.speed + particle.angle) * 5;
        const noiseY = Math.cos(time * particle.speed + particle.angle * 0.7) * 5;

        const newX = orbitX + noiseX;
        const newY = orbitY + noiseY;

        particle.element.style.left = newX + 'px';
        particle.element.style.top = newY + 'px';

        const pulseFactor = 1 + Math.sin(time * particle.pulseSpeed + particle.pulsePhase) * 0.3;
        const newSize = particle.size * pulseFactor;

        particle.element.style.width = newSize + 'px';
        particle.element.style.height = newSize + 'px';

        const baseOpacity = 0.2 + Math.sin(time * particle.pulseSpeed + particle.pulsePhase) * 0.1;
        particle.element.style.opacity = Math.min(0.8, baseOpacity).toString();
      });

      requestAnimationFrame(animateParticles);
    };

    animateParticles();
  }, []);

  // Initialize circular visualizer
  useEffect(() => {
    if (!circularCanvasRef.current) return;

    const canvas = circularCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = 450;
      canvas.height = 450;
    };
    resizeCanvas();

    const drawCircularVisualizer = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.clearRect(0, 0, width, height);

      // Use external audio data if available, otherwise use internal analyser
      let currentFrequencyData = frequencyDataRef.current;
      
      if (externalAudioData) {
        currentFrequencyData = new Uint8Array(externalAudioData);
      } else if (analyserRef.current && frequencyDataRef.current) {
        analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
        currentFrequencyData = frequencyDataRef.current;
      }

      if (currentFrequencyData) {
        
        const numPoints = 180;
        const baseRadius = Math.min(width, height) * 0.4;
        
        // Draw base circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 78, 66, 0.05)';
        ctx.fill();

        const numRings = 3;
          for (let ring = 0; ring < numRings; ring++) {
            const ringRadius = baseRadius * (0.7 + ring * 0.15);
            const opacity = 0.8 - ring * 0.2;
            
            ctx.beginPath();
            for (let i = 0; i < numPoints; i++) {
              const freqRangeStart = Math.floor((ring * currentFrequencyData.length) / (numRings * 1.5));
              const freqRangeEnd = Math.floor(((ring + 1) * currentFrequencyData.length) / (numRings * 1.5));
              const freqRange = freqRangeEnd - freqRangeStart;
              
              let sum = 0;
              const segmentSize = Math.floor(freqRange / numPoints);
              for (let j = 0; j < segmentSize; j++) {
                const freqIndex = freqRangeStart + ((i * segmentSize + j) % freqRange);
                sum += currentFrequencyData[freqIndex];
              }            const value = sum / (segmentSize * 255);
            const adjustedValue = value * (settings.sensitivity / 5) * settings.reactivity;
            const dynamicRadius = ringRadius * (1 + adjustedValue * 0.5);
            
            const angle = (i / numPoints) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * dynamicRadius;
            const y = centerY + Math.sin(angle) * dynamicRadius;
            
            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();
          
          const gradient = ctx.createRadialGradient(centerX, centerY, ringRadius * 0.8, centerX, centerY, ringRadius * 1.2);
          if (ring === 0) {
            gradient.addColorStop(0, `rgba(255, 78, 66, ${opacity})`);
            gradient.addColorStop(1, `rgba(194, 54, 47, ${opacity * 0.7})`);
          } else if (ring === 1) {
            gradient.addColorStop(0, `rgba(194, 54, 47, ${opacity})`);
            gradient.addColorStop(1, `rgba(255, 179, 171, ${opacity * 0.7})`);
          } else {
            gradient.addColorStop(0, `rgba(255, 179, 171, ${opacity})`);
            gradient.addColorStop(1, `rgba(255, 78, 66, ${opacity * 0.7})`);
          }
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2 + (numRings - ring);
          ctx.stroke();
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(255, 78, 66, 0.7)';
        }
        ctx.shadowBlur = 0;
      }
      
      requestAnimationFrame(drawCircularVisualizer);
    };

    drawCircularVisualizer();
  }, [settings.sensitivity, settings.reactivity, externalAudioData]);

  useEffect(() => {
    // Copy containerRef.current early to avoid stale closure
    const container = containerRef.current;
    
    const initThreeJS = async () => {
      try {
        if (!container) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0e17, 0.05);
        sceneRef.current = scene;

        // Get actual container dimensions to avoid cropping
        const containerRect = container.getBoundingClientRect();
        const width = Math.max(containerRect.width || window.innerWidth, window.innerWidth);
        const height = Math.max(containerRect.height || window.innerHeight, window.innerHeight);

        // Camera setup  
        const camera = new THREE.PerspectiveCamera(
          60,
          width / height,
          0.1,
          1000
        );
        camera.position.set(0, 0, 10);
        cameraRef.current = camera;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        });
        
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio to avoid performance issues
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        rendererRef.current = renderer;

        container.appendChild(renderer.domElement);

        // Clock for timing
        clockRef.current = new THREE.Clock();

        // Lighting setup identical to reference
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        const pointLight1 = new THREE.PointLight(0xff4e42, 1, 10);
        pointLight1.position.set(2, 2, 2);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xc2362f, 1, 10);
        pointLight2.position.set(-2, -2, -2);
        scene.add(pointLight2);

        // Create anomaly object (orb) - exactly matching reference
        createAnomalyObject(scene);

        // Create background particles identical to reference
        createBackgroundParticles(scene);

        setIsInitialized(true);

        // Start animation loop
        animate();

      } catch (error) {
        console.error('Error initializing Three.js:', error);
      }
    };

    const createAnomalyObject = (scene: THREE.Scene) => {
      const anomalyObject = new THREE.Group();
      const radius = 2;

      // Outer geometry with exact resolution calculation from reference
      const outerGeometry = new THREE.IcosahedronGeometry(
        radius,
        Math.max(1, Math.floor(settings.resolution / 8))
      );

      // Main orb material - exact copy from reference with our settings
      const outerMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0xff4e42) },
          audioLevel: { value: 0 },
          distortion: { value: settings.distortion }
        },
        vertexShader: `
          uniform float time;
          uniform float audioLevel;
          uniform float distortion;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
          vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
          vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
          
          float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            
            vec3 i  = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            
            i = mod289(i);
            vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                  
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            
            vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            
            vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
          }
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            
            float slowTime = time * 0.3;
            vec3 pos = position;
            
            float noise = snoise(vec3(position.x * 0.5, position.y * 0.5, position.z * 0.5 + slowTime));
            pos += normal * noise * 0.2 * distortion * (1.0 + audioLevel);
            
            vPosition = pos;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 color;
          uniform float audioLevel;
          varying vec3 vNormal;
          varying vec3 vPosition;
          
          void main() {
            vec3 viewDirection = normalize(cameraPosition - vPosition);
            float fresnel = 1.0 - max(0.0, dot(viewDirection, vNormal));
            fresnel = pow(fresnel, 2.0 + audioLevel * 2.0);
            
            float pulse = 0.8 + 0.2 * sin(time * 2.0);
            
            vec3 finalColor = color * fresnel * pulse * (1.0 + audioLevel * 0.8);
            
            float alpha = fresnel * (0.7 - audioLevel * 0.3);
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        wireframe: true,
        transparent: true
      });

      const outerSphere = new THREE.Mesh(outerGeometry, outerMaterial);
      anomalyObject.add(outerSphere);

      // Glow sphere - exact copy from reference
      const glowGeometry = new THREE.SphereGeometry(radius * 1.2, 32, 32);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0xff4e42) },
          audioLevel: { value: 0 }
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform float audioLevel;
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position * (1.0 + audioLevel * 0.2);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          uniform vec3 color;
          uniform float time;
          uniform float audioLevel;
          
          void main() {
            vec3 viewDirection = normalize(cameraPosition - vPosition);
            float fresnel = 1.0 - max(0.0, dot(viewDirection, vNormal));
            fresnel = pow(fresnel, 3.0 + audioLevel * 3.0);
            
            float pulse = 0.5 + 0.5 * sin(time * 2.0);
            float audioFactor = 1.0 + audioLevel * 3.0;
            
            vec3 finalColor = color * fresnel * (0.8 + 0.2 * pulse) * audioFactor;
            
            float alpha = fresnel * (0.3 * audioFactor) * (1.0 - audioLevel * 0.2);
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
      anomalyObject.add(glowSphere);

      scene.add(anomalyObject);
      anomalyObjectRef.current = anomalyObject;
    };

    const createBackgroundParticles = (scene: THREE.Scene) => {
      const particlesGeometry = new THREE.BufferGeometry();
      const particleCount = 3000;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      
      const color1 = new THREE.Color(0xff4e42);
      const color2 = new THREE.Color(0xc2362f);
      const color3 = new THREE.Color(0xffb3ab);

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

        let color;
        const colorChoice = Math.random();
        if (colorChoice < 0.33) {
          color = color1;
        } else if (colorChoice < 0.66) {
          color = color2;
        } else {
          color = color3;
        }

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = 0.05;
      }

      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 }
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          uniform float time;
          
          void main() {
            vColor = color;
            
            vec3 pos = position;
            pos.x += sin(time * 0.1 + position.z * 0.2) * 0.05;
            pos.y += cos(time * 0.1 + position.x * 0.2) * 0.05;
            pos.z += sin(time * 0.1 + position.y * 0.2) * 0.05;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          
          void main() {
            float r = distance(gl_PointCoord, vec2(0.5, 0.5));
            if (r > 0.5) discard;
            
            float glow = 1.0 - (r * 2.0);
            glow = pow(glow, 2.0);
            
            gl_FragColor = vec4(vColor, glow);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      });

      const particles = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particles);
    };

    const animate = () => {
      if (!isInitialized || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }

      const time = clockRef.current?.getElapsedTime() || 0;
      let audioLevel = 0;

      // Use external audio data if available, otherwise use internal music player data
      if (externalAudioData) {
        // Use external audio data for visualizer
        let sum = 0;
        for (let i = 0; i < externalAudioData.length; i++) {
          sum += externalAudioData[i];
        }
        audioLevel = ((sum / externalAudioData.length / 255) * settings.sensitivity) / 5;
        
        // Also copy external data to frequencyDataRef for circular visualizer
        if (frequencyDataRef.current && frequencyDataRef.current.length === externalAudioData.length) {
          frequencyDataRef.current.set(externalAudioData);
        } else {
          frequencyDataRef.current = new Uint8Array(externalAudioData);
        }
      } else if (analyserRef.current && frequencyDataRef.current) {
        // Use internal music player audio data
        analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
        let sum = 0;
        for (let i = 0; i < frequencyDataRef.current.length; i++) {
          sum += frequencyDataRef.current[i];
        }
        audioLevel = ((sum / frequencyDataRef.current.length / 255) * settings.sensitivity) / 5;
      }

      // Update orb - exact rotation calculations from reference plus manual rotation
      if (anomalyObjectRef.current) {
        const audioRotationFactor = 1 + audioLevel * settings.reactivity;
        
        // Apply automatic rotation
        const autoRotationY = 0.005 * settings.rotationSpeed * audioRotationFactor;
        const autoRotationZ = 0.002 * settings.rotationSpeed * audioRotationFactor;
        
        // Apply manual rotation from mouse/touch interaction with inertia
        anomalyObjectRef.current.rotation.x = rotationRef.current.x;
        anomalyObjectRef.current.rotation.y += autoRotationY + rotationRef.current.y * 0.01;
        anomalyObjectRef.current.rotation.z += autoRotationZ;

        // Apply inertia system when not actively dragging
        if (!isDraggingRef.current) {
          // Apply velocity-based inertia
          const sensitivity = 0.01;
          rotationRef.current.x += velocityRef.current.x * sensitivity * inertiaMultiplier;
          rotationRef.current.y += velocityRef.current.y * sensitivity * inertiaMultiplier;
          
          // Apply damping to velocity for smooth deceleration
          velocityRef.current.x *= dampingFactor;
          velocityRef.current.y *= dampingFactor;
          
          // Stop very small velocities to prevent infinite spinning
          if (Math.abs(velocityRef.current.x) < 0.001) velocityRef.current.x = 0;
          if (Math.abs(velocityRef.current.y) < 0.001) velocityRef.current.y = 0;
        }

        // Update materials
        anomalyObjectRef.current.children.forEach((child: THREE.Object3D) => {
          if ('isMesh' in child && child.isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material && 'uniforms' in mesh.material) {
              const material = mesh.material as THREE.ShaderMaterial;
              material.uniforms.time.value = time;
              material.uniforms.audioLevel.value = audioLevel;
              if ('distortion' in material.uniforms) {
                material.uniforms.distortion.value = settings.distortion;
              }
            }
          }
        });
      }

      // Update background particles
      if (sceneRef.current) {
        const particles = sceneRef.current.children.find((child: THREE.Object3D) => child.type === 'Points') as THREE.Points;
        if (particles && particles.material && 'uniforms' in particles.material) {
          const material = particles.material as THREE.ShaderMaterial;
          material.uniforms.time.value = time;
        }
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    initThreeJS();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      // Use the container variable captured in the effect scope
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [settings, isInitialized, externalAudioData]); // Include dependencies

  // Setup audio analysis
  useEffect(() => {
    if (!isPlaying || !audioRef.current || !currentAlbum) return;

    const setupAudio = async () => {
      try {
        if (!audioContextRef.current) {
          // Use proper typing for AudioContext
          const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioContextRef.current = new AudioContextClass();
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 2048;
          analyserRef.current.smoothingTimeConstant = 0.8;
          // Create frequency data array directly with the required size
          frequencyDataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        }

        if (!sourceRef.current && audioRef.current) {
          try {
            sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioContextRef.current.destination);
          } catch (error) {
            // Source might already exist, ignore error
            console.log('Audio source already connected or error:', error);
          }
        }
      } catch (error) {
        console.error('Error setting up audio analysis:', error);
      }
    };

    setupAudio();
  }, [isPlaying, audioRef, currentAlbum]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current && cameraRef.current && containerRef.current) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const width = Math.max(containerRect.width || window.innerWidth, window.innerWidth);
        const height = Math.max(containerRect.height || window.innerHeight, window.innerHeight);
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
        
        // Ensure the canvas fills the container properly
        const canvas = rendererRef.current.domElement;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global mouse/touch event listeners for drag functionality
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (isDraggingRef.current) {
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTimeRef.current;
        const deltaX = event.clientX - lastMouseRef.current.x;
        const deltaY = event.clientY - lastMouseRef.current.y;
        
        const sensitivity = 0.01;
        rotationRef.current.x += deltaY * sensitivity;
        rotationRef.current.y += deltaX * sensitivity;
        
        // Calculate velocity for inertia
        if (deltaTime > 0) {
          velocityRef.current.x = deltaY / deltaTime;
          velocityRef.current.y = deltaX / deltaTime;
        }
        
        lastMouseRef.current = { x: event.clientX, y: event.clientY };
        lastTimeRef.current = currentTime;
        event.preventDefault();
      }
    };

    const handleGlobalTouchMove = (event: TouchEvent) => {
      if (isDraggingRef.current && event.touches.length > 0) {
        const touch = event.touches[0];
        const currentTime = performance.now();
        const deltaTime = currentTime - lastTimeRef.current;
        const deltaX = touch.clientX - lastMouseRef.current.x;
        const deltaY = touch.clientY - lastMouseRef.current.y;
        
        const sensitivity = 0.01;
        rotationRef.current.x += deltaY * sensitivity;
        rotationRef.current.y += deltaX * sensitivity;
        
        // Calculate velocity for inertia
        if (deltaTime > 0) {
          velocityRef.current.x = deltaY / deltaTime;
          velocityRef.current.y = deltaX / deltaTime;
        }
        
        lastMouseRef.current = { x: touch.clientX, y: touch.clientY };
        lastTimeRef.current = currentTime;
        event.preventDefault();
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsGrabbing(false);
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsGrabbing(false);
      }
    };

    // Add global listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, []);

  return (
    <>
      {/* Three.js container */}
      <div 
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          width: '100vw',
          height: '100vh',
          top: 0,
          left: 0
        }}
      />

      {/* Interactive orb area overlay */}
      <div 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] z-35 rounded-full transition-all duration-200"
        style={{
          cursor: isGrabbing ? 'grabbing' : 'grab',
          pointerEvents: 'auto',
          backgroundColor: isHovering ? 'rgba(255, 78, 66, 0.02)' : 'transparent',
          border: isHovering ? '1px solid rgba(255, 78, 66, 0.1)' : '1px solid transparent'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      />

      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none z-20"
           style={{
             backgroundImage: `
               linear-gradient(to right, rgba(255, 240, 230, 0.02) 1px, transparent 1px),
               linear-gradient(to bottom, rgba(255, 240, 230, 0.02) 1px, transparent 1px)
             `,
             backgroundSize: '40px 40px'
           }} />

      {/* Circular visualizer */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] pointer-events-none z-30">
        <canvas
          ref={circularCanvasRef}
          width={450}
          height={450}
          className="w-full h-full"
        />
      </div>

      {/* Audio wave rings */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none z-20">
        <div className="w-full h-full rounded-full border border-red-400/10 relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full border border-red-400/5 animate-pulse" 
               style={{ 
                 animation: 'pulse 4s infinite',
                 animationDelay: '0s'
               }} />
        </div>
      </div>

      {/* Floating particles */}
      <div 
        ref={floatingParticlesRef}
        className="fixed inset-0 pointer-events-none z-25"
      />

      {/* Scanner frame - the targeting UI */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-red-400 pointer-events-none z-40  opacity-5 ">
        {/* Corner markers */}
        <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-red-400 opacity-5" />
        <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-red-400 opacity-5" />
        <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-red-400 opacity-5" />
        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-red-400 opacity-5" />

      </div>



      <style jsx>{`
        @keyframes pulse {
          0% {
            width: 100%;
            height: 100%;
            opacity: 0.5;
          }
          50% {
            width: 120%;
            height: 120%;
            opacity: 0;
          }
          100% {
            width: 100%;
            height: 100%;
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
};

export default OrbVisualizer;