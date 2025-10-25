'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useMusicPlayer } from './MusicPlayerContext';
import * as THREE from 'three';

const OrbVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
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
  
  const { audioRef, isPlaying, currentAlbum } = useMusicPlayer();
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Settings based on requirements - use useMemo to prevent re-creation
  const settings = useMemo(() => ({
    rotationSpeed: 5.0,
    resolution: 69,
    distortion: 3.3,
    reactivity: 2.0
  }), []);

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

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
          60,
          window.innerWidth / window.innerHeight,
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
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(window.devicePixelRatio);
        rendererRef.current = renderer;

        container.appendChild(renderer.domElement);

        // Clock for timing
        clockRef.current = new THREE.Clock();

        // Lighting
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

        // Create anomaly object (orb)
        createAnomalyObject(scene);

        // Create background particles
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

      // Outer geometry with high resolution as specified
      const outerGeometry = new THREE.IcosahedronGeometry(
        radius,
        Math.max(1, Math.floor(settings.resolution / 8))
      );

      // Main orb material with audio-reactive distortion
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

      // Glow sphere
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

      // Get audio data if available
      if (analyserRef.current && frequencyDataRef.current) {
        analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
        let sum = 0;
        for (let i = 0; i < frequencyDataRef.current.length; i++) {
          sum += frequencyDataRef.current[i];
        }
        audioLevel = (sum / frequencyDataRef.current.length / 255) * settings.reactivity;
      }

      // Update orb
      if (anomalyObjectRef.current) {
        const audioRotationFactor = 1 + audioLevel * settings.reactivity;
        anomalyObjectRef.current.rotation.y += 0.005 * settings.rotationSpeed * audioRotationFactor;
        anomalyObjectRef.current.rotation.z += 0.002 * settings.rotationSpeed * audioRotationFactor;

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
  }, [settings, isInitialized]); // Include dependencies

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
      if (rendererRef.current && cameraRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

export default OrbVisualizer;