import { useState, useEffect, useRef } from "react";
import { Radio, Users, Clock, Send, MessageCircle, ChevronRight, Bell, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

const APP_ID = "0503d343fd7e416fb8b594e53470cc1e";

const BADGE_COLORS: Record<string, string> = {
  admin: "🔴",
  seller: "🟠",
  vip: "🟡",
  member: "🟢",
};

const Live = () => {
  const navigate = useNavigate();
  const { user, userDisplayName } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const agoraClientRef = useRef<any>(null);
  const [joined, setJoined] = useState(false);
  const [agoraError, setAgoraError] = useState("");

  // Buscar live activa
  const { data: session } = useQuery({
    queryKey: ["active_live_session"],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    refetchInterval: 10000,
  });

  // Buscar próximas lives
  const { data: upcoming = [] } = useQuery({
    queryKey: ["upcoming_live_sessions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true })
        .limit(4);
      return data || [];
    },
  });

  // Carregar mensagens do chat
  useEffect(() => {
    if (!session?.id) return;

    supabase
      .from("live_chat")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => setMessages(data || []));

    // Realtime chat
    const channel = supabase
      .channel(`live_chat:${session.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_chat",
        filter: `session_id=eq.${session.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    // Realtime viewer count
    const viewerChannel = supabase
      .channel(`live_viewers:${session.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "live_viewers",
        filter: `session_id=eq.${session.id}`,
      }, async () => {
        const { count } = await supabase
          .from("live_viewers")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id)
          .is("left_at", null);
        setViewerCount(count || 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(viewerChannel);
    };
  }, [session?.id]);

  // Registar espectador
  useEffect(() => {
    if (!session?.id || !user) return;
    supabase.from("live_viewers").upsert({
      session_id: session.id,
      user_id: user.id,
      joined_at: new Date().toISOString(),
      left_at: null,
    }, { onConflict: "session_id,user_id" });

    return () => {
      supabase.from("live_viewers").update({ left_at: new Date().toISOString() })
        .eq("session_id", session.id).eq("user_id", user.id);
    };
  }, [session?.id, user]);

  // Timer ao vivo
  useEffect(() => {
    if (!session?.started_at) return;
    const start = new Date(session.started_at).getTime();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [session?.started_at]);

  // Iniciar Agora
  useEffect(() => {
    if (!session?.channel_name) return;

    const initAgora = async () => {
      try {
        const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
        const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
        client.setClientRole("audience");
        agoraClientRef.current = client;

        // Pedir token à Edge Function
        const { data: fnData } = await supabase.functions.invoke("agora-token", {
          body: { channel: session.channel_name, uid: 0, role: 2 },
        });

        await client.join(APP_ID, session.channel_name, fnData.token, null);

        client.on("user-published", async (remoteUser: any, mediaType: any) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === "video") {
            const videoContainer = document.getElementById("agora-video");
            if (videoContainer) remoteUser.videoTrack.play(videoContainer);
          }
          if (mediaType === "audio") remoteUser.audioTrack.play();
        });

        setJoined(true);
      } catch (e: any) {
        setAgoraError("Não foi possível ligar ao stream.");
      }
    };

    initAgora();

    return () => {
      agoraClientRef.current?.leave();
    };
  }, [session?.channel_name]);

  // Scroll chat para baixo
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !user || !session?.id) return;
    await supabase.from("live_chat").insert({
      session_id: session.id,
      user_id: user.id,
      user_name: userDisplayName || "Anónimo",
      message: chatInput.trim(),
      badge: "member",
    });
    setChatInput("");
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Hero Live Section */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(30 50% 10%) 0%, hsl(35 60% 18%) 40%, hsl(25 40% 12%) 100%)" }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, hsl(45 100% 60% / 0.4) 0%, transparent 40%)" }} />

        <div className="container mx-auto px-3 py-6 relative z-10">
          <div className="text-center mb-4">
            <h1 className="text-xl md:text-3xl font-black text-secondary tracking-wider">
              TRANSMISSÃO AO VIVO
            </h1>
            <p className="text-xs text-primary-foreground/80 font-semibold mt-1">
              PARTICIPE AO VIVO E CONHEÇA AS NOVIDADES!
            </p>
          </div>

          {session ? (
            <>
              {/* Stats */}
              <div className="flex items-center justify-between mb-4 text-primary-foreground/90 text-xs">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="font-bold">{viewerCount.toLocaleString()} espectadores</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-sm bg-red-500 text-white text-[10px] font-black animate-pulse">
                    AO VIVO
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-bold tabular-nums">{formatTime(elapsed)}</span>
                  </div>
                </div>
              </div>

              <div className="md:grid md:grid-cols-5 md:gap-4">
                {/* Vídeo Agora */}
                <div className="md:col-span-3 relative rounded-xl overflow-hidden mb-3 md:mb-0 bg-black aspect-video flex items-center justify-center">
                  <div id="agora-video" className="w-full h-full" />
                  {!joined && !agoraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <span className="text-white text-sm">A ligar ao stream...</span>
                    </div>
                  )}
                  {agoraError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-sm">{agoraError}</span>
                    </div>
                  )}
                  {session.thumbnail_url && !joined && (
                    <img src={session.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                  )}
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-1 rounded-sm text-[10px] font-black text-white bg-red-500 mb-1 inline-block">AO VIVO</span>
                    <h2 className="text-lg font-black text-white leading-tight">{session.title}</h2>
                  </div>
                </div>

                {/* Chat realtime */}
                <div className="md:col-span-2 bg-card/90 backdrop-blur-sm rounded-xl border border-border overflow-hidden flex flex-col" style={{ maxHeight: "350px" }}>
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-secondary" />
                      <span className="text-xs font-black text-foreground uppercase">Chat da Live</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {messages.map((msg: any) => (
                      <div key={msg.id} className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold">{msg.user_name?.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-foreground">{msg.user_name}</span>
                            <span className="text-[10px]">{BADGE_COLORS[msg.badge] || "🟢"}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-2 border-t border-border">
                    {user ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && sendMessage()}
                          placeholder="Envie sua mensagem..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-muted text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <button onClick={sendMessage} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => navigate("/auth")} className="w-full text-xs text-center text-primary font-semibold py-1.5">
                        Faz login para participar no chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <Radio className="w-12 h-12 text-secondary mx-auto mb-3 animate-pulse" />
              <p className="text-primary-foreground font-semibold">Nenhuma live activa no momento</p>
              <p className="text-primary-foreground/60 text-sm mt-1">Veja as próximas transmissões abaixo</p>
            </div>
          )}
        </div>
      </section>

      {/* Próximas lives */}
      <section className="container mx-auto px-3 py-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-secondary" /> Transmissões em Breve
          </h2>
        </div>
        {upcoming.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {upcoming.map((stream: any) => (
              <div key={stream.id} className="rounded-xl overflow-hidden relative cursor-pointer group">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {stream.thumbnail_url ? (
                    <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Radio className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
                </div>
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-sm text-[9px] font-black text-secondary-foreground bg-secondary">EM BREVE</span>
                <div className="absolute bottom-2 left-2">
                  <h3 className="text-xs font-black text-white">{stream.title}</h3>
                  {stream.scheduled_at && (
                    <p className="text-[9px] text-white/70">{new Date(stream.scheduled_at).toLocaleDateString("pt-AO")}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transmissão agendada</p>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-3 mb-6">
        <div className="rounded-xl overflow-hidden p-6 text-center" style={{ background: "linear-gradient(135deg, hsl(30 50% 10%) 0%, hsl(35 60% 18%) 100%)" }}>
          <Bell className="w-8 h-8 text-secondary mx-auto mb-2" />
          <h2 className="text-base font-black text-secondary uppercase">
            CADASTRE-SE E NÃO PERCA AS PRÓXIMAS LIVES!
          </h2>
          <button onClick={() => navigate("/auth")} className="mt-3 px-8 py-2.5 rounded-xl text-sm font-black bg-secondary text-secondary-foreground hover:bg-secondary/80 transition">
            CADASTRE-SE
          </button>
        </div>
      </section>

    </div>
  );
};

export default Live;
