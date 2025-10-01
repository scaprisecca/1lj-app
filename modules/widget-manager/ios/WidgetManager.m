#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetManager, NSObject)

RCT_EXTERN_METHOD(reloadWidgets:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isWidgetSupported:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
