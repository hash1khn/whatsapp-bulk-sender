import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryData {
  images: string[]; // Array of image URLs
  message: string;
  expires?: number;
}

export default function Gallery() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
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

    const loadGalleryData = () => {
      try {
        const localStorageKey = `g_${batchId}`;
        const storedData = localStorage.getItem(localStorageKey);

        if (!storedData) {
          throw new Error('Gallery not found');
        }

        const galleryData = JSON.parse(storedData) as GalleryData;

        // Check if gallery has expired
        if (galleryData.expires && galleryData.expires < Date.now()) {
          localStorage.removeItem(localStorageKey);
          throw new Error('This gallery link has expired');
        }

        setData({
          images: galleryData.images,
          message: galleryData.message || ''
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid gallery link');
      } finally {
        setLoading(false);
      }
    };

    loadGalleryData();
  }, [batchId]);

  const handleKeyPress = (e: KeyboardEvent) => {
    if (selectedImage === null || !data) return;

    if (e.key === 'Escape') {
      setSelectedImage(null);
    } else if (e.key === 'ArrowLeft' && selectedImage > 0) {
      setSelectedImage(selectedImage - 1);
    } else if (e.key === 'ArrowRight' && selectedImage < data.images.length - 1) {
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

  if (error || !data?.images?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-semibold mb-4">Gallery Error</h2>
          <p className="text-red-500 mb-4">{error || 'No images found'}</p>
          {data?.message && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="whitespace-pre-wrap">{data.message}</p>
            </div>
          )}
          <Button 
            className="mt-4 w-full"
            onClick={() => navigate('/')}
          >
            Return Home
          </Button>
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
          {data.images.map((imageUrl, index) => (
            <div
              key={imageUrl}
              className="aspect-square relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedImage(index)}
            >
              <img
                src={imageUrl}
                alt={`Gallery image ${index + 1}`}
                className="object-cover w-full h-full"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage !== null && data && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div 
            className="relative w-full h-full flex items-center justify-center"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={data.images[selectedImage]}
              alt={`Selected image ${selectedImage + 1}`}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
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