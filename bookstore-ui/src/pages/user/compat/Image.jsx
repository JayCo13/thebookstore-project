export default function Image({ src, alt = '', className, style, fill, sizes, ...props }) {
  // Simple img wrapper to replace Next.js Image in CRA
  // Support `fill` by making the image absolutely positioned to fill parent
  const finalStyle = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }
    : style;
  return <img src={src} alt={alt} className={className} style={finalStyle} {...props} />;
}