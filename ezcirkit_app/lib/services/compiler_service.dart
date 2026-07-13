import 'dart:convert';
import 'package:http/http.dart' as http;

class CompileResult {
  final bool success;
  final String? hex;
  final String? stdout;
  final String? error;

  CompileResult({
    required this.success,
    this.hex,
    this.stdout,
    this.error,
  });
}

class CompilerService {
  static const String _compilerUrl = 'https://ezcirkit.onrender.com/api/compile';

  /// Sends the C++ code to the compiler server
  Future<CompileResult> compileCode(String code) async {
    try {
      final response = await http.post(
        Uri.parse(_compilerUrl),
        headers: {
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'code': code,
        }),
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode == 200 || response.statusCode == 400 || response.statusCode == 500) {
        final data = json.decode(response.body);
        final success = data['success'] as bool? ?? false;
        
        if (success) {
          return CompileResult(
            success: true,
            hex: data['hex'] as String?,
            stdout: data['stdout'] as String?,
          );
        } else {
          return CompileResult(
            success: false,
            error: data['error'] as String? ?? 'Unknown compilation error.',
            stdout: data['stdout'] as String?,
          );
        }
      } else {
        return CompileResult(
          success: false,
          error: 'Compiler server returned status code: ${response.statusCode}',
        );
      }
    } catch (e) {
      return CompileResult(
        success: false,
        error: 'Failed to contact compiler server: ${e.toString()}',
      );
    }
  }
}
