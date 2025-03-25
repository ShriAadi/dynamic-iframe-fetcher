
import React, { useState } from 'react';
import VideoFetcher from '@/components/VideoFetcher';

const Index = () => {
  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Dynamic Video Player</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Search and play movies from various sources
          </p>
        </header>

        <main>
          <VideoFetcher 
            defaultVideoUrl="https://jole340erun.com/play/tt27995594" 
            key="video-fetcher" // Adding a stable key to maintain state between renders
          />
        </main>

        <footer className="mt-20 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Dynamic Video Player. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
