import { Plus } from "lucide-react";
import story1 from "@/assets/story-1.jpg";
import story2 from "@/assets/story-2.jpg";
import story3 from "@/assets/story-3.jpg";
import story4 from "@/assets/story-4.jpg";
import story5 from "@/assets/story-5.jpg";

const stories = [
  { id: 0, name: "Sua história", image: "", isAdd: true },
  { id: 1, name: "Ana Luísa", image: story1, hasNew: true },
  { id: 2, name: "Carlos M.", image: story2, hasNew: true },
  { id: 3, name: "Maria João", image: story3, hasNew: false },
  { id: 4, name: "Pedro A.", image: story4, hasNew: true },
  { id: 5, name: "Beatriz S.", image: story5, hasNew: false },
];

const Stories = () => {
  return (
    <section className="py-4 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {stories.map((story) => (
            <button key={story.id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              {story.isAdd ? (
                <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center">
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
              ) : (
                <div
                  className={`w-16 h-16 rounded-full p-[2.5px] ${
                    story.hasNew
                      ? "bg-gradient-to-tr from-primary to-accent"
                      : "bg-border"
                  }`}
                >
                  <img
                    src={story.image}
                    alt={story.name}
                    className="w-full h-full rounded-full object-cover border-2 border-card"
                    loading="lazy"
                    width={64}
                    height={64}
                  />
                </div>
              )}
              <span className="text-[11px] text-muted-foreground font-medium truncate w-16 text-center">
                {story.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stories;
