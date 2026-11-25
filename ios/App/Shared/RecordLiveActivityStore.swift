import Foundation

/// A pause/start tapped on the Live Activity while the web layer may not be running.
/// The app drains these into Firestore time slots (see src/composables/useRecordLiveActivity.js).
struct RecordLiveActivityPendingAction: Codable, Equatable {
    var id: String
    var recordId: String
    /// "pause" or "start"
    var action: String
    /// ISO-8601 timestamp with milliseconds, matching `new Date().toISOString()`.
    var at: String

    func asDictionary() -> [String: Any] {
        ["id": id, "recordId": recordId, "action": action, "at": at]
    }
}

enum RecordLiveActivityStore {
    private static let lock = NSLock()

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: RecordLiveActivityShared.appGroupId)
    }

    static func isoString(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        f.timeZone = TimeZone(identifier: "UTC")
        return f.string(from: date)
    }

    static func pendingActions() -> [RecordLiveActivityPendingAction] {
        lock.lock(); defer { lock.unlock() }
        return readUnlocked()
    }

    static func hasPendingActions(recordId: String) -> Bool {
        pendingActions().contains { $0.recordId == recordId }
    }

    static func append(recordId: String, action: String, at date: Date) {
        lock.lock()
        var list = readUnlocked()
        list.append(RecordLiveActivityPendingAction(
            id: UUID().uuidString,
            recordId: recordId,
            action: action,
            at: isoString(date)
        ))
        writeUnlocked(list)
        lock.unlock()

        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(RecordLiveActivityShared.pendingActionsDarwinName as CFString),
            nil, nil, true
        )
    }

    static func remove(ids: [String]) {
        let set = Set(ids)
        lock.lock(); defer { lock.unlock() }
        writeUnlocked(readUnlocked().filter { !set.contains($0.id) })
    }

    private static func readUnlocked() -> [RecordLiveActivityPendingAction] {
        guard let data = defaults?.data(forKey: RecordLiveActivityShared.pendingActionsKey) else { return [] }
        return (try? JSONDecoder().decode([RecordLiveActivityPendingAction].self, from: data)) ?? []
    }

    private static func writeUnlocked(_ list: [RecordLiveActivityPendingAction]) {
        guard let data = try? JSONEncoder().encode(list) else { return }
        defaults?.set(data, forKey: RecordLiveActivityShared.pendingActionsKey)
    }
}
