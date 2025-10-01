import WidgetKit
import SwiftUI

// MARK: - Widget Entry
struct JournalEntry: TimelineEntry {
    let date: Date
    let entryText: String
    let entryDate: String
}

// MARK: - Widget Provider
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> JournalEntry {
        JournalEntry(
            date: Date(),
            entryText: "No entry for today",
            entryDate: formatDate(Date())
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (JournalEntry) -> ()) {
        let entry = JournalEntry(
            date: Date(),
            entryText: loadTodayEntry(),
            entryDate: formatDate(Date())
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [JournalEntry] = []

        let currentDate = Date()
        let entryText = loadTodayEntry()
        let entryDate = formatDate(currentDate)

        // Create entry for current time
        let entry = JournalEntry(
            date: currentDate,
            entryText: entryText,
            entryDate: entryDate
        )
        entries.append(entry)

        // Update every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
        let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
        completion(timeline)
    }

    // Load today's entry from shared app group
    private func loadTodayEntry() -> String {
        if let sharedDefaults = UserDefaults(suiteName: "group.com.scaprisecca.boltexponativewind") {
            if let widgetDataString = sharedDefaults.string(forKey: "@widget_today_entry"),
               let widgetData = widgetDataString.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: widgetData) as? [String: Any],
               let plainText = json["plainTextPreview"] as? String {
                return plainText.isEmpty ? "No entry for today" : plainText
            }
        }
        return "No entry for today"
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM d, yyyy"
        return formatter.string(from: date)
    }
}

// MARK: - Widget View
struct OneLineJournalWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [Color(hex: "667eea"), Color(hex: "764ba2")]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .leading, spacing: 8) {
                // Date header
                Text(entry.entryDate)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(.white.opacity(0.9))

                // Entry text
                Text(entry.entryText)
                    .font(.caption)
                    .foregroundColor(.white)
                    .lineLimit(3)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Spacer()

                // Quick add button
                HStack {
                    Spacer()
                    Link(destination: URL(string: "onelinejournal://quickadd")!) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.white)
                    }
                }
            }
            .padding(12)
        }
    }
}

// MARK: - Widget Configuration
@main
struct OneLineJournalWidget: Widget {
    let kind: String = "OneLineJournalWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            OneLineJournalWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("One Line Journal")
        .description("Quick view of today's journal entry")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - Preview
struct OneLineJournalWidget_Previews: PreviewProvider {
    static var previews: some View {
        OneLineJournalWidgetEntryView(entry: JournalEntry(
            date: Date(),
            entryText: "This is a sample journal entry showing how the widget looks.",
            entryDate: "January 15, 2025"
        ))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
