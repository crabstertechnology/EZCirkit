import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/curriculum_provider.dart';
import '../services/firestore_service.dart';
import '../services/auth_service.dart';
import 'ide_screen.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  _DashboardScreenState createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _searchQuery = '';
  String _selectedChapterId = 'All';

  Widget _buildExperimentImage(String url) {
    final bool isDiagram = url.startsWith('data:image/') || !url.contains('img.youtube.com');
    final BoxFit fit = isDiagram ? BoxFit.contain : BoxFit.cover;

    if (url.startsWith('data:image/') && url.contains(';base64,')) {
      try {
        final base64Str = url.substring(url.indexOf(';base64,') + 8);
        final bytes = base64Decode(base64Str);
        return Image.memory(
          bytes,
          fit: fit,
          errorBuilder: (context, error, stackTrace) {
            return const Center(
              child: Icon(Icons.broken_image, color: Color(0xFFF97316), size: 48),
            );
          },
        );
      } catch (e) {
        return const Center(
          child: Icon(Icons.broken_image, color: Color(0xFFF97316), size: 48),
        );
      }
    }
    
    if (url.isNotEmpty) {
      return Image.network(
        url,
        fit: fit,
        errorBuilder: (context, error, stackTrace) {
          return const Center(
            child: Icon(Icons.play_circle_fill, color: Color(0xFFF97316), size: 48),
          );
        },
      );
    }

    return const Center(
      child: Icon(Icons.memory, color: Color(0xFFF97316), size: 48),
    );
  }

  @override
  void initState() {
    super.initState();
    // Load curriculum data on start
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<CurriculumProvider>(context, listen: false).loadCurriculum();
    });
  }

  String _getYoutubeThumbnail(String urlOrId) {
    if (urlOrId.isEmpty) return '';
    if (urlOrId.length == 11) {
      return 'https://img.youtube.com/vi/$urlOrId/mqdefault.jpg';
    }
    final regExp = RegExp(r'^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*');
    final match = regExp.firstMatch(urlOrId);
    final videoId = (match != null && match.group(2)?.length == 11) ? match.group(2) : null;
    return videoId != null 
        ? 'https://img.youtube.com/vi/$videoId/mqdefault.jpg' 
        : 'https://img.youtube.com/vi/$urlOrId/mqdefault.jpg'; // Fallback
  }

  @override
  Widget build(BuildContext context) {
    final curriculumProvider = Provider.of<CurriculumProvider>(context);
    final theme = Theme.of(context);

    // List of chapters
    final chapters = curriculumProvider.chapters;

    // Filtered experiments
    final List<TutorialExperiment> filteredExperiments = [];
    for (var chapter in chapters) {
      if (_selectedChapterId == 'All' || chapter.id == _selectedChapterId) {
        for (var tut in chapter.experiments) {
          final matchesSearch = tut.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              tut.description.toLowerCase().contains(_searchQuery.toLowerCase());
          if (matchesSearch) {
            filteredExperiments.add(tut);
          }
        }
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate light bg
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Section
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0x1AFF9800), // light orange glow
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0x33FF9800)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: const [
                                Icon(Icons.bolt, color: Color(0xFFF59E0B), size: 14),
                                SizedBox(width: 4),
                                Text(
                                  'INTERACTIVE LEARNING',
                                  style: TextStyle(
                                    color: Color(0xFFF59E0B),
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),
                          RichText(
                            text: const TextSpan(
                              text: 'EZCirkit ',
                              style: TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFF97316), // Orange
                                fontFamily: 'Outfit',
                              ),
                              children: [
                                TextSpan(
                                  text: 'Experiments',
                                  style: TextStyle(
                                    color: Color(0xFF0F172A), // Deep Slate
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      // User Profile Avatar & Logout Action
                      Consumer<AuthService>(
                        builder: (context, authService, _) {
                          final user = authService.currentUser;
                          final displayName = user?.displayName ?? 'User';
                          final email = user?.email ?? '';
                          final photoUrl = user?.photoUrl ?? '';

                          return PopupMenuButton<int>(
                            onSelected: (value) async {
                              if (value == 1) {
                                await authService.logout();
                                if (context.mounted) {
                                  Navigator.of(context).pushReplacement(
                                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                                  );
                                }
                              }
                            },
                            offset: const Offset(0, 50),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            itemBuilder: (context) => [
                              PopupMenuItem(
                                enabled: false,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      displayName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      email,
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                    const Divider(),
                                  ],
                                ),
                              ),
                              PopupMenuItem(
                                value: 1,
                                child: Row(
                                  children: const [
                                    Icon(Icons.logout, size: 18, color: Colors.redAccent),
                                    SizedBox(width: 8),
                                    Text(
                                      'Log Out',
                                      style: TextStyle(color: Colors.redAccent, fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            child: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                              ),
                              child: ClipOval(
                                child: photoUrl.isNotEmpty
                                    ? Image.network(
                                        photoUrl,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => const Icon(Icons.person, color: Color(0xFF64748B)),
                                      )
                                    : const Icon(Icons.person, color: Color(0xFF64748B)),
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Select an experiment to code and flash your Arduino board directly.',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.4),
                  ),
                ],
              ),
            ),

            // Search Bar & Filter Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 46,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: TextField(
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 14),
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val;
                          });
                        },
                        decoration: const InputDecoration(
                          hintText: 'Search experiments...',
                          hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                          prefixIcon: Icon(Icons.search, color: Color(0xFF94A3B8), size: 20),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Horizontal Chapters Filter
            if (curriculumProvider.status == CurriculumStatus.loaded)
              Container(
                height: 38,
                margin: const EdgeInsets.only(bottom: 12),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: chapters.length + 1,
                  itemBuilder: (context, index) {
                    final isAll = index == 0;
                    final chapter = isAll ? null : chapters[index - 1];
                    final id = isAll ? 'All' : chapter!.id;
                    final title = isAll ? 'All Chapters' : chapter!.title;
                    final isSelected = _selectedChapterId == id;

                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(
                          title,
                          style: TextStyle(
                            color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                        selected: isSelected,
                        selectedColor: const Color(0xFFF97316),
                        backgroundColor: const Color(0xFFF1F5F9),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                          side: BorderSide(
                            color: isSelected ? const Color(0xFFF97316) : const Color(0xFFE2E8F0),
                          ),
                        ),
                        onSelected: (selected) {
                          if (selected) {
                            setState(() {
                              _selectedChapterId = id;
                            });
                          }
                        },
                      ),
                    );
                  },
                ),
              ),

            // Experiments Grid/List View
            Expanded(
              child: _buildCurriculumContent(
                curriculumProvider,
                filteredExperiments,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurriculumContent(
    CurriculumProvider provider,
    List<TutorialExperiment> experiments,
  ) {
    if (provider.status == CurriculumStatus.loading) {
      return _buildSkeletonLoader();
    }

    if (provider.status == CurriculumStatus.error) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off, color: Color(0xFFEF4444), size: 48),
              const SizedBox(height: 12),
              const Text(
                'Failed to load curriculum',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Text(
                provider.errorMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => provider.loadCurriculum(forceRefresh: true),
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF97316),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (experiments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.search_off, color: Color(0xFF64748B), size: 48),
            SizedBox(height: 12),
            Text(
              'No experiments found',
              style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 4),
            Text(
              'Try adjusting your search query or filters.',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      physics: const BouncingScrollPhysics(),
      itemCount: experiments.length,
      itemBuilder: (context, index) {
        final exp = experiments[index];
        final imageUrl = exp.diagramUrl.isNotEmpty
            ? exp.diagramUrl
            : _getYoutubeThumbnail(exp.videoId);

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.2),
                blurRadius: 8,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Card Image Thumbnail
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(15),
                      topRight: Radius.circular(15),
                    ),
                    child: Container(
                      height: 160,
                      width: double.infinity,
                      color: const Color(0xFFF1F5F9),
                      child: _buildExperimentImage(imageUrl),
                    ),
                  ),
                  // Duration chip overlay
                  Positioned(
                    bottom: 10,
                    right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.85),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFF334155), width: 0.5),
                      ),
                      child: Text(
                        exp.duration,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              // Title and details
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      exp.title,
                      style: const TextStyle(
                        color: Color(0xFF0F172A),
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      exp.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF475569),
                        fontSize: 12,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Action button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFFF7ED), // Light orange background tint
                          foregroundColor: const Color(0xFFF97316),
                          surfaceTintColor: const Color(0xFFF97316),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: const BorderSide(color: Color(0x66F97316)),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          elevation: 0,
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => IdeScreen(experiment: exp),
                            ),
                          );
                        },
                        icon: const Icon(Icons.code, size: 16),
                        label: const Text(
                          'Launch IDE',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSkeletonLoader() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: 3,
      itemBuilder: (context, index) {
        return Container(
          height: 270,
          margin: const EdgeInsets.only(bottom: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 160,
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(15),
                    topRight: Radius.circular(15),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(height: 16, width: 140, color: const Color(0xFFE2E8F0)),
                    const SizedBox(height: 8),
                    Container(height: 12, width: double.infinity, color: const Color(0xFFE2E8F0)),
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }
}
