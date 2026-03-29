import { type ReactNode } from "react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  cta?: string;
  bg?: string;
  icon?: ReactNode;
  children: ReactNode;
}

const SectionCard = ({ title, subtitle, cta = "Compre agora", bg = "bg-card", icon, children }: SectionCardProps) => {
  return (
    <section className="container mx-auto px-3 pt-3">
      <div className={`${bg} rounded-card overflow-hidden border border-border`}>
        {/* Header */}
        <div className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <h2 className="text-sm font-bold text-foreground leading-tight">{title}</h2>
                {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <a href="#" className="text-[11px] font-semibold text-primary hover:underline">{cta}</a>
          </div>
        </div>
        {/* Content */}
        <div className="px-3 pb-3">
          {children}
        </div>
      </div>
    </section>
  );
};

export default SectionCard;
