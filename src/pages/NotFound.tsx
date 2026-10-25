import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-gradient-knowledge rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">🧠</span>
        </div>
        <h1 className="text-4xl font-bold mb-4 bg-gradient-knowledge bg-clip-text text-transparent">404</h1>
        <p className="text-xl text-muted-foreground mb-8">This page doesn't exist in your knowledge vault</p>
        <Link to="/dashboard">
          <Button className="bg-gradient-primary hover:shadow-knowledge transition-smooth">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
