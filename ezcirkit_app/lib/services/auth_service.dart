import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:google_sign_in/google_sign_in.dart';
import 'firestore_service.dart';

class AuthUser {
  final String uid;
  final String email;
  final String displayName;
  final String photoUrl;
  final String idToken;

  AuthUser({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.photoUrl,
    required this.idToken,
  });
}

class AuthService extends ChangeNotifier {
  static const String _apiKey = 'AIzaSyAaRHpOOODgLR9sinxecEqb2u7s8iT9158';
  
  AuthUser? _currentUser;
  AuthUser? get currentUser => _currentUser;
  
  bool get isAuthenticated => _currentUser != null;

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    serverClientId: '1063677286444-q2tgejq4qe9pi80ea3ia9ughd3ec0j3p.apps.googleusercontent.com',
    scopes: ['email'],
  );

  final FirestoreService _firestoreService = FirestoreService();
  bool _hasTutorialAccess = false;
  bool get hasTutorialAccess => _hasTutorialAccess;

  Future<void> checkTutorialAccess() async {
    if (_currentUser == null) {
      _hasTutorialAccess = false;
      notifyListeners();
      return;
    }
    try {
      _hasTutorialAccess = await _firestoreService.verifyUserAccess(_currentUser!.uid);
      notifyListeners();
    } catch (e) {
      print('Error checking tutorial access: $e');
    }
  }

  /// Signs up a new user with email and password
  Future<void> signUpWithEmail(String email, String password, String displayName) async {
    final url = Uri.parse('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$_apiKey');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'email': email,
        'password': password,
        'returnSecureToken': true,
      }),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final uid = data['localId'] as String;
      final token = data['idToken'] as String;

      // Sync user profile to Firestore database
      await _syncUserProfile(uid, email, displayName, '');
      
      _currentUser = AuthUser(
        uid: uid,
        email: email,
        displayName: displayName,
        photoUrl: '',
        idToken: token,
      );
      await checkTutorialAccess();
    } else {
      final error = json.decode(response.body)['error']?['message'] ?? 'Sign up failed';
      throw Exception(error);
    }
  }

  /// Logs in a user with email and password
  Future<void> loginWithEmail(String email, String password) async {
    final url = Uri.parse('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$_apiKey');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'email': email,
        'password': password,
        'returnSecureToken': true,
      }),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final uid = data['localId'] as String;
      final token = data['idToken'] as String;
      final displayName = data['displayName'] as String? ?? email.split('@')[0];

      // Fetch user profile from Firestore or sync default if not exist
      await _syncUserProfile(uid, email, displayName, '');

      _currentUser = AuthUser(
        uid: uid,
        email: email,
        displayName: displayName,
        photoUrl: '',
        idToken: token,
      );
      await checkTutorialAccess();
    } else {
      final error = json.decode(response.body)['error']?['message'] ?? 'Login failed';
      throw Exception(error);
    }
  }

  /// Signs in a user with Google
  Future<void> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        throw Exception('Google Sign-In canceled by user');
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;

      if (idToken == null) {
        throw Exception('Failed to obtain Google ID Token');
      }

      // Authenticate with Firebase Auth REST API
      final url = Uri.parse('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=$_apiKey');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'postBody': 'id_token=$idToken&providerId=google.com',
          'requestUri': 'http://localhost',
          'returnIdpCredential': true,
          'returnSecureToken': true,
        }),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final uid = data['localId'] as String;
        final token = data['idToken'] as String;
        final email = data['email'] as String? ?? googleUser.email;
        final displayName = data['displayName'] as String? ?? googleUser.displayName ?? email.split('@')[0];
        final photoUrl = data['photoUrl'] as String? ?? googleUser.photoUrl ?? '';

        // Sync user profile to Firestore database
        await _syncUserProfile(uid, email, displayName, photoUrl);

        _currentUser = AuthUser(
          uid: uid,
          email: email,
          displayName: displayName,
          photoUrl: photoUrl,
          idToken: token,
        );
        await checkTutorialAccess();
      } else {
        final error = json.decode(response.body)['error']?['message'] ?? 'Google Authentication failed';
        throw Exception(error);
      }
    } catch (e) {
      print('Google Sign-In Error: $e');
      rethrow;
    }
  }

  /// Logs out the user
  Future<void> logout() async {
    _currentUser = null;
    _hasTutorialAccess = false;
    await _googleSignIn.signOut();
    notifyListeners();
  }

  /// Helper to sync/update user profile in Firestore
  Future<void> _syncUserProfile(String uid, String email, String displayName, String photoUrl) async {
    final url = Uri.parse('https://firestore.googleapis.com/v1/projects/studio-2519724075-3b571/databases/(default)/documents/users/$uid?updateMask.fieldPaths=email&updateMask.fieldPaths=displayName&updateMask.fieldPaths=photoURL&updateMask.fieldPaths=id&updateMask.fieldPaths=createdAt&updateMask.fieldPaths=isAdmin');

    final body = {
      "fields": {
        "id": {"stringValue": uid},
        "email": {"stringValue": email},
        "displayName": {"stringValue": displayName},
        "photoURL": {"stringValue": photoUrl},
        "createdAt": {"stringValue": DateTime.now().toUtc().toIso8601String()},
        "isAdmin": {"booleanValue": email == "crabstertechnology@gmail.com"}
      }
    };

    try {
      final response = await http.patch(
        url,
        headers: {"Content-Type": "application/json"},
        body: json.encode(body),
      );
      print("Upsert user response: ${response.statusCode}");
    } catch (e) {
      print("Error syncing user profile: $e");
    }
  }
}
