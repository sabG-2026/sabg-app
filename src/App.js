import React,{useState,useEffect,useContext,createContext,useCallback,useMemo,useRef}from"react";
import{supabase}from"./supabase";

const Ctx=createContext();
const APP_NAME="SAB-g";
const ADMIN_EMAIL="admin@sabg.com";
const SLOTS=["ASAP (8–12 mins)","10:00–12:00 PM","12:00–2:00 PM","2:00–4:00 PM","4:00–6:00 PM","6:00–8:00 PM","8:00–10:00 PM"];
const ORDER_STEPS=[{key:"pending",icon:"🧾",label:"Placed"},{key:"confirmed",icon:"✅",label:"Confirmed"},{key:"preparing",icon:"👨‍🍳",label:"Preparing"},{key:"out_for_delivery",icon:"🛵",label:"On the Way"},{key:"delivered",icon:"📦",label:"Delivered"}];
const ST_CLR={pending:"#f59f00",confirmed:"#0ea5e9",preparing:"#8b5cf6",out_for_delivery:"#f97316",delivered:"#22c55e",cancelled:"#ef4444"};

const GS=`
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  body{margin:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overscroll-behavior:none;}
  ::-webkit-scrollbar{display:none;}
  input,button,textarea,select{-webkit-appearance:none;font-family:inherit;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.45;}}
  @keyframes slideIn{from{opacity:0;transform:translateY(-12px);}to{opacity:1;transform:translateY(0);}}
  @keyframes slideUp{from{transform:translateY(100%);opacity:0;}to{transform:translateY(0);opacity:1;}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes pop{0%{transform:scale(0.92);}50%{transform:scale(1.04);}100%{transform:scale(1);}}
  @keyframes spin{to{transform:rotate(360deg);}}
  .tap-scale:active{transform:scale(0.97)!important;}
`;

function Toasts({list}){
  return(
    <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:9999,display:"flex",flexDirection:"column",gap:8,width:"92%",maxWidth:360,pointerEvents:"none"}}>
      {list.map(t=>(
        <div key={t.id} style={{background:"#1e293b",color:"#fff",borderRadius:14,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",borderLeft:`4px solid ${t.color||"#22c55e"}`,animation:"slideIn 0.25s ease"}}>
          <span style={{fontSize:18}}>{t.icon}</span><span style={{lineHeight:1.4}}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

function Shimmer({w="100%",h=16,r=8}){
  const{dk}=useContext(Ctx);
  return <div style={{width:w,height:h,borderRadius:r,background:dk?"#1e293b":"#e9eef5",animation:"pulse 1.6s ease-in-out infinite"}}/>;
}

function StockBadge({stock,size="sm"}){
  const s=Number(stock??999);
  const fs=size==="lg"?13:10;
  const pad=size==="lg"?"6px 12px":"3px 8px";
  const r=size==="lg"?8:6;
  if(s===0)return <span style={{fontSize:fs,fontWeight:800,color:"#fff",background:"#ef4444",borderRadius:r,padding:pad,letterSpacing:0.3}}>Out of Stock</span>;
  if(s<=3)return <span style={{fontSize:fs,fontWeight:800,color:"#fff",background:"linear-gradient(135deg,#ef4444,#dc2626)",borderRadius:r,padding:pad,animation:"pulse 1s infinite"}}>🔥 Only {s} left!</span>;
  if(s<=10)return <span style={{fontSize:fs,fontWeight:800,color:"#9a3412",background:"#ffedd5",borderRadius:r,padding:pad}}>⚠️ Only {s} left</span>;
  if(s<=30)return <span style={{fontSize:fs,fontWeight:700,color:"#854d0e",background:"#fef9c3",borderRadius:r,padding:pad}}>{s} in stock</span>;
  return null;
}

function StockBar({stock}){
  const s=Number(stock??999);
  if(s>=999||stock==null)return(
    <div style={{background:"#f0fdf4",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:14}}>✅</span><span style={{fontSize:13,fontWeight:700,color:"#166534"}}>In stock — plenty available</span>
    </div>
  );
  const color=s===0?"#ef4444":s<=3?"#ef4444":s<=10?"#f97316":s<=30?"#eab308":"#22c55e";
  const bg=s===0?"#fee2e2":s<=3?"#fee2e2":s<=10?"#ffedd5":s<=30?"#fef9c3":"#f0fdf4";
  const pct=s===0?0:Math.min(100,(s/50)*100);
  const label=s===0?"❌ Out of stock — back soon!":s<=3?`🔥 Only ${s} left — order now!`:s<=10?`⚠️ Only ${s} left — selling fast!`:s<=30?`📦 ${s} items left`:null;
  if(!label)return null;
  return(
    <div style={{background:bg,borderRadius:12,padding:"12px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:13,fontWeight:700,color}}>{label}</span>
        {s>0&&<span style={{fontSize:11,color:"#94a3b8",fontWeight:600}}>{s} units</span>}
      </div>
      {s>0&&s<=50&&(
        <div style={{background:"rgba(0,0,0,0.08)",borderRadius:6,height:6,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:6,transition:"width 0.5s ease"}}/>
        </div>
      )}
    </div>
  );
}

function AdminStockEditor({product,onUpdated}){
  const{user,toast}=useContext(Ctx);
  const[open,setOpen]=useState(false);
  const[val,setVal]=useState("");
  const[saving,setSaving]=useState(false);
  if(user?.email!==ADMIN_EMAIL)return null;
  const cur=product.stock!=null?Number(product.stock):null;

  const apply=async(newVal)=>{
    if(isNaN(newVal)||newVal<0)return;
    setSaving(true);
    await supabase.from("products").update({stock:newVal}).eq("id",product.id);
    setSaving(false);setOpen(false);
    toast(`Stock updated → ${newVal}`,"📦","#0ea5e9");
    onUpdated&&onUpdated();
  };
  const quick=async(delta)=>{const nv=Math.max(0,(cur??0)+delta);await apply(nv);};

  return(
    <div style={{background:"#0f172a",border:"1px solid #334155",borderRadius:14,padding:14,marginTop:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:open?12:0}}>
        <span style={{fontSize:12,fontWeight:800,color:"#22c55e",letterSpacing:0.5}}>🔧 ADMIN: STOCK CONTROL</span>
        <button onClick={()=>setOpen(o=>!o)} style={{background:"#1e293b",border:"none",borderRadius:8,padding:"5px 12px",color:"#94a3b8",fontSize:12,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>{open?"✕ Close":"Edit Stock"}</button>
      </div>
      {open&&(
        <div style={{animation:"fadeIn 0.2s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>Current:</span>
            <span style={{fontSize:14,fontWeight:900,color:"#f1f5f9"}}>{cur??<i>unlimited</i>}</span>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
            {[-5,-1,1,5,10].map(d=>(
              <button key={d} onClick={()=>quick(d)} disabled={saving}
                style={{background:d<0?"#7f1d1d":"#14532d",color:d<0?"#fca5a5":"#86efac",border:"none",borderRadius:8,padding:"7px 12px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                {d>0?"+":""}{d}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {[0,5,10,25,50,100].map(n=>(
              <button key={n} onClick={()=>apply(n)} disabled={saving}
                style={{background:"#1e293b",color:"#94a3b8",border:"1px solid #334155",borderRadius:8,padding:"6px 10px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                ={n}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input value={val} onChange={e=>setVal(e.target.value)} type="number" min="0" placeholder="Exact value..."
              onKeyDown={e=>e.key==="Enter"&&apply(Number(val))}
              style={{flex:1,background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"9px 12px",color:"#f1f5f9",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
            <button onClick={()=>apply(Number(val))} disabled={saving||val===""}
              style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontWeight:800,cursor:"pointer",fontFamily:"inherit",fontSize:13,opacity:saving?0.6:1}}>
              {saving?"...":"Set"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthModal({onClose}){
  const{dk,toast}=useContext(Ctx);
  const[mode,setMode]=useState("login");
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[pw,setPw]=useState("");
  const[busy,setBusy]=useState(false);
  const[err,setErr]=useState("");
  const bg=dk?"#0f172a":"#fff",tx=dk?"#f1f5f9":"#1e293b",br=dk?"#334155":"#e2e8f0";

  const submit=async()=>{
    if(!email.trim()||!pw.trim()){setErr("Email and password required");return;}
    setBusy(true);setErr("");
    if(mode==="signup"){
      if(!name.trim()){setErr("Name is required");setBusy(false);return;}
      localStorage.setItem("sabg_signup_name",name.trim());
      const{error}=await supabase.auth.signUp({email,password:pw});
      if(error){setErr(error.message);setBusy(false);return;}
      setBusy(false);setErr("");setMode("confirm");return;
    }else{
      const{error}=await supabase.auth.signInWithPassword({email,password:pw});
      if(error){setErr(error.message);setBusy(false);return;}
    }
    setBusy(false);toast(`Welcome to ${APP_NAME}! 🎉`,"👋");onClose();
  };

  if(mode==="confirm")return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"28px 24px 52px",textAlign:"center",animation:"slideUp 0.3s ease"}}>
        <div style={{fontSize:56,marginBottom:12}}>📧</div>
        <h2 style={{margin:"0 0 8px",fontSize:20,fontWeight:900,color:tx}}>Check your email!</h2>
        <p style={{margin:"0 0 6px",fontSize:14,color:"#64748b",lineHeight:1.6}}>We sent a confirmation link to</p>
        <p style={{margin:"0 0 20px",fontSize:15,fontWeight:700,color:tx}}>{email}</p>
        <p style={{margin:"0 0 24px",fontSize:13,color:"#94a3b8",lineHeight:1.6}}>Click the link in the email, then come back here and log in.</p>
        <button onClick={()=>setMode("login")} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>
          Go to Login →
        </button>
      </div>
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:bg,borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,padding:"20px 20px 48px",animation:"slideUp 0.3s ease"}}>
        <div style={{width:36,height:4,background:br,borderRadius:2,margin:"0 auto 20px"}}/>
        <h2 style={{margin:"0 0 3px",fontSize:22,fontWeight:900,color:tx}}>{mode==="login"?"Welcome back 👋":`Join ${APP_NAME} 🛒`}</h2>
        <p style={{margin:"0 0 20px",fontSize:13,color:"#64748b"}}>{mode==="login"?"Sign in to your account":"Create your free account"}</p>
        <div style={{display:"flex",background:dk?"#1e293b":"#f1f5f9",borderRadius:12,padding:4,marginBottom:20,gap:4}}>
          {["login","signup"].map(m=>(
            <button key={m} onClick={()=>{setMode(m);setErr("");}}
              style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",background:mode===m?"#22c55e":"transparent",color:mode===m?"#fff":tx,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,transition:"all 0.2s"}}>
              {m==="login"?"Login":"Sign Up"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {mode==="signup"&&<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" style={{background:dk?"#1e293b":"#f8fafc",border:`2px solid ${br}`,borderRadius:12,padding:"13px 15px",fontSize:14,color:tx,outline:"none",fontFamily:"inherit"}}/>}
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" style={{background:dk?"#1e293b":"#f8fafc",border:`2px solid ${br}`,borderRadius:12,padding:"13px 15px",fontSize:14,color:tx,outline:"none",fontFamily:"inherit"}}/>
          <input value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" type="password" onKeyDown={e=>e.key==="Enter"&&submit()} style={{background:dk?"#1e293b":"#f8fafc",border:`2px solid ${br}`,borderRadius:12,padding:"13px 15px",fontSize:14,color:tx,outline:"none",fontFamily:"inherit"}}/>
          {err&&<p style={{margin:0,fontSize:12,color:"#ef4444",fontWeight:700,background:"#fee2e2",borderRadius:8,padding:"9px 13px"}}>{err}</p>}
          <button onClick={submit} disabled={busy}
            style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:14,padding:"15px 0",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"inherit",marginTop:4,opacity:busy?0.7:1,boxShadow:"0 6px 20px rgba(34,197,94,0.35)"}}>
            {busy?"Please wait...":(mode==="login"?"Login →":"Create Account →")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ZoomModal({src,name,onClose}){
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.97)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeIn 0.2s ease"}}>
      <button onClick={onClose} style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:"50%",width:42,height:42,color:"#fff",fontSize:20,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      <div onClick={e=>e.stopPropagation()} style={{maxWidth:340,width:"100%",textAlign:"center"}}>
        {src?.startsWith("http")?<img src={src} alt={name} style={{width:"100%",borderRadius:20,objectFit:"contain",maxHeight:"70vh"}}/>:<div style={{fontSize:160,lineHeight:1}}>{src||"🛒"}</div>}
        <p style={{color:"rgba(255,255,255,0.9)",marginTop:16,fontWeight:700,fontSize:16}}>{name}</p>
      </div>
    </div>
  );
}

function AddBtn({product,size="sm"}){
  const{cart,addItem,updCart}=useContext(Ctx);
  const qty=cart[product.id]||0;
  const stock=Number(product.stock??999);
  const outOfStock=stock===0;
  const atMax=qty>=stock&&stock<999;
  const h=size==="lg"?46:36;
  const btnW=size==="lg"?40:32;
  const fs=size==="lg"?22:18;
  const pfs=size==="lg"?14:12;

  if(outOfStock)return(
    <span style={{fontSize:10,fontWeight:800,color:"#ef4444",background:"#fee2e2",borderRadius:8,padding:"5px 8px"}}>OUT OF STOCK</span>
  );
  if(qty===0)return(
    <button onClick={e=>{e.stopPropagation();addItem(product);}}
      className="tap-scale"
      style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:size==="lg"?14:10,padding:size==="lg"?"13px 28px":"8px 16px",fontWeight:800,fontSize:pfs,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 12px rgba(34,197,94,0.4)",letterSpacing:0.3,transition:"transform 0.15s"}}>
      + ADD
    </button>
  );
  return(
    <div style={{display:"flex",alignItems:"center",background:"linear-gradient(135deg,#22c55e,#16a34a)",borderRadius:size==="lg"?14:10,overflow:"hidden",height:h,boxShadow:"0 3px 12px rgba(34,197,94,0.4)"}}>
      <button onClick={e=>{e.stopPropagation();updCart(product.id,-1);}} style={{background:"none",border:"none",color:"#fff",width:btnW,height:h,fontSize:fs,cursor:"pointer",fontWeight:800,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
      <span style={{color:"#fff",fontWeight:900,fontSize:pfs+1,minWidth:22,textAlign:"center",animation:"pop 0.2s ease"}}>{qty}</span>
      <button onClick={e=>{e.stopPropagation();if(!atMax)addItem(product);}} style={{background:"none",border:"none",color:atMax?"rgba(255,255,255,0.3)":"#fff",width:btnW,height:h,fontSize:fs,cursor:atMax?"not-allowed":"pointer",fontWeight:800,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
    </div>
  );
}

function PCard({product,onOpen}){
  const{categories,wishlist,toggleWish,setZoom,dk,cart}=useContext(Ctx);
  const cat=categories.find(c=>c.name===product.category)||{};
  const img=product.image_url||product.image;
  const isUrl=img?.startsWith("http");
  const wished=wishlist.includes(product.id);
  const stock=Number(product.stock??999);
  const inCart=cart[product.id]||0;
  const bg=dk?"#1e293b":"#fff";
  const tx=dk?"#f1f5f9":"#1e293b";

  return(
    <div onClick={onOpen}
      style={{background:bg,borderRadius:18,padding:12,boxShadow:dk?"0 2px 8px rgba(0,0,0,0.3)":"0 2px 14px rgba(0,0,0,0.07)",border:`1px solid ${dk?"#334155":"#f1f5f9"}`,display:"flex",flexDirection:"column",gap:6,position:"relative",cursor:"pointer",overflow:"hidden",opacity:stock===0?0.72:1,transition:"transform 0.15s,box-shadow 0.15s"}}>
      <button onClick={e=>{e.stopPropagation();toggleWish(product.id);}}
        style={{position:"absolute",top:8,right:8,background:"rgba(255,255,255,0.93)",backdropFilter:"blur(4px)",border:"none",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:3,fontSize:14,boxShadow:"0 2px 8px rgba(0,0,0,0.14)",transition:"transform 0.2s"}}
        className="tap-scale">
        {wished?"❤️":"🤍"}
      </button>
      {product.badge&&<div style={{position:"absolute",top:8,left:8,background:cat.color||"#22c55e",color:"#fff",borderRadius:7,padding:"2px 8px",fontSize:10,fontWeight:800,zIndex:2}}>{product.badge}</div>}
      {Number(product.discount||0)>0&&<div style={{position:"absolute",top:product.badge?30:8,left:8,background:"#ef4444",color:"#fff",borderRadius:7,padding:"2px 7px",fontSize:10,fontWeight:800,zIndex:2}}>-{product.discount}%</div>}
      <div onClick={e=>{e.stopPropagation();setZoom({src:img,name:product.name});}}
        style={{background:cat.bg||(dk?"#0f172a":"#f8fafc"),borderRadius:12,padding:"14px 0",display:"flex",alignItems:"center",justifyContent:"center",minHeight:86,cursor:"zoom-in",position:"relative"}}>
        {isUrl?<img src={img} alt={product.name} style={{width:72,height:72,objectFit:"contain",borderRadius:8}}/>:<span style={{fontSize:52,lineHeight:1}}>{img||"🛒"}</span>}
        {inCart>0&&<div style={{position:"absolute",bottom:6,right:6,background:"#22c55e",color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:10,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{inCart}</div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:3,flex:1}}>
        <p style={{margin:0,fontWeight:700,fontSize:13,color:tx,lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{product.name}</p>
        <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>per {product.unit||"piece"}</p>
        <StockBadge stock={product.stock}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:2}}>
        <div>
          {Number(product.original_price||0)>Number(product.price)&&<span style={{textDecoration:"line-through",color:"#94a3b8",fontSize:11,display:"block",lineHeight:1}}>₹{product.original_price}</span>}
          <strong style={{fontSize:17,color:tx,fontWeight:900}}>₹{product.price}</strong>
        </div>
        <AddBtn product={product}/>
      </div>
    </div>
  );
}

function ProductDetail(){
  const{selProduct:p,setPage,dk,wishlist,toggleWish,user,setShowAuth,toast,setZoom,products}=useContext(Ctx);
  const[reviews,setReviews]=useState([]);
  const[myRating,setMyRating]=useState(5);
  const[myComment,setMyComment]=useState("");
  const[submitting,setSub]=useState(false);
  const[curProd,setCurProd]=useState(p);
  const bg=dk?"#0f172a":"#f8fafc",card=dk?"#1e293b":"#fff",tx=dk?"#f1f5f9":"#1e293b";

  useEffect(()=>{
    if(!p)return;
    const live=products.find(x=>x.id===p.id);
    if(live)setCurProd(live);
  },[products,p]);

  useEffect(()=>{
    if(!p)return;
    supabase.from("reviews").select("*,user_profiles(name)").eq("product_id",p.id).order("created_at",{ascending:false}).then(({data})=>setReviews(data||[]));
  },[p]);

  if(!curProd)return null;
  const img=curProd.image_url||curProd.image;
  const avg=reviews.length?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1):null;

  const submitReview=async()=>{
    if(!user){setShowAuth(true);return;}
    setSub(true);
    await supabase.from("reviews").upsert([{user_id:user.id,product_id:curProd.id,rating:myRating,comment:myComment}]);
    const{data}=await supabase.from("reviews").select("*,user_profiles(name)").eq("product_id",curProd.id).order("created_at",{ascending:false});
    setReviews(data||[]);setSub(false);toast("Review submitted!","⭐");
  };

  const refreshStock=async()=>{
    const{data}=await supabase.from("products").select("*").eq("id",curProd.id).single();
    if(data)setCurProd(data);
  };

  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:100}}>
      <div style={{background:card,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:50,borderBottom:`1px solid ${dk?"#1e293b":"#f1f5f9"}`}}>
        <button onClick={()=>setPage("home")} style={{background:dk?"#1e293b":"#f1f5f9",border:"none",borderRadius:12,padding:"9px 14px",cursor:"pointer",fontSize:17,color:tx,fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:6}}>← Back</button>
        <h2 style={{margin:0,fontSize:16,fontWeight:800,color:tx,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{curProd.name}</h2>
        <button onClick={()=>toggleWish(curProd.id)} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",padding:4}}>{wishlist.includes(curProd.id)?"❤️":"🤍"}</button>
      </div>
      <div onClick={()=>setZoom({src:img,name:curProd.name})} style={{background:dk?"#1e293b":"#f0fdf4",padding:"44px 0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-in",position:"relative"}}>
        {img?.startsWith("http")?<img src={img} alt={curProd.name} style={{width:200,height:200,objectFit:"contain",borderRadius:16}}/>:<span style={{fontSize:130,lineHeight:1}}>{img||"🛒"}</span>}
        <span style={{position:"absolute",bottom:10,right:16,fontSize:11,color:"#94a3b8",background:"rgba(255,255,255,0.85)",borderRadius:8,padding:"3px 9px"}}>🔍 Tap to zoom</span>
      </div>
      <div style={{padding:"16px"}}>
        <div style={{background:card,borderRadius:20,padding:18,marginBottom:14,boxShadow:dk?"none":"0 2px 16px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{flex:1,marginRight:12}}>
              <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:900,color:tx}}>{curProd.name}</h1>
              <p style={{margin:0,fontSize:13,color:"#94a3b8"}}>per {curProd.unit||"piece"}{curProd.badge&&` · ${curProd.badge}`}</p>
            </div>
            {avg&&<div style={{background:"#22c55e",color:"#fff",borderRadius:10,padding:"5px 11px",fontSize:13,fontWeight:800,flexShrink:0}}>⭐ {avg}</div>}
          </div>
          <StockBar stock={curProd.stock}/>
          <AdminStockEditor product={curProd} onUpdated={refreshStock}/>
          {curProd.description&&<p style={{margin:"14px 0 16px",color:dk?"#94a3b8":"#64748b",fontSize:14,lineHeight:1.7}}>{curProd.description}</p>}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14}}>
            <div>
              {Number(curProd.original_price||0)>Number(curProd.price)&&<span style={{textDecoration:"line-through",color:"#94a3b8",fontSize:14}}>₹{curProd.original_price}</span>}
              <p style={{margin:0,fontSize:32,fontWeight:900,color:tx}}>₹{curProd.price}</p>
            </div>
            <AddBtn product={curProd} size="lg"/>
          </div>
        </div>
        <div style={{background:card,borderRadius:20,padding:18,boxShadow:dk?"none":"0 2px 16px rgba(0,0,0,0.06)"}}>
          <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:800,color:tx}}>⭐ Reviews {reviews.length>0&&`(${reviews.length})`}</h3>
          <div style={{marginBottom:16}}>
            <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,color:"#64748b",letterSpacing:0.5}}>YOUR RATING</p>
            <div style={{display:"flex",gap:4,marginBottom:10}}>
              {[1,2,3,4,5].map(n=><button key={n} onClick={()=>setMyRating(n)} style={{background:"none",border:"none",fontSize:28,cursor:"pointer",opacity:myRating>=n?1:0.2,padding:0,transition:"all 0.15s"}}>⭐</button>)}
            </div>
            <textarea value={myComment} onChange={e=>setMyComment(e.target.value)} placeholder="Share your experience..." rows={2}
              style={{width:"100%",border:`2px solid ${dk?"#334155":"#e2e8f0"}`,borderRadius:12,padding:"11px 13px",fontSize:13,background:dk?"#0f172a":"#f8fafc",color:tx,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:10}}/>
            <button onClick={submitReview} disabled={submitting}
              style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:12,padding:"10px 22px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,opacity:submitting?0.7:1}}>
              {submitting?"Submitting...":"Submit Review"}
            </button>
          </div>
          <div style={{height:1,background:dk?"#334155":"#f1f5f9",margin:"0 -18px 16px"}}/>
          {reviews.length===0?<p style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:"10px 0"}}>No reviews yet — be the first!</p>:
          reviews.map(r=>(
            <div key={r.id} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                <span style={{fontWeight:700,fontSize:13,color:tx}}>{r.user_profiles?.name||"User"}</span>
                <span>{Array.from({length:r.rating},(_,i)=><span key={i}>⭐</span>)}</span>
              </div>
              {r.comment&&<p style={{margin:0,fontSize:13,color:dk?"#94a3b8":"#64748b",lineHeight:1.5}}>{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Provider({children}){
  const[products,setProducts]=useState([]);
  const[categories,setCategories]=useState([]);
  const[banners,setBanners]=useState([]);
  const[settings,setSettings]=useState({deliveryFee:30,platformFee:5,taxRate:5,deliveryTime:8});
  const[offers,setOffers]=useState([]);
  const[loading,setLoading]=useState(true);
  const[user,setUser]=useState(null);
  const[profile,setProfile]=useState(null);
  const[wishlist,setWishlist]=useState([]);
  const[addresses,setAddresses]=useState([]);
  const[cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.getItem("sabg_cart")||"{}");}catch{return{};}});
  const[page,setPage]=useState("home");
  const[selCat,setSelCat]=useState("All");
  const[query,setQuery]=useState("");
  const[recentSearches,setRecentSearches]=useState(()=>{try{return JSON.parse(localStorage.getItem("sabg_recent")||"[]");}catch{return[];}});
  const[appliedOffer,setAppliedOffer]=useState(null);
  const[toasts,setToasts]=useState([]);
  const[dk,setDk]=useState(()=>localStorage.getItem("sabg_dk")==="1");
  const[zoom,setZoom]=useState(null);
  const[showAuth,setShowAuth]=useState(false);
  const[selProduct,setSelProduct]=useState(null);
  const[slot,setSlot]=useState(SLOTS[0]);
  const tid=useRef(0);

  useEffect(()=>{localStorage.setItem("sabg_dk",dk?"1":"0");},[dk]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>setUser(session?.user||null));
    const{data:{subscription}}=supabase.auth.onAuthStateChange(async(event,session)=>{
      setUser(session?.user||null);
      if(event==="SIGNED_IN"&&session?.user){
        const uid=session.user.id;
        const{data:existing}=await supabase.from("user_profiles").select("id").eq("id",uid).single();
        if(!existing){
          const storedName=localStorage.getItem("sabg_signup_name")||session.user.email?.split("@")[0]||"User";
          const rc=Math.random().toString(36).slice(2,8).toUpperCase();
          await supabase.from("user_profiles").insert([{id:uid,name:storedName,referral_code:rc}]);
          localStorage.removeItem("sabg_signup_name");
        }
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(!user){setProfile(null);setWishlist([]);setAddresses([]);return;}
    supabase.from("user_profiles").select("*").eq("id",user.id).single().then(({data})=>{if(data)setProfile(data);});
    supabase.from("wishlists").select("product_id").eq("user_id",user.id).then(({data})=>setWishlist(data?.map(w=>w.product_id)||[]));
    supabase.from("addresses").select("*").eq("user_id",user.id).order("is_default",{ascending:false}).then(({data})=>setAddresses(data||[]));
  },[user]);

  const fetchCfg=useCallback(async()=>{
    const{data}=await supabase.from("config").select("*").eq("key","settings").single();
    if(data?.value){const v=data.value;setSettings({deliveryFee:v.deliveryFee??30,platformFee:v.platformFee??5,taxRate:v.taxRate??5,deliveryTime:v.deliveryTime??8});}
  },[]);

  useEffect(()=>{
    const subs=[];
    const sub=(t,fn)=>supabase.channel(`c-${t}-${Math.random().toString(36).slice(2)}`).on("postgres_changes",{event:"*",schema:"public",table:t},fn).subscribe();
    Promise.all([
      supabase.from("products").select("*").order("name").then(({data})=>data?.length&&setProducts(data)),
      supabase.from("categories").select("*").order("name").then(({data})=>data?.length&&setCategories(data)),
      supabase.from("banners").select("*").eq("active",true).order("display_order").then(({data})=>data?.length&&setBanners(data)),
      supabase.from("offers").select("*").eq("active",true).then(({data})=>data?.length&&setOffers(data)),
      fetchCfg(),
    ]).finally(()=>setLoading(false));
    subs.push(sub("products",()=>supabase.from("products").select("*").order("name").then(({data})=>data&&setProducts(data))));
    subs.push(sub("categories",()=>supabase.from("categories").select("*").order("name").then(({data})=>data&&setCategories(data))));
    subs.push(sub("banners",()=>supabase.from("banners").select("*").eq("active",true).order("display_order").then(({data})=>data&&setBanners(data))));
    subs.push(sub("offers",()=>supabase.from("offers").select("*").eq("active",true).then(({data})=>data&&setOffers(data))));
    subs.push(sub("config",fetchCfg));
    subs.push(sub("settings",fetchCfg));
    return()=>subs.forEach(s=>supabase.removeChannel(s));
  },[fetchCfg]);

  useEffect(()=>{localStorage.setItem("sabg_cart",JSON.stringify(cart));},[cart]);

  const toast=useCallback((msg,icon="✅",color="#22c55e")=>{
    const id=++tid.current;
    setToasts(p=>[...p,{id,msg,icon,color}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),2800);
  },[]);

  const updCart=useCallback((pid,delta)=>{
    setCart(prev=>{
      const qty=(prev[pid]||0)+delta;
      if(qty<=0){const{[pid]:_,...rest}=prev;return rest;}
      return{...prev,[pid]:qty};
    });
  },[]);

  const addItem=useCallback((p)=>{
    const stock=Number(p.stock??999);
    const inCart=cart[p.id]||0;
    if(stock===0){toast("Out of stock","❌","#ef4444");return;}
    if(stock>0&&inCart>=stock){toast(`Only ${stock} left in stock!`,"⚠️","#f59f00");return;}
    updCart(p.id,1);
    toast(`${p.name} added`,"🛒");
  },[updCart,toast,cart]);

  const toggleWish=useCallback(async(pid)=>{
    if(!user){setShowAuth(true);return;}
    if(wishlist.includes(pid)){
      await supabase.from("wishlists").delete().eq("user_id",user.id).eq("product_id",pid);
      setWishlist(p=>p.filter(id=>id!==pid));toast("Removed from wishlist","💔","#ef4444");
    }else{
      await supabase.from("wishlists").insert([{user_id:user.id,product_id:pid}]);
      setWishlist(p=>[...p,pid]);toast("Added to wishlist","❤️","#ef4444");
    }
  },[user,wishlist,toast]);

  const addRecent=useCallback((q)=>{
    if(!q.trim())return;
    setRecentSearches(prev=>{const u=[q,...prev.filter(s=>s!==q)].slice(0,6);localStorage.setItem("sabg_recent",JSON.stringify(u));return u;});
  },[]);

  const applyPromo=useCallback((code,sub)=>{
    const o=offers.find(x=>x.code?.toLowerCase()===code.toLowerCase());
    if(!o){toast("Invalid promo code","❌","#ef4444");return false;}
    if(sub<Number(o.min_order||0)){toast(`Min order ₹${o.min_order} required`,"⚠️","#f59f00");return false;}
    setAppliedOffer(o);toast(`${o.code} applied! 🎉`,"🏷️");return true;
  },[offers,toast]);

  const notify=useCallback((title,body)=>{
    if(Notification.permission==="granted")new Notification(title,{body,icon:"/icon-192.png"});
  },[]);

  const placeOrder=useCallback(async(od)=>{
    const{data,error}=await supabase.from("orders").insert([{...od,status:"pending",user_id:user?.id||null}]).select().single();
    if(error){console.error(error);return null;}
    for(const item of(od.items||[])){
      const prod=products.find(px=>px.id===item.id);
      if(prod&&Number(prod.stock??999)<999&&Number(prod.stock||0)>0){
        const ns=Math.max(0,Number(prod.stock)-item.quantity);
        await supabase.from("products").update({stock:ns}).eq("id",item.id);
      }
    }
    notify(`${APP_NAME} — Order Confirmed! 🎉`,`Order #${String(data.id).slice(-6).toUpperCase()} is being packed`);
    return data;
  },[user,notify,products]);

  const cartItems=products.filter(p=>cart[p.id]>0).map(p=>({...p,qty:cart[p.id]}));
  const cartCount=Object.values(cart).reduce((a,b)=>a+b,0);
  const subtotal=cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const dFee=Number(settings.deliveryFee||30);
  const pFee=Number(settings.platformFee||5);
  const taxAmt=Math.round(subtotal*(settings.taxRate||5)/100);
  let disc=0;
  if(appliedOffer){
    disc=appliedOffer.type==="percent"?Math.round(subtotal*appliedOffer.discount/100):Number(appliedOffer.discount);
    disc=Math.min(disc,subtotal);
  }
  const total=Math.max(0,subtotal+dFee+pFee+taxAmt-disc);

  const ctx={products,categories,banners,settings,offers,loading,user,profile,wishlist,addresses,setAddresses,cart,setCart,page,setPage,selCat,setSelCat,query,setQuery,recentSearches,addRecent,appliedOffer,setAppliedOffer,toasts,toast,dk,setDk,zoom,setZoom,showAuth,setShowAuth,selProduct,setSelProduct,slot,setSlot,updCart,addItem,toggleWish,applyPromo,placeOrder,notify,cartItems,cartCount,subtotal,dFee,pFee,taxAmt,disc,total};

  return(
    <Ctx.Provider value={ctx}>
      {children}
      <Toasts list={toasts}/>
      {showAuth&&<AuthModal onClose={()=>setShowAuth(false)}/>}
      {zoom&&<ZoomModal src={zoom.src} name={zoom.name} onClose={()=>setZoom(null)}/>}
    </Ctx.Provider>
  );
}

function Home(){
  const{products,categories,banners,settings,loading,selCat,setSelCat,query,setQuery,recentSearches,addRecent,dk,setPage,user,setShowAuth,cartCount,total,setDk,toast,setSelProduct}=useContext(Ctx);
  const[bIdx,setBIdx]=useState(0);
  const[showSug,setShowSug]=useState(false);
  const sRef=useRef(null);
  const bg=dk?"#0f172a":"#f8fafc";
  const tx=dk?"#f1f5f9":"#1e293b";
  const card=dk?"#1e293b":"#fff";

  useEffect(()=>{
    if(banners.length<=1)return;
    const t=setInterval(()=>setBIdx(i=>(i+1)%banners.length),4500);
    return()=>clearInterval(t);
  },[banners.length]);

  const sugs=useMemo(()=>{
    if(!query||query.length<2)return[];
    return products.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())&&p.available!==false).slice(0,6);
  },[query,products]);

  const popular=useMemo(()=>products.filter(p=>p.available!==false&&Number(p.stock??1)>0).slice(0,8),[products]);

  const filtered=useMemo(()=>products.filter(p=>{
    const catOk=selCat==="All"||p.category===selCat;
    const qOk=!query||p.name.toLowerCase().includes(query.toLowerCase());
    return catOk&&qOk&&p.available!==false;
  }),[products,selCat,query]);

  const banner=banners[bIdx%Math.max(banners.length,1)];
  const doSearch=(q)=>{setQuery(q);addRecent(q);setShowSug(false);sRef.current?.blur();};
  const openProduct=(p)=>{setSelProduct(p);setPage("product");};

  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:100}}>
      <div style={{background:dk?"#0f172a":"linear-gradient(160deg,#0f172a,#1a2f4f)",padding:"14px 16px 16px",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 20px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
              <span style={{fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:1}}>DELIVERY IN</span>
              <span style={{background:"#22c55e",color:"#fff",borderRadius:6,padding:"2px 9px",fontSize:10,fontWeight:800}}>⚡ {settings.deliveryTime} MINS</span>
            </div>
            <h1 style={{margin:0,color:"#fff",fontSize:27,fontWeight:900,letterSpacing:-1.5,lineHeight:1}}>SAB<span style={{color:"#22c55e"}}>-g</span></h1>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setDk(d=>!d)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{dk?"☀️":"🌙"}</button>
            <button onClick={async()=>{if(!("Notification"in window))return;const p=await Notification.requestPermission();p==="granted"&&toast("Notifications enabled","🔔");}}
              style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>🔔</button>
            <button onClick={()=>user?setPage("profile"):setShowAuth(true)}
              style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:13,color:"#fff",fontWeight:700,fontFamily:"inherit"}}>
              {user?"👤 Me":"Login"}
            </button>
          </div>
        </div>
        <div style={{position:"relative"}}>
          <input ref={sRef} value={query} onChange={e=>{setQuery(e.target.value);setShowSug(e.target.value.length>1);}}
            onFocus={()=>query.length>1&&setShowSug(true)}
            onKeyDown={e=>e.key==="Enter"&&doSearch(query)}
            placeholder="🔍  Search groceries, fruits, dairy..."
            style={{width:"100%",background:dk?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.97)",border:"2px solid transparent",borderRadius:14,padding:"13px 44px 13px 16px",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none",color:dk?"#fff":"#1e293b",fontWeight:500,backdropFilter:"blur(10px)"}}/>
          {query&&<button onClick={()=>{setQuery("");setShowSug(false);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"#94a3b8",border:"none",borderRadius:"50%",width:22,height:22,cursor:"pointer",color:"#fff",fontSize:11,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
          {showSug&&(
            <div style={{position:"absolute",left:0,right:0,top:"calc(100% + 6px)",background:card,borderRadius:16,boxShadow:"0 8px 32px rgba(0,0,0,0.22)",zIndex:200,overflow:"hidden",maxHeight:280,overflowY:"auto"}} onMouseDown={e=>e.preventDefault()}>
              {sugs.length>0?sugs.map(p=>(
                <div key={p.id} onClick={()=>{openProduct(p);setShowSug(false);}}
                  style={{padding:"11px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",borderBottom:`1px solid ${dk?"#1e293b":"#f8fafc"}`}}>
                  <span style={{fontSize:22}}>{p.image?.startsWith("http")?"🛒":p.image||"🛒"}</span>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontSize:13,fontWeight:700,color:tx}}>{p.name}</p>
                    <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>₹{p.price} / {p.unit}</p>
                  </div>
                  <StockBadge stock={p.stock}/>
                </div>
              )):<div style={{padding:"16px",textAlign:"center",color:"#94a3b8",fontSize:13}}>No results for "{query}"</div>}
            </div>
          )}
        </div>
        {!query&&recentSearches.length>0&&(
          <div style={{display:"flex",gap:6,marginTop:10,overflowX:"auto",scrollbarWidth:"none"}}>
            {recentSearches.map(s=><button key={s} onClick={()=>doSearch(s)} style={{background:"rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.85)",border:"none",borderRadius:20,padding:"5px 13px",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",flexShrink:0}}>🕐 {s}</button>)}
          </div>
        )}
      </div>

      {!query&&banner&&(
        <div style={{padding:"14px 16px 0"}}>
          <div style={{background:banner.bg||"linear-gradient(135deg,#22c55e,#16a34a)",borderRadius:20,padding:"20px 22px",position:"relative",overflow:"hidden",minHeight:100,cursor:"pointer"}}>
            {banner.image_url&&<img src={banner.image_url} alt="" style={{position:"absolute",right:-10,top:0,height:"120%",objectFit:"cover",opacity:0.15}}/>}
            <p style={{margin:"0 0 4px",color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:700,letterSpacing:0.5}}>{banner.subtitle}</p>
            <h3 style={{margin:"0 0 10px",color:"#fff",fontSize:22,fontWeight:900,lineHeight:1.25}}>{banner.title||`${APP_NAME} Offers`}</h3>
            {banners.length>1&&<div style={{display:"flex",gap:5}}>{banners.map((_,i)=><div key={i} onClick={()=>setBIdx(i)} style={{width:i===bIdx?22:6,height:6,borderRadius:3,background:i===bIdx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",transition:"all 0.3s"}}/>)}</div>}
          </div>
        </div>
      )}

      {!query&&categories.length>0&&(
        <div style={{padding:"18px 16px 0"}}>
          <h2 style={{margin:"0 0 12px",fontSize:16,fontWeight:800,color:tx}}>Shop by Category</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {categories.map(cat=>{
              const active=selCat===cat.name;
              return(
                <button key={cat.id} onClick={()=>setSelCat(active?"All":cat.name)}
                  className="tap-scale"
                  style={{background:active?cat.color||(dk?"#166534":"#f0fdf4"):dk?"#1e293b":"#f8fafc",border:`2px solid ${active?cat.color||"#22c55e":"transparent"}`,borderRadius:16,padding:"12px 6px 10px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all 0.2s"}}>
                  <span style={{fontSize:26}}>{cat.emoji}</span>
                  <span style={{fontSize:10,fontWeight:700,color:active?"#fff":cat.color||"#64748b",textAlign:"center",lineHeight:1.2}}>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{overflowX:"auto",padding:"14px 16px 0",scrollbarWidth:"none"}}>
        <div style={{display:"flex",gap:8,width:"max-content"}}>
          {[{id:"all",name:"All",emoji:"✨",color:"#22c55e"},...categories].map(cat=>{
            const active=(cat.name==="All"&&selCat==="All")||selCat===cat.name;
            return(
              <button key={cat.id} onClick={()=>setSelCat(cat.name==="All"?"All":cat.name)}
                style={{background:active?cat.color||"#22c55e":card,color:active?"#fff":"#64748b",border:`2px solid ${active?cat.color||"#22c55e":dk?"#334155":"#e2e8f0"}`,borderRadius:50,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"inherit",transition:"all 0.2s"}}>
                {cat.emoji} {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {!query&&selCat==="All"&&popular.length>0&&(
        <div style={{padding:"18px 0 0"}}>
          <div style={{padding:"0 16px",marginBottom:12}}>
            <h2 style={{margin:0,fontSize:16,fontWeight:800,color:tx}}>🔥 Popular Right Now</h2>
          </div>
          <div style={{overflowX:"auto",padding:"0 16px",scrollbarWidth:"none"}}>
            <div style={{display:"flex",gap:10,width:"max-content",paddingBottom:4}}>
              {popular.map(p=>{
                const img=p.image_url||p.image;
                const isUrl=img?.startsWith("http");
                const stock=Number(p.stock??999);
                return(
                  <div key={p.id} onClick={()=>openProduct(p)}
                    style={{background:card,borderRadius:16,padding:12,width:132,flexShrink:0,boxShadow:dk?"0 2px 8px rgba(0,0,0,0.25)":"0 2px 8px rgba(0,0,0,0.06)",border:`1px solid ${dk?"#334155":"#f1f5f9"}`,display:"flex",flexDirection:"column",gap:6,cursor:"pointer"}}>
                    <div style={{background:dk?"#0f172a":"#f8fafc",borderRadius:12,padding:"10px 0",display:"flex",alignItems:"center",justifyContent:"center",minHeight:62,position:"relative"}}>
                      {isUrl?<img src={img} alt={p.name} style={{width:48,height:48,objectFit:"contain"}}/>:<span style={{fontSize:38,lineHeight:1}}>{img||"🛒"}</span>}
                      {stock<=10&&stock>0&&<span style={{position:"absolute",bottom:4,right:4,fontSize:8,fontWeight:800,color:"#fff",background:"#f97316",borderRadius:5,padding:"1px 5px"}}>Only {stock}!</span>}
                    </div>
                    <p style={{margin:0,fontSize:11,fontWeight:700,color:tx,lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.name}</p>
                    <p style={{margin:0,fontSize:13,fontWeight:900,color:"#22c55e"}}>₹{p.price}</p>
                    <AddBtn product={p}/>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{padding:"18px 16px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h2 style={{margin:0,fontSize:16,fontWeight:800,color:tx}}>{query?`"${query}"`:selCat!=="All"?selCat:"All Products"}</h2>
          <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>{filtered.length} items</span>
        </div>
        {loading?(
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
            {[1,2,3,4].map(i=>(
              <div key={i} style={{background:card,borderRadius:18,padding:12,display:"flex",flexDirection:"column",gap:8}}>
                <Shimmer h={90} r={12}/><Shimmer h={14} w="70%"/><Shimmer h={11} w="40%"/>
                <div style={{display:"flex",justifyContent:"space-between"}}><Shimmer h={20} w="35%"/><Shimmer h={34} w="70px" r={10}/></div>
              </div>
            ))}
          </div>
        ):filtered.length===0?(
          <div style={{textAlign:"center",padding:"56px 20px"}}>
            <div style={{fontSize:56,marginBottom:12}}>🔍</div>
            <h3 style={{color:tx,margin:"0 0 8px",fontSize:18}}>Nothing found</h3>
            <p style={{color:"#94a3b8",margin:0}}>Try a different search or category</p>
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
            {filtered.map(p=><PCard key={p.id} product={p} onOpen={()=>openProduct(p)}/>)}
          </div>
        )}
      </div>

      {cartCount>0&&(
        <div style={{position:"fixed",bottom:72,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 28px)",maxWidth:452,zIndex:200}}>
          <button onClick={()=>setPage("cart")}
            style={{width:"100%",background:"linear-gradient(135deg,#0f172a,#1a2f4f)",color:"#fff",border:"none",borderRadius:20,padding:"15px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:"slideIn 0.3s ease"}}
            className="tap-scale">
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{background:"#ef4444",color:"#fff",borderRadius:"50%",width:24,height:24,fontSize:11,fontWeight:900,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{cartCount}</span>
              <span style={{fontWeight:700,fontSize:14}}>{cartCount} item{cartCount!==1?"s":""} in cart</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontWeight:900,fontSize:15}}>₹{total}</span>
              <span style={{background:"#22c55e",borderRadius:10,padding:"3px 12px",fontSize:12,fontWeight:800}}>View Cart →</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function Cart(){
  const{cartItems,updCart,subtotal,dFee,pFee,taxAmt,disc,total,setPage,applyPromo,appliedOffer,setAppliedOffer,dk,settings,slot,setSlot,cartCount}=useContext(Ctx);
  const[promo,setPromo]=useState("");
  const bg=dk?"#0f172a":"#f8fafc",card=dk?"#1e293b":"#fff",tx=dk?"#f1f5f9":"#1e293b";

  if(!cartCount)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:88,marginBottom:16}}>🛒</div>
      <h2 style={{color:tx,margin:"0 0 8px",fontSize:22}}>Your cart is empty</h2>
      <p style={{color:"#94a3b8",margin:"0 0 28px"}}>Add some fresh groceries to get started</p>
      <button onClick={()=>setPage("home")} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:16,padding:"15px 36px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Shop Now</button>
    </div>
  );

  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:110}}>
      <div style={{background:card,borderBottom:`1px solid ${dk?"#1e293b":"#f1f5f9"}`,padding:"16px",position:"sticky",top:0,zIndex:50}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:900,color:tx}}>🛒 My Cart</h2>
      </div>
      <div style={{margin:"12px 16px 0",background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:22}}>⚡</span>
        <div>
          <p style={{margin:0,fontWeight:700,fontSize:13,color:"#166534"}}>Delivery in {settings.deliveryTime} minutes</p>
          <p style={{margin:0,fontSize:11,color:"#4ade80"}}>Fresh from our store to your door</p>
        </div>
      </div>
      <div style={{padding:"12px 16px 0",display:"flex",flexDirection:"column",gap:10}}>
        {cartItems.map(item=>{
          const img=item.image_url||item.image;
          const stock=Number(item.stock??999);
          const atMax=item.qty>=stock&&stock<999;
          return(
            <div key={item.id} style={{background:card,borderRadius:18,padding:14,boxShadow:dk?"0 2px 8px rgba(0,0,0,0.2)":"0 2px 10px rgba(0,0,0,0.06)",display:"flex",gap:12,alignItems:"center",border:`1px solid ${dk?"#334155":"transparent"}`}}>
              <div style={{background:dk?"#0f172a":"#f8fafc",borderRadius:12,width:58,height:58,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {img?.startsWith("http")?<img src={img} alt={item.name} style={{width:46,height:46,objectFit:"contain"}}/>:<span style={{fontSize:34}}>{img||"🛒"}</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:"0 0 2px",fontWeight:700,fontSize:13,color:tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</p>
                <p style={{margin:"0 0 2px",fontSize:11,color:"#94a3b8"}}>₹{item.price} per {item.unit}</p>
                <p style={{margin:0,fontWeight:900,fontSize:15,color:"#22c55e"}}>₹{item.price*item.qty}</p>
                {atMax&&<p style={{margin:"3px 0 0",fontSize:10,color:"#f59f00",fontWeight:700}}>⚠️ Max {stock} available</p>}
              </div>
              <div style={{display:"flex",alignItems:"center",background:"linear-gradient(135deg,#22c55e,#16a34a)",borderRadius:12,overflow:"hidden"}}>
                <button onClick={()=>updCart(item.id,-1)} style={{background:"none",border:"none",color:"#fff",width:34,height:34,fontSize:18,cursor:"pointer",fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                <span style={{color:"#fff",fontWeight:900,fontSize:14,minWidth:20,textAlign:"center"}}>{item.qty}</span>
                <button onClick={()=>!atMax&&updCart(item.id,1)} style={{background:"none",border:"none",color:atMax?"rgba(255,255,255,0.3)":"#fff",width:34,height:34,fontSize:18,cursor:atMax?"not-allowed":"pointer",fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{margin:"14px 16px 0",background:card,borderRadius:16,padding:16,border:`1px solid ${dk?"#334155":"transparent"}`}}>
        <p style={{margin:"0 0 10px",fontWeight:800,fontSize:14,color:tx}}>🕐 Choose Delivery Slot</p>
        <select value={slot} onChange={e=>setSlot(e.target.value)} style={{width:"100%",background:dk?"#0f172a":"#f8fafc",border:`2px solid ${dk?"#334155":"#e2e8f0"}`,borderRadius:12,padding:"11px 13px",fontSize:13,color:tx,outline:"none",fontFamily:"inherit",fontWeight:600}}>
          {SLOTS.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{margin:"14px 16px 0",background:card,borderRadius:16,padding:16,border:`1px solid ${dk?"#334155":"transparent"}`}}>
        {appliedOffer?(
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}>
              <p style={{margin:"0 0 2px",fontWeight:800,fontSize:14,color:"#22c55e"}}>🎉 {appliedOffer.code} applied!</p>
              <p style={{margin:0,fontSize:12,color:"#64748b"}}>Saving ₹{disc} on this order</p>
            </div>
            <button onClick={()=>{setAppliedOffer(null);setPromo("");}} style={{color:"#ef4444",fontWeight:700,fontSize:12,background:"#fee2e2",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontFamily:"inherit"}}>Remove</button>
          </div>
        ):(
          <div>
            <p style={{margin:"0 0 10px",fontWeight:800,fontSize:14,color:tx}}>🏷️ Promo Code</p>
            <div style={{display:"flex",gap:8}}>
              <input value={promo} onChange={e=>setPromo(e.target.value.toUpperCase())} placeholder="Enter code..."
                style={{flex:1,border:`2px solid ${dk?"#334155":"#e2e8f0"}`,borderRadius:12,padding:"11px 13px",fontSize:13,fontFamily:"inherit",outline:"none",background:dk?"#0f172a":"#f8fafc",color:tx,fontWeight:700,letterSpacing:1}}/>
              <button onClick={()=>applyPromo(promo,subtotal)} disabled={!promo}
                style={{background:promo?"#22c55e":"#e2e8f0",color:promo?"#fff":"#94a3b8",border:"none",borderRadius:12,padding:"11px 18px",fontWeight:800,cursor:promo?"pointer":"default",fontFamily:"inherit",fontSize:13}}>Apply</button>
            </div>
          </div>
        )}
      </div>
      <div style={{margin:"14px 16px 0",background:card,borderRadius:16,padding:18,border:`1px solid ${dk?"#334155":"transparent"}`}}>
        <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:900,color:tx}}>Bill Summary</h3>
        {[["Item Total",`₹${subtotal}`],["Delivery Fee",`₹${dFee}`],["Platform Fee",`₹${pFee}`],[`Tax (${settings.taxRate}%)`,`₹${taxAmt}`]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#64748b",fontSize:14}}>{l}</span>
            <span style={{color:dk?"#cbd5e1":"#334155",fontWeight:600,fontSize:14}}>{v}</span>
          </div>
        ))}
        {disc>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{color:"#22c55e",fontSize:14,fontWeight:600}}>Discount</span><span style={{color:"#22c55e",fontWeight:700,fontSize:14}}>−₹{disc}</span></div>}
        <div style={{height:1,background:dk?"#334155":"#f1f5f9",margin:"10px -18px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:12}}>
          <span style={{fontWeight:900,fontSize:17,color:tx}}>Grand Total</span>
          <span style={{fontWeight:900,fontSize:20,color:"#22c55e"}}>₹{total}</span>
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:16,background:card,borderTop:`1px solid ${dk?"#1e293b":"#f1f5f9"}`,boxSizing:"border-box"}}>
        <button onClick={()=>setPage("checkout")} className="tap-scale"
          style={{width:"100%",background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:18,padding:"16px 24px",fontWeight:900,fontSize:16,cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 6px 20px rgba(34,197,94,0.4)"}}>
          <span>Proceed to Checkout</span>
          <span style={{background:"rgba(255,255,255,0.25)",borderRadius:10,padding:"3px 14px",fontSize:15,fontWeight:900}}>₹{total}</span>
        </button>
      </div>
    </div>
  );
}

function Checkout(){
  const{cartItems,subtotal,dFee,pFee,taxAmt,disc,total,setPage,toast,placeOrder,setCart,appliedOffer,user,setShowAuth,addresses,setAddresses,dk,slot,settings}=useContext(Ctx);
  const[addr,setAddr]=useState("");
  const[placed,setPlaced]=useState(false);
  const[orderId,setOrderId]=useState(null);
  const[busy,setBusy]=useState(false);
  const[saveAddr,setSaveAddr]=useState(false);
  const[label,setLabel]=useState("Home");
  const[gpsLoad,setGpsLoad]=useState(false);
  const bg=dk?"#0f172a":"#f8fafc",card=dk?"#1e293b":"#fff",tx=dk?"#f1f5f9":"#1e293b";

  useEffect(()=>{if(addresses.length>0&&!addr)setAddr(addresses[0].address);},[addresses]);

  const detectGPS=async()=>{
    if(!navigator.geolocation){toast("GPS not supported on this device","❌","#ef4444");return;}
    setGpsLoad(true);
    navigator.geolocation.getCurrentPosition(
      async({coords:{latitude:lat,longitude:lon}})=>{
        try{
          const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,{headers:{"Accept-Language":"en"}});
          const d=await r.json();
          if(d?.address){
            const a=d.address;
            const parts=[a.house_number,a.road||a.street,a.suburb||a.neighbourhood||a.quarter,a.city||a.town||a.village||a.county,a.state,a.postcode].filter(Boolean);
            setAddr(parts.join(", "));
            toast("Location detected!","📍","#22c55e");
          }else toast("Could not read address — enter manually","⚠️","#f59f00");
        }catch{toast("Location fetch failed — try again","❌","#ef4444");}
        setGpsLoad(false);
      },
      err=>{
        setGpsLoad(false);
        if(err.code===1)toast("Allow location access to use GPS","📍","#f59f00");
        else toast("Could not get your location","❌","#ef4444");
      },
      {enableHighAccuracy:true,timeout:10000,maximumAge:0}
    );
  };

  const handleOrder=async()=>{
    if(!user){setShowAuth(true);return;}
    if(!addr.trim()){toast("Please add a delivery address","📍","#f59f00");return;}
    setBusy(true);
    if(saveAddr&&user){
      await supabase.from("addresses").insert([{user_id:user.id,label,address:addr.trim(),is_default:addresses.length===0}]);
      const{data}=await supabase.from("addresses").select("*").eq("user_id",user.id).order("is_default",{ascending:false});
      if(data)setAddresses(data);
    }
    const data=await placeOrder({
      items:cartItems.map(i=>({id:i.id,name:i.name,price:i.price,quantity:i.qty,total:i.price*i.qty,unit:i.unit})),
      subtotal,delivery_fee:dFee,platform_fee:pFee,tax:taxAmt,discount:disc,total,
      address:addr.trim(),payment_method:"Cash on Delivery",
      promo_code:appliedOffer?.code||null,delivery_slot:slot,
    });
    setBusy(false);
    if(!data){toast("Order failed — please try again","❌","#ef4444");return;}
    setOrderId(data.id);setCart({});localStorage.removeItem("sabg_cart");setPlaced(true);
  };

  if(placed)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,textAlign:"center",animation:"fadeIn 0.4s ease"}}>
      <div style={{fontSize:90,marginBottom:12}}>🎉</div>
      <h2 style={{color:tx,margin:"0 0 6px",fontSize:26,fontWeight:900}}>Order Confirmed!</h2>
      <p style={{color:"#64748b",margin:"0 0 4px",fontSize:14}}>Your groceries are being packed right now</p>
      <p style={{color:"#94a3b8",fontSize:12,margin:"0 0 24px",fontFamily:"monospace",letterSpacing:1}}>ORDER #{String(orderId).slice(-8).toUpperCase()}</p>
      <div style={{background:card,borderRadius:20,padding:"16px 28px",marginBottom:16,border:"2px solid #bbf7d0",width:"100%",maxWidth:300}}>
        <p style={{color:"#166534",fontWeight:800,margin:"0 0 4px",fontSize:15}}>⚡ {slot===SLOTS[0]?`Arriving in ~${settings?.deliveryTime||8} mins`:`Scheduled: ${slot}`}</p>
        <p style={{color:"#4ade80",margin:0,fontSize:12}}>💵 Pay on delivery · Cash accepted</p>
      </div>
      <div style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",borderRadius:20,padding:"16px 36px",marginBottom:28,color:"#fff"}}>
        <p style={{margin:"0 0 2px",fontSize:11,opacity:0.85,letterSpacing:1}}>TOTAL AMOUNT</p>
        <p style={{margin:0,fontSize:36,fontWeight:900}}>₹{total}</p>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setPage("orders")} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:14,padding:"14px 22px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(34,197,94,0.4)"}}>Track Order</button>
        <button onClick={()=>setPage("home")} style={{background:card,color:tx,border:`2px solid ${dk?"#334155":"#e2e8f0"}`,borderRadius:14,padding:"14px 22px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Shop More</button>
      </div>
    </div>
  );

  return(
    // ✅ FIX: increased paddingBottom to 160 so content isn't hidden behind fixed button
    <div style={{background:bg,minHeight:"100vh",paddingBottom:200}}>
      <div style={{background:card,borderBottom:`1px solid ${dk?"#1e293b":"#f1f5f9"}`,padding:16,position:"sticky",top:0,zIndex:50,display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setPage("cart")} style={{background:dk?"#1e293b":"#f1f5f9",border:"none",borderRadius:12,padding:"9px 14px",cursor:"pointer",fontSize:17,color:tx,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>← Cart</button>
        <h2 style={{margin:0,fontSize:18,fontWeight:900,color:tx}}>Checkout</h2>
      </div>
      {addresses.length>0&&(
        <div style={{margin:"16px 16px 0"}}>
          <p style={{margin:"0 0 10px",fontSize:12,fontWeight:800,color:"#64748b",letterSpacing:0.5}}>SAVED ADDRESSES</p>
          <div style={{display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
            {addresses.map(a=>(
              <div key={a.id} onClick={()=>setAddr(a.address)}
                style={{background:addr===a.address?dk?"#0f2d1a":"#f0fdf4":card,border:`2px solid ${addr===a.address?"#22c55e":dk?"#334155":"#e2e8f0"}`,borderRadius:14,padding:"10px 14px",cursor:"pointer",minWidth:155,flexShrink:0,transition:"all 0.2s"}}>
                <p style={{margin:"0 0 3px",fontWeight:800,fontSize:12,color:addr===a.address?"#22c55e":tx}}>{a.label||"Address"} {a.is_default&&"✓"}</p>
                <p style={{margin:0,fontSize:11,color:"#64748b",lineHeight:1.35}}>{a.address.slice(0,44)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{margin:"16px 16px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <p style={{margin:0,fontSize:12,fontWeight:800,color:"#64748b",letterSpacing:0.5}}>DELIVERY ADDRESS</p>
          <button onClick={detectGPS} disabled={gpsLoad} className="tap-scale"
            style={{background:gpsLoad?"#94a3b8":"linear-gradient(135deg,#0ea5e9,#0284c7)",color:"#fff",border:"none",borderRadius:10,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:gpsLoad?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,boxShadow:gpsLoad?"none":"0 3px 10px rgba(14,165,233,0.35)"}}>
            <span>{gpsLoad?"⏳":"📍"}</span>{gpsLoad?"Detecting...":"Use GPS"}
          </button>
        </div>
        {gpsLoad&&(
          <div style={{background:dk?"#0c2236":"#e0f2fe",borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#0369a1",fontWeight:600}}>
            <span>📡</span> Getting your precise location...
          </div>
        )}
        <textarea value={addr} onChange={e=>setAddr(e.target.value)} placeholder="House no., Street, Area, Landmark, City..." rows={3}
          style={{width:"100%",border:`2px solid ${addr?"#22c55e":dk?"#334155":"#e2e8f0"}`,borderRadius:14,padding:"13px 14px",fontSize:14,fontFamily:"inherit",resize:"none",outline:"none",background:card,color:tx,boxSizing:"border-box",transition:"border-color 0.2s",lineHeight:1.5}}/>
        {user&&(
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:8,flexWrap:"wrap"}}>
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
              <input type="checkbox" checked={saveAddr} onChange={e=>setSaveAddr(e.target.checked)} style={{width:16,height:16}}/>
              <span style={{fontSize:13,color:tx,fontWeight:600}}>Save as</span>
            </label>
            <select value={label} onChange={e=>setLabel(e.target.value)} style={{background:card,border:`2px solid ${dk?"#334155":"#e2e8f0"}`,borderRadius:8,padding:"5px 10px",fontSize:12,color:tx,fontFamily:"inherit",outline:"none",fontWeight:600}}>
              {["Home","Work","Other"].map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}
      </div>
      <div style={{margin:"14px 16px 0",background:card,borderRadius:16,padding:16,border:`1px solid ${dk?"#334155":"transparent"}`}}>
        <p style={{margin:"0 0 4px",fontSize:12,fontWeight:800,color:"#64748b",letterSpacing:0.5}}>DELIVERY SLOT</p>
        <p style={{margin:0,fontWeight:700,fontSize:14,color:"#22c55e"}}>🕐 {slot}</p>
      </div>
      <div style={{margin:"14px 16px 0",background:card,borderRadius:16,padding:16,border:`1px solid ${dk?"#334155":"transparent"}`}}>
        <p style={{margin:"0 0 12px",fontSize:12,fontWeight:800,color:"#64748b",letterSpacing:0.5}}>PAYMENT METHOD</p>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"13px 14px",background:dk?"#0f2d1a":"#f0fdf4",borderRadius:13,border:"2px solid #22c55e"}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:"#22c55e",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>
          </div>
          <span style={{fontSize:24}}>💵</span>
          <div style={{flex:1}}>
            <p style={{margin:"0 0 2px",fontWeight:800,fontSize:14,color:"#22c55e"}}>Cash on Delivery</p>
            <p style={{margin:0,fontSize:12,color:"#64748b"}}>Pay when your order arrives</p>
          </div>
          <span style={{color:"#22c55e",fontSize:20}}>✓</span>
        </div>
      </div>
      <div style={{margin:"14px 16px 0"}}>
        <p style={{margin:"0 0 10px",fontSize:12,fontWeight:800,color:"#64748b",letterSpacing:0.5}}>ORDER ({cartItems.length} ITEM{cartItems.length!==1?"S":""})</p>
        <div style={{background:card,borderRadius:16,overflow:"hidden",border:`1px solid ${dk?"#334155":"transparent"}`}}>
          {cartItems.map((item,idx)=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:idx<cartItems.length-1?`1px solid ${dk?"#1e293b":"#f8fafc"}`:"none"}}>
              <span style={{fontSize:20}}>{item.image?.startsWith("http")?"":item.image||"🛒"}</span>
              {item.image?.startsWith("http")&&<img src={item.image} alt="" style={{width:28,height:28,objectFit:"contain",borderRadius:6}}/>}
              <div style={{flex:1}}>
                <p style={{margin:0,fontWeight:700,fontSize:13,color:tx}}>{item.name}</p>
                <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>× {item.qty} · ₹{item.price} each</p>
              </div>
              <span style={{fontWeight:800,fontSize:14,color:tx}}>₹{item.price*item.qty}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{margin:"14px 16px 0",background:card,borderRadius:16,padding:18,border:`1px solid ${dk?"#334155":"transparent"}`}}>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:900,color:tx}}>Payment Summary</h3>
        {[["Subtotal",subtotal],["Delivery Fee",dFee],["Platform Fee",pFee],["Taxes",taxAmt]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#64748b",fontSize:14}}>{l}</span>
            <span style={{color:dk?"#cbd5e1":"#334155",fontWeight:600,fontSize:14}}>₹{v}</span>
          </div>
        ))}
        {disc>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{color:"#22c55e",fontSize:14,fontWeight:600}}>Discount</span><span style={{color:"#22c55e",fontWeight:700}}>−₹{disc}</span></div>}
        <div style={{height:1,background:dk?"#334155":"#f1f5f9",margin:"10px -18px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:12}}>
          <span style={{fontWeight:900,fontSize:17,color:tx}}>Grand Total</span>
          <span style={{fontWeight:900,fontSize:22,color:"#22c55e"}}>₹{total}</span>
        </div>
      </div>

      {/* ✅ FIX: padding "12px 16px 28px" lifts button above phone home bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:"30px 40px 50px",background:card,borderTop:`1px solid ${dk?"#1e293b":"#f1f5f9"}`,boxSizing:"border-box",boxShadow:"0 -4px 20px rgba(0,0,0,0.08)"}}>
        {!addr.trim()&&<p style={{margin:"0 0 10px",fontSize:12,color:"#f59f00",fontWeight:700,textAlign:"center",background:"#fef3c7",borderRadius:10,padding:"8px 12px"}}>📍 Please add a delivery address to continue</p>}
        <button onClick={handleOrder} disabled={busy||gpsLoad} className="tap-scale"
          style={{width:"100%",background:busy?"#94a3b8":"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:18,padding:"17px 0",fontWeight:900,fontSize:16,cursor:busy?"not-allowed":"pointer",fontFamily:"inherit",boxShadow:busy?"none":"0 6px 22px rgba(34,197,94,0.4)",transition:"all 0.3s",display:"block"}}>
          {busy?"Placing Order...":`Place Order · Cash on Delivery · ₹${total}`}
        </button>
      </div>
    </div>
  );
}

function Orders(){
  const{user,setShowAuth,dk,toast,products,updCart,setPage}=useContext(Ctx);
  const[orders,setOrders]=useState([]);
  const[busy,setBusy]=useState(true);
  const[expanded,setExpanded]=useState(null);
  const bg=dk?"#0f172a":"#f8fafc",card=dk?"#1e293b":"#fff",tx=dk?"#f1f5f9":"#1e293b";

  useEffect(()=>{
    if(!user){setBusy(false);return;}
    supabase.from("orders").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).then(({data})=>{setOrders(data||[]);setBusy(false);});
    const sub=supabase.channel("ord-rt-"+Math.random().toString(36).slice(2))
      .on("postgres_changes",{event:"*",schema:"public",table:"orders"},()=>{
        supabase.from("orders").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).then(({data})=>setOrders(data||[]));
      }).subscribe();
    return()=>supabase.removeChannel(sub);
  },[user]);

  const reorder=(order)=>{
    let added=0;
    (order.items||[]).forEach(item=>{
      const p=products.find(x=>x.id===item.id);
      if(p&&Number(p.stock??1)>0){updCart(p.id,item.quantity);added++;}
    });
    if(added>0){toast(`${added} item${added!==1?"s":""} added to cart`,"🛒");setPage("cart");}
    else toast("Items are out of stock","⚠️","#f59f00");
  };

  if(!user)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:72,marginBottom:16}}>📦</div>
      <h2 style={{color:tx,margin:"0 0 8px"}}>Track Your Orders</h2>
      <p style={{color:"#94a3b8",margin:"0 0 24px"}}>Login to see your order history and live tracking</p>
      <button onClick={()=>setShowAuth(true)} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Login</button>
    </div>
  );

  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:80}}>
      <div style={{background:card,borderBottom:`1px solid ${dk?"#1e293b":"#f1f5f9"}`,padding:"16px",position:"sticky",top:0,zIndex:50}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:900,color:tx}}>📦 My Orders</h2>
      </div>
      {busy?<p style={{textAlign:"center",padding:48,color:"#94a3b8",fontSize:14}}>Loading orders...</p>:
      orders.length===0?(
        <div style={{textAlign:"center",padding:"64px 32px"}}>
          <div style={{fontSize:72,marginBottom:16}}>📭</div>
          <h3 style={{color:tx,margin:"0 0 8px",fontSize:18}}>No orders yet</h3>
          <p style={{color:"#94a3b8"}}>Your orders will appear here once you place one</p>
        </div>
      ):(
        <div style={{padding:"14px 16px 0",display:"flex",flexDirection:"column",gap:12}}>
          {orders.map(order=>{
            const open=expanded===order.id;
            const si=ORDER_STEPS.findIndex(s=>s.key===order.status);
            const cancelled=order.status==="cancelled";
            return(
              <div key={order.id} style={{background:card,borderRadius:20,overflow:"hidden",boxShadow:dk?"0 2px 8px rgba(0,0,0,0.25)":"0 2px 12px rgba(0,0,0,0.07)",border:`1px solid ${dk?"#334155":"transparent"}`}}>
                <div onClick={()=>setExpanded(open?null:order.id)} style={{padding:16,cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <p style={{margin:"0 0 3px",fontWeight:900,fontSize:13,color:tx,fontFamily:"monospace",letterSpacing:1}}>#{String(order.id).slice(-8).toUpperCase()}</p>
                      <p style={{margin:0,fontSize:11,color:"#94a3b8"}}>{new Date(order.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                      <span style={{background:`${ST_CLR[order.status]||"#94a3b8"}20`,color:ST_CLR[order.status]||"#94a3b8",borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:800}}>
                        {ORDER_STEPS.find(s=>s.key===order.status)?.icon} {ORDER_STEPS.find(s=>s.key===order.status)?.label||order.status}
                      </span>
                      <span style={{fontWeight:900,fontSize:17,color:"#22c55e"}}>₹{order.total}</span>
                    </div>
                  </div>
                  {!cancelled&&(
                    <div style={{display:"flex",alignItems:"center",overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
                      {ORDER_STEPS.map((step,i)=>(
                        <React.Fragment key={step.key}>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                            <div style={{width:32,height:32,borderRadius:"50%",background:i<=si?"#22c55e":dk?"#334155":"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,transition:"all 0.4s",boxShadow:i===si?"0 0 0 4px rgba(34,197,94,0.25)":"none"}}>
                              <span style={{opacity:i<=si?1:0.3}}>{step.icon}</span>
                            </div>
                            <span style={{fontSize:8,marginTop:4,fontWeight:700,color:i<=si?"#22c55e":"#94a3b8",textAlign:"center",maxWidth:46,lineHeight:1.2}}>{step.label}</span>
                          </div>
                          {i<ORDER_STEPS.length-1&&<div style={{flex:1,height:2,background:i<si?"#22c55e":dk?"#334155":"#e2e8f0",minWidth:14,margin:"0 2px",marginBottom:16,transition:"all 0.4s"}}/>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  {cancelled&&<div style={{background:"#fee2e2",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#991b1b",fontWeight:700}}>❌ Order was cancelled</div>}
                  <p style={{margin:"6px 0 0",fontSize:11,color:"#94a3b8",textAlign:"right"}}>{open?"▲ Hide details":"▼ Show details"}</p>
                </div>
                {open&&(
                  <div style={{borderTop:`1px solid ${dk?"#1e293b":"#f1f5f9"}`,padding:"14px 16px 16px"}}>
                    <p style={{margin:"0 0 10px",fontSize:11,fontWeight:800,color:"#64748b",letterSpacing:0.5}}>ITEMS ORDERED</p>
                    {(order.items||[]).map((item,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i<(order.items.length-1)?`1px solid ${dk?"#1e293b":"#f8fafc"}`:"none"}}>
                        <span style={{fontSize:13,color:tx}}>{item.name} <span style={{color:"#94a3b8"}}>× {item.quantity}</span></span>
                        <span style={{fontSize:13,fontWeight:700,color:tx}}>₹{item.total}</span>
                      </div>
                    ))}
                    <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:5}}>
                      <p style={{margin:0,fontSize:12,color:"#64748b"}}>📍 {order.address}</p>
                      {order.delivery_slot&&<p style={{margin:0,fontSize:12,color:"#64748b"}}>🕐 {order.delivery_slot}</p>}
                      <p style={{margin:0,fontSize:12,color:"#64748b"}}>💵 {order.payment_method||"Cash on Delivery"}</p>
                    </div>
                    <button onClick={()=>reorder(order)} style={{marginTop:14,background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:12,padding:"10px 20px",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>🔄 Reorder</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Profile(){
  const{user,profile,dk,setPage,setShowAuth,toast,addresses,setAddresses}=useContext(Ctx);
  const bg=dk?"#0f172a":"#f8fafc",card=dk?"#1e293b":"#fff",tx=dk?"#f1f5f9":"#1e293b";

  if(!user)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:72,marginBottom:16}}>👤</div>
      <h2 style={{color:tx,margin:"0 0 8px"}}>My Account</h2>
      <p style={{color:"#94a3b8",margin:"0 0 24px"}}>Login to manage your profile and track orders</p>
      <button onClick={()=>setShowAuth(true)} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Login / Sign Up</button>
    </div>
  );

  const delAddr=async(id)=>{await supabase.from("addresses").delete().eq("id",id);setAddresses(p=>p.filter(a=>a.id!==id));toast("Address removed","🗑️","#ef4444");};

  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:80}}>
      <div style={{background:card,borderBottom:`1px solid ${dk?"#1e293b":"#f1f5f9"}`,padding:16,position:"sticky",top:0,zIndex:50}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:900,color:tx}}>👤 My Account</h2>
      </div>
      <div style={{padding:"16px"}}>
        <div style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",borderRadius:20,padding:22,marginBottom:14,color:"#fff"}}>
          <div style={{width:60,height:60,background:"rgba(255,255,255,0.2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,marginBottom:12}}>👤</div>
          <h3 style={{margin:"0 0 4px",fontSize:20,fontWeight:900}}>{profile?.name||"User"}</h3>
          <p style={{margin:0,fontSize:13,opacity:0.85}}>{user.email}</p>
          {user.email===ADMIN_EMAIL&&<span style={{marginTop:8,display:"inline-block",background:"rgba(0,0,0,0.25)",borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:800}}>🔧 ADMIN</span>}
        </div>
        {profile?.referral_code&&(
          <div style={{background:card,borderRadius:20,padding:18,marginBottom:12,border:`1px solid ${dk?"#334155":"#bbf7d0"}`}}>
            <h3 style={{margin:"0 0 6px",fontSize:15,fontWeight:900,color:tx}}>🎁 Referral Code</h3>
            <p style={{margin:"0 0 12px",fontSize:12,color:"#64748b"}}>Share & earn rewards when friends order!</p>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1,background:dk?"#0f172a":"#f0fdf4",borderRadius:12,padding:"13px 16px",fontFamily:"monospace",fontSize:20,fontWeight:900,color:"#22c55e",letterSpacing:3,textAlign:"center"}}>{profile.referral_code}</div>
              <button onClick={()=>{navigator.clipboard.writeText(profile.referral_code);toast("Copied!","📋");}} style={{background:"#22c55e",color:"#fff",border:"none",borderRadius:12,padding:"13px 16px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Copy</button>
              <button onClick={()=>navigator.share?.({title:APP_NAME,text:`Use my code ${profile.referral_code} on ${APP_NAME}!`,url:"https://sabg-app.vercel.app"})} style={{background:card,color:tx,border:`2px solid ${dk?"#334155":"#e2e8f0"}`,borderRadius:12,padding:"13px 16px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Share</button>
            </div>
          </div>
        )}
        <div style={{background:card,borderRadius:20,padding:18,marginBottom:12,border:`1px solid ${dk?"#334155":"transparent"}`}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:900,color:tx}}>📍 Saved Addresses</h3>
          {addresses.length===0?<p style={{color:"#94a3b8",fontSize:13,textAlign:"center",padding:"8px 0"}}>No saved addresses yet</p>:
          addresses.map(a=>(
            <div key={a.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 0",borderBottom:`1px solid ${dk?"#1e293b":"#f1f5f9"}`}}>
              <div style={{width:36,height:36,background:dk?"#0f172a":"#f0fdf4",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>📍</div>
              <div style={{flex:1}}>
                <p style={{margin:"0 0 2px",fontWeight:800,fontSize:13,color:tx}}>{a.label||"Address"} {a.is_default&&<span style={{background:"#22c55e",color:"#fff",fontSize:9,borderRadius:5,padding:"1px 6px",marginLeft:4}}>DEFAULT</span>}</p>
                <p style={{margin:0,fontSize:12,color:"#64748b",lineHeight:1.4}}>{a.address}</p>
              </div>
              <button onClick={()=>delAddr(a.id)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:18,padding:4}}>🗑️</button>
            </div>
          ))}
        </div>
        <div style={{background:card,borderRadius:20,overflow:"hidden",marginBottom:12,border:`1px solid ${dk?"#334155":"transparent"}`}}>
          {[["📦","My Orders","orders"],["❤️","Wishlist","wishlist"]].map(([icon,label,pg],i,arr)=>(
            <button key={label} onClick={()=>setPage(pg)} style={{width:"100%",background:"none",border:"none",borderBottom:i<arr.length-1?`1px solid ${dk?"#1e293b":"#f1f5f9"}`:"none",padding:"16px 18px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",fontFamily:"inherit"}}>
              <span style={{fontSize:22}}>{icon}</span>
              <span style={{fontWeight:700,fontSize:14,color:tx,flex:1,textAlign:"left"}}>{label}</span>
              <span style={{color:"#94a3b8",fontSize:18}}>›</span>
            </button>
          ))}
        </div>
        <button onClick={async()=>{await supabase.auth.signOut();toast("Signed out","👋");setPage("home");}} style={{width:"100%",background:"#fee2e2",border:"none",borderRadius:16,padding:"15px 16px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",fontFamily:"inherit",color:"#991b1b",fontWeight:800,fontSize:14}}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}

function Wishlist(){
  const{products,wishlist,user,setShowAuth,dk,setPage,setSelProduct}=useContext(Ctx);
  const bg=dk?"#0f172a":"#f8fafc",card=dk?"#1e293b":"#fff",tx=dk?"#f1f5f9":"#1e293b";
  const items=products.filter(p=>wishlist.includes(p.id));

  if(!user)return(
    <div style={{background:bg,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:72,marginBottom:16}}>❤️</div>
      <h2 style={{color:tx,margin:"0 0 8px"}}>Your Wishlist</h2>
      <p style={{color:"#94a3b8",margin:"0 0 24px"}}>Login to save your favourite items</p>
      <button onClick={()=>setShowAuth(true)} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Login</button>
    </div>
  );

  return(
    <div style={{background:bg,minHeight:"100vh",paddingBottom:80}}>
      <div style={{background:card,borderBottom:`1px solid ${dk?"#1e293b":"#f1f5f9"}`,padding:16,position:"sticky",top:0,zIndex:50}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:900,color:tx}}>❤️ Wishlist ({items.length})</h2>
      </div>
      {items.length===0?(
        <div style={{textAlign:"center",padding:"64px 32px"}}>
          <div style={{fontSize:72,marginBottom:16}}>🤍</div>
          <h3 style={{color:tx,margin:"0 0 8px",fontSize:18}}>Nothing saved yet</h3>
          <p style={{color:"#94a3b8",margin:"0 0 24px"}}>Tap ❤️ on any product to save it here</p>
          <button onClick={()=>setPage("home")} style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:14,padding:"14px 32px",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>Browse Products</button>
        </div>
      ):(
        <div style={{padding:"16px",display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
          {items.map(p=><PCard key={p.id} product={p} onOpen={()=>{setSelProduct(p);setPage("product");}}/>)}
        </div>
      )}
    </div>
  );
}

function Nav(){
  const{page,setPage,cartCount,dk}=useContext(Ctx);
  const bg=dk?"#1e293b":"#fff";
  const tabs=[{id:"home",icon:"🏠",label:"Home"},{id:"wishlist",icon:"❤️",label:"Saved"},{id:"cart",icon:"🛒",label:"Cart",badge:cartCount},{id:"orders",icon:"📦",label:"Orders"},{id:"profile",icon:"👤",label:"Me"}];
  return(
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:bg,borderTop:`1px solid ${dk?"#334155":"#f1f5f9"}`,display:"flex",zIndex:150,boxShadow:"0 -4px 24px rgba(0,0,0,0.1)"}}>
      {tabs.map(tab=>(
        <button key={tab.id} onClick={()=>setPage(tab.id)} style={{flex:1,background:"none",border:"none",padding:"10px 0 13px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontFamily:"inherit",position:"relative",WebkitTapHighlightColor:"transparent"}}>
          {page===tab.id&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:28,height:3,background:"#22c55e",borderRadius:"0 0 4px 4px"}}/>}
          <span style={{fontSize:20,position:"relative"}}>
            {tab.icon}
            {tab.badge>0&&<span style={{position:"absolute",top:-5,right:-10,background:"#ef4444",color:"#fff",borderRadius:"50%",width:17,height:17,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{tab.badge>9?"9+":tab.badge}</span>}
          </span>
          <span style={{fontSize:9,fontWeight:page===tab.id?900:500,color:page===tab.id?"#22c55e":"#94a3b8",letterSpacing:0.3}}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function App(){
  return(
    <Provider>
      <style>{GS}</style>
      <Screen/>
    </Provider>
  );
}

function Screen(){
  const{page,dk}=useContext(Ctx);
  return(
    <div style={{maxWidth:480,margin:"0 auto",minHeight:"100vh",background:dk?"#0f172a":"#f8fafc",position:"relative"}}>
      {page==="home"&&<Home/>}
      {page==="product"&&<ProductDetail/>}
      {page==="cart"&&<Cart/>}
      {page==="checkout"&&<Checkout/>}
      {page==="orders"&&<Orders/>}
      {page==="profile"&&<Profile/>}
      {page==="wishlist"&&<Wishlist/>}
      {page!=="product"&&<Nav/>}
    </div>
  );
}
