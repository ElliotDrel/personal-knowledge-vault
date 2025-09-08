import { Layout } from '@/components/layout/Layout';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { resourceTypeConfig } from '@/data/mockData';
import { getResources, getRecentResources } from '@/data/storage';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, BookOpen, Target, Brain } from 'lucide-react';

const Dashboard = () => {
  const resources = getResources();
  const recentResources = getRecentResources(3);
  const totalResources = resources.length;
  
  // Stats by type
  const statsByType = Object.entries(resourceTypeConfig).map(([type, config]) => ({
    type,
    config,
    count: resources.filter(r => r.type === type).length
  }));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-knowledge rounded-2xl mb-6 shadow-glow">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-knowledge bg-clip-text text-transparent">
            Your Knowledge Vault
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Capture, organize, and share insights from books, videos, podcasts, and articles. 
            Your learning journey, beautifully documented.
          </p>
          <Link to="/resources/new">
            <Button size="lg" className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Resource
            </Button>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {/* Total Resources */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader className="pb-3">
              <CardDescription>Total Resources</CardDescription>
              <CardTitle className="text-3xl font-bold text-primary">
                {totalResources}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4 mr-1" />
                Growing collection
              </div>
            </CardContent>
          </Card>

          {/* Resource Type Stats */}
          {statsByType.map(({ type, config, count }) => (
            <Card key={type} className="bg-gradient-card border-0 shadow-card group hover:shadow-knowledge transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{config.icon}</span>
                  <CardTitle className="text-2xl font-bold">
                    {count}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="group-hover:text-foreground transition-smooth">
                  {config.label}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Resources */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Recent Updates</h2>
              <p className="text-muted-foreground">Your latest learning insights</p>
            </div>
            <Link to="/resources">
              <Button variant="outline" className="hover:bg-accent-soft transition-smooth">
                View All Resources
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {recentResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-card rounded-2xl p-8 shadow-card border-0">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Ready to Learn?</h2>
            <p className="text-muted-foreground">Add a new resource to your knowledge vault</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(resourceTypeConfig).map(([type, config]) => (
              <Link key={type} to={`/resources/new?type=${type}`}>
                <Button 
                  variant="outline" 
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2 hover:bg-accent-soft hover:border-accent transition-smooth group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-smooth">{config.icon}</span>
                  <span className="font-medium">Add {config.label.slice(0, -1)}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;