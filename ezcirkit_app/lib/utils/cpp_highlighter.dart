import 'package:flutter/material.dart';

class ArduinoCodeController extends TextEditingController {
  // Styles for different syntax categories (optimized for light theme background)
  final TextStyle keywordStyle = const TextStyle(color: Color(0xFFEA580C), fontWeight: FontWeight.bold); // Dark Orange
  final TextStyle typeStyle = const TextStyle(color: Color(0xFF2563EB)); // Deep Blue
  final TextStyle functionStyle = const TextStyle(color: Color(0xFF0D9488)); // Teal
  final TextStyle constantStyle = const TextStyle(color: Color(0xFFC2410C), fontWeight: FontWeight.w600); // Deep Orange-Red
  final TextStyle commentStyle = const TextStyle(color: Color(0xFF64748B), fontStyle: FontStyle.italic); // Slate Gray
  final TextStyle stringStyle = const TextStyle(color: Color(0xFF16A34A)); // Green
  final TextStyle numberStyle = const TextStyle(color: Color(0xFFD97706)); // Amber
  final TextStyle preprocessorStyle = const TextStyle(color: Color(0xFF9333EA)); // Purple
  final TextStyle defaultStyle = const TextStyle(color: Color(0xFF0F172A)); // Slate deep dark

  // Word lists for matching
  static const List<String> keywords = [
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'default', 'const', 'static', 'volatile', 'class', 'struct',
    'public', 'private', 'protected', 'new', 'delete', 'sizeof'
  ];

  static const List<String> types = [
    'void', 'int', 'char', 'float', 'double', 'bool', 'long', 'short',
    'unsigned', 'signed', 'uint8_t', 'uint16_t', 'uint32_t', 'int8_t',
    'int16_t', 'int32_t', 'String', 'word', 'byte', 'boolean'
  ];

  static const List<String> constants = [
    'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'true', 'false',
    'LED_BUILTIN', 'MSBFIRST', 'LSBFIRST', 'CHANGE', 'FALLING', 'RISING'
  ];

  static const List<String> functions = [
    'setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite',
    'analogRead', 'delay', 'delayMicroseconds', 'millis', 'micros', 'begin',
    'print', 'println', 'available', 'read', 'write', 'peek', 'flush', 'Serial',
    'attachInterrupt', 'detachInterrupt', 'tone', 'noTone', 'shiftOut', 'shiftIn',
    'pulseIn', 'min', 'max', 'abs', 'constrain', 'map', 'pow', 'sqrt', 'sin',
    'cos', 'tan', 'randomSeed', 'random'
  ];

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final textVal = text;
    if (textVal.isEmpty) return const TextSpan();

    final List<TextSpan> children = [];
    int lastMatchEnd = 0;

    // Combined Regex for:
    // 1. Comments (Block & Line)
    // 2. Strings & Characters
    // 3. Preprocessor directives
    // 4. Numbers
    // 5. Word boundaries for keywords/types/functions/constants
    final regex = RegExp(
      r'(//[^\n]*|/\*[\s\S]*?\*/)' // 1. Comments
      r'|("(\\.|[^"\\])*"|'
      "\'(\\\\.|[^\'\\\\])*\')" // 2. Strings & Chars
      r'|(#[a-zA-Z]+)' // 3. Preprocessor
      r'|(\b\d+(\.\d+)?\b)' // 4. Numbers
      r'|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)', // 5. Words
      multiLine: true,
    );

    for (final Match match in regex.allMatches(textVal)) {
      // Add unmatched text before the match as default style
      if (match.start > lastMatchEnd) {
        children.add(TextSpan(
          text: textVal.substring(lastMatchEnd, match.start),
          style: defaultStyle,
        ));
      }

      final matchedText = match.group(0)!;

      if (matchedText.startsWith('//') || matchedText.startsWith('/*')) {
        // Comment
        children.add(TextSpan(text: matchedText, style: commentStyle));
      } else if (matchedText.startsWith('"') || matchedText.startsWith("'")) {
        // String or Char
        children.add(TextSpan(text: matchedText, style: stringStyle));
      } else if (matchedText.startsWith('#')) {
        // Preprocessor
        children.add(TextSpan(text: matchedText, style: preprocessorStyle));
      } else if (double.tryParse(matchedText) != null) {
        // Number
        children.add(TextSpan(text: matchedText, style: numberStyle));
      } else {
        // Word matching
        if (keywords.contains(matchedText)) {
          children.add(TextSpan(text: matchedText, style: keywordStyle));
        } else if (types.contains(matchedText)) {
          children.add(TextSpan(text: matchedText, style: typeStyle));
        } else if (functions.contains(matchedText)) {
          children.add(TextSpan(text: matchedText, style: functionStyle));
        } else if (constants.contains(matchedText)) {
          children.add(TextSpan(text: matchedText, style: constantStyle));
        } else {
          // Normal identifier
          children.add(TextSpan(text: matchedText, style: defaultStyle));
        }
      }

      lastMatchEnd = match.end;
    }

    // Add remaining unmatched text
    if (lastMatchEnd < textVal.length) {
      children.add(TextSpan(
        text: textVal.substring(lastMatchEnd),
        style: defaultStyle,
      ));
    }

    return TextSpan(
      style: style ?? const TextStyle(fontFamily: 'monospace'),
      children: children,
    );
  }
}
