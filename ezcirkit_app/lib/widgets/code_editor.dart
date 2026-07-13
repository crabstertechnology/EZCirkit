import 'package:flutter/material.dart';
import '../utils/cpp_highlighter.dart';

class CodeEditor extends StatefulWidget {
  final ArduinoCodeController controller;
  final ScrollController scrollController;

  const CodeEditor({
    Key? key,
    required this.controller,
    required this.scrollController,
  }) : super(key: key);

  @override
  _CodeEditorState createState() => _CodeEditorState();
}

class _CodeEditorState extends State<CodeEditor> {
  int _lineCount = 1;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_updateLineCount);
    _updateLineCount();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_updateLineCount);
    super.dispose();
  }

  void _updateLineCount() {
    final text = widget.controller.text;
    final count = '\n'.allMatches(text).length + 1;
    if (count != _lineCount) {
      setState(() {
        _lineCount = count;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Generate line numbers column text: "1\n2\n3\n..."
    final lineNumbersText = List.generate(_lineCount, (i) => '${i + 1}').join('\n');

    return SingleChildScrollView(
      controller: widget.scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Line Numbers Gutter
          Container(
            padding: const EdgeInsets.only(top: 16, right: 8, left: 8),
            decoration: const BoxDecoration(
              color: Color(0xFFF1F5F9), // Light background for gutter
              border: Border(
                right: BorderSide(color: Color(0xFFE2E8F0), width: 1),
              ),
            ),
            child: Text(
              lineNumbersText,
              style: const TextStyle(
                color: Color(0xFF64748B), // Slate gray text
                fontFamily: 'Fira Code',
                fontSize: 13,
                height: 1.6, // Must match the TextField height parameter exactly!
              ),
              textAlign: TextAlign.right,
            ),
          ),
          
          // Code Text Area
          Expanded(
            child: Container(
              color: Colors.white, // Clean white editor canvas
              child: Scrollbar(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SizedBox(
                    width: 1000, // Force large width to allow horizontal scrolling for long code lines
                    child: TextField(
                      controller: widget.controller,
                      keyboardType: TextInputType.multiline,
                      maxLines: null,
                      autofocus: false,
                      style: const TextStyle(
                        fontFamily: 'Fira Code',
                        fontSize: 13,
                        color: Color(0xFFABB2BF),
                        height: 1.6, // Match gutter line height!
                      ),
                      scrollPhysics: const NeverScrollableScrollPhysics(), // Scroll managed by outer scroll view
                      decoration: const InputDecoration(
                        contentPadding: EdgeInsets.fromLTRB(16, 16, 16, 16),
                        border: InputBorder.none,
                        isDense: true,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
