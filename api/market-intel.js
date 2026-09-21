const xmlDecode=(s="")=>s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#39;/g,"'").replace(/&quot;/g,'"');
const text=(s="")=>s.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const esc=(s="")=>s.replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"GET only"});
  const q=String(req.query.q||"AI automation small business").slice(0,120);
  try{
    const url="https://news.google.com/rss/search?q="+encodeURIComponent(q)+"&hl=en-US&gl=US&ceid=US:en";
    const r=await fetch(url,{headers:{"user-agent":"AI-Business-Builder/1.0"}});
    if(!r.ok) throw new Error("Google News request failed");
    const xml=await r.text();
    const items=[...xml.matchAll(/<item>([\\s\\S]*?)<\\/item>/g)].slice(0,8).map(m=>{
      const block=m[1], get=k=>{const x=block.match(new RegExp("<"+k+">([\\s\\S]*?)<\\/"+k+">"));return x?xmlDecode(x[1]):""};
      return {title:text(get("title")),link:get("link").trim(),date:get("pubDate"),source:text(get("source"))};
    }).filter(x=>x.title&&x.link);
    return res.status(200).json({ok:true,query:q,items,note:"Public Google News signals only. Headlines are evidence to inspect, not proof of demand, pricing, revenue, or customer intent."});
  }catch(e){return res.status(502).json({ok:false,error:e.message||"Market research unavailable"});}
}