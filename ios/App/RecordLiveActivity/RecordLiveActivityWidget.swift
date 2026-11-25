import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct RecordLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        RecordLiveActivityWidget()
    }
}

/// App accent (`--color-icon-add`, rgb 224 157 127).
private let accent = Color(red: 224 / 255, green: 157 / 255, blue: 127 / 255)

struct RecordLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RecordActivityAttributes.self) { context in
            RecordLockScreenView(context: context)
                .activityBackgroundTint(Color(.systemBackground).opacity(0.85))
                .activitySystemActionForegroundColor(.primary)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.projectName)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ToggleButton(context: context, compact: true)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 2) {
                        DurationText(state: context.state)
                            .font(.system(size: 34, weight: .semibold, design: .rounded).monospacedDigit())
                        MetaLine(state: context.state)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            } compactLeading: {
                CrochetHookIcon()
                    .foregroundStyle(accent)
                    .frame(width: 18, height: 18)
            } compactTrailing: {
                DurationText(state: context.state)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(accent)
                    .frame(maxWidth: 56)
            } minimal: {
                CrochetHookIcon()
                    .foregroundStyle(accent)
                    .frame(width: 18, height: 18)
            }
            .keylineTint(accent)
        }
    }
}

struct RecordLockScreenView: View {
    let context: ActivityViewContext<RecordActivityAttributes>

    var body: some View {
        VStack(spacing: 4) {
            Text(context.state.projectName)
                .font(.headline)
                .lineLimit(1)
            DurationText(state: context.state)
                .font(.system(size: 40, weight: .semibold, design: .rounded).monospacedDigit())
            MetaLine(state: context.state)
                .font(.caption)
                .foregroundStyle(.secondary)
            ToggleButton(context: context, compact: false)
                .padding(.top, 2)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .padding(.horizontal, 16)
    }
}

/// Ticks every second on its own while playing; no push updates needed.
/// Renders nothing while paused, so the duration is hidden everywhere it's used.
struct DurationText: View {
    let state: RecordActivityAttributes.ContentState

    var body: some View {
        if state.isPlaying, let start = state.slotStart {
            Text(timerInterval: start...Date.distantFuture, countsDown: false)
                .multilineTextAlignment(.center)
        }
    }
}

struct MetaLine: View {
    let state: RecordActivityAttributes.ContentState

    var body: some View {
        let parts = [state.positionText, state.statusText, state.statusNote]
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        Text(parts.joined(separator: " · "))
            .lineLimit(1)
            .truncationMode(.tail)
    }
}

struct ToggleButton: View {
    let context: ActivityViewContext<RecordActivityAttributes>
    let compact: Bool

    var body: some View {
        let playing = context.state.isPlaying
        let icon = playing ? "pause.fill" : "play.fill"
        let label = playing ? context.attributes.pauseLabel : context.attributes.startLabel

        if #available(iOS 17.0, *) {
            Button(intent: ToggleRecordIntent(recordId: context.attributes.recordId)) {
                if compact {
                    Image(systemName: icon)
                        .font(.body.weight(.semibold))
                } else {
                    Label(label, systemImage: icon)
                        .font(.caption.weight(.semibold))
                }
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.capsule)
            .controlSize(.small)
            .tint(accent)
            .accessibilityLabel(label)
        }
    }
}

/// Simple crochet hook glyph (shaft, thumb rest, hooked tip), drawn so it can't be
/// mistaken for the system screen-recording indicator.
struct CrochetHookIcon: View {
    var body: some View {
        CrochetHookShape()
            .aspectRatio(1, contentMode: .fit)
            .accessibilityHidden(true)
    }
}

struct CrochetHookShape: Shape {
    func path(in rect: CGRect) -> Path {
        let u = min(rect.width, rect.height) / 24
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: rect.minX + x * u, y: rect.minY + y * u) }

        var shaft = Path()
        shaft.move(to: p(3.5, 21.5))
        shaft.addLine(to: p(16.5, 7.5))

        var grip = Path()
        grip.move(to: p(8.0, 16.6))
        grip.addLine(to: p(11.0, 13.4))

        // Head with an open, outward-curling hook (a "J"), not a closed eye.
        var hook = Path()
        hook.move(to: p(16.5, 7.5))
        hook.addQuadCurve(to: p(19.2, 3.4), control: p(18.6, 5.2))
        hook.addQuadCurve(to: p(21.6, 6.4), control: p(21.9, 3.0))

        var out = Path()
        out.addPath(shaft.strokedPath(StrokeStyle(lineWidth: 2.4 * u, lineCap: .round)))
        out.addPath(grip.strokedPath(StrokeStyle(lineWidth: 4.4 * u, lineCap: .round)))
        out.addPath(hook.strokedPath(StrokeStyle(lineWidth: 2.2 * u, lineCap: .round, lineJoin: .round)))
        return out
    }
}
