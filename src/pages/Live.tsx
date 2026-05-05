import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Radio, Eye, X, Send, MessageCircle, Loader2,
  Video, ShoppingBag, Bell, PlayCircle, Pin, PinOff, Trash2
} from "lucide-react";

import AgoraRTC, {
  AgoraRTCProvider,
  useLocalCameraTrack,
  useLocalMicrophoneTrack,
  usePublish,
  useJoin,
  useRemoteUsers,
  RemoteUser,
  LocalUser,
} from "agora-rtc-react";

const APP_ID = "0503d343fd7e416fb8b594e53470cc1e";

const hostClient = AgoraRTC.createClient({ codec: "vp8", mode: "live", role: "host" });
const audienceClient = AgoraRTC.createClient({ codec: "vp8", mode: "live", role: "audience" });

// ─── Chat ────────────────────────────────────────────────
const LiveChat = ({ sessionId }: { sessionId: string }) => {
  const { user, userDisplayName } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });

  useEffect(() => {
    supabase
      .from("live_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => { setMessages(data || []); setTimeout(scrollToBottom, 200); });

    const channel = supabase
      .channel(`live_chat_room_${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_messages", filter: `session_id=eq.${sessionId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMessages((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]);
          setTimeout(scrollToBottom, 50);
        } else if (payload.eventType === "DELETE") {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        } else if (payload.eventType === "UPDATE") {
          setMessages((prev) => prev.map((m) => m.id === payload.new.id ? payload.new : m));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;
    const msg = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
    await supabase.from("live_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      user_name: userDisplayName || "Anónimo",
      content: msg,
    });
    setIsSending(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("live_messages").delete().eq("id", id);
  };

  const handlePin = async (id: string, pinned: boolean) => {
    await supabase.from("live_messages").update({ is_pinned: !pinned }).eq("id", id);
  };

  const pinned = messages.filter((m) => m.is_pinned);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-white/5">
      <div className="hidden lg:flex items-center gap-2 p-4 bg-zinc-900 border-b border-white/5">
        <MessageCircle size={16} className="text-yellow-400" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">Conversa ao Vivo</span>
      </div>

      {pinned.length > 0 && (
        <div className="bg-yellow-400/10 border-b border-yellow-400/20 p-2 max-h-[100px] overflow-y-auto">
          {pinned.map((msg) => (
            <div key={`pin-${msg.id}`} className="flex items-start gap-2 text-xs mb-1.5 bg-black/20 p-1.5 rounded-lg">
              <Pin size={12} className="text-yellow-400 shrink-0 mt-0.5 fill-yellow-400" />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-yellow-400 text-[10px] mr-1">{msg.user_name}:</span>
                <span className="text-white text-[10px] opacity-90">{msg.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center py-10 opacity-30">
            <MessageCircle size={32} className="mx-auto mb-2 text-white" />
            <p className="text-[9px] font-bold text-white uppercase">Seja o primeiro a comentar!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwner = user?.id === msg.user_id;
          return (
            <div key={msg.id || i} className="group flex flex-col items-start">
              <div className="flex items-baseline justify-between w-full mb-0.5">
                <span className={`text-[10px] font-black uppercase ${isOwner ? "text-yellow-400" : "text-zinc-400"}`}>
                  {msg.user_name}
                </span>
                {isOwner && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handlePin(msg.id, msg.is_pinned)} className={`p-1 rounded ${msg.is_pinned ? "text-yellow-400" : "text-zinc-500"}`}>
                      {msg.is_pinned ? <PinOff size={10} /> : <Pin size={10} />}
                    </button>
                    <button onClick={() => handleDelete(msg.id)} className="text-zinc-500 hover:text-red-500 p-1 rounded">
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
              <div className={`px-3 py-2 rounded-2xl rounded-tl-none border max-w-[90%] ${isOwner ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-400" : "bg-white/10 border-white/5 text-white"}`}>
                <p className="text-xs leading-snug font-medium break-words">{msg.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 bg-zinc-900 border-t border-white/5">
        {user ? (
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Comentar..."
              disabled={isSending}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white text-xs font-bold outline-none placeholder:text-white/20"
            />
            <button type="submit" disabled={!newMessage.trim() || isSending}
              className="bg-yellow-400 text-black p-2.5 rounded-full disabled:opacity-50">
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        ) : (
          <Link to="/auth" className="block text-center py-2 bg-white/5 rounded-xl text-[9px] font-black text-gray-400 uppercase border border-white/10">
            Entra para participar do chat
          </Link>
        )}
      </div>
    </div>
  );
};

// ─── Host (vendedor a transmitir) ────────────────────────
const HostStream = ({ sessionId, onEnd }: { sessionId: string; onEnd: () => void }) => {
  const { localMicrophoneTrack, isLoading: loadingMic } = useLocalMicrophoneTrack();
  const { localCameraTrack, isLoading: loadingCam } = useLocalCameraTrack();
  const remoteUsers = useRemoteUsers();

  useJoin({ appid: APP_ID, channel: sessionId, token: null });
  usePublish([localMicrophoneTrack, localCameraTrack]);

  if (loadingMic || loadingCam)
    return <div className="fixed inset-0 bg-black flex items-center justify-center"><Loader2 className="animate-spin text-yellow-400" size={48} /></div>;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col lg:flex-row overflow-hidden">
      <div className="flex-1 relative bg-black h-[55vh] lg:h-full">
        <div className="w-full h-full">
          <LocalUser audioTrack={localMicrophoneTrack} videoTrack={localCameraTrack} cameraOn micOn playAudio={false} playVideo />
        </div>
        <div className="absolute top-6 left-6 flex items-center gap-3 z-50">
          <div className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 animate-pulse">
            <span className="w-1.5 h-1.5 bg-white rounded-full" /> EMISSÃO AO VIVO
          </div>
          <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 border border-white/10">
            <Eye size={14} /> {remoteUsers.length}
          </div>
        </div>
        <button onClick={onEnd} className="absolute top-6 right-6 bg-red-600/20 hover:bg-red-600 text-white p-2 rounded-xl z-50">
          <X size={24} />
        </button>
      </div>
      <div className="w-full lg:w-[400px] h-[45vh] lg:h-full shrink-0 flex flex-col">
        <LiveChat sessionId={sessionId} />
      </div>
    </div>
  );
};

// ─── Audience (espectador) ────────────────────────────────
const AudienceStream = ({ session, onClose }: { session: any; onClose: () => void }) => {
  const remoteUsers = useRemoteUsers();
  useJoin({ appid: APP_ID, channel: session.channel_name, token: null });
  const hostUser = remoteUsers[0];

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col lg:flex-row overflow-hidden">
      <div className="flex-1 relative bg-zinc-950 h-[55vh] lg:h-full">
        {!hostUser ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-white">
            <Loader2 className="animate-spin text-yellow-400 mb-4" size={40} />
            <p className="font-black uppercase text-[10px] opacity-40">Sintonizando emissão...</p>
          </div>
        ) : (
          <div className="w-full h-full">
            <RemoteUser user={hostUser} playAudio playVideo />
          </div>
        )}
        <div className="absolute top-6 left-6 flex gap-2 z-50">
          <div className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase animate-pulse">AO VIVO</div>
          <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-2 border border-white/10">
            <Eye size={12} /> {session.viewer_count + remoteUsers.length}
          </div>
        </div>
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/40 rounded-full text-white z-50">
          <X size={24} />
        </button>
        <div className="absolute bottom-3 left-3">
          <span className="px-2 py-1 rounded text-[10px] font-black text-white bg-red-600 mb-1 inline-block">AO VIVO</span>
          <h2 className="text-lg font-black text-white">{session.title}</h2>
        </div>
      </div>
      <div className="w-full lg:w-[400px] h-[45vh] lg:h-full flex flex-col bg-zinc-950 shrink-0">
        <LiveChat sessionId={session.id} />
      </div>
    </div>
  );
};

// ─── Página principal ─────────────────────────────────────
const Live = () => {
  const navigate = useNavigate();
  const { user, userDisplayName } = useAuth();
  const [activeLive, setActiveLive] = useState<any>(null);
  const [isHostMode, setIsHostMode] = useState(false);
  const [hostSessionId, setHostSessionId] = useState<string | null>(null);
  const [liveTitle, setLiveTitle] = useState("");

  // Lives activas
  const { data: lives = [] } = useQuery({
    queryKey: ["live_sessions_active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("status", "live")
        .order("started_at", { ascending: false });
      return data || [];
    },
    refetchInterval: 20000,
  });

  // Próximas lives
  const { data: upcoming = [] } = useQuery({
    queryKey: ["live_sessions_upcoming"],
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

  const handleStartLive = async () => {
    if (!user || !liveTitle.trim()) return;
    const channelName = `kisua-live-${user.id}-${Date.now()}`;
    const { data } = await supabase.from("live_sessions").insert({
      title: liveTitle,
      channel_name: channelName,
      seller_id: user.id,
      status: "live",
      started_at: new Date().toISOString(),
    }).select().single();
    if (data) {
      setHostSessionId(data.id);
      setIsHostMode(true);
    }
  };

  const handleEndLive = async () => {
    if (!hostSessionId) return;
    await supabase.from("live_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", hostSessionId);
    setIsHostMode(false);
    setHostSessionId(null);
  };

  // Host a transmitir
  if (isHostMode && hostSessionId) {
    return (
      <AgoraRTCProvider client={hostClient}>
        <HostStream sessionId={hostSessionId} onEnd={handleEndLive} />
      </AgoraRTCProvider>
    );
  }

  // Espectador a ver live
  if (activeLive) {
    return (
      <AgoraRTCProvider client={audienceClient}>
        <AudienceStream session={activeLive} onClose={() => setActiveLive(null)} />
      </AgoraRTCProvider>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-10">

        {/* Título */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Radio className="text-red-600 animate-pulse" size={20} />
              <span className="text-red-600 font-black uppercase tracking-widest text-[9px]">Shopping em Directo</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
              Transmissões <br /><span className="text-zinc-600">ao Vivo</span>
            </h1>
          </div>

          {/* Botão iniciar live — apenas utilizadores autenticados */}
          {user && (
            <div className="w-full md:w-auto flex flex-col gap-2">
              <input
                type="text"
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                placeholder="Título da live..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
              />
              <button
                onClick={handleStartLive}
                disabled={!liveTitle.trim()}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest disabled:opacity-30"
              >
                Iniciar Emissão
              </button>
            </div>
          )}
        </div>

        {/* Lives activas */}
        {lives.length === 0 ? (
          <div className="text-center py-24 bg-zinc-900/30 rounded-3xl border-2 border-dashed border-zinc-800">
            <PlayCircle size={60} className="text-zinc-800 mx-auto mb-4" />
            <h3 className="text-lg font-black text-zinc-700 uppercase italic">Sem directos no momento</h3>
            <p className="text-zinc-800 text-[10px] mt-1 font-black uppercase tracking-widest">Fique atento às próximas lives</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {lives.map((live: any) => (
              <div key={live.id} onClick={() => setActiveLive(live)}
                className="group cursor-pointer relative aspect-[9/16] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 hover:border-red-600 transition-all duration-500">
                {live.thumbnail_url
                  ? <img src={live.thumbnail_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-all" />
                  : <div className="w-full h-full flex items-center justify-center bg-zinc-950"><Radio size={60} className="text-zinc-800" /></div>
                }
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase animate-pulse">AO VIVO</div>
                  <div className="bg-black/60 text-white px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <Eye size={12} /> {live.viewer_count || 0}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <h3 className="font-black text-white text-lg uppercase italic truncate">{live.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Próximas lives */}
        {upcoming.length > 0 && (
          <>
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
              <Radio size={16} className="text-yellow-400" /> Transmissões em Breve
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
              {upcoming.map((s: any) => (
                <div key={s.id} className="rounded-xl overflow-hidden relative bg-zinc-900 aspect-[4/3]">
                  {s.thumbnail_url
                    ? <img src={s.thumbnail_url} className="w-full h-full object-cover opacity-50" />
                    : <div className="w-full h-full flex items-center justify-center"><Radio size={30} className="text-zinc-700" /></div>
                  }
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-black text-black bg-yellow-400">EM BREVE</span>
                  <div className="absolute bottom-2 left-2">
                    <h3 className="text-xs font-black text-white">{s.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div className="rounded-2xl p-6 text-center" style={{ background: "linear-gradient(135deg, hsl(30 50% 10%) 0%, hsl(35 60% 18%) 100%)" }}>
          <Bell className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <h2 className="text-base font-black text-yellow-400 uppercase">Não perca as próximas lives!</h2>
          {!user && (
            <button onClick={() => navigate("/auth")} className="mt-3 px-8 py-2.5 rounded-xl text-sm font-black bg-yellow-400 text-black hover:bg-yellow-300 transition">
              Cadastre-se
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Live;
