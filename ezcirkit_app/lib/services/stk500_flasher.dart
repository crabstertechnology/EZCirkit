import 'dart:async';
import 'dart:typed_data';
import 'package:usb_serial/usb_serial.dart';

class HexPage {
  final int index;
  final int address;
  final List<int> data;

  HexPage({
    required this.index,
    required this.address,
    required this.data,
  });
}

class Stk500Flasher {
  final UsbPort _port;
  final List<int> _readBuffer = [];
  bool _isReading = false;
  StreamSubscription<Uint8List>? _subscription;

  Stk500Flasher(this._port);

  /// Low level background read loop
  void _startReading() {
    _readBuffer.clear();
    _isReading = true;
    _subscription = _port.inputStream!.listen((data) {
      if (_isReading) {
        _readBuffer.addAll(data);
      }
    });
  }

  void _stopReading() {
    _isReading = false;
    _subscription?.cancel();
    _subscription = null;
    _readBuffer.clear();
  }

  /// Wait synchronously for a certain amount of bytes
  Future<List<int>> _waitForBytes(int count, Duration timeout) async {
    final startTime = DateTime.now();
    while (_readBuffer.length < count) {
      if (DateTime.now().difference(startTime) > timeout) {
        throw Exception("Response timeout. Board did not respond in time.");
      }
      await Future.delayed(const Duration(milliseconds: 5));
    }
    final result = _readBuffer.sublist(0, count);
    _readBuffer.removeRange(0, count);
    return result;
  }

  /// Try syncing with the bootloader (STK_GET_SYNC)
  Future<void> _getSync() async {
    const maxAttempts = 15;
    for (int attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        _readBuffer.clear(); // clear buffer
        await _port.write(Uint8List.fromList([0x30, 0x20])); // STK_GET_SYNC, STK_CRC_EOP
        
        final resp = await _waitForBytes(2, const Duration(milliseconds: 150));
        if (resp[0] == 0x14 && resp[1] == 0x10) { // STK_INSYNC, STK_OK
          return; // Synced!
        }
      } catch (e) {
        // Timeout or wrong byte, retry
      }
      await Future.delayed(const Duration(milliseconds: 40));
    }
    throw Exception("Cannot sync with bootloader. Ensure board is connected properly and correct port is selected.");
  }

  /// Send an STK command and verify response
  Future<void> _sendStkCommand(List<int> cmdBytes, {Duration timeout = const Duration(seconds: 1)}) async {
    _readBuffer.clear();
    await _port.write(Uint8List.fromList(cmdBytes));
    
    final resp = await _waitForBytes(2, timeout);
    if (resp[0] != 0x14 || resp[1] != 0x10) {
      throw Exception(
        "Command 0x${cmdBytes[0].toRadixString(16)} failed. "
        "InSync: 0x${resp[0].toRadixString(16)}, Status: 0x${resp[1].toRadixString(16)}"
      );
    }
  }

  /// Parses the Intel HEX format string into 128-byte pages ready for flashing
  List<HexPage> _parseHexToPages(String hexString) {
    final lines = hexString.split('\n');
    final flash = List<int>.filled(32768, 0xFF); // Uno ATmega328P Flash Size (32KB)
    
    int maxAddr = 0;
    int minAddr = 32768;
    bool hasData = false;

    for (var line in lines) {
      line = line.trim();
      if (!line.startsWith(':')) continue;
      
      final byteCount = int.parse(line.substring(1, 3), radix: 16);
      final address = int.parse(line.substring(3, 7), radix: 16);
      final recordType = int.parse(line.substring(7, 9), radix: 16);
      
      if (recordType == 0) { // Data record
        hasData = true;
        for (int i = 0; i < byteCount; i++) {
          final val = int.parse(line.substring(9 + i * 2, 11 + i * 2), radix: 16);
          final targetAddr = address + i;
          
          if (targetAddr < flash.length) {
            flash[targetAddr] = val;
            if (targetAddr < minAddr) minAddr = targetAddr;
            if (targetAddr > maxAddr) maxAddr = targetAddr;
          }
        }
      } else if (recordType == 1) { // End of file record
        break;
      }
    }

    if (!hasData) {
      throw Exception("No flash data records found in HEX file.");
    }

    const pageSize = 128; // ATmega328P Flash Page size
    final pages = <HexPage>[];
    final startPage = (minAddr / pageSize).floor();
    final endPage = (maxAddr / pageSize).floor();

    for (int p = startPage; p <= endPage; p++) {
      final pageAddr = p * pageSize;
      final pageData = flash.sublist(pageAddr, pageAddr + pageSize);
      pages.add(HexPage(
        index: p,
        address: pageAddr,
        data: pageData,
      ));
    }

    return pages;
  }

  /// Flashes the HEX string to the board and invokes a progress callback
  Future<bool> flashHex(String hexString, Function(double progress, String status) onProgress) async {
    try {
      onProgress(0.05, "Parsing HEX file");
      final pages = _parseHexToPages(hexString);
      
      onProgress(0.10, "Opening programming interface");
      // Set to bootloader baud rate (115200 for Optiboot/Uno)
      await _port.setPortParameters(
        115200,
        UsbPort.DATABITS_8,
        UsbPort.STOPBITS_1,
        UsbPort.PARITY_NONE,
      );

      _startReading();

      // Trigger DTR/RTS Reset Pulse
      onProgress(0.15, "Resetting Arduino Uno");
      await _port.setDTR(true);
      await _port.setRTS(true);
      await Future.delayed(const Duration(milliseconds: 250));
      await _port.setDTR(false);
      await _port.setRTS(false);
      await Future.delayed(const Duration(milliseconds: 200)); // wait for bootloader to wake

      // Handshake/Sync
      onProgress(0.20, "Establishing connection");
      await _getSync();

      // Enter programming mode
      onProgress(0.25, "Entering programming mode");
      await _sendStkCommand([0x50, 0x20]); // STK_ENTER_PROGMODE, STK_CRC_EOP

      // Flash memory pages
      onProgress(0.28, "Writing flash memory");
      for (int i = 0; i < pages.length; i++) {
        final page = pages[i];
        
        // Calculate sub-progress (from 0.30 to 0.95)
        final flashFraction = (i + 1) / pages.length;
        final currentProgress = 0.30 + (flashFraction * 0.65);
        onProgress(currentProgress, "Writing page ${i + 1}/${pages.length}");

        // Load Address (divided by 2 because AVR addresses are 16-bit word based)
        final wordAddr = page.address ~/ 2;
        final addrLow = wordAddr & 0xFF;
        final addrHigh = (wordAddr >> 8) & 0xFF;
        
        await _sendStkCommand([0x55, addrLow, addrHigh, 0x20]); // STK_LOAD_ADDRESS, low, high, STK_CRC_EOP

        // Program page (128 bytes)
        // Format: STK_PROG_PAGE (0x64), size_high (0x00), size_low (0x80), memType ('F' = 0x46), dataBytes..., STK_CRC_EOP (0x20)
        final progCmd = <int>[0x64, 0x00, 0x80, 0x46];
        progCmd.addAll(page.data);
        progCmd.add(0x20);

        await _sendStkCommand(progCmd);
      }

      // Leave programming mode
      onProgress(0.98, "Completing flash process");
      await _sendStkCommand([0x51, 0x20]); // STK_LEAVE_PROGMODE, STK_CRC_EOP

      onProgress(1.0, "Program uploaded successfully");
      return true;
    } catch (e) {
      print("Flash error: $e");
      rethrow;
    } finally {
      _stopReading();
    }
  }
}
