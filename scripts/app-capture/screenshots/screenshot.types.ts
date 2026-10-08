import type { DemoRepository } from '../demo-repository.ts';
import type { ChaffNavigator } from './chaff-navigator.ts';
import type { FocusScreen } from './focus-screen.ts';
import type { ScreenshotCamera } from './screenshot-camera.ts';

export interface iScreenshotContext {
  camera: ScreenshotCamera;
  navigator: ChaffNavigator;
  focus: FocusScreen;
  repository: DemoRepository;
}

export interface iScreenshotScene {
  title: string;
  run: (context: iScreenshotContext) => Promise<unknown>;
}
