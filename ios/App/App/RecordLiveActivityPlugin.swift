import Foundation
import Capacitor
#if canImport(ActivityKit)
import ActivityKit
#endif

/// JS: `registerPlugin('RecordLiveActivity')` — see src/services/native/recordLiveActivity.js
@objc(RecordLiveActivityPlugin)
public class RecordLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RecordLiveActivityPlugin"
    public let jsName = "RecordLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingActions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removePendingActions", returnType: CAPPluginReturnPromise)
    ]

    private var darwinObserverAdded = false

    override public func load() {
        let center = CFNotificationCenterGetDarwinNotifyCenter()
        let observer = Unmanaged.passUnretained(self).toOpaque()
        CFNotificationCenterAddObserver(
            center, observer,
            { _, observer, _, _, _ in
                guard let observer else { return }
                let plugin = Unmanaged<RecordLiveActivityPlugin>.fromOpaque(observer).takeUnretainedValue()
                DispatchQueue.main.async {
                    plugin.notifyListeners("pendingActions", data: [:])
                }
            },
            RecordLiveActivityShared.pendingActionsDarwinName as CFString,
            nil, .deliverImmediately
        )
        darwinObserverAdded = true
    }

    deinit {
        if darwinObserverAdded {
            CFNotificationCenterRemoveEveryObserver(
                CFNotificationCenterGetDarwinNotifyCenter(),
                Unmanaged.passUnretained(self).toOpaque()
            )
        }
    }

    @objc func isSupported(_ call: CAPPluginCall) {
        var supported = false
        if #available(iOS 16.2, *) {
            supported = ActivityAuthorizationInfo().areActivitiesEnabled
        }
        var interactive = false
        if #available(iOS 17.0, *) { interactive = supported }
        call.resolve(["supported": supported, "interactive": interactive])
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["ok": false, "reason": "unsupported"])
            return
        }
        guard let recordId = call.getString("recordId"), !recordId.isEmpty else {
            call.reject("recordId is required")
            return
        }

        // A Lock Screen tap the web layer hasn't applied yet wins; don't overwrite it.
        if RecordLiveActivityStore.hasPendingActions(recordId: recordId) {
            call.resolve(["ok": false, "reason": "pendingActions"])
            return
        }

        let state = RecordActivityAttributes.ContentState(
            projectName: call.getString("projectName") ?? "",
            positionText: call.getString("positionText") ?? "",
            statusText: call.getString("statusText") ?? "",
            statusNote: call.getString("statusNote") ?? "",
            isPlaying: call.getBool("isPlaying") ?? false,
            slotStart: Self.parseDate(call.getString("slotStart")),
            elapsedSeconds: call.getDouble("elapsedSeconds") ?? 0
        )
        let pauseLabel = call.getString("pauseLabel") ?? "Pause"
        let startLabel = call.getString("startLabel") ?? "Start"

        Task {
            let attrs = RecordActivityAttributes(recordId: recordId, pauseLabel: pauseLabel, startLabel: startLabel)
            if let id = await RecordLiveActivityPresenter.present(attributes: attrs, state: state) {
                call.resolve(["ok": true, "id": id])
            } else {
                call.resolve(["ok": false, "reason": "disabled"])
            }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        let recordId = call.getString("recordId")
        Task {
            for activity in Activity<RecordActivityAttributes>.activities
            where recordId == nil || activity.attributes.recordId == recordId {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }

    @objc func getPendingActions(_ call: CAPPluginCall) {
        call.resolve(["actions": RecordLiveActivityStore.pendingActions().map { $0.asDictionary() }])
    }

    @objc func removePendingActions(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids") as? [String]) ?? []
        RecordLiveActivityStore.remove(ids: ids)
        call.resolve()
    }

    private static func parseDate(_ raw: String?) -> Date? {
        guard let raw, !raw.isEmpty else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: raw) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: raw)
    }
}
