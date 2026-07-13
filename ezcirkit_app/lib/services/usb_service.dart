import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:usb_serial/usb_serial.dart';

class UsbDeviceWrapper {
  final UsbDevice device;
  UsbDeviceWrapper(this.device);

  String get name => device.deviceName ?? 'Unknown USB Device';
  String get manufacturer => device.manufacturerName ?? '';
  String get productName => device.productName ?? 'Serial Board';
  String get vendorId => device.vid.toString();
  String get productId => device.pid.toString();
}

class UsbService extends ChangeNotifier {
  List<UsbDevice> _availableDevices = [];
  UsbDevice? _connectedDevice;
  UsbPort? _activePort;
  StreamSubscription<Uint8List>? _incomingStreamSubscription;
  
  // Serial monitor logging
  final List<String> _serialLogs = [];
  bool _isSerialMonitorOpen = false;
  int _currentBaudRate = 9600;
  bool _autoscroll = true;
  bool _showTimestamp = false;
  
  // Stream controller for real-time console updates
  final StreamController<String> _serialLogStreamController = StreamController<String>.broadcast();

  List<UsbDevice> get availableDevices => _availableDevices;
  UsbDevice? get connectedDevice => _connectedDevice;
  bool get isConnected => _activePort != null;
  List<String> get serialLogs => _serialLogs;
  bool get isSerialMonitorOpen => _isSerialMonitorOpen;
  int get currentBaudRate => _currentBaudRate;
  bool get autoscroll => _autoscroll;
  bool get showTimestamp => _showTimestamp;
  Stream<String> get serialLogStream => _serialLogStreamController.stream;

  UsbService() {
    _initUsbListener();
    scanDevices();
  }

  void _initUsbListener() {
    UsbSerial.usbEventStream?.listen((UsbEvent event) {
      scanDevices();
      
      // Auto-disconnect if our connected device is unplugged
      if (event.event == UsbEvent.ACTION_USB_DETACHED && _connectedDevice != null) {
        if (event.device?.deviceName == _connectedDevice!.deviceName) {
          disconnect();
          addSystemLog("Device physically disconnected.");
        }
      }
    });
  }

  /// Scans for available USB devices and notifies listeners
  Future<void> scanDevices() async {
    try {
      _availableDevices = await UsbSerial.listDevices();
      notifyListeners();
    } catch (e) {
      print("Error scanning USB devices: $e");
    }
  }

  /// Sets the Baud Rate for the Serial Port
  Future<void> setBaudRate(int baudRate) async {
    _currentBaudRate = baudRate;
    if (_activePort != null) {
      // Re-configure port parameters with new baud rate
      await _activePort!.setPortParameters(
        _currentBaudRate,
        UsbPort.DATABITS_8,
        UsbPort.STOPBITS_1,
        UsbPort.PARITY_NONE,
      );
      addSystemLog("Baud rate set to $_currentBaudRate");
    }
    notifyListeners();
  }

  void setAutoscroll(bool val) {
    _autoscroll = val;
    notifyListeners();
  }

  void setShowTimestamp(bool val) {
    _showTimestamp = val;
    notifyListeners();
  }

  /// Connects to a selected USB Device
  Future<bool> connect(UsbDevice device) async {
    if (isConnected) {
      await disconnect();
    }

    try {
      _activePort = await device.create();
      if (_activePort == null) {
        throw Exception("Failed to create serial port.");
      }

      bool openSuccess = await _activePort!.open();
      if (!openSuccess) {
        _activePort = null;
        throw Exception("Failed to open serial port.");
      }

      _connectedDevice = device;
      
      // Set default serial port parameters (8N1)
      await _activePort!.setPortParameters(
        _currentBaudRate,
        UsbPort.DATABITS_8,
        UsbPort.STOPBITS_1,
        UsbPort.PARITY_NONE,
      );

      addSystemLog("Connected to ${device.productName ?? 'Arduino Uno'} successfully.");
      
      // Start listening to incoming data if serial monitor is enabled
      if (_isSerialMonitorOpen) {
        _startListening();
      }

      notifyListeners();
      return true;
    } catch (e) {
      print("Connection error: $e");
      addErrorLog("Connection failed: ${e.toString()}");
      _connectedDevice = null;
      _activePort = null;
      notifyListeners();
      return false;
    }
  }

  /// Disconnects from the currently connected USB device
  Future<void> disconnect() async {
    _stopListening();
    
    if (_activePort != null) {
      try {
        await _activePort!.close();
      } catch (e) {
        print("Error closing port: $e");
      }
      _activePort = null;
    }
    _connectedDevice = null;
    notifyListeners();
  }

  /// Toggles the Serial Monitor read stream
  Future<void> toggleSerialMonitor() async {
    if (!isConnected) {
      addSystemLog("Please connect a board first.");
      return;
    }

    _isSerialMonitorOpen = !_isSerialMonitorOpen;
    if (_isSerialMonitorOpen) {
      addSystemLog("--- Serial Monitor Opened ($_currentBaudRate Baud) ---");
      _startListening();
    } else {
      _stopListening();
      addSystemLog("--- Serial Monitor Closed ---");
    }
    notifyListeners();
  }

  void _startListening() {
    _incomingStreamSubscription?.cancel();
    if (_activePort == null) return;

    StringBuffer buffer = StringBuffer();
    
    _incomingStreamSubscription = _activePort!.inputStream!.listen((Uint8List data) {
      String text = String.fromCharCodes(data);
      
      // Handle lines splitting
      for (int i = 0; i < text.length; i++) {
        var char = text[i];
        if (char == '\n') {
          _addRxLog(buffer.toString());
          buffer.clear();
        } else if (char != '\r') {
          buffer.write(char);
        }
      }
      
      // If there's still text left (no newline yet)
      if (buffer.length > 0 && text.endsWith('\r') == false) {
        // We'll log it if it gets too long, or wait for next stream event
        if (buffer.length > 200) {
          _addRxLog(buffer.toString());
          buffer.clear();
        }
      }
    }, onError: (err) {
      addErrorLog("Read error: $err");
    });
  }

  void _stopListening() {
    _incomingStreamSubscription?.cancel();
    _incomingStreamSubscription = null;
  }

  /// Sends a string command to the connected USB serial port
  Future<void> writeData(String data, String lineEnding) async {
    if (_activePort == null) return;
    
    String payload = data;
    if (lineEnding == 'nl') payload += '\n';
    if (lineEnding == 'cr') payload += '\r';
    if (lineEnding == 'nlcr') payload += '\r\n';

    try {
      final bytes = Uint8List.fromList(payload.codeUnits);
      await _activePort!.write(bytes);
      _addTxLog(data);
    } catch (e) {
      addErrorLog("Send failed: $e");
    }
  }

  void clearLogs() {
    _serialLogs.clear();
    notifyListeners();
  }

  // --- Logger Helpers ---

  void addSystemLog(String msg) {
    final log = "[SYSTEM] $msg";
    _serialLogs.add(log);
    _serialLogStreamController.add(log);
    notifyListeners();
  }

  void addErrorLog(String msg) {
    final log = "[ERROR] $msg";
    _serialLogs.add(log);
    _serialLogStreamController.add(log);
    notifyListeners();
  }

  void _addRxLog(String msg) {
    String log;
    if (_showTimestamp) {
      final time = DateTime.now().toIso8601String().substring(11, 19);
      log = "[$time] RX: $msg";
    } else {
      log = "RX: $msg";
    }
    _serialLogs.add(log);
    _serialLogStreamController.add(log);
    notifyListeners();
  }

  void _addTxLog(String msg) {
    String log;
    if (_showTimestamp) {
      final time = DateTime.now().toIso8601String().substring(11, 19);
      log = "[$time] TX: $msg";
    } else {
      log = "TX: $msg";
    }
    _serialLogs.add(log);
    _serialLogStreamController.add(log);
    notifyListeners();
  }

  /// Exposed active port for the STK500 flasher to borrow during programming
  UsbPort? get rawPort => _activePort;

  @override
  void dispose() {
    disconnect();
    _serialLogStreamController.close();
    super.dispose();
  }
}
