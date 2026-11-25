import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif
import AppIntents

/// Start/pause button on the Live Activity. Compiled into both the App and the widget
/// extension; the system runs `perform()` in the app process without opening the app.
@available(iOS 17.0, *)
struct ToggleRecordIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Start or pause record"
    static var isDiscoverable: Bool = false

    @Parameter(title: "Record ID")
    var recordId: String

    init() {}

    init(recordId: String) {
        self.recordId = recordId
    }

    func perform() async throws -> some IntentResult {
        #if !RECORD_WIDGET_EXTENSION
        await RecordLiveActivityToggler.toggle(recordId: recordId)
        #endif
        return .result()
    }
}

#if !RECORD_WIDGET_EXTENSION
@available(iOS 16.2, *)
enum RecordLiveActivityToggler {
    static func toggle(recordId: String, now: Date = Date()) async {
        let matches = Activity<RecordActivityAttributes>.activities.filter { $0.attributes.recordId == recordId }
        guard let activity = matches.first(where: { $0.activityState == .active }) ?? matches.first else { return }

        var state = activity.content.state
        let action: String
        if state.isPlaying {
            let start = state.slotStart ?? now
            state.elapsedSeconds = max(0, now.timeIntervalSince(start))
            state.isPlaying = false
            state.slotStart = nil
            action = "pause"
        } else {
            state.isPlaying = true
            state.slotStart = now
            state.elapsedSeconds = 0
            action = "start"
        }

        RecordLiveActivityStore.append(recordId: recordId, action: action, at: now)
        _ = await RecordLiveActivityPresenter.present(attributes: activity.attributes, state: state)
    }
}

/// Playing: an active activity (Lock Screen + Dynamic Island, ticking).
/// Paused: an *ended* activity that lingers on the Lock Screen only, so the Dynamic Island
/// pill goes away while its 開始 button stays usable (it starts a fresh activity).
@available(iOS 16.2, *)
enum RecordLiveActivityPresenter {
    /// iOS keeps an ended activity on the Lock Screen for at most 4 hours.
    static let pausedLinger: TimeInterval = 4 * 60 * 60

    @discardableResult
    static func present(attributes: RecordActivityAttributes, state: RecordActivityAttributes.ContentState) async -> String? {
        let all = Activity<RecordActivityAttributes>.activities
        for other in all where other.attributes.recordId != attributes.recordId {
            await other.end(nil, dismissalPolicy: .immediate)
        }
        let same = all.filter { $0.attributes.recordId == attributes.recordId }
        let content = ActivityContent(state: state, staleDate: nil)
        let reusable = same.first {
            $0.activityState == .active
                && $0.attributes.pauseLabel == attributes.pauseLabel
                && $0.attributes.startLabel == attributes.startLabel
        }

        if let active = reusable {
            for extra in same where extra.id != active.id {
                await extra.end(nil, dismissalPolicy: .immediate)
            }
            if state.isPlaying {
                if active.content.state != state { await active.update(content) }
            } else {
                await active.end(content, dismissalPolicy: .after(Date().addingTimeInterval(pausedLinger)))
            }
            return active.id
        }

        // Already showing exactly this paused state on the Lock Screen: leave it.
        if !state.isPlaying, let lingering = same.first(where: { $0.activityState == .ended }),
           lingering.content.state == state, lingering.attributes == attributes {
            return lingering.id
        }

        for old in same {
            await old.end(nil, dismissalPolicy: .immediate)
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }
        guard let activity = try? Activity.request(attributes: attributes, content: content, pushType: nil) else {
            return nil
        }
        if !state.isPlaying {
            await activity.end(content, dismissalPolicy: .after(Date().addingTimeInterval(pausedLinger)))
        }
        return activity.id
    }
}
#endif
