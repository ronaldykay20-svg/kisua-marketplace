import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Radio, Users, Clock, Send, MessageCircle, ChevronRight, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

const chatMessages = [
  { user: "Lucas Costa", message: "Bom acceita", badge: "🟠", time: "11......" },
  { user: "Beatriz Lima", message: "Promoções a prodaços", badge: "🟠", time: "11......" },
  { user: "Rafael Moura", message: "Gostou a seepra", badge: "🟢", time: "1......" },
  { user: "Amanda Silva", message: "Vou com ada a beperi", badge: "🟠", time: "1......" },
  { user: "Pedro Rodrigues", message: "Madre doa do soa beoco", badge: "🟢", time: "1......" },
];

const upcomingStreams = [
  { title: "Smart TV 8K", subtitle: "LANÇAMENTO", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop", tag: "EM BREVE" },
  { title: "Moto Honda CB 650R", subtitle: "ANÚNCIO OFICIAL", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop", tag: "EM BREVE" },
  { title: "iPhone 16 Pro", subtitle: "UNBOXING", image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=300&fit=crop", tag: "EM BREVE" },
  { title: "Apartamento Talatona", subtitle: "TOUR VIRTUAL", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop", tag: "EM BREVE" },
];

const Live = () => {
  const navigate = useNavigate();
  const [chatInput, setChatInput] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Live Section */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(30 50% 10%) 0%, hsl(35 60% 18%) 40%, hsl(25 40% 12%) 100%)" }}>
        {/* Sparkle overlay */}
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(45 100% 60% / 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 30%, hsl(45 100% 60% / 0.3) 0%, transparent 40%)" }} />

        <div className="container mx-auto px-3 py-6 relative z-10">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-xl md:text-3xl font-black text-secondary tracking-wider" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
              TRANSMISSÃO AO VIVO
            </h1>
            <p className="text-xs md:text-sm text-primary-foreground/80 font-semibold mt-1">PARTICIPE AO VIVO E CONHEÇA AS NOVIDADES!</p>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between mb-4 text-primary-foreground/90 text-xs">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span className="font-bold">TW = 5.278</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-sm bg-destructive text-primary-foreground text-[10px] font-black animate-pulse">AO VIVO</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-bold tabular-nums">-90:45</span>
              </div>
            </div>
          </div>

          {/* Main content - mobile stacked, tablet side by side */}
          <div className="md:grid md:grid-cols-5 md:gap-4">
            {/* Video area */}
            <div className="md:col-span-3 relative rounded-card overflow-hidden mb-3 md:mb-0">
              <div className="aspect-video bg-foreground/20 rounded-card overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=500&fit=crop"
                  alt="Live stream"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                {/* Product overlay */}
                <div className="absolute bottom-3 left-3">
                  <span className="px-2 py-1 rounded-sm text-[10px] font-black text-primary-foreground bg-destructive mb-1 inline-block">NOVIDADE!</span>
                  <h2 className="text-lg md:text-xl font-black text-primary-foreground leading-tight">
                    iPHONE 14 PRO<br />E AIRPODS PRO
                  </h2>
                </div>
              </div>
            </div>

            {/* Chat area */}
            <div className="md:col-span-2 bg-card/90 backdrop-blur-sm rounded-card border border-border overflow-hidden flex flex-col" style={{ maxHeight: "350px" }}>
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-secondary" />
                  <span className="text-xs font-black text-foreground uppercase">Chat da Live</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold">{msg.user.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-foreground">{msg.user}</span>
                        <span className="text-[10px]">{msg.badge}</span>
                        <span className="text-[9px] text-muted-foreground">{msg.time}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-border">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Envie sua mensagem..."
                    className="flex-1 px-3 py-1.5 rounded-card bg-muted text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <button className="px-3 py-1.5 rounded-card bg-primary text-primary-foreground">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming streams */}
      <section className="container mx-auto px-3 py-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-secondary" /> Transmissões em Breve
          </h2>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-foreground" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {upcomingStreams.map((stream, i) => (
            <div key={i} className="rounded-card overflow-hidden relative cursor-pointer group">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={stream.image} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
              </div>
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-sm text-[9px] font-black text-secondary-foreground bg-secondary">{stream.tag}</span>
              <div className="absolute bottom-2 left-2">
                <p className="text-[9px] text-primary-foreground/80 font-semibold uppercase">{stream.subtitle}</p>
                <h3 className="text-xs font-black text-primary-foreground">{stream.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="container mx-auto px-3 mb-6">
        <div className="rounded-card overflow-hidden p-6 text-center" style={{ background: "linear-gradient(135deg, hsl(30 50% 10%) 0%, hsl(35 60% 18%) 100%)" }}>
          <Bell className="w-8 h-8 text-secondary mx-auto mb-2" />
          <h2 className="text-base md:text-lg font-black text-secondary uppercase">
            CADASTRE-SE E NÃO PERCA AS PRÓXIMAS LIVES!
          </h2>
          <button onClick={() => navigate("/")} className="mt-3 px-8 py-2.5 rounded-card text-sm font-black bg-secondary text-secondary-foreground hover:bg-secondary/80 transition border-2 border-secondary">
            CADASTRE-SE
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Live;
