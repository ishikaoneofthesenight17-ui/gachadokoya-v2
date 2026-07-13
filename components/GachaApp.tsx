"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Map, Plus, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import type { Spot, StockStatus } from "@/lib/types";
import { mockSpots } from "@/lib/mock";
import { matchesSpot } from "@/lib/search";
import { getSupabaseBrowser } from "@/lib/supabase";
import SpotCard from "./SpotCard";
import DetailDrawer from "./DetailDrawer";
import ReportModal from "./ReportModal";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

type Sort = "new" | "near" | "likely";
const priority: Record<StockStatus, number> = { found: 0, low: 1, unknown: 2, soldout: 3 };

export default function GachaApp() {
  const [spots, setSpots] = useState<Spot[]>(mockSpots);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | StockStatus>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected] = useState<Spot | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("spots").select("*").order("witnessed_at", { ascending: false }).limit(300);
    if (!error && data?.length) setSpots(data as Spot[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const next = spots.filter((s) => matchesSpot(s, query) && (status === "all" || s.status === status));
    return [...next].sort((a,b) => sort === "likely" ? priority[a.status]-priority[b.status] : new Date(b.witnessed_at).getTime()-new Date(a.witnessed_at).getTime());
  }, [spots, query, status, sort]);

  return <main>
    <header className="site-header"><div className="header-inner"><div className="brand"><div className="brand-icon">◉</div><div><b>ガチャドコヤ</b><small>GACHA SIGHTING MAP</small></div></div><button className="header-report" onClick={()=>setReportOpen(true)}><Plus size={18}/>目撃情報を登録</button></div></header>

    <section className="hero"><div className="hero-inner"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/>世界の“今”を伝え残す地図。</div><h1>あのガチャ、<br/><em>どこにある？</em></h1><p>欲しいカプセルトイの最新目撃情報を、みんなで残して探せるマップ。</p></div><div className="hero-cat">🐈‍⬛<span>見つけたら<br/>教えてね</span></div></div></section>

    <section className="search-panel"><div className="search-row"><div className="search-box"><Search/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="商品名・キャラ・メーカー・お店で検索"/></div><button className="search-button">探す</button></div><div className="suggestions"><span>例：</span>{["猫","ちいかわ","ポケモン","ミニチュア"].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div></section>

    <section className="content-shell"><div className="toolbar"><div className="filters"><SlidersHorizontal size={17}/>{([['all','すべて'],['found','あった'],['low','残り少なめ'],['soldout','なかった']] as const).map(([v,l])=><button key={v} className={status===v?'active':''} onClick={()=>setStatus(v)}>{l}</button>)}</div><div className="view-actions"><select value={sort} onChange={(e)=>setSort(e.target.value as Sort)}><option value="new">新しい順</option><option value="likely">見つかる可能性順</option></select><button className={view==='map'?'active':''} onClick={()=>setView('map')}><Map size={17}/>地図</button><button className={view==='list'?'active':''} onClick={()=>setView('list')}>一覧</button></div></div>
      <div className="result-summary"><b>{filtered.length}件</b>の目撃情報 {loading && <span>更新中…</span>}</div>
      <div className={`results-layout ${view==='list'?'list-only':''}`}>
        <div className="map-column"><MapView spots={filtered} onSelect={setSelected}/></div>
        <div className="cards-column">{filtered.length ? filtered.map(s=><SpotCard key={s.id} spot={s} onClick={()=>setSelected(s)}/>) : <div className="empty"><div>🔍</div><h3>まだ目撃情報がありません</h3><p>検索語を変えるか、最初の目撃者になってください。</p></div>}</div>
      </div>
    </section>

    <button className="floating-report" onClick={()=>setReportOpen(true)}><Plus/>今見たガチャを登録</button>
    <footer><b>ガチャドコヤ</b><p>あなたの今日を、誰かが明日発見するかもしれない。</p></footer>
    <DetailDrawer spot={selected} onClose={()=>setSelected(null)}/>
    <ReportModal open={reportOpen} onClose={()=>setReportOpen(false)} onSaved={load}/>
  </main>;
}
