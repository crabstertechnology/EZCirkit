import 'package:flutter/material.dart';
import '../services/firestore_service.dart';

enum CurriculumStatus { initial, loading, loaded, error }

class CurriculumProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();
  
  List<TutorialChapter> _chapters = [];
  CurriculumStatus _status = CurriculumStatus.initial;
  String _errorMessage = '';

  List<TutorialChapter> get chapters => _chapters;
  CurriculumStatus get status => _status;
  String get errorMessage => _errorMessage;

  bool get isLoading => _status == CurriculumStatus.loading;
  bool get hasError => _status == CurriculumStatus.error;

  /// Trigger a fetch of all chapters and experiments
  Future<void> loadCurriculum({bool forceRefresh = false}) async {
    if (_status == CurriculumStatus.loaded && !forceRefresh) return;

    _status = CurriculumStatus.loading;
    _errorMessage = '';
    notifyListeners();

    try {
      _chapters = await _firestoreService.fetchCurriculum();
      _status = CurriculumStatus.loaded;
    } catch (e) {
      _status = CurriculumStatus.error;
      _errorMessage = e.toString();
    }
    notifyListeners();
  }
}
