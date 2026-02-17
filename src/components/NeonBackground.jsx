export default function NeonBackgroundB({ children }) {
  return (
    <div className="neoB">
      <div className="neoB__base" />
      <div className="neoB__outlineGlow" />
      <div className="neoB__run" />
      <div className="neoB__content">{children}</div>
    </div>
  );
}
