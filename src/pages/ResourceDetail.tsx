import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { resourceTypeConfig } from '@/data/mockData';
import { getResourceById, updateResource } from '@/data/storage';
import { 
  ArrowLeft, 
  ExternalLink, 
  Share, 
  Edit, 
  Calendar, 
  User, 
  Clock, 
  Tag,
  FileText,
  Mic,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ResourceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const resource = id ? getResourceById(id) : null;
  
  const [notes, setNotes] = useState(resource?.notes || '');
  const [transcript, setTranscript] = useState(resource?.transcript || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);

  if (!resource) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-4">Resource not found</h1>
            <Link to="/resources">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Resources
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const config = resourceTypeConfig[resource.type];

  const handleSaveNotes = () => {
    if (!resource) return;
    updateResource(resource.id, { notes });
    console.log('Saved notes for resource:', resource.id);
    setIsEditingNotes(false);
  };

  const handleSaveTranscript = () => {
    if (!resource) return;
    updateResource(resource.id, { transcript });
    console.log('Saved transcript for resource:', resource.id);
    setIsEditingTranscript(false);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/resources">
            <Button variant="ghost" size="sm" className="mb-4 hover:bg-accent-soft transition-smooth">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Resources
            </Button>
          </Link>

          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">{config.icon}</span>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "font-medium",
                    `bg-${config.color}/10 text-${config.color} border-${config.color}/20`
                  )}
                >
                  {config.label.slice(0, -1)}
                </Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-reading">
                {resource.title}
              </h1>
              
              <p className="text-lg text-muted-foreground font-reading leading-relaxed">
                {resource.description}
              </p>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <Button size="sm" variant="outline">
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
              {resource.url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Metadata */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {resource.author && (
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Author</p>
                      <p className="font-medium">{resource.author}</p>
                    </div>
                  </div>
                )}
                {resource.creator && (
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Creator</p>
                      <p className="font-medium">{resource.creator}</p>
                    </div>
                  </div>
                )}
                {resource.duration && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{resource.duration}</p>
                    </div>
                  </div>
                )}
                {resource.year && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p className="font-medium">{resource.year}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {resource.tags.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-wrap gap-2">
                      {resource.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes Section */}
        <Card className="mb-8 bg-gradient-card border-0 shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle>Your Notes</CardTitle>
              </div>
              <Button
                size="sm"
                variant={isEditingNotes ? "default" : "outline"}
                onClick={() => {
                  if (isEditingNotes) {
                    handleSaveNotes();
                  } else {
                    setIsEditingNotes(true);
                  }
                }}
              >
                {isEditingNotes ? (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Capture your insights, key takeaways, and thoughts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingNotes ? (
              <MarkdownEditor
                value={notes}
                onChange={(value) => setNotes(value)}
                placeholder="Write your notes here... You can use markdown formatting."
                height={400}
                className="font-reading text-base leading-relaxed"
              />
            ) : (
              <div className="prose prose-slate max-w-none font-reading">
                <div className="whitespace-pre-wrap text-base leading-relaxed">
                  {notes || (
                    <div className="text-muted-foreground italic text-center py-8">
                      No notes yet. Click Edit to add your insights.
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transcript Section (for videos/podcasts) */}
        {(resource.type === 'video' || resource.type === 'podcast') && (
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mic className="w-5 h-5 text-primary" />
                  <CardTitle>Transcript</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant={isEditingTranscript ? "default" : "outline"}
                  onClick={() => {
                    if (isEditingTranscript) {
                      handleSaveTranscript();
                    } else {
                      setIsEditingTranscript(true);
                    }
                  }}
                >
                  {isEditingTranscript ? (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
              <CardDescription>
                Full transcript or key quotes from the {resource.type}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingTranscript ? (
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste transcript or key quotes here..."
                  className="min-h-[300px] font-reading text-sm leading-relaxed resize-none"
                />
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed font-reading">
                    {transcript || (
                      <div className="text-muted-foreground italic text-center py-8">
                        No transcript available. Click Edit to add one.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default ResourceDetail;