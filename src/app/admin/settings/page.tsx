'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles, AlertCircle, Save, Undo, FlaskConical, LayoutGrid, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnouncementItem {
  text: string;
  accentText?: string;
  prefixIcon?: string;
}

interface AnnouncementBarSettings {
  enabled: boolean;
  backgroundGradient: string;
  textColor: string;
  accentColor: string;
  speed: number;
  items: AnnouncementItem[];
}

const DEFAULT_SETTINGS: AnnouncementBarSettings = {
  enabled: true,
  backgroundGradient: 'linear-gradient(90deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
  textColor: '#ffffff',
  accentColor: '#f97316',
  speed: 40,
  items: [
    { prefixIcon: '⚡', text: 'Free Shipping Over ₹999', accentText: 'Free Shipping' },
    { prefixIcon: '', text: 'For Schools – Bulk Pricing', accentText: 'Bulk Pricing' },
    { prefixIcon: '', text: 'Made In India 🇮🇳', accentText: '' },
    { prefixIcon: '', text: '10,000+ Students Learning With EZCirkit', accentText: 'EZCirkit' },
    { prefixIcon: '', text: 'Step-by-Step Video Tutorials Included', accentText: 'Video Tutorials' }
  ]
};

const SettingsPage = () => {
  const firestore = useFirestore();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'announcementBar') : null),
    [firestore]
  );
  const homepageDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'homepage') : null),
    [firestore]
  );

  const { data: remoteSettings, isLoading: isLoadingSettings } = useDoc<AnnouncementBarSettings>(settingsDocRef);
  const { data: remoteHomepage, isLoading: isLoadingHomepage } = useDoc<{ selectedExperiments?: string[] }>(homepageDocRef);

  const [allExperiments, setAllExperiments] = useState<any[]>([]);
  const [isLoadingExps, setIsLoadingExps] = useState(true);

  // Load from localStorage cache immediately on client-side mount to avoid blocking UI
  useEffect(() => {
    try {
      const cached = localStorage.getItem('ez_experiments_cache');
      if (cached) {
        setAllExperiments(JSON.parse(cached));
        setIsLoadingExps(false);
      }
    } catch (e) {
      console.error("Error loading settings experiments cache:", e);
    }
  }, []);

  const isLoading = isLoadingSettings || isLoadingHomepage || isLoadingExps;
  
  const [settings, setSettings] = useState<AnnouncementBarSettings>(DEFAULT_SETTINGS);
  const [selectedExps, setSelectedExps] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (remoteSettings) {
      setSettings({
        enabled: remoteSettings.enabled ?? DEFAULT_SETTINGS.enabled,
        backgroundGradient: remoteSettings.backgroundGradient || DEFAULT_SETTINGS.backgroundGradient,
        textColor: remoteSettings.textColor || DEFAULT_SETTINGS.textColor,
        accentColor: remoteSettings.accentColor || DEFAULT_SETTINGS.accentColor,
        speed: remoteSettings.speed ?? DEFAULT_SETTINGS.speed,
        items: remoteSettings.items || DEFAULT_SETTINGS.items
      });
    }
  }, [remoteSettings]);

  useEffect(() => {
    if (remoteHomepage) {
      setSelectedExps(remoteHomepage.selectedExperiments || []);
    }
  }, [remoteHomepage]);

  useEffect(() => {
    if (!firestore) {
      setIsLoadingExps(false);
      return;
    }
    
    let active = true;
    const loadExperiments = async () => {
      try {
        const chaptersSnap = await getDocs(collection(firestore, 'tutorialChapters'));
        const chaptersData = chaptersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch all chapter tutorials in parallel
        const promises = chaptersData.map(async (ch) => {
          const tutsSnap = await getDocs(collection(firestore, `tutorialChapters/${ch.id}/tutorials`));
          return tutsSnap.docs.map(doc => ({
            id: doc.id,
            chapterId: ch.id,
            ...doc.data()
          }));
        });
        
        const results = await Promise.all(promises);
        const loadedTuts = results.flat();
        
        if (active) {
          setAllExperiments(loadedTuts);
          try {
            localStorage.setItem('ez_experiments_cache', JSON.stringify(loadedTuts));
          } catch (e) {
            console.error("Error saving settings experiments cache:", e);
          }
        }
      } catch (err) {
        console.error("Error loading settings experiments:", err);
      } finally {
        if (active) {
          setIsLoadingExps(false);
        }
      }
    };

    loadExperiments();
    return () => {
      active = false;
    };
  }, [firestore]);

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, 'settings', 'announcementBar'), settings);
      await setDoc(doc(firestore, 'settings', 'homepage'), { selectedExperiments: selectedExps });
      toast({
        title: 'Settings Saved',
        description: 'All settings updated successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving Settings',
        description: error.message || 'Something went wrong.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    toast({
      description: 'Reset fields to system default values (click Save to apply).',
    });
  };

  const updateItem = (index: number, key: keyof AnnouncementItem, value: string) => {
    const newItems = [...settings.items];
    newItems[index] = { ...newItems[index], [key]: value };
    setSettings({ ...settings, items: newItems });
  };

  const deleteItem = (index: number) => {
    const newItems = settings.items.filter((_, i) => i !== index);
    setSettings({ ...settings, items: newItems });
  };

  const addItem = () => {
    setSettings({
      ...settings,
      items: [...settings.items, { prefixIcon: '⚡', text: 'New Announcement Item', accentText: '' }]
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === settings.items.length - 1) return;
    
    const newItems = [...settings.items];
    const temp = newItems[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    newItems[index] = newItems[swapIndex];
    newItems[swapIndex] = temp;
    
    setSettings({ ...settings, items: newItems });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-sm text-muted-foreground font-semibold">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black font-headline tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage configuration parameters, announcement banners, and roles.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleReset} className="rounded-xl h-9 gap-1.5 cursor-pointer">
            <Undo className="h-4 w-4" />
            <span>Reset to Default</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="rounded-xl h-9 gap-1.5 cursor-pointer">
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="announcement" className="w-full">
        <TabsList className="bg-muted p-1 rounded-2xl mb-6">
          <TabsTrigger value="announcement" className="rounded-xl px-4 py-2 font-bold transition-all">Announcement Bar</TabsTrigger>
          <TabsTrigger value="homepage" className="rounded-xl px-4 py-2 font-bold transition-all">Homepage Experiments</TabsTrigger>
          <TabsTrigger value="general" className="rounded-xl px-4 py-2 font-bold transition-all">General Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="announcement" className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Controls Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800 py-5">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>Appearance & Animation</span>
                  </CardTitle>
                  <CardDescription>Customize colors, gradient, and display status of the banner.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  {/* Enabled switch */}
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border">
                    <div className="space-y-1">
                      <Label htmlFor="enabled" className="text-sm font-bold text-foreground">Enable Announcement Bar</Label>
                      <p className="text-xs text-muted-foreground">Toggle visibility of the scrolling banner on the homepage.</p>
                    </div>
                    <Switch
                      id="enabled"
                      checked={settings.enabled}
                      onCheckedChange={(val) => setSettings({ ...settings, enabled: val })}
                    />
                  </div>

                  {/* Gradient Background */}
                  <div className="space-y-2">
                    <Label htmlFor="gradient" className="text-sm font-bold text-foreground">Background Gradient / Color CSS</Label>
                    <Input
                      id="gradient"
                      value={settings.backgroundGradient}
                      onChange={(e) => setSettings({ ...settings, backgroundGradient: e.target.value })}
                      placeholder="e.g. linear-gradient(90deg, #1c1917 0%, #292524 50%)"
                      className="rounded-xl font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Supports valid CSS background values, gradients, or HEX colors.</p>
                  </div>

                  {/* Color Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="textColor" className="text-sm font-bold text-foreground">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="textColor"
                          type="color"
                          value={settings.textColor.startsWith('#') && settings.textColor.length === 7 ? settings.textColor : '#ffffff'}
                          onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                          className="w-12 h-10 p-1 rounded-xl cursor-pointer"
                        />
                        <Input
                          value={settings.textColor}
                          onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                          className="flex-1 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accentColor" className="text-sm font-bold text-foreground">Accent Highlight Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accentColor"
                          type="color"
                          value={settings.accentColor.startsWith('#') && settings.accentColor.length === 7 ? settings.accentColor : '#f97316'}
                          onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                          className="w-12 h-10 p-1 rounded-xl cursor-pointer"
                        />
                        <Input
                          value={settings.accentColor}
                          onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                          className="flex-1 rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Marquee Speed Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-bold text-foreground">Animation Loop Speed</Label>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {settings.speed}s per loop
                      </span>
                    </div>
                    <Slider
                      min={10}
                      max={120}
                      step={5}
                      value={[settings.speed]}
                      onValueChange={(val) => setSettings({ ...settings, speed: val[0] })}
                      className="py-2"
                    />
                    <p className="text-[10px] text-muted-foreground">Lower duration increases velocity; higher duration makes it scroll slower.</p>
                  </div>

                </CardContent>
              </Card>

              {/* Marquee Items List */}
              <Card className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800 py-5 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-lg font-bold">Banner Messages</CardTitle>
                    <CardDescription>Manage, reorder, and edit the items inside the marquee.</CardDescription>
                  </div>
                  <Button type="button" size="sm" onClick={addItem} className="rounded-xl gap-1 cursor-pointer">
                    <Plus className="h-4 w-4" />
                    <span>Add Item</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-6">
                  {settings.items.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-2xl space-y-2">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-bold">No items added</p>
                      <p className="text-xs text-muted-foreground">Click Add Item to start composing announcements.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {settings.items.map((item, index) => (
                        <div key={index} className="flex gap-3 items-start p-4 bg-zinc-50 dark:bg-zinc-900/30 border rounded-2xl relative group">
                          
                          {/* Order Action Buttons */}
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              disabled={index === 0}
                              onClick={() => moveItem(index, 'up')}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              disabled={index === settings.items.length - 1}
                              onClick={() => moveItem(index, 'down')}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* Item Fields */}
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Icon / Emoji</Label>
                              <Input
                                value={item.prefixIcon || ''}
                                onChange={(e) => updateItem(index, 'prefixIcon', e.target.value)}
                                placeholder="⚡, ✦, 🇮🇳"
                                className="rounded-xl text-sm"
                              />
                            </div>
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Main Message Text</Label>
                              <Input
                                value={item.text}
                                onChange={(e) => updateItem(index, 'text', e.target.value)}
                                placeholder="e.g. Free Shipping Over ₹999"
                                className="rounded-xl text-sm"
                              />
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Accent Text to Highlight (Optional)</Label>
                              <Input
                                value={item.accentText || ''}
                                onChange={(e) => updateItem(index, 'accentText', e.target.value)}
                                placeholder="Must match a substring of the main text to highlight it."
                                className="rounded-xl text-sm"
                              />
                              <p className="text-[9px] text-muted-foreground">The matching words inside the main text will be styled with the Accent Color.</p>
                            </div>
                          </div>

                          {/* Delete Action */}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-xl shrink-0 mt-6 cursor-pointer"
                            onClick={() => deleteItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Live Preview Panel */}
            <div className="space-y-6">
              <Card className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden lg:sticky lg:top-8">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800 py-5">
                  <CardTitle className="text-lg font-bold">Live Banner Preview</CardTitle>
                  <CardDescription>Beholds how the announcement bar will render for customers.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  
                  {!settings.enabled ? (
                    <div className="py-8 border rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 text-center text-xs text-muted-foreground font-semibold">
                      Announcement Bar is currently disabled.
                    </div>
                  ) : (
                    <div 
                      className="w-full overflow-hidden relative rounded-xl border border-zinc-200 dark:border-zinc-800 py-2.5 px-4"
                      style={{ background: settings.backgroundGradient }}
                    >
                      <div className="flex items-center gap-4 flex-wrap justify-center text-center">
                        {settings.items.map((item, idx) => {
                          const parts = item.text.split(new RegExp(`(${item.accentText})`, 'gi'));
                          return (
                            <span 
                              key={idx} 
                              className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1"
                              style={{ color: settings.textColor }}
                            >
                              {item.prefixIcon && <span className="mr-0.5">{item.prefixIcon}</span>}
                              <span>
                                {parts.map((part, i) => {
                                  const isAccent = item.accentText && part.toLowerCase() === item.accentText.toLowerCase();
                                  return (
                                    <span 
                                      key={i} 
                                      style={{ color: isAccent ? settings.accentColor : undefined }}
                                      className={isAccent ? 'font-extrabold' : undefined}
                                    >
                                      {part}
                                    </span>
                                  );
                                })}
                              </span>
                              {idx < settings.items.length - 1 && (
                                <span className="ml-3 font-semibold opacity-40">◆</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 p-4 rounded-2xl flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">Unsaved Changes</h4>
                      <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
                        Preview is simulated in real time. Remember to click **Save Settings** in the top right to deploy it live.
                      </p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>

        <TabsContent value="homepage" className="space-y-6 animate-in fade-in duration-200">
          <Card className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800 py-5">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-primary" />
                    <span>Select Homepage Experiments</span>
                  </CardTitle>
                  <CardDescription>Choose which projects to display in the learning carousel/grid on the homepage.</CardDescription>
                </div>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black">
                  {selectedExps.length} selected
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {allExperiments.map((proj) => {
                  const isSelected = selectedExps.includes(proj.id);
                  return (
                    <div
                      key={proj.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedExps(selectedExps.filter(id => id !== proj.id));
                        } else {
                          setSelectedExps([...selectedExps, proj.id]);
                        }
                      }}
                      className={cn(
                        "group cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 hover:shadow-md",
                        isSelected
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-background border-border/80 hover:border-zinc-400"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {proj.duration || '5 mins'}
                          </span>
                          <Switch
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedExps([...selectedExps, proj.id]);
                              } else {
                                setSelectedExps(selectedExps.filter(id => id !== proj.id));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">
                          {proj.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {proj.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6 animate-in fade-in duration-200">
          <Card className="rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
            <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800 py-5">
              <CardTitle className="text-lg font-bold">Admin Settings</CardTitle>
              <CardDescription>Manage store configuration and application rules.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-2xl bg-zinc-50 dark:bg-zinc-900/10">
                    <div>
                        <h3 className="font-semibold text-sm">User Roles</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Define permissions for different user roles.</p>
                    </div>
                    <Button variant="outline" className="rounded-xl h-9" disabled>Manage Roles</Button>
                </div>
                 <div className="flex items-center justify-between p-4 border rounded-2xl bg-zinc-50 dark:bg-zinc-900/10">
                    <div>
                        <h3 className="font-semibold text-sm">Notifications</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Configure email and push notifications.</p>
                    </div>
                    <Button variant="outline" className="rounded-xl h-9" disabled>Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
