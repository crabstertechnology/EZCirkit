import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import 'package:photo_view/photo_view.dart';
import 'package:usb_serial/usb_serial.dart';

import '../services/firestore_service.dart';
import '../services/compiler_service.dart';
import '../services/usb_service.dart';
import '../services/stk500_flasher.dart';
import '../utils/cpp_highlighter.dart';
import '../widgets/code_editor.dart';

class IdeScreen extends StatefulWidget {
  final TutorialExperiment experiment;

  const IdeScreen({Key? key, required this.experiment}) : super(key: key);

  @override
  _IdeScreenState createState() => _IdeScreenState();
}

class _IdeScreenState extends State<IdeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late ArduinoCodeController _codeController;
  final ScrollController _editorScrollController = ScrollController();
  final ScrollController _consoleScrollController = ScrollController();
  final ScrollController _serialScrollController = ScrollController();
  final TextEditingController _serialInputController = TextEditingController();
  
  // Compiler state
  final CompilerService _compilerService = CompilerService();
  bool _isCompiling = false;
  String _compilerLogs = 'Compiler idle.\nClick Verify to compile.';
  String? _compiledHex;
  bool _compileSuccess = false;

  // Flasher state
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String _uploadStatus = '';

  ImageProvider _getDiagramImageProvider(String url) {
    if (url.startsWith('data:image/') && url.contains(';base64,')) {
      try {
        final base64Str = url.substring(url.indexOf(';base64,') + 8);
        final bytes = base64Decode(base64Str);
        return MemoryImage(bytes);
      } catch (e) {
        // Fallback
      }
    }
    return NetworkImage(url);
  }

  // YouTube player state
  YoutubePlayerController? _ytController;

  // Serial config
  String _lineEnding = 'nl'; // nl, cr, nlcr, none

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _codeController = ArduinoCodeController();
    _codeController.text = widget.experiment.code.isNotEmpty
        ? widget.experiment.code
        : '// Write your Arduino code here';

    // Initialize YouTube Controller
    _initYoutubePlayer();
  }

  void _initYoutubePlayer() {
    final videoId = _extractVideoId(widget.experiment.videoId);
    if (videoId != null) {
      _ytController = YoutubePlayerController(
        initialVideoId: videoId,
        flags: const YoutubePlayerFlags(
          autoPlay: false,
          mute: false,
          enableCaption: true,
        ),
      );
    }
  }

  String? _extractVideoId(String urlOrId) {
    if (urlOrId.isEmpty) return null;
    if (urlOrId.length == 11) return urlOrId;
    final regExp = RegExp(r'^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*');
    final match = regExp.firstMatch(urlOrId);
    return (match != null && match.group(2)?.length == 11) ? match.group(2) : null;
  }

  @override
  void dispose() {
    _tabController.dispose();
    _codeController.dispose();
    _editorScrollController.dispose();
    _consoleScrollController.dispose();
    _serialScrollController.dispose();
    _serialInputController.dispose();
    _ytController?.dispose();
    super.dispose();
  }

  // Handle sketch verification (compile)
  Future<void> _handleCompile() async {
    setState(() {
      _isCompiling = true;
      _compilerLogs = 'Compiling sketch for Arduino Uno...';
      _compileSuccess = false;
      _compiledHex = null;
    });

    final result = await _compilerService.compileCode(_codeController.text);

    setState(() {
      _isCompiling = false;
      _compileSuccess = result.success;
      if (result.success) {
        _compiledHex = result.hex;
        _compilerLogs = result.stdout ?? 'Compilation Successful!';
      } else {
        _compilerLogs = result.error ?? 'Compilation Failed.';
      }
    });

    // Scroll compiler console to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_consoleScrollController.hasClients) {
        _consoleScrollController.animateTo(
          _consoleScrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // Handle flash upload using STK500v1
  Future<void> _handleUpload(UsbService usbService) async {
    if (_compiledHex == null) return;
    if (!usbService.isConnected) {
      _showConnectionSheet(usbService);
      return;
    }

    final rawPort = usbService.rawPort;
    if (rawPort == null) return;

    // Save monitor connection state and close it to release serial locks
    final wasMonitorOpen = usbService.isSerialMonitorOpen;
    if (wasMonitorOpen) {
      await usbService.toggleSerialMonitor();
    }

    setState(() {
      _isUploading = true;
      _uploadProgress = 0.0;
      _uploadStatus = 'Preparing programmer...';
    });

    try {
      final flasher = Stk500Flasher(rawPort);
      final success = await flasher.flashHex(
        _compiledHex!,
        (progress, status) {
          setState(() {
            _uploadProgress = progress;
            _uploadStatus = status;
          });
        },
      );

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sketch uploaded successfully!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      _showUploadErrorDialog(e.toString());
    } finally {
      setState(() {
        _isUploading = false;
      });

      // Restore device baud parameters
      await rawPort.setPortParameters(
        usbService.currentBaudRate,
        UsbPort.DATABITS_8,
        UsbPort.STOPBITS_1,
        UsbPort.PARITY_NONE,
      );

      // Re-enable serial monitor if it was open
      if (wasMonitorOpen) {
        await usbService.toggleSerialMonitor();
      }
    }
  }

  void _showUploadErrorDialog(String error) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Upload Failed', style: TextStyle(color: Colors.white)),
        content: Text(
          error,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: Color(0xFFF97316))),
          ),
        ],
      ),
    );
  }

  void _showConnectionSheet(UsbService usbService) {
    usbService.scanDevices();
    
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF151D30),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Consumer<UsbService>(
          builder: (context, service, child) {
            final devices = service.availableDevices;

            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Connect Arduino Uno',
                          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh, color: Color(0xFFF97316)),
                          onPressed: () => service.scanDevices(),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (devices.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24.0),
                        child: Center(
                          child: Column(
                            children: const [
                              Icon(Icons.usb, color: Color(0xFF64748B), size: 36),
                              SizedBox(height: 8),
                              Text(
                                'No USB serial boards detected.',
                                style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Connect your board via USB OTG adapter.',
                                style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      Flexible(
                        child: ListView.builder(
                          shrinkWrap: true,
                          itemCount: devices.length,
                          itemBuilder: (context, index) {
                            final dev = devices[index];
                            final isConnected = service.connectedDevice?.deviceName == dev.deviceName;

                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFF334155)),
                              ),
                              child: ListTile(
                                leading: const Icon(Icons.developer_board, color: Color(0xFFF97316)),
                                title: Text(
                                  dev.productName ?? 'Arduino Uno',
                                  style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                                ),
                                subtitle: Text(
                                  'Vendor: 0x${(dev.vid ?? 0).toRadixString(16)} | Product: 0x${(dev.pid ?? 0).toRadixString(16)}',
                                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                ),
                                trailing: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isConnected ? const Color(0xFFEF4444) : const Color(0xFFF97316),
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  ),
                                  onPressed: () async {
                                    if (isConnected) {
                                      await service.disconnect();
                                    } else {
                                      final connected = await service.connect(dev);
                                      if (connected) {
                                        Navigator.pop(context);
                                      }
                                    }
                                  },
                                  child: Text(isConnected ? 'Disconnect' : 'Connect'),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final usbService = Provider.of<UsbService>(context);

    // Auto-scroll serial monitor if autoscroll is on
    if (usbService.autoscroll && _serialScrollController.hasClients) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_serialScrollController.hasClients) {
          _serialScrollController.jumpTo(_serialScrollController.position.maxScrollExtent);
        }
      });
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.experiment.title,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A), fontFamily: 'Outfit'),
            ),
            const SizedBox(height: 2),
            const Text(
              'Arduino Uno IDE Workspace',
              style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
            ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          // Connection USB Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 10.0),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: usbService.isConnected ? const Color(0x1A10B981) : const Color(0xFFF1F5F9),
                foregroundColor: usbService.isConnected ? const Color(0xFF10B981) : const Color(0xFF0F172A),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: BorderSide(
                    color: usbService.isConnected ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                elevation: 0,
              ),
              onPressed: () => _showConnectionSheet(usbService),
              icon: Icon(
                usbService.isConnected ? Icons.usb : Icons.usb_off,
                size: 14,
              ),
              label: Text(
                usbService.isConnected ? 'Connected' : 'Connect Board',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFF97316),
          labelColor: const Color(0xFFF97316),
          unselectedLabelColor: const Color(0xFF64748B),
          labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          tabs: const [
            Tab(icon: Icon(Icons.code, size: 18), text: 'Editor'),
            Tab(icon: Icon(Icons.play_circle, size: 18), text: 'Video'),
            Tab(icon: Icon(Icons.info_outline, size: 18), text: 'Diagram'),
            Tab(icon: Icon(Icons.terminal, size: 18), text: 'Monitor'),
          ],
        ),
      ),
      body: Stack(
        children: [
          TabBarView(
            controller: _tabController,
            physics: const NeverScrollableScrollPhysics(), // Prevent swipe to make editor coding easy
            children: [
              // 1. CODE EDITOR TAB
              _buildEditorTab(usbService),

              // 2. VIDEO TUTORIAL TAB
              _buildVideoTab(),

              // 3. DIAGRAM & DETAILS TAB
              _buildDiagramTab(),

              // 4. SERIAL MONITOR TAB
              _buildSerialTab(usbService),
            ],
          ),

          // Uploading overlay loader
          if (_isUploading) _buildUploadingOverlay(),
        ],
      ),
    );
  }

  Widget _buildEditorTab(UsbService usbService) {
    return Column(
      children: [
        // Editor Core Area
        Expanded(
          child: CodeEditor(
            controller: _codeController,
            scrollController: _editorScrollController,
          ),
        ),

        // Console logger output
        Container(
          height: 100,
          width: double.infinity,
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A), // Keep terminal high-contrast dark
            border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
          ),
          child: SingleChildScrollView(
            controller: _consoleScrollController,
            padding: const EdgeInsets.all(12),
            child: Text(
              _compilerLogs,
              style: TextStyle(
                color: _compileSuccess ? const Color(0xFF10B981) : (_isCompiling ? Colors.amber : const Color(0xFFEF4444)),
                fontFamily: 'Fira Code',
                fontSize: 11,
              ),
            ),
          ),
        ),

        // Action Toolbar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: Colors.white,
          child: Row(
            children: [
              // Compile Button
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316).withOpacity(0.08),
                    foregroundColor: const Color(0xFFEA580C),
                    side: const BorderSide(color: Color(0xFFF97316), width: 1),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: _isCompiling ? null : _handleCompile,
                  icon: _isCompiling
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFF59E0B)),
                        )
                      : const Icon(Icons.check, size: 16),
                  label: Text(_isCompiling ? 'Compiling...' : 'Verify'),
                ),
              ),
              const SizedBox(width: 12),

              // Upload Button
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _compileSuccess ? const Color(0xFFF97316) : const Color(0xFFE2E8F0),
                    foregroundColor: _compileSuccess ? Colors.white : const Color(0xFF94A3B8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: (_compileSuccess && !_isCompiling) ? () => _handleUpload(usbService) : null,
                  icon: const Icon(Icons.arrow_forward_ios, size: 14),
                  label: const Text('Upload', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVideoTab() {
    if (_ytController == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(Icons.video_camera_back_outlined, color: Color(0xFF64748B), size: 48),
              SizedBox(height: 12),
              Text(
                'No Video Tutorial Available',
                style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 4),
              Text(
                'This experiment doesn\'t have an active YouTube link.',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Center(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: YoutubePlayer(
            controller: _ytController!,
            showVideoProgressIndicator: true,
            progressIndicatorColor: const Color(0xFFF97316),
            progressColors: const ProgressBarColors(
              playedColor: Color(0xFFF97316),
              handleColor: Color(0xFFF59E0B),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDiagramTab() {
    final diagramUrl = widget.experiment.diagramUrl;
    final pinout = widget.experiment.pinout;

    if (diagramUrl.isEmpty && pinout.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.info_outline, color: Color(0xFF64748B), size: 48),
            SizedBox(height: 12),
            Text(
              'No details available',
              style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Description if present
          if (widget.experiment.description.isNotEmpty) ...[
            const Text(
              'Experiment Description',
              style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Text(
                widget.experiment.description,
                style: const TextStyle(color: Color(0xFF475569), fontSize: 12, height: 1.5),
              ),
            ),
            const SizedBox(height: 20),
          ],

          // 2. Interactive Zoomable Image Diagram
          if (diagramUrl.isNotEmpty) ...[
            const Text(
              'Circuit Diagram (Double tap or pinch to zoom)',
              style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              height: 220,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(11),
                child: PhotoView(
                  imageProvider: _getDiagramImageProvider(diagramUrl),
                  backgroundDecoration: const BoxDecoration(color: Colors.white),
                  initialScale: PhotoViewComputedScale.contained,
                  minScale: PhotoViewComputedScale.contained * 0.5,
                  maxScale: PhotoViewComputedScale.covered * 3,
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          // 3. Pinout description
          if (pinout.isNotEmpty) ...[
            const Text(
              'Connection Pinouts',
              style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Text(
                pinout,
                style: const TextStyle(
                  color: Color(0xFF1E293B),
                  fontFamily: 'Fira Code',
                  fontSize: 11,
                  height: 1.6,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSerialTab(UsbService usbService) {
    return Column(
      children: [
        // Controls Row: Baud rate & settings
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: const Color(0xFFF8FAFC),
          child: Row(
            children: [
              // Baud Rate Select
              DropdownButton<int>(
                dropdownColor: Colors.white,
                value: usbService.currentBaudRate,
                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12),
                underline: const SizedBox(),
                items: [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]
                    .map((baud) => DropdownMenuItem(
                          value: baud,
                          child: Text('$baud Baud'),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) {
                    usbService.setBaudRate(val);
                  }
                },
              ),
              const Spacer(),
              
              // Autoscroll check
              TextButton.icon(
                style: TextButton.styleFrom(padding: EdgeInsets.zero),
                onPressed: () => usbService.setAutoscroll(!usbService.autoscroll),
                icon: Icon(
                  usbService.autoscroll ? Icons.check_box : Icons.check_box_outline_blank,
                  color: const Color(0xFFF97316),
                  size: 16,
                ),
                label: const Text('Autoscroll', style: TextStyle(color: Color(0xFF0F172A), fontSize: 11)),
              ),
              
              // Clear Button
              IconButton(
                icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 20),
                onPressed: () => usbService.clearLogs(),
              ),
            ],
          ),
        ),

        // Logging content view
        Expanded(
          child: Container(
            color: const Color(0xFF0F172A), // Keep terminal high-contrast dark
            width: double.infinity,
            child: ListView.builder(
              controller: _serialScrollController,
              padding: const EdgeInsets.all(12),
              itemCount: usbService.serialLogs.length,
              itemBuilder: (context, index) {
                final log = usbService.serialLogs[index];
                Color color = Colors.white;
                
                if (log.startsWith('[SYSTEM]')) {
                  color = const Color(0xFFF59E0B); // Amber
                } else if (log.startsWith('[ERROR]')) {
                  color = const Color(0xFFEF4444); // Red
                } else if (log.contains('TX:')) {
                  color = const Color(0xFF60A5FA); // Blue
                } else if (log.contains('RX:')) {
                  color = const Color(0xFF34D399); // Green
                }

                return Padding(
                  padding: const EdgeInsets.only(bottom: 4.0),
                  child: Text(
                    log,
                    style: TextStyle(
                      color: color,
                      fontFamily: 'Fira Code',
                      fontSize: 11,
                    ),
                  ),
                );
              },
            ),
          ),
        ),

        // Input bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: Container(
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: TextField(
                    controller: _serialInputController,
                    enabled: usbService.isConnected && usbService.isSerialMonitorOpen,
                    style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13),
                    onSubmitted: (val) {
                      if (val.isNotEmpty) {
                        usbService.writeData(val, _lineEnding);
                        _serialInputController.clear();
                      }
                    },
                    decoration: InputDecoration(
                      hintText: (usbService.isConnected && usbService.isSerialMonitorOpen)
                          ? 'Send data to board...'
                          : 'Open serial monitor to send data',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              
              // Line ending select
              DropdownButton<String>(
                dropdownColor: Colors.white,
                value: _lineEnding,
                underline: const SizedBox(),
                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 11),
                items: const [
                  DropdownMenuItem(value: 'none', child: Text('No Ending')),
                  DropdownMenuItem(value: 'nl', child: Text('NL (\\n)')),
                  DropdownMenuItem(value: 'cr', child: Text('CR (\\r)')),
                  DropdownMenuItem(value: 'nlcr', child: Text('Both')),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _lineEnding = val;
                    });
                  }
                },
              ),
              const SizedBox(width: 4),

              // Open stream button
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: usbService.isSerialMonitorOpen ? const Color(0xFFEF4444) : const Color(0xFFF97316),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                onPressed: usbService.isConnected ? () => usbService.toggleSerialMonitor() : null,
                child: Text(
                  usbService.isSerialMonitorOpen ? 'Close' : 'Open',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildUploadingOverlay() {
    return Container(
      color: Colors.black.withOpacity(0.75),
      child: Center(
        child: Card(
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          child: Container(
            width: 250,
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 48,
                  height: 48,
                  child: CircularProgressIndicator(
                    color: Color(0xFFF97316),
                    strokeWidth: 4,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Uploading Sketch',
                  style: TextStyle(color: Color(0xFF0F172A), fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  _uploadStatus,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                ),
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: _uploadProgress,
                  backgroundColor: const Color(0xFFF1F5F9),
                  color: const Color(0xFFF97316),
                  minHeight: 6,
                ),
                const SizedBox(height: 8),
                Text(
                  '${(_uploadProgress * 100).round()}%',
                  style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
