import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class ShopScreen extends StatefulWidget {
  final String url;

  const ShopScreen({Key? key, required this.url}) : super(key: key);

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  bool _isLoading = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'EZCirkit Shop',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        backgroundColor: const Color(0xFFF97316),
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      body: Stack(
        children: [
          InAppWebView(
            initialUrlRequest: URLRequest(
              url: Uri.parse(widget.url),
            ),
            onLoadStop: (controller, url) {
              setState(() {
                _isLoading = false;
              });
            },
          ),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFF97316)),
              ),
            ),
        ],
      ),
    );
  }
}
