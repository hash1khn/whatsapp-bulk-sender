import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryImage {
  url: string;
  width: number;
  height: number;
}

interface GalleryData {
  images: GalleryImage[];
  message: string;
}

export default function Gallery() {
  const { batchId } = useParams<{ batchId: string }>();
  const [data, setData] = useState<GalleryData | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) {
      setError('Missing gallery ID');
      setLoading(false);
      return;
    }

    fetch(`/api/gallery/${batchId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load gallery');
        }
        return response.json();
      })
      .then(data => {
        if (!data.images || data.images.length === 0) {
          setError('No images found in this gallery');
          setData({ images: [], message: data.message });
        } else {
          setData(data);
        }
      })
      .catch(error => {
        console.error('Gallery fetch error:', error);
        setError(error instanceof Error ? error.message : 'Failed to load gallery');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [batchId]);

  const handleKeyPress = (e: KeyboardEvent) => {
    if (selectedImage === null) return;

    if (e.key === 'Escape') {
      setSelectedImage(null);
    } else if (e.key === 'ArrowLeft' && selectedImage > 0) {
      setSelectedImage(selectedImage - 1);
    } else if (e.key === 'ArrowRight' && data && selectedImage < data.images.length - 1) {
      setSelectedImage(selectedImage + 1);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedImage, data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading gallery...</div>
      </div>
    );
  }

  if (error || !data || data.images.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Error</h2>
          <p className="text-red-500 mb-4">{error || 'No images found'}</p>
          {data?.message && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap">{data.message}</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Message Header */}
      {data.message && (
        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b">
          <div className="container py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap">{data.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Image Grid */}
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.images.map((image, index) => (
            <div
              key={image.url}
              className="aspect-square relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedImage(index)}
            >
              <img
                src={image.url}
                alt={`Gallery image ${index + 1}`}
                className="object-cover w-full h-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center"
               onClick={e => e.stopPropagation()}>
            <img
              src={data.images[selectedImage].url}
              alt={`Gallery image ${selectedImage + 1}`}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            {selectedImage > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(selectedImage - 1);
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {selectedImage < data.images.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(selectedImage + 1);
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            <div className="absolute bottom-4 left-0 right-0 text-center text-white">
              {selectedImage + 1} of {data.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 