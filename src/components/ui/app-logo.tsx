type AppLogoProps = {
  subtitle?: string;
};

export function AppLogo({
  subtitle = "Self-hosted engineering hiring",
}: AppLogoProps) {
  return (
    <div className="ht-brand-mark">
      <span aria-hidden="true" className="ht-brand-mark__glyph">HT</span>
      <span className="ht-brand-mark__text">
        <span className="ht-brand-mark__title">Hiretea</span>
        <span className="ht-brand-mark__subtitle">{subtitle}</span>
      </span>
    </div>
  );
}
