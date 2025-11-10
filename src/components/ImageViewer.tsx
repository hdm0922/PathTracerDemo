interface ImageViewerProps {
  className: string;
  imageClassName: string;
  src: string;
  alt: string;
  opacity?: number;
  onClick?: () => void;
}

export default function ImageViewer({
  className,
  imageClassName,
  src,
  alt,
  opacity = 1,
  onClick,
}: ImageViewerProps) {
  return (
    <div className={className} style={{ opacity }} onClick={onClick}>
      <img src={src} alt={alt} className={imageClassName} />
    </div>
  );
}
