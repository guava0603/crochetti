import UIKit
import Capacitor

/// Registers app-local Capacitor plugins (set as the storyboard's root view controller).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RecordLiveActivityPlugin())
    }
}
