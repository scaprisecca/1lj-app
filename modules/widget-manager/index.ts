import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'widget-manager' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

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

export default WidgetManager as WidgetManagerInterface;
