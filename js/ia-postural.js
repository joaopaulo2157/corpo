(() => {
  'use strict';

  const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  const PACKAGE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/+esm';
  const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';

  let poseLandmarkerPromise = null;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pct = (v) => `${Math.round(Math.abs(v) * 100)}%`;

  function pointVisible(p) {
    if (!p) return false;
    const visibility = Number(p.visibility ?? 1);
    const presence = Number(p.presence ?? 1);
    return visibility >= 0.35 && presence >= 0.35;
  }

  function midpoint(a, b) {
    return { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
  }

  function distance(a, b) {
    return Math.hypot(a.x-b.x, a.y-b.y);
  }

  async function getPoseLandmarker() {
    if (!poseLandmarkerPromise) {
      poseLandmarkerPromise = (async () => {
        const mod = await import(PACKAGE_URL);
        const vision = await mod.FilesetResolver.forVisionTasks(WASM_URL);
        return await mod.PoseLandmarker.createFromModelPath(vision, MODEL_URL);
      })();
    }
    return poseLandmarkerPromise;
  }

  async function waitImage(img) {
    if (img.complete && img.naturalWidth > 0) return;
    await new Promise((resolve, reject) => {
      const onLoad = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Não foi possível carregar a foto.')); };
      const cleanup = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };
      img.addEventListener('load', onLoad, { once:true });
      img.addEventListener('error', onError, { once:true });
    });
  }

  function prepareCanvas(canvas, img) {
    canvas.width = img.naturalWidth || 900;
    canvas.height = img.naturalHeight || 1200;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.pointerEvents = 'none';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    return ctx;
  }

  function xy(p, canvas) {
    return { x:p.x*canvas.width, y:p.y*canvas.height };
  }

  function drawLine(ctx, canvas, a, b, color, width=5) {
    const A=xy(a,canvas), B=xy(b,canvas);
    ctx.strokeStyle=color;
    ctx.lineWidth=Math.max(3, canvas.width/180*width/5);
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
  }

  function drawPoint(ctx, canvas, p, color, radius=7) {
    const P=xy(p,canvas);
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.arc(P.x,P.y,Math.max(5,canvas.width/130*radius/7),0,Math.PI*2);
    ctx.fill();
  }

  function drawLabel(ctx, canvas, p, text, color) {
    const P=xy(p,canvas);
    const fontSize=Math.max(18,Math.round(canvas.width/32));
    ctx.font=`800 ${fontSize}px Arial`;
    const pad=Math.max(8,canvas.width/120);
    const metrics=ctx.measureText(text);
    const w=metrics.width+pad*2, h=fontSize+pad*1.5;
    let x=clamp(P.x-w/2,4,canvas.width-w-4);
    let y=clamp(P.y-h-14,4,canvas.height-h-4);
    ctx.fillStyle='rgba(7,16,35,.88)';
    ctx.strokeStyle=color;
    ctx.lineWidth=Math.max(2,canvas.width/320);
    ctx.beginPath();
    ctx.roundRect?.(x,y,w,h,10);
    if (!ctx.roundRect) ctx.rect(x,y,w,h);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff';
    ctx.textBaseline='middle';
    ctx.fillText(text,x+pad,y+h/2);
  }

  function frontMetrics(lm) {
    const ls=lm[11], rs=lm[12], lh=lm[23], rh=lm[24], lk=lm[25], rk=lm[26];
    if (![ls,rs,lh,rh].every(pointVisible)) return null;

    const shoulderWidth=Math.max(distance(ls,rs),0.08);
    const hipWidth=Math.max(distance(lh,rh),0.08);
    const sm=midpoint(ls,rs), hm=midpoint(lh,rh);

    return {
      kind:'front',
      shoulderTilt:Math.abs(ls.y-rs.y)/shoulderWidth,
      hipTilt:Math.abs(lh.y-rh.y)/hipWidth,
      trunkShift:Math.abs(sm.x-hm.x)/Math.max(distance(sm,hm),0.12),
      kneeHeight:(pointVisible(lk)&&pointVisible(rk)) ? Math.abs(lk.y-rk.y)/Math.max(distance(lk,rk),0.08) : null,
      points:{ls,rs,lh,rh,lk,rk,sm,hm}
    };
  }

  function sideMetrics(lm) {
    const left=[lm[7],lm[11],lm[23],lm[25],lm[27]];
    const right=[lm[8],lm[12],lm[24],lm[26],lm[28]];
    const score=(arr)=>arr.reduce((s,p)=>s+Number(p?.visibility ?? 0),0);
    const side=score(left)>=score(right)?'left':'right';
    const [ear,shoulder,hip,knee,ankle]=side==='left'?left:right;

    if (![ear,shoulder,hip].every(pointVisible)) return null;

    const torso=Math.max(distance(shoulder,hip),0.12);
    return {
      kind:'side',
      side,
      headForward:Math.abs(ear.x-shoulder.x)/torso,
      trunkLean:Math.abs(shoulder.x-hip.x)/torso,
      kneeTrack:(pointVisible(knee)&&pointVisible(ankle)) ? Math.abs(knee.x-ankle.x)/Math.max(distance(hip,ankle),0.18) : null,
      points:{ear,shoulder,hip,knee,ankle}
    };
  }

  function describe(metrics, position) {
    const items=[];
    if (!metrics) return [{level:'info',text:'A IA não conseguiu identificar o corpo com segurança nesta foto. Refaça a imagem com o corpo inteiro visível e boa iluminação.'}];

    if (metrics.kind==='front') {
      if (metrics.shoulderTilt > .07) items.push({level:'attention',key:'shoulderTilt',text:'Possível diferença visual no nível dos ombros. O professor deve conferir estabilidade e controle bilateral.'});
      if (metrics.hipTilt > .06) items.push({level:'attention',key:'hipTilt',text:'Possível diferença visual no nível do quadril. Vale revisar controle de pelve e execução dos exercícios.'});
      if (metrics.trunkShift > .07) items.push({level:'attention',key:'trunkShift',text:'O eixo aparente do tronco está deslocado na foto. Conferir postura e distribuição de apoio.'});
      if (metrics.kneeHeight != null && metrics.kneeHeight > .07) items.push({level:'attention',key:'kneeHeight',text:'Há diferença visual entre os joelhos na imagem. Conferir posicionamento e apoio durante a avaliação.'});
    } else {
      if (metrics.headForward > .16) items.push({level:'attention',key:'headForward',text:'Cabeça e ombro aparecem com maior deslocamento horizontal. O professor pode revisar controle cervical/escapular durante os treinos.'});
      if (metrics.trunkLean > .12) items.push({level:'attention',key:'trunkLean',text:'O tronco apresenta inclinação aparente nesta vista. Conferir postura e controle de core.'});
      if (metrics.kneeTrack != null && metrics.kneeTrack > .12) items.push({level:'attention',key:'kneeTrack',text:'Joelho e tornozelo aparecem desalinhados nesta projeção. Conferir apoio e execução dos membros inferiores.'});
    }

    if (!items.length) items.push({level:'ok',text:'Nenhum ponto de atenção visual relevante foi sinalizado nesta foto. O professor deve confirmar presencialmente.'});
    return items;
  }

  function drawOverlay(canvas, img, metrics, messages) {
    const ctx=prepareCanvas(canvas,img);
    const good='#34d399', warn='#fbbf24', blue='#60a5fa';
    if (!metrics) return;

    const has=(key)=>messages.some(x=>x.key===key);

    if (metrics.kind==='front') {
      const p=metrics.points;
      drawLine(ctx,canvas,p.ls,p.rs,has('shoulderTilt')?warn:good);
      drawLine(ctx,canvas,p.lh,p.rh,has('hipTilt')?warn:good);
      drawLine(ctx,canvas,p.sm,p.hm,has('trunkShift')?warn:blue);
      [p.ls,p.rs,p.lh,p.rh].forEach(pt=>drawPoint(ctx,canvas,pt,blue));
      if (has('shoulderTilt')) drawLabel(ctx,canvas,p.sm,'ombros',warn);
      if (has('hipTilt')) drawLabel(ctx,canvas,p.hm,'quadril',warn);
    } else {
      const p=metrics.points;
      drawLine(ctx,canvas,p.ear,p.shoulder,has('headForward')?warn:good);
      drawLine(ctx,canvas,p.shoulder,p.hip,has('trunkLean')?warn:good);
      [p.ear,p.shoulder,p.hip].forEach(pt=>drawPoint(ctx,canvas,pt,blue));
      if (has('headForward')) drawLabel(ctx,canvas,p.shoulder,'cabeça/ombro',warn);
      if (has('trunkLean')) drawLabel(ctx,canvas,p.hip,'eixo do tronco',warn);
    }
  }

  async function analyzeImage(img, canvas, position='frente') {
    await waitImage(img);
    const detector=await getPoseLandmarker();
    const result=detector.detect(img);
    const landmarks=(result?.landmarks || result?.poseLandmarks || [])[0] || null;
    if (!landmarks) {
      const messages=describe(null,position);
      if (canvas) prepareCanvas(canvas,img);
      return {metrics:null,messages,position};
    }

    const metrics=(position==='frente'||position==='costas') ? frontMetrics(landmarks) : sideMetrics(landmarks);
    const messages=describe(metrics,position);
    if (canvas) drawOverlay(canvas,img,metrics,messages);
    return {metrics,messages,position};
  }

  function improvementLabel(key, before, after) {
    if (before == null || after == null || !Number.isFinite(before) || !Number.isFinite(after)) return null;
    const diff=before-after;
    const relative=before>0.005 ? diff/before : 0;
    const names={
      shoulderTilt:'nível dos ombros',
      hipTilt:'nível do quadril',
      trunkShift:'eixo do tronco',
      kneeHeight:'simetria visual dos joelhos',
      headForward:'relação cabeça/ombro',
      trunkLean:'inclinação do tronco',
      kneeTrack:'relação joelho/tornozelo'
    };
    const label=names[key]||key;
    if (Math.abs(relative)<.10) return {level:'stable',text:`${label}: visualmente estável entre as duas avaliações.`};
    if (relative>0) return {level:'better',text:`${label}: melhora visual aproximada de ${Math.round(relative*100)}% no indicador fotográfico.`};
    return {level:'attention',text:`${label}: o indicador visual aumentou cerca de ${Math.round(Math.abs(relative)*100)}%; o professor deve revisar o contexto e a execução.`};
  }

  function compare(beforeResult, afterResult) {
    if (!beforeResult?.metrics || !afterResult?.metrics) {
      return [{level:'info',text:'Não foi possível calcular a evolução visual porque uma das fotos não teve pontos corporais suficientes.'}];
    }

    const b=beforeResult.metrics, a=afterResult.metrics;
    const keys=b.kind==='front'
      ? ['shoulderTilt','hipTilt','trunkShift','kneeHeight']
      : ['headForward','trunkLean','kneeTrack'];

    return keys.map(k=>improvementLabel(k,b[k],a[k])).filter(Boolean);
  }

  window.CorpofitnessPoseAI={
    analyzeImage,
    compare,
    clearCanvas(canvas){
      if (!canvas) return;
      const ctx=canvas.getContext('2d');
      ctx?.clearRect(0,0,canvas.width,canvas.height);
    }
  };
})();