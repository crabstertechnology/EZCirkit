import 'dart:convert';
import 'package:http/http.dart' as http;

class TutorialExperiment {
  final String id;
  final String chapterId;
  final String title;
  final String description;
  final String videoId;
  final String duration;
  final String code;
  final String diagramUrl;
  final String pinout;
  final int order;

  TutorialExperiment({
    required this.id,
    required this.chapterId,
    required this.title,
    required this.description,
    required this.videoId,
    required this.duration,
    required this.code,
    required this.diagramUrl,
    required this.pinout,
    required this.order,
  });

  factory TutorialExperiment.fromFirestoreJson(Map<String, dynamic> json, String chapterId, String id) {
    final fields = json['fields'] ?? {};
    
    // Safely extract string values
    String getString(String key) {
      if (fields[key] != null && fields[key]['stringValue'] != null) {
        return fields[key]['stringValue'].toString();
      }
      return '';
    }

    // Safely extract integer value
    int getInt(String key) {
      if (fields[key] != null) {
        if (fields[key]['integerValue'] != null) {
          return int.tryParse(fields[key]['integerValue'].toString()) ?? 0;
        } else if (fields[key]['doubleValue'] != null) {
          return (fields[key]['doubleValue'] as num).toInt();
        }
      }
      return 0;
    }

    return TutorialExperiment(
      id: id,
      chapterId: chapterId,
      title: getString('title'),
      description: getString('description'),
      videoId: getString('videoId'),
      duration: getString('duration').isEmpty ? '0:00' : getString('duration'),
      code: getString('code'),
      diagramUrl: getString('diagramUrl').startsWith('/')
          ? 'https://ezcirkit.crabster.in${getString('diagramUrl')}'
          : getString('diagramUrl'),
      pinout: getString('pinout'),
      order: getInt('order'),
    );
  }
}

class TutorialChapter {
  final String id;
  final String title;
  final int order;
  List<TutorialExperiment> experiments;

  TutorialChapter({
    required this.id,
    required this.title,
    required this.order,
    this.experiments = const [],
  });

  factory TutorialChapter.fromFirestoreJson(Map<String, dynamic> json, String id) {
    final fields = json['fields'] ?? {};
    
    String getString(String key) {
      if (fields[key] != null && fields[key]['stringValue'] != null) {
        return fields[key]['stringValue'].toString();
      }
      return '';
    }

    int getInt(String key) {
      if (fields[key] != null) {
        if (fields[key]['integerValue'] != null) {
          return int.tryParse(fields[key]['integerValue'].toString()) ?? 0;
        } else if (fields[key]['doubleValue'] != null) {
          return (fields[key]['doubleValue'] as num).toInt();
        }
      }
      return 0;
    }

    return TutorialChapter(
      id: id,
      title: getString('title'),
      order: getInt('order'),
      experiments: [],
    );
  }
}

class FirestoreService {
  static const String _projectId = 'studio-2519724075-3b571';
  static const String _baseUrl = 'https://firestore.googleapis.com/v1/projects/$_projectId/databases/(default)/documents';

  /// Fetches all Chapters and their nested Tutorials/Experiments
  Future<List<TutorialChapter>> fetchCurriculum() async {
    try {
      final chaptersUrl = Uri.parse('$_baseUrl/tutorialChapters');
      final response = await http.get(chaptersUrl);

      if (response.statusCode != 200) {
        throw Exception('Failed to load chapters: ${response.statusCode}');
      }

      final data = json.decode(response.body);
      final documents = data['documents'] as List<dynamic>?;

      if (documents == null || documents.isEmpty) {
        return [];
      }

      final chapters = <TutorialChapter>[];

      for (var doc in documents) {
        final name = doc['name'] as String;
        final docId = name.split('/').last;
        final chapter = TutorialChapter.fromFirestoreJson(doc, docId);
        chapters.add(chapter);
      }

      // Sort chapters by their order field
      chapters.sort((a, b) => a.order.compareTo(b.order));

      // Fetch tutorials for all chapters in parallel to improve load performance
      await Future.wait(chapters.map((chapter) async {
        final tutorialsUrl = Uri.parse('$_baseUrl/tutorialChapters/${chapter.id}/tutorials');
        final tutResponse = await http.get(tutorialsUrl);

        if (tutResponse.statusCode == 200) {
          final tutData = json.decode(tutResponse.body);
          final tutDocs = tutData['documents'] as List<dynamic>?;

          if (tutDocs != null) {
            final experiments = <TutorialExperiment>[];
            for (var tutDoc in tutDocs) {
              final name = tutDoc['name'] as String;
              final tutId = name.split('/').last;
              final experiment = TutorialExperiment.fromFirestoreJson(tutDoc, chapter.id, tutId);
              experiments.add(experiment);
            }
            // Sort experiments by their order
            experiments.sort((a, b) => a.order.compareTo(b.order));
            chapter.experiments = experiments;
          }
        }
      }));

      return chapters;
    } catch (e) {
      print('Error fetching curriculum from Firestore REST API: $e');
      rethrow;
    }
  }

  /// Checks if the user is an admin, has explicit tutorial access, or has a paid/shipped/delivered order.
  Future<bool> verifyUserAccess(String uid) async {
    try {
      // 1. Fetch user doc
      final userUrl = Uri.parse('$_baseUrl/users/$uid');
      final userRes = await http.get(userUrl);
      
      if (userRes.statusCode == 200) {
        final userData = json.decode(userRes.body);
        final fields = userData['fields'] ?? {};
        
        final isAdmin = fields['isAdmin'] != null && fields['isAdmin']['booleanValue'] == true;
        final hasTutorialAccess = fields['hasTutorialAccess'] != null && fields['hasTutorialAccess']['booleanValue'] == true;
        
        if (isAdmin || hasTutorialAccess) {
          return true;
        }
      }
      
      // 2. Fetch user's orders subcollection
      final ordersUrl = Uri.parse('$_baseUrl/users/$uid/orders');
      final ordersRes = await http.get(ordersUrl);
      
      if (ordersRes.statusCode == 200) {
        final ordersData = json.decode(ordersRes.body);
        final documents = ordersData['documents'] as List<dynamic>?;
        
        if (documents != null && documents.isNotEmpty) {
          for (var doc in documents) {
            final fields = doc['fields'] ?? {};
            final status = fields['status'] != null ? fields['status']['stringValue'] : '';
            if (status == 'paid' || status == 'shipped' || status == 'delivered') {
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (e) {
      print('Error checking user access: $e');
      return false;
    }
  }
}
