import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useStorageAdapter, type ResourceTypeConfig } from '@/data/storageAdapter';
import { Settings as SettingsIcon, User, Palette, Database, Plus, Trash2 } from 'lucide-react';

const Settings = () => {
  const storageAdapter = useStorageAdapter();
  const [resourceTypeConfig, setResourceTypeConfig] = useState<ResourceTypeConfig | null>(null);
  const [newFieldInputs, setNewFieldInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load resource type config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const config = await storageAdapter.getResourceTypeConfig();
        setResourceTypeConfig(config);
      } catch (err) {
        console.error('Error loading resource type config:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [storageAdapter]);

  const handleAddField = async (resourceType: keyof ResourceTypeConfig) => {
    const newFieldName = newFieldInputs[resourceType]?.trim();
    if (!newFieldName || !resourceTypeConfig) return;

    setLoading(true);
    setError(null);
    try {
      // Add field and refresh config
      const updatedConfig = await storageAdapter.addFieldToResourceType(resourceType, newFieldName);
      setResourceTypeConfig(updatedConfig);

      // Clear input
      setNewFieldInputs(prev => ({ ...prev, [resourceType]: '' }));
    } catch (err) {
      console.error('Error adding field:', err);
      setError('Failed to add field');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveField = async (resourceType: keyof ResourceTypeConfig, fieldName: string) => {
    if (!resourceTypeConfig) return;

    setLoading(true);
    setError(null);
    try {
      // Remove field and refresh config
      const updatedConfig = await storageAdapter.removeFieldFromResourceType(resourceType, fieldName);
      setResourceTypeConfig(updatedConfig);
    } catch (err) {
      console.error('Error removing field:', err);
      setError('Failed to remove field');
    } finally {
      setLoading(false);
    }
  };

  const handleNewFieldInputChange = (resourceType: string, value: string) => {
    setNewFieldInputs(prev => ({ ...prev, [resourceType]: value }));
  };

  if (!resourceTypeConfig) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading settings...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-knowledge rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          </div>
          <p className="text-muted-foreground">Customize your knowledge vault experience</p>
        </div>

        <div className="space-y-8">
          {/* Profile Settings */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-primary" />
                <CardTitle>Profile</CardTitle>
              </div>
              <CardDescription>
                Manage your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" placeholder="Your name" defaultValue="Knowledge Seeker" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" defaultValue="seeker@knowledge.vault" />
                </div>
              </div>
              <Button size="sm" className="bg-gradient-primary">
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Resource Type Configuration */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle>Resource Types</CardTitle>
              </div>
              <CardDescription>
                Configure fields for each resource type to match your workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(resourceTypeConfig).map(([type, config]) => (
                <div key={type} className="border border-border rounded-lg p-4 bg-background/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{config.icon}</span>
                      <div>
                        <h3 className="font-semibold">{config.label}</h3>
                        <p className="text-sm text-muted-foreground">
                          {config.fields.length} custom fields
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Current Fields */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Current Fields:</Label>
                      <div className="flex flex-wrap gap-2">
                        {config.fields.map((field) => (
                          <Badge key={field} variant="secondary" className="flex items-center space-x-1">
                            <span>{field}</span>
                            <button
                              className="ml-1 hover:text-destructive transition-colors"
                              onClick={() => handleRemoveField(type as keyof ResourceTypeConfig, field)}
                              title={`Remove ${field} field`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                        {config.fields.length === 0 && (
                          <span className="text-sm text-muted-foreground italic">No custom fields yet</span>
                        )}
                      </div>
                    </div>

                    {/* Add New Field */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter new field name"
                        value={newFieldInputs[type] || ''}
                        onChange={(e) => handleNewFieldInputChange(type, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddField(type as keyof ResourceTypeConfig);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddField(type as keyof ResourceTypeConfig)}
                        disabled={!newFieldInputs[type]?.trim()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Field
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-primary" />
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>
                Customize how your knowledge vault looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Theme</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <div className="w-12 h-8 bg-gradient-subtle rounded border"></div>
                    <span className="text-sm">Light</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <div className="w-12 h-8 bg-gradient-to-b from-slate-800 to-slate-900 rounded border"></div>
                    <span className="text-sm">Dark</span>
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-sm font-medium mb-3 block">Reading Font</Label>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start font-reading">
                    Crimson Text (Current)
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Inter
                  </Button>
                  <Button variant="ghost" className="w-full justify-start font-serif">
                    Georgia
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="text-destructive">Data & Privacy</CardTitle>
              <CardDescription>
                Manage your data and account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                <h4 className="font-medium mb-2">Export Data</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Download all your resources and notes in JSON format
                </p>
                <Button size="sm" variant="outline">
                  Export All Data
                </Button>
              </div>
              
              <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
                <h4 className="font-medium text-destructive mb-2">Danger Zone</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Permanently delete your account and all associated data
                </p>
                <Button size="sm" variant="destructive">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;