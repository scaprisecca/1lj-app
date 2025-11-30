import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'widget-manager' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Check if the native module is available
const isWidgetManagerAvailable = !!NativeModules.WidgetManager;

const WidgetManager = NativeModules.WidgetManager
  ? NativeModules.WidgetManager
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface WidgetManagerInterface {
  /**
   * Reload all widgets to show updated data
   */
  reloadWidgets(): Promise<void>;

  /**
   * Check if widgets are supported on this device
   */
  isWidgetSupported(): Promise<boolean>;
}

/**
 * Check if widget manager native module is available
 * Returns false when running in Expo Go or if native module is not linked
 */
export function isWidgetManagerEnabled(): boolean {
  return isWidgetManagerAvailable;
}

export default WidgetManager as WidgetManagerInterface;
