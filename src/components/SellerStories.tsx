import { Plus, CheckCircle } from "lucide-react";
import story1 from "@/assets/story-1.jpg";
import story2 from "@/assets/story-2.jpg";
import story3 from "@/assets/story-3.jpg";
import story4 from "@/assets/story-4.jpg";
import story5 from "@/assets/story-5.jpg";

const sellers = [
  { id: 1, name: "TechZone", image: story1, verified: true, hasNew: true },
  { id: 2, name: "ModaAO", image: story2, verified: true, hasNew: true },
  { id: 3, name: "AutoPremium", image: story3, verified: true, hasNew: false },
  { id: 4, name: "CasaDecor", image: story4, verified: false, hasNew: true },
  { id: 5, name: "SportMax", image: story5, verified: true, hasNew: true },
  { id: 6, name: "FarmáciaSol", image: story1, verified: true, hasNew: false },
  { id: 7, name: "LivrariaLuz", image: story3, verified: false, hasNew: true },
];

const SellerStories = () => {
  return (
    <section className="container mx-auto px-4 py-4">
      <h3 className="text-sm font-bold text-foreground mb-3">Lojas em destaque</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {sellers.map((s) => (
          <button key={s.id} className="flex flex-col items-center gap-1 flex-shrink-0 w-[68px]">
            <div className={`w-[60px] h-[60px] rounded-card p-[2px] ${s.hasNew ? "bg-primary" : "bg-border"}`}>
              <img
                src={s.image}
                alt={s.name}
                className="w-full h-full rounded-[4px] object-cover border-2 border-card"
                loading="lazy"
              />
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[56px]">{s.name}</span>
              {s.verified && <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default SellerStories;
