import React from 'react';
import { KieAiImageGenerationResponse } from '../types';

interface ImageDisplayProps {
  image: KieAiImageGenerationResponse;
  onClick: (image: KieAiImageGenerationResponse) => void; // Added onClick prop
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ image, onClick }) => {
  return (
    <div
      className="relative flex flex-col items-center p-2 bg-white rounded-lg shadow-md border border-gray-200 dark:bg-gray-700 dark:border-gray-600 cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={() => onClick(image)}
      role="button"
      tabIndex={0}
      aria-label={`"${image.prompt}" 이미지 상세보기`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(image);
        }
      }}
    >
      <img
        src={image.imageUrl}
        alt={`${image.model}으로 생성됨`}
        className="w-32 h-32 object-cover rounded-md mb-2 border border-gray-300 dark:border-gray-600" // Thumbnail size
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = 'data:image/svg+xml;base64,' + btoa('<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><rect width="128" height="128" fill="#cccccc"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="12" fill="#333333" text-anchor="middle" dominant-baseline="middle">Failed to load</text></svg>');
        }}
      />
      {image.isMock && (
        <div className="absolute top-1 left-1 bg-yellow-500 text-white text-xs px-2 py-1 rounded-br-lg opacity-90 font-bold">
          모의 이미지
        </div>
      )}
      <p className="text-xs text-gray-600 dark:text-gray-300 text-center truncate w-full px-1">
        {image.prompt.length > 50 ? `${image.prompt.substring(0, 47)}...` : image.prompt}
      </p>
    </div>
  );
};

export default ImageDisplay;