import Foundation
import WidgetKit

@objc(WidgetManager)
class WidgetManager: NSObject {

  @objc
  func reloadWidgets(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
      resolve(nil)
    } else {
      reject("E_WIDGET_NOT_SUPPORTED", "Widgets require iOS 14 or later", nil)
    }
  }

  @objc
  func isWidgetSupported(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 14.0, *) {
      resolve(true)
    } else {
      resolve(false)
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
