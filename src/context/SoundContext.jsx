// src/utils/threeUtils.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export function initScene(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);
  return { scene, camera, renderer };
}

export function loadModel(url) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}import React, { createContext } from "react"
import useSound from "use-sound"
import soundUrl from "/sound/sounds.mp3"

export const SoundContext = createContext()

export const SoundProvider = async (props) => {
  const soundFiles = '/sound/sound-files.json?url';
  const soundData = await fetch(soundFiles).then(res => res.json());

  const _getSoundFiles = regex => soundData.find(f => regex.test(f.name));

  const [play] = useSound(soundUrl, {
    sprite: {
      switchItem: [_getSoundFiles(/switchingItem/).offset, _getSoundFiles(/switchingItem/).duration],
      classSelect: [_getSoundFiles(/class-select/).offset, _getSoundFiles(/class-select/).duration],
      characterLoad: [_getSoundFiles(/character-load/).offset, _getSoundFiles(/character-load/).duration],
      randomizeButton: [_getSoundFiles(/randomize-button/).offset, _getSoundFiles(/randomize-button/).duration],
      classMouseOver: [_getSoundFiles(/class-mouse-over/).offset, _getSoundFiles(/class-mouse-over/).duration],
      backNextButton: [_getSoundFiles(/back-next-button/).offset, _getSoundFiles(/back-next-button/).duration],
    }
  });

  const playSound = (name, delay = 0) => {
    delay === 0 ? play({ id: name }) : setTimeout(() => {
      play({ id: name });
    },delay);
  }

  return (
    <SoundContext.Provider
      value={{
        playSound
      }}
    >
      {props.children}
    </SoundContext.Provider>
  )
}
