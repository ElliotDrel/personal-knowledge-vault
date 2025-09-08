import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resourceTypeConfig } from '@/data/mockData';
import { addResource } from '@/data/storage';
import { ArrowLeft, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const NewResource = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedType = searchParams.get('type') as keyof typeof resourceTypeConfig || null;
  
  const [selectedType, setSelectedType] = useState<keyof typeof resourceTypeConfig | null>(preSelectedType);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    notes: '',
    transcript: '',
    tags: '',
    // Dynamic fields based on resource type
    author: '',
    creator: '',
    platform: '',
    year: '',
    duration: '',
    url: '',
    isbn: '',
    episode: '',
    readTime: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !formData.title.trim()) {
      alert('Please select a resource type and enter a title');
      return;
    }

    // Create new resource object
    const newResource = {
      id: `resource-${Date.now()}`,
      type: selectedType,
      title: formData.title.trim(),
      description: formData.description.trim(),
      notes: formData.notes.trim(),
      transcript: formData.transcript.trim(),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add type-specific fields
      ...(formData.author && { author: formData.author }),
      ...(formData.creator && { creator: formData.creator }),
      ...(formData.platform && { platform: formData.platform }),
      ...(formData.year && { year: parseInt(formData.year) }),
      ...(formData.duration && { duration: formData.duration }),
      ...(formData.url && { url: formData.url }),
      ...(formData.isbn && { isbn: formData.isbn }),
      ...(formData.episode && { episode: formData.episode }),
      ...(formData.readTime && { readTime: formData.readTime })
    };

    // Save to localStorage
    addResource(newResource);
    
    console.log('Created new resource:', newResource);
    
    // Navigate to the new resource page
    navigate(`/resource/${newResource.id}`);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderTypeSpecificFields = () => {
    if (!selectedType) return null;

    const config = resourceTypeConfig[selectedType];
    const fields = config.fields || [];

    return fields.map((field) => (
      <div key={field} className="space-y-2">
        <Label htmlFor={field} className="text-sm font-medium">
          {field.charAt(0).toUpperCase() + field.slice(1)}
        </Label>
        <Input
          id={field}
          value={formData[field as keyof typeof formData] || ''}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={`Enter ${field}`}
        />
      </div>
    ));
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Add New Resource</h1>
            <p className="text-muted-foreground">Capture insights from your learning journey</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Resource Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Type</CardTitle>
              <CardDescription>What type of content are you adding?</CardDescription>
            </CardHeader>
            <CardContent>
              {!preSelectedType ? (
                <Select value={selectedType || ''} onValueChange={(value) => setSelectedType(value as keyof typeof resourceTypeConfig)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(resourceTypeConfig).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <span>{config.icon}</span>
                          <span>{config.label.slice(0, -1)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
                  <span className="text-2xl">{resourceTypeConfig[selectedType].icon}</span>
                  <div>
                    <p className="font-medium">{resourceTypeConfig[selectedType].label.slice(0, -1)}</p>
                    <p className="text-sm text-muted-foreground">Pre-selected from dashboard</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedType && (
            <>
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Essential details about your resource</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter resource title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of the resource"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-medium">
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => handleInputChange('tags', e.target.value)}
                      placeholder="Enter tags separated by commas (e.g., javascript, programming, tutorial)"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Type-Specific Fields */}
              <Card>
                <CardHeader>
                  <CardTitle>{resourceTypeConfig[selectedType].label.slice(0, -1)} Details</CardTitle>
                  <CardDescription>Specific information for this resource type</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderTypeSpecificFields()}
                </CardContent>
              </Card>

              {/* Content */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Insights</CardTitle>
                  <CardDescription>Add your notes and key takeaways</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm font-medium">
                      Notes
                    </Label>
                    <MarkdownEditor
                      value={formData.notes}
                      onChange={(value) => handleInputChange('notes', value)}
                      placeholder="Add your notes, key insights, and takeaways here..."
                      height={300}
                    />
                  </div>

                  {(selectedType === 'video' || selectedType === 'podcast') && (
                    <div className="space-y-2">
                      <Label htmlFor="transcript" className="text-sm font-medium">
                        Transcript
                      </Label>
                      <Textarea
                        id="transcript"
                        value={formData.transcript}
                        onChange={(e) => handleInputChange('transcript', e.target.value)}
                        placeholder="Paste transcript or key quotes here..."
                        rows={4}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button type="submit" size="lg" className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Resource
                </Button>
                <Link to="/">
                  <Button type="button" variant="outline" size="lg">
                    Cancel
                  </Button>
                </Link>
              </div>
            </>
          )}
        </form>
      </div>
    </Layout>
  );
};

export default NewResource;