import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import 'providers/curriculum_provider.dart';
import 'services/usb_service.dart';
import 'screens/dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const EZCirkitApp());
}

class EZCirkitApp extends StatelessWidget {
  const EZCirkitApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CurriculumProvider()),
        ChangeNotifierProvider(create: (_) => UsbService()),
      ],
      child: MaterialApp(
        title: 'EZCirkit IDE',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.light,
          primaryColor: const Color(0xFFF97316), // Premium Orange
          colorScheme: const ColorScheme.light(
            primary: Color(0xFFF97316),
            secondary: Color(0xFFF59E0B), // Amber
            background: Color(0xFFF8FAFC), // Slate light/white
            surface: Colors.white,
            onPrimary: Colors.white,
            onSecondary: Colors.white,
            onBackground: Color(0xFF0F172A),
            onSurface: Color(0xFF1E293B),
          ),
          scaffoldBackgroundColor: const Color(0xFFF8FAFC),
          
          // Google Fonts typography integration
          textTheme: GoogleFonts.outfitTextTheme(
            ThemeData.light().textTheme,
          ).apply(
            bodyColor: const Color(0xFF1E293B),
            displayColor: const Color(0xFF0F172A),
          ),
          
          // Elevated Button Theme
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF97316),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              textStyle: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          
          // Chip Theme
          chipTheme: const ChipThemeData(
            backgroundColor: Color(0xFFF1F5F9),
            selectedColor: Color(0xFFF97316),
            secondarySelectedColor: Color(0xFFF97316),
            labelStyle: TextStyle(color: Color(0xFF1E293B)),
            padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          ),
          
          // Tooltip Theme
          tooltipTheme: TooltipThemeData(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            textStyle: const TextStyle(color: Color(0xFF0F172A), fontSize: 11),
          ),
          
          useMaterial3: true,
        ),
        home: const DashboardScreen(),
      ),
    );
  }
}
