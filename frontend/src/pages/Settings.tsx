/**
 * Settings Page
 *
 * Application settings with persisted preferences for viewer and safety.
 *
 * @module pages/Settings
 */

import { toast } from 'sonner';
import {
  Box,
  Shield,
  Palette,
  RotateCcw,
  Trash2,
  Save,
  Bell,
  Mail,
  Volume2,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useViewerStore } from '@/stores/viewer-store';
import { useSafetyStore } from '@/stores/safety-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Settings() {
  const { theme, setTheme, sidebarCollapsed, setSidebarCollapsed } = useUIStore();

  const {
    shadows,
    setShadows,
    postProcessing,
    setPostProcessing,
    antiAliasing,
    setAntiAliasing,
    qualityLevel,
    setQualityLevel,
    showGrid,
    setShowGrid,
    autoRotate,
    setAutoRotate,
    resetToDefaults: resetViewerSettings,
  } = useViewerStore();

  const {
    autoMitigation,
    setAutoMitigation,
    alertNotifications,
    setAlertNotifications,
    alertSound,
    setAlertSound,
    alertEmail,
    setAlertEmail,
    emailAddress,
    setEmailAddress,
    warningThreshold,
    setWarningThreshold,
    criticalThreshold,
    setCriticalThreshold,
    resetToDefaults: resetSafetySettings,
  } = useSafetyStore();

  const handleClearData = () => {
    localStorage.clear();
    sessionStorage.clear();
    toast.success('All data cleared', {
      description: 'Local storage has been cleared. Refresh to apply.',
    });
  };

  const handleResetAllSettings = () => {
    resetViewerSettings();
    resetSafetySettings();
    setTheme('system');
    setSidebarCollapsed(false);
    toast.success('Settings reset', {
      description: 'All settings have been restored to defaults.',
    });
  };

  const handleSaveSettings = () => {
    // Settings are auto-saved via zustand persist
    toast.success('Settings saved', {
      description: 'Your preferences have been saved.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application preferences
          </p>
        </div>
        <Button onClick={handleSaveSettings}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="appearance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="appearance">
            <Palette className="mr-2 h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="viewer">
            <Box className="mr-2 h-4 w-4" />
            3D Viewer
          </TabsTrigger>
          <TabsTrigger value="safety">
            <Shield className="mr-2 h-4 w-4" />
            Safety
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Choose your preferred color theme for the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme">Color Theme</Label>
                <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system') => setTheme(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Layout</CardTitle>
              <CardDescription>
                Customize the application layout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sidebar">Collapse Sidebar</Label>
                  <p className="text-sm text-muted-foreground">
                    Show only icons in the sidebar navigation.
                  </p>
                </div>
                <Switch
                  id="sidebar"
                  checked={sidebarCollapsed}
                  onCheckedChange={setSidebarCollapsed}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3D Viewer Tab */}
        <TabsContent value="viewer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rendering</CardTitle>
              <CardDescription>
                Configure 3D rendering options for performance or quality.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="shadows">Shadows</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable dynamic shadow rendering.
                  </p>
                </div>
                <Switch
                  id="shadows"
                  checked={shadows}
                  onCheckedChange={setShadows}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="post-processing">Post Processing</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable bloom and other effects.
                  </p>
                </div>
                <Switch
                  id="post-processing"
                  checked={postProcessing}
                  onCheckedChange={setPostProcessing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="anti-aliasing">Anti-Aliasing</Label>
                  <p className="text-sm text-muted-foreground">
                    Smooth jagged edges (FXAA).
                  </p>
                </div>
                <Switch
                  id="anti-aliasing"
                  checked={antiAliasing}
                  onCheckedChange={setAntiAliasing}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="quality">Quality Level</Label>
                <Select value={qualityLevel} onValueChange={(value: 'low' | 'medium' | 'high') => setQualityLevel(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Performance)</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High (Quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display</CardTitle>
              <CardDescription>
                Configure scene display options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="grid">Show Grid</Label>
                  <p className="text-sm text-muted-foreground">
                    Display ground grid in the scene.
                  </p>
                </div>
                <Switch
                  id="grid"
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-rotate">Auto Rotate</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically rotate the scene.
                  </p>
                </div>
                <Switch
                  id="auto-rotate"
                  checked={autoRotate}
                  onCheckedChange={setAutoRotate}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" onClick={resetViewerSettings}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Viewer Settings
            </Button>
          </div>
        </TabsContent>

        {/* Safety Tab */}
        <TabsContent value="safety" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Mitigation</CardTitle>
              <CardDescription>
                Configure automatic safety mitigation behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-mitigation">Auto Mitigation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply safety mitigations.
                  </p>
                </div>
                <Switch
                  id="auto-mitigation"
                  checked={autoMitigation}
                  onCheckedChange={setAutoMitigation}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thresholds</CardTitle>
              <CardDescription>
                Configure uncertainty thresholds for alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Warning Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {(warningThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[warningThreshold * 100]}
                  onValueChange={(values: number[]) => setWarningThreshold(values[0] / 100)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Critical Threshold</Label>
                  <span className="text-sm text-muted-foreground">
                    {(criticalThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[criticalThreshold * 100]}
                  onValueChange={(values: number[]) => setCriticalThreshold(values[0] / 100)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" onClick={resetSafetySettings}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Safety Settings
            </Button>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Notifications</CardTitle>
              <CardDescription>
                Configure how you receive safety alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show browser notifications for alerts.
                    </p>
                  </div>
                </div>
                <Switch
                  id="notifications"
                  checked={alertNotifications}
                  onCheckedChange={setAlertNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="sound">Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Play a sound for critical alerts.
                    </p>
                  </div>
                </div>
                <Switch
                  id="sound"
                  checked={alertSound}
                  onCheckedChange={setAlertSound}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email-alerts">Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for critical events.
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-alerts"
                  checked={alertEmail}
                  onCheckedChange={setAlertEmail}
                />
              </div>

              {alertEmail && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="email-address">Email Address</Label>
                  <Input
                    id="email-address"
                    type="email"
                    placeholder="your@email.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Destructive actions that cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset All Settings
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Settings?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will restore all settings to their default values. Your data will not be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAllSettings}>
                  Reset Settings
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all locally stored data including settings, cache, and session data. You will be logged out.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearData}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Clear All Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
