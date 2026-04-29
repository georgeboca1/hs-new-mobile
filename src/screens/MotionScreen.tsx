import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text, View, Platform, Image} from 'react-native';
import {WebView} from 'react-native-webview';
import {useTelemetryStore} from '../store/useTelemetryStore';
import {AppColors, useAppColors} from '../theme/colors';
import {ParachuteData} from '../types/telemetry';

// Resolve the model URI via Metro/Asset system
const modelAsset = require('../../public/esp32.glb');
const resolveModelUri = () => Image.resolveAssetSource(modelAsset).uri;

type MotionSample = {
  pitch: number;
  roll: number;
  yaw: number;
  ax: number;
  ay: number;
  az: number;
  timestamp: string;
};

type MotionTelemetry = Partial<ParachuteData>;

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function buildMotionViewerHtml(initialSample: MotionSample, modelUri: string): string {
  const rotX = initialSample.pitch !== undefined ? -initialSample.pitch : 0;
  const rotY = initialSample.roll !== undefined ? initialSample.roll : 0;
  const rotZ = initialSample.yaw !== undefined ? -initialSample.yaw : 0;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Three.js IMU Viewer</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: radial-gradient(circle at 30% 20%, #2e3338 0%, #181b1f 45%, #0f1114 100%);
    }
    #app { width: 100%; height: 100%; }
    #hud {
      position: fixed; top: 12px; left: 12px; z-index: 10;
      color: #eaf0f6; font-family: sans-serif; font-size: 11px;
      background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px; padding: 6px 10px; backdrop-filter: blur(4px);
    }
    #controls {
      position: fixed; right: 12px; bottom: 12px; z-index: 10;
      display: flex; gap: 8px;
    }
    #controls button {
      width: 40px; height: 40px; border: 0; border-radius: 10px;
      font-size: 18px; color: #fff; background: rgba(30, 35, 45, 0.8);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    canvas { display: block; width: 100%; height: 100%; touch-action: none; }
  </style>
</head>
<body>
  <div id="app"></div>
  <div id="hud">Initializing...</div>
  <div id="controls">
    <button id="zoomIn">+</button>
    <button id="zoomOut">-</button>
    <button id="reset">R</button>
  </div>

  <script>
    window.__imuPending = { x: ${rotX}, y: ${rotY}, z: ${rotZ} };
    
    const logToApp = (type, message) => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, message }));
      }
    };
    
    window.updateImuRotation = function (x, y, z) {
      window.__imuPending.x = Number(x) || 0;
      window.__imuPending.y = Number(y) || 0;
      window.__imuPending.z = Number(z) || 0;
    };
    
    window.onerror = (msg, url, line) => {
      logToApp('error', 'JS Error: ' + msg + ' at ' + line);
    };
  </script>

  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  
  <script>
    (function () {
      const hud = document.getElementById('hud');
      const log = (msg) => { console.log(msg); logToApp('log', msg); };
      const error = (msg) => { console.error(msg); logToApp('error', msg); hud.textContent = msg; hud.style.color = '#ff6b6b'; };

      if (!window.THREE) return error('THREE not found');
      if (!THREE.GLTFLoader) return error('GLTFLoader not found');

      log('Three.js initialized');

      const container = document.getElementById('app');
      const scene = new THREE.Scene();
      const worldRoot = new THREE.Group();
      scene.add(worldRoot);
      
      const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.01, 100);
      camera.position.set(0, 0, 2.8);
      
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(5, 5, 5);
      scene.add(dir);

      const modelRoot = new THREE.Group();
      worldRoot.add(modelRoot);

      const placeholder = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.3, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x3366ff })
      );
      modelRoot.add(placeholder);

      let activeModel = null;

      function loadModel() {
        const modelUri = "${modelUri}";
        log('Starting model load from: ' + modelUri);
        const loader = new THREE.GLTFLoader();
        
        loader.load(modelUri, (gltf) => {
          log('Load successful');
          if (activeModel) modelRoot.remove(activeModel);
          modelRoot.remove(placeholder);
          activeModel = gltf.scene;
          modelRoot.add(activeModel);
          
          const box = new THREE.Box3().setFromObject(activeModel);
          const center = new THREE.Vector3();
          box.getCenter(center);
          const size = new THREE.Vector3();
          box.getSize(size);
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.2 / (maxDim || 1); // Slightly larger scale
          activeModel.scale.setScalar(scale);
          
          // Set position to inverse of scaled center to align geometry center with origin
          activeModel.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
          
          log('Model centered and scaled: ' + scale);
          
          hud.textContent = 'Model ready';
          setTimeout(() => hud.style.display = 'none', 3000);
        }, undefined, (err) => {
          error('Load failed: ' + modelUri + ' (Error: ' + JSON.stringify(err) + ')');
        });
      }

      document.getElementById('zoomIn').onclick = () => { camera.position.multiplyScalar(0.8); controls.update(); };
      document.getElementById('zoomOut').onclick = () => { camera.position.multiplyScalar(1.2); controls.update(); };
      document.getElementById('reset').onclick = () => { camera.position.set(0, 0, 2.8); controls.target.set(0, 0, 0); controls.update(); };

      const targetEuler = new THREE.Euler(0, 0, 0, 'XYZ');
      const currentEuler = new THREE.Euler(0, 0, 0, 'XYZ');

      function animate() {
        targetEuler.set(
          THREE.MathUtils.degToRad(-window.__imuPending.x),
          THREE.MathUtils.degToRad(window.__imuPending.y),
          THREE.MathUtils.degToRad(-window.__imuPending.z),
          'XYZ'
        );
        currentEuler.x += (targetEuler.x - currentEuler.x) * 0.35;
        currentEuler.y += (targetEuler.y - currentEuler.y) * 0.35;
        currentEuler.z += (targetEuler.z - currentEuler.z) * 0.35;
        worldRoot.rotation.copy(currentEuler);
        
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
      }

      window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      });

      loadModel();
      animate();
    })();
  </script>
</body>
</html>`;
}

export function MotionScreen(): React.JSX.Element {
  const colors = useAppColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const webViewRef = useRef<WebView>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const latestSampleRef = useRef<MotionSample>({
    pitch: 0, roll: 0, yaw: 0,
    ax: 0, ay: 0, az: 0,
    timestamp: ''
  });
  const lastWebViewUpdateTimeRef = useRef<number>(0);
  const THROTTLE_MS = 16; // 60fps target for maximum smoothness

  const motionSource = useTelemetryStore(state => state.latestMotion);

  const sample = useMemo<MotionSample>(() => {
    return {
      pitch: Number(motionSource?.pitch ?? 0),
      roll: Number(motionSource?.roll ?? 0),
      yaw: Number(motionSource?.yaw ?? 0),
      ax: Number(motionSource?.ax ?? 0),
      ay: Number(motionSource?.ay ?? 0),
      az: Number(motionSource?.az ?? 0),
      timestamp: String(motionSource?.timestamp ?? ''),
    };
  }, [motionSource]);

  const viewerHtml = useMemo(() => buildMotionViewerHtml({
    pitch: 0, roll: 0, yaw: 0,
    ax: 0, ay: 0, az: 0,
    timestamp: ''
  }, resolveModelUri()), []);
  const viewerSource = useMemo(() => ({
    html: viewerHtml,
    baseUrl: Platform.OS === 'android' ? 'file:///android_asset/' : ''
  }), [viewerHtml]);

  useEffect(() => {
    latestSampleRef.current = sample;

    if (!viewerReady || !webViewRef.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastWebViewUpdateTimeRef.current;
    
    if (timeSinceLastUpdate < THROTTLE_MS) {
      // If we are within the throttle window, don't update yet.
      // React will trigger this effect again when 'sample' changes.
      return;
    }

    const rotX = sample.pitch !== undefined ? -sample.pitch : 0;
    const rotY = sample.roll !== undefined ? sample.roll : 0;
    const rotZ = sample.yaw !== undefined ? -sample.yaw : 0;

    lastWebViewUpdateTimeRef.current = now;
    webViewRef.current.injectJavaScript(`window.updateImuRotation(${rotX}, ${rotY}, ${rotZ}); true;`);
  }, [sample, viewerReady]);

  function pushSampleToViewer(): void {
    if (!webViewRef.current) {
      return;
    }

    const rotX = latestSampleRef.current.pitch !== undefined ? -latestSampleRef.current.pitch : 0;
    const rotY = latestSampleRef.current.roll !== undefined ? latestSampleRef.current.roll : 0;
    const rotZ = latestSampleRef.current.yaw !== undefined ? -latestSampleRef.current.yaw : 0;
    webViewRef.current.injectJavaScript(`window.updateImuRotation(${rotX}, ${rotY}, ${rotZ}); true;`);
  }

  return (
    <View style={styles.screen}>
        <WebView
          ref={webViewRef}
          source={viewerSource}
          style={styles.webView}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          onLoadEnd={() => {
            setViewerReady(true);
            pushSampleToViewer();
          }}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          mixedContentMode="always"
          onMessage={event => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'log') {
                console.log('[WebView Log]', data.message);
              } else if (data.type === 'error') {
                console.error('[WebView Error]', data.message);
              } else {
                setViewerReady(true);
                pushSampleToViewer();
              }
            } catch (e) {
              // Fallback for simple string messages
              if (event.nativeEvent.data) {
                setViewerReady(true);
                pushSampleToViewer();
              }
            }
          }}
        />

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>IMU Motion Viewer</Text>
          <Text style={styles.subtitle}>
            The model uses Euler rotation (Pitch, Roll, Yaw) for real-time visualization of the device orientation.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Orientation</Text>
            <Text style={styles.statValue}>Pitch {formatValue(sample.pitch)}°</Text>
            <Text style={styles.statValue}>Roll {formatValue(sample.roll)}°</Text>
            <Text style={styles.statValue}>Yaw {formatValue(sample.yaw)}°</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Accelerometer</Text>
            <Text style={styles.statValue}>X {formatValue(sample.ax)} G</Text>
            <Text style={styles.statValue}>Y {formatValue(sample.ay)} G</Text>
            <Text style={styles.statValue}>Z {formatValue(sample.az)} G</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      padding: 16,
      justifyContent: 'space-between',
    },
    headerCard: {
      alignSelf: 'flex-start',
      maxWidth: '92%',
      backgroundColor: 'rgba(12, 16, 24, 0.62)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.14)',
      borderRadius: 14,
      padding: 14,
      gap: 6,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textSecondary,
      lineHeight: 18,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    statCard: {
      minWidth: '45%',
      maxWidth: '80%',
      backgroundColor: 'rgba(12, 16, 24, 0.62)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.14)',
      borderRadius: 14,
      padding: 14,
      gap: 4,
    },
    statLabel: {
      color: colors.neonGlow,
      fontWeight: '700',
      marginBottom: 4,
    },
    statValue: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    viewerCard: {
      flex: 1,
    },
    webView: {
      flex: 1,
      backgroundColor: 'transparent',
    },
  });