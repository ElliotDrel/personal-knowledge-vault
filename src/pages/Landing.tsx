import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 transition-smooth hover:opacity-80">
              <div className="w-8 h-8 bg-gradient-knowledge rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold bg-gradient-knowledge bg-clip-text text-transparent">
                  Knowledge Vault
                </h1>
              </div>
            </Link>

            {/* Auth Button - Dynamic based on auth state */}
            <div>
              {user ? (
                <Link to="/dashboard">
                  <Button className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
                    Go to App
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
                    Sign In / Sign Up
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-knowledge rounded-2xl mb-8 shadow-glow">
              <Brain className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-knowledge bg-clip-text text-transparent leading-tight">
              Turn Content Into Knowledge
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              Stop letting great ideas slip away. Knowledge Vault helps you capture, organize, and revisit insights from videos, articles, and more.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-primary hover:shadow-knowledge transition-smooth text-lg px-8 py-6">
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Watching great content but forgetting it all?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Scattered notes across apps? Losing track of valuable insights?
            </p>
            <p className="text-2xl font-semibold bg-gradient-knowledge bg-clip-text text-transparent">
              There's a better way.
            </p>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                How It Works
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to build your knowledge library
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {/* Step 1 */}
              <Card className="bg-gradient-card border-0 shadow-card">
                <CardHeader>
                  <div className="text-5xl mb-4">📥</div>
                  <CardTitle className="text-2xl">Capture</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Paste any YouTube, TikTok, or Instagram URL and let us handle the rest
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="bg-gradient-card border-0 shadow-card">
                <CardHeader>
                  <div className="text-5xl mb-4">🧠</div>
                  <CardTitle className="text-2xl">Process</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    AI extracts transcripts and key insights automatically
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className="bg-gradient-card border-0 shadow-card">
                <CardHeader>
                  <div className="text-5xl mb-4">📚</div>
                  <CardTitle className="text-2xl">Organize</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Build your personal knowledge library with smart organization
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
                  Start Building Your Vault
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                Powerful Features
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Everything you need to capture and organize knowledge
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {/* Feature 1 */}
              <Card className="bg-gradient-card border-0 shadow-card hover:shadow-knowledge transition-smooth">
                <CardHeader>
                  <div className="text-4xl mb-3">🎥</div>
                  <CardTitle className="text-xl">Video Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Extract transcripts from YouTube Shorts, TikTok, and Instagram Reels automatically
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="bg-gradient-card border-0 shadow-card hover:shadow-knowledge transition-smooth">
                <CardHeader>
                  <div className="text-4xl mb-3">🤖</div>
                  <CardTitle className="text-xl">AI-Powered Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Automatically generate summaries and smart suggestions for your content
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="bg-gradient-card border-0 shadow-card hover:shadow-knowledge transition-smooth">
                <CardHeader>
                  <div className="text-4xl mb-3">💬</div>
                  <CardTitle className="text-xl">Smart Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Add threaded notes and discussions to your resources for deeper insights
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 4 */}
              <Card className="bg-gradient-card border-0 shadow-card hover:shadow-knowledge transition-smooth">
                <CardHeader>
                  <div className="text-4xl mb-3">🔗</div>
                  <CardTitle className="text-xl">Duplicate Detection</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Never save the same resource twice with intelligent URL matching
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 5 */}
              <Card className="bg-gradient-card border-0 shadow-card hover:shadow-knowledge transition-smooth">
                <CardHeader>
                  <div className="text-4xl mb-3">🚀</div>
                  <CardTitle className="text-xl">Instant Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    Paste a URL and get transcripts in seconds with our optimized pipeline
                  </CardDescription>
                </CardContent>
              </Card>

              {/* Feature 6 */}
              <Card className="bg-gradient-card border-0 shadow-card hover:shadow-knowledge transition-smooth">
                <CardHeader>
                  <div className="text-4xl mb-3">📊</div>
                  <CardTitle className="text-xl">Beautiful Organization</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    See your knowledge grow with stats, insights, and visual organization
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
              Your ideas deserve a home
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10">
              Join others who are building their knowledge vault.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-primary hover:shadow-knowledge transition-smooth text-lg px-10 py-7">
                  Create Free Account
                  <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              Already a member?{' '}
              <Link to="/auth" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>

            <div className="mt-12 flex items-center justify-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>Free to use</span>
              <span className="mx-2">•</span>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span>No credit card required</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-6 h-6 bg-gradient-knowledge rounded flex items-center justify-center"
              )}>
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Knowledge Vault
              </span>
            </div>

            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Knowledge Vault. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
