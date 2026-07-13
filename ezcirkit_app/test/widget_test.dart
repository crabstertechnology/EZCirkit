import 'package:flutter_test/flutter_test.dart';
import 'package:ezcirkit_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const EZCirkitApp());

    // Verify that the dashboard title is rendered.
    expect(find.textContaining('EZCirkit'), findsOneWidget);
  });
}
