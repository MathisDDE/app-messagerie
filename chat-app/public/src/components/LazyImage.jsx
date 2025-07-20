import React, { useState, useEffect, useRef } from "react";
import useDarkMode from "./useDarkMode";

const LazyImage = ({ src, alt, className, placeholder, onLoad }) => {
  const [imageSrc, setImageSrc] = useState(placeholder || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef(null);
  const [darkMode] = useDarkMode();

  useEffect(() => {
    let observer;
    
    if (imgRef.current && imageSrc !== src) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Précharger l'image
              const img = new Image();
              img.src = src;
              
              img.onload = () => {
                setImageSrc(src);
                setIsLoading(false);
                if (onLoad) onLoad();
              };
              
              img.onerror = () => {
                setIsError(true);
                setIsLoading(false);
              };
              
              // Arrêter d'observer une fois chargé
              if (observer && imgRef.current) {
                observer.unobserve(imgRef.current);
              }
            }
          });
        },
        {
          rootMargin: "50px",
          threshold: 0.01
        }
      );
      
      observer.observe(imgRef.current);
    }
    
    return () => {
      if (observer && imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, imageSrc, onLoad]);

  // Placeholder par défaut
  const defaultPlaceholder = (
    <div className={`${className} ${darkMode ? "bg-gray-700" : "bg-gray-300"} animate-pulse flex items-center justify-center`}>
      <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );

  if (isError) {
    return (
      <div className={`${className} ${darkMode ? "bg-gray-700" : "bg-gray-300"} flex items-center justify-center`}>
        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {isLoading && !imageSrc && defaultPlaceholder}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading && !placeholder ? 'hidden' : ''}`}
        style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}
      />
    </>
  );
};

export default LazyImage; 