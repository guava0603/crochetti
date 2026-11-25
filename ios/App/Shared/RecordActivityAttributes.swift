import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif

/// Shared between the App target and the RecordLiveActivity widget extension.
enum RecordLiveActivityShared {
    static let appGroupId = "group.com.crochetti.app"
    static let pendingActionsKey = "recordLiveActivity.pendingActions"
    /// Darwin notification posted whenever a Live Activity button queues an action.
    static let pendingActionsDarwinName = "com.crochetti.app.recordLiveActivity.pendingActions"
}

#if canImport(ActivityKit)
@available(iOS 16.2, *)
struct RecordActivityAttributes: ActivityAttributes, Hashable {
    struct ContentState: Codable, Hashable {
        var projectName: String
        var positionText: String
        var statusText: String
        /// Current slot's status_note (or pending note); empty when none.
        var statusNote: String
        var isPlaying: Bool
        /// Start of the open time slot while playing.
        var slotStart: Date?
        /// Frozen duration of the last slot while paused (seconds).
        var elapsedSeconds: Double
    }

    var recordId: String
    var pauseLabel: String
    var startLabel: String
}
#endif
