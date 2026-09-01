// All localized copy and reference content, ported verbatim from the original app.
export type Lang = "es" | "en" | "zh";

export const T: Record<Lang, Record<string, string>> = {
 es:{kick:"Análisis de swing con IA · 8 posiciones",h1:"Tu swing, fotograma a fotograma",
  hp:'Te grabas con la cámara y la IA detecta tu cuerpo en tu navegador, dibuja las 8 posiciones clave y marca en <b style="color:#FBE3D4">naranja</b> lo que conviene corregir.',
  s1:"Activa la cámara",s2:"Haz tu swing",s3:"La IA te mira",s4:"8 posiciones",
  camstart:"📷 Activar cámara y grabar mi swing",oruplo:"o",upl:"sube un vídeo grabado",
  gh:"📹 Cómo colocarte para grabar",
  g1:'<b>Luz de frente.</b> La luz delante de ti, nunca detrás.',g2:'<b>Cuerpo entero.</b> De la cabeza a los pies en el encuadre.',
  g3:'<b>Distancia.</b> Apoya el móvil a la altura de la cadera, a 3–4 m.',g4:'<b>Swing completo.</b> Espera el 3-2-1 y haz el swing entero.',
  gbad:'<b>Evita:</b> contraluz, ropa del color de la pared y quedar fuera de cuadro.',
  demo:"¿Sin cámara? Ver un ejemplo",
  camhint:"Apoya el móvil, colócate de cuerpo entero a 3–4 m y pulsa grabar. Tras el 3-2-1 tienes 6 s para tu swing.",
  recnow:"● Grabar mi swing",recing:"Grabando…",flip:"↺ Cambiar cámara",cancel:"Cancelar",
  note:"Todo ocurre en tu dispositivo. Tus fotogramas no se suben a ningún sitio. La 1ª vez tarda un poco porque descarga el modelo de IA.",
  ctab:"Tu profesor de golf con IA",ctah:"¿Te ha gustado? Hazte fundador",
  ctap:"Esta lectura es gratis. Como fundador tienes análisis ilimitados y formación por 50€ (3 meses), y bloqueas tu precio antes de la suscripción.",
  cta1:"Ser fundador · 50€ →",cta2:"Ver formación",
  reset:"Empezar de cero",disc:"Análisis orientativo basado en detección de pose. Herramienta de demostración con fines educativos y de entretenimiento.",
  foot:"una app de PIAITIC · ecosistema PIA Dreams",ltos:"Términos",lpriv:"Privacidad",retry:"Volver a intentar",seeex:"Ver un ejemplo",
  resh:"Tu swing — 8 posiciones",plan:"🏌️ Plan de práctica",allok:"Sin fallos claros. Mantén ese ritmo y repítelo hasta que sea automático.",posw:"Posición",prolink:"▷ Cómo lo corrige un profesional →",
  dl:"Descargando la IA (solo la 1ª vez)…",init:"Activando la cámara…",proc:"Analizando tu swing…",go:"¡YA!",
  camdenied:"No se pudo acceder a la cámara. Permite el acceso en el navegador o usa «sube un vídeo».",
  camfew:"No te hemos detectado bien. Sal de cuerpo entero, con luz de frente, y repite el swing.",
  privacy:'<b>Tus imágenes no salen de tu móvil.</b> El análisis y los fotogramas ocurren dentro de tu navegador: nada se sube ni se guarda en ningún servidor. Las imágenes se muestran en tu pantalla y se borran al cerrar o reiniciar.',
  consent:"Soy mayor de edad o cuento con la autorización de un adulto o tutor para usar esta cámara.",
  consentwarn:"Antes de empezar, marca la casilla de confirmación de edad.",checkopen:"📋 Checklist para jugar",viewq:"¿Cómo vas a grabar?",viewfront:"De frente",viewback:"Desde atrás",viewhint:"De frente se ven brazos y cabeza. Desde atrás (down-the-line) se ve la postura y si te incorporas. Graba las dos para verlo todo.",
  vidformat:"Tu navegador no pudo leer este vídeo. Suele pasar con vídeos .MOV/HEVC del iPhone. Prueba a grabar aquí mismo con la cámara, o sube un MP4 (H.264).",exland:"⤓ Fotograma para la landing",exsheet:"⤓ Descargar los 8 fotogramas",exhint:"Se componen en tu dispositivo con la marca naranja incrustada.",
  checkoutwait:"Abriendo el pago seguro…",checkouterr:"No se pudo iniciar el pago. Inténtalo de nuevo en un momento.",paidok:"¡Pago confirmado! Bienvenido, fundador.",
  extracting:"Preparando los fotogramas…",wintitle:"Coloca la ventana sobre tu swing",winintro:"Solo se analiza lo que quede dentro. <b>Toca la foto</b> donde esté tu swing, afina con ◄ ► y compruébalo con «ver la ventana».",winprev:"▶ Ver la ventana",winstop:"■ Detener",windur:"¿Cuánto dura tu swing en el vídeo?",winanalyze:"Analizar esta ventana →",nudgel:"◄ 0,5 s",nudger:"0,5 s ►",frameadj:"Ajustar fotograma",
  impq:"¿Dónde golpeaste la bola?",imphint:"No hace falta acertar. Marca más o menos dónde golpeaste; analizamos 2 s antes y 1 s después.",impanalyze:"Analizar swing →",detimpact:"Detectando el impacto…",detmotion:"Analizando el movimiento…",detphases:"Identificando las posiciones…",impconf:"Confianza del impacto",impbetween:"El impacto cae entre dos fotogramas",
  adjimpact:"Ajustar impacto",lowconfhint:"Impacto detectado con baja confianza. Si no cuadra, pulsa «Ajustar impacto».",sesopen:"Sesión",sestitle:"Tu sesión",sesswings:"golpes",sestop:"Tu error más repetido",sesin:"en {x} de {n} golpes",sesconf:"Confianza media del impacto",sesall:"Todos los fallos de la sesión",sesnone:"Sin golpes todavía. Analiza un swing y se guardará aquí.",sesback:"Volver",sesnew:"Nueva sesión",
  mtitle:"Métricas del swing",m_spine:"Inclinación (address)",m_shoulder:"Giro hombros (top)",m_hip:"Giro cadera (top)",m_knee:"Flexión rodillas",m_head:"Cabeza (backswing)",m_balance:"Equilibrio (finish)",dir_right:"Derecha",dir_left:"Izquierda",dir_stable:"Estable",mapprox:"Valores orientativos (estimación con una sola cámara).",seshead:"Cabeza en el backswing",
  sesupload:"analizar una sesión (varios golpes)",sesrec:"Grabar sesión (varios golpes)",sesstop:"Detener y analizar",swtitle:"Golpes detectados",swone:"Swing",swback:"Volver a la lista",swok:"Sin fallos claros",swnone:"No se detectaron golpes. Prueba con un clip más largo o mejor encuadre.",wtitle:"Ajustes de detección del impacto",w_audio:"Peso audio",w_club:"Peso palo",w_ball:"Peso bola",wreset:"Restablecer pesos"},
 en:{kick:"AI swing analysis · 8 positions",h1:"Your swing, frame by frame",
  hp:'Record yourself with the camera and the AI detects your body in your browser, draws the 8 key positions and marks in <b style="color:#FBE3D4">orange</b> what to fix.',
  s1:"Turn on camera",s2:"Make your swing",s3:"The AI watches",s4:"8 positions",
  camstart:"📷 Turn on camera and record my swing",oruplo:"or",upl:"upload a recorded video",
  gh:"📹 How to set up to record",
  g1:'<b>Light in front.</b> Light facing you, never behind.',g2:'<b>Full body.</b> Head to toe in the frame.',
  g3:'<b>Distance.</b> Prop the phone at hip height, 3–4 m away.',g4:'<b>Full swing.</b> Wait for the 3-2-1 and make the whole swing.',
  gbad:'<b>Avoid:</b> backlight, clothing the same colour as the wall, and going out of frame.',
  demo:"No camera? See an example",
  camhint:"Prop your phone, stand full-body 3–4 m away and tap record. After the 3-2-1 you have 6 s for your swing.",
  recnow:"● Record my swing",recing:"Recording…",flip:"↺ Flip camera",cancel:"Cancel",
  note:"Everything runs on your device. Your frames are not uploaded anywhere. The first time takes a bit as it downloads the AI model.",
  ctab:"Your AI golf coach",ctah:"Liked it? Become a founder",
  ctap:"This read is free. As a founder you get unlimited analysis and training for €50 (3 months), and you lock your price before the subscription.",
  cta1:"Become a founder · 50€ →",cta2:"See training",
  reset:"Start over",disc:"Guidance analysis based on pose detection. A demo tool for educational and entertainment purposes.",
  foot:"an app by PIAITIC · PIA Dreams ecosystem",ltos:"Terms",lpriv:"Privacy",retry:"Try again",seeex:"See an example",
  resh:"Your swing — 8 positions",plan:"🏌️ Practice plan",allok:"No clear faults. Keep that tempo and repeat it until it's automatic.",posw:"Position",prolink:"▷ How a pro fixes it →",
  dl:"Downloading the AI (first time only)…",init:"Turning on the camera…",proc:"Analyzing your swing…",go:"GO!",
  camdenied:"Couldn't access the camera. Allow access in the browser or use 'upload a video'.",
  camfew:"We didn't detect you well. Get your whole body in frame with light in front, and swing again.",
  privacy:'<b>Your images never leave your phone.</b> The analysis and the frames run inside your browser: nothing is uploaded or stored on any server. The images show on your screen and are cleared when you close or restart.',
  consent:"I am of legal age, or I have permission from an adult or guardian to use this camera.",
  consentwarn:"Before you start, tick the age confirmation box.",checkopen:"📋 Playing checklist",viewq:"How will you record?",viewfront:"Face-on",viewback:"Down-the-line",viewhint:"Face-on shows arms and head. Down-the-line (from behind) shows posture and early extension. Record both to see it all.",
  vidformat:"Your browser couldn't read this video. This often happens with .MOV/HEVC videos from iPhone. Try recording here with the camera, or upload an MP4 (H.264).",exland:"⤓ Frame for the landing",exsheet:"⤓ Download the 8 frames",exhint:"Composed on your device with the orange mark baked in.",
  checkoutwait:"Opening secure checkout…",checkouterr:"Couldn't start checkout. Please try again in a moment.",paidok:"Payment confirmed! Welcome, founder.",
  extracting:"Preparing the frames…",wintitle:"Place the window over your swing",winintro:"Only what's inside is analyzed. <b>Tap the photo</b> where your swing is, fine-tune with ◄ ► and check it with 'see the window'.",winprev:"▶ See the window",winstop:"■ Stop",windur:"How long is your swing in the video?",winanalyze:"Analyze this window →",nudgel:"◄ 0.5 s",nudger:"0.5 s ►",frameadj:"Adjust frame",
  impq:"Where did you hit the ball?",imphint:"No need to be exact. Mark roughly where you hit; we analyze 2 s before and 1 s after.",impanalyze:"Analyze swing →",detimpact:"Detecting impact…",detmotion:"Analyzing motion…",detphases:"Identifying positions…",impconf:"Impact confidence",impbetween:"Impact falls between two frames",
  adjimpact:"Adjust impact",lowconfhint:"Impact detected with low confidence. If it's off, tap 'Adjust impact'.",sesopen:"Session",sestitle:"Your session",sesswings:"swings",sestop:"Your most repeated fault",sesin:"in {x} of {n} swings",sesconf:"Average impact confidence",sesall:"All faults this session",sesnone:"No swings yet. Analyze a swing and it'll be saved here.",sesback:"Back",sesnew:"New session",
  mtitle:"Swing metrics",m_spine:"Tilt (address)",m_shoulder:"Shoulder turn (top)",m_hip:"Hip turn (top)",m_knee:"Knee flex",m_head:"Head (backswing)",m_balance:"Balance (finish)",dir_right:"Right",dir_left:"Left",dir_stable:"Steady",mapprox:"Approximate values (single-camera estimate).",seshead:"Head in the backswing",
  sesupload:"analyze a session (many balls)",sesrec:"Record session (many balls)",sesstop:"Stop & analyze",swtitle:"Swings detected",swone:"Swing",swback:"Back to list",swok:"No clear faults",swnone:"No swings detected. Try a longer clip or better framing.",wtitle:"Impact detection settings",w_audio:"Audio weight",w_club:"Club weight",w_ball:"Ball weight",wreset:"Reset weights"},
 zh:{kick:"AI挥杆分析 · 8个位置",h1:"你的挥杆，逐帧分析",
  hp:'用摄像头录制，AI在你的浏览器中识别身体，绘制8个关键位置，并用<b style="color:#FBE3D4">橙色</b>标出需要改正的地方。',
  s1:"打开摄像头",s2:"完成挥杆",s3:"AI观察",s4:"8个位置",
  camstart:"📷 打开摄像头录制我的挥杆",oruplo:"或",upl:"上传已录制的视频",
  gh:"📹 如何架好机位",
  g1:'<b>光线在前。</b>光线面向你，不要在背后。',g2:'<b>全身入镜。</b>从头到脚都在画面中。',
  g3:'<b>距离。</b>把手机架在髋部高度，距离3–4米。',g4:'<b>完整挥杆。</b>等待3-2-1后完成整个挥杆。',
  gbad:'<b>避免：</b>逆光、与墙同色的衣服，以及出画。',
  demo:"没有摄像头？看示例",
  camhint:"架好手机，全身入镜距离3–4米，点击录制。3-2-1后你有6秒完成挥杆。",
  recnow:"● 录制我的挥杆",recing:"录制中…",flip:"↺ 切换摄像头",cancel:"取消",
  note:"一切都在你的设备上完成。你的画面不会上传到任何地方。首次使用会稍慢，因为需要下载AI模型。",
  ctab:"你的AI高尔夫教练",ctah:"喜欢吗？成为创始会员",
  ctap:"本次分析免费。作为创始会员，你以50€（3个月）获得无限分析和培训，并在订阅前锁定你的价格。",
  cta1:"成为创始会员 · 50€ →",cta2:"查看培训",
  reset:"重新开始",disc:"基于姿态检测的参考性分析。用于教育和娱乐目的的演示工具。",
  foot:"PIAITIC出品的应用 · PIA Dreams生态",ltos:"条款",lpriv:"隐私",retry:"重试",seeex:"看示例",
  resh:"你的挥杆 — 8个位置",plan:"🏌️ 练习计划",allok:"没有明显问题。保持这个节奏，反复练习直到形成习惯。",posw:"位置",prolink:"▷ 专业教练如何纠正 →",
  dl:"正在下载AI（仅首次）…",init:"正在打开摄像头…",proc:"正在分析你的挥杆…",go:"开始！",
  camdenied:"无法访问摄像头。请在浏览器中允许访问，或使用上传视频功能。",
  camfew:"未能很好地识别你。请全身入镜、光线在前，然后重新挥杆。",
  privacy:'<b>你的图像不会离开手机。</b>分析和画面都在你的浏览器中完成：不上传也不保存到任何服务器。图像仅显示在你的屏幕上，关闭或重启后即删除。',
  consent:"我已成年，或已获得成年人或监护人的许可使用此摄像头。",
  consentwarn:"开始前，请勾选年龄确认框。",checkopen:"📋 打球清单",viewq:"你要怎么拍摄？",viewfront:"正面",viewback:"后方（目标线）",viewhint:"正面能看到手臂和头部。后方（目标线）能看到姿势和是否起身。两个都拍才能全面了解。",
  vidformat:"你的浏览器无法读取此视频。iPhone的.MOV/HEVC视频常出现此问题。请在此直接用摄像头录制，或上传MP4（H.264）。",exland:"⤓ 用于落地页的画面",exsheet:"⤓ 下载8个画面",exhint:"在你的设备上合成，橙色标记已嵌入。",
  checkoutwait:"正在打开安全支付…",checkouterr:"无法开始支付。请稍后重试。",paidok:"支付已确认！欢迎成为创始会员。",
  extracting:"正在准备画面…",wintitle:"把窗口放在你的挥杆上",winintro:"只分析窗口内的部分。<b>点击画面</b>中你挥杆的位置，用 ◄ ► 微调，并用「查看窗口」确认。",winprev:"▶ 查看窗口",winstop:"■ 停止",windur:"视频里你的挥杆有多长？",winanalyze:"分析这个窗口 →",nudgel:"◄ 0.5 秒",nudger:"0.5 秒 ►",frameadj:"调整画面",
  impq:"你在哪里击球？",imphint:"不用很准。大概标出击球位置；我们分析前2秒和后1秒。",impanalyze:"分析挥杆 →",detimpact:"正在检测击球…",detmotion:"正在分析动作…",detphases:"正在识别姿势…",impconf:"击球置信度",impbetween:"击球点落在两帧之间",
  adjimpact:"调整击球点",lowconfhint:"击球点置信度较低。如果不对，请点「调整击球点」。",sesopen:"训练",sestitle:"你的训练",sesswings:"次挥杆",sestop:"你最常见的问题",sesin:"在 {n} 次中有 {x} 次",sesconf:"平均击球置信度",sesall:"本次训练的所有问题",sesnone:"还没有挥杆。分析一次后会保存在这里。",sesback:"返回",sesnew:"新训练",
  mtitle:"挥杆数据",m_spine:"前倾（准备）",m_shoulder:"肩部转动（顶点）",m_hip:"髋部转动（顶点）",m_knee:"屈膝",m_head:"头部（上杆）",m_balance:"平衡（收杆）",dir_right:"向右",dir_left:"向左",dir_stable:"稳定",mapprox:"参考值（单摄像头估算）。",seshead:"上杆时头部",
  sesupload:"分析一组（多球）",sesrec:"录制一组（多球）",sesstop:"停止并分析",swtitle:"检测到的挥杆",swone:"挥杆",swback:"返回列表",swok:"没有明显问题",swnone:"未检测到挥杆。请用更长的视频或更好的取景。",wtitle:"击球检测设置",w_audio:"音频权重",w_club:"球杆权重",w_ball:"球权重",wreset:"重置权重"}
};

export const PHN: Record<"es" | "en", string[]> = {
 es:["Parado (address)","Inicio (takeaway)","Medio swing","Arriba (top)","Bajada","Golpeo (impacto)","Liberación","Acabado (finish)"],
 en:["Address","Takeaway","Mid-backswing","Top","Downswing","Impact","Release","Finish"]
};

export const PILL: Record<string, Record<"es" | "en", string>> = {
 spine_hunched:{es:"ESPALDA ENCORVADA",en:"HUNCHED BACK"},spine_straight:{es:"ESPALDA RECTA",en:"TOO STRAIGHT"},hands_inside:{es:"MANOS POR DENTRO",en:"HANDS INSIDE"},arms_early:{es:"BRAZO DOBLADO",en:"ARM BENDS"},arms_top:{es:"SE DOBLA ARRIBA",en:"BENDS AT TOP"},head_down:{es:"CABEZA SE MUEVE",en:"HEAD MOVES"},spine_ext:{es:"TE INCORPORAS",en:"STANDING UP"},head_impact:{es:"CABEZA DESPLAZADA",en:"HEAD OFF"},lose_ext:{es:"PIERDES EXTENSIÓN",en:"LOSES EXTENSION"},legs_back:{es:"TE QUEDAS ATRÁS",en:"HANGING BACK"}
};

type Verdict = { m: string; f: string | null };
export const V: Record<string, Record<"es" | "en", Verdict>> = {
 spine_straight:{es:{m:"Espalda muy recta",f:"En la posición inicial te falta inclinación. <b>Inclínate desde las caderas hacia la bola</b>."},en:{m:"Back too straight",f:"At address you lack tilt. <b>Hinge from your hips toward the ball</b>."}},
 spine_hunched:{es:{m:"Demasiado encorvado",f:"En el address te encorvas demasiado. <b>Saca pecho y baja desde la cadera</b>."},en:{m:"Too hunched",f:"At address you hunch too much. <b>Chest up and hinge from the hips</b>."}},
 arms_early:{es:{m:"Brazo flexionado pronto",f:"<b>Mantén el brazo adelantado estirado</b> en la primera mitad de la subida."},en:{m:"Arm bends too early",f:"<b>Keep the lead arm straight</b> through the first half of the backswing."}},
 arms_top:{es:{m:"Brazo se dobla arriba",f:"Pierdes potencia. <b>Llega al top con ese brazo más estirado</b>."},en:{m:"Arm collapses at top",f:"You lose power. <b>Reach the top with that arm straighter</b>."}},
 head_down:{es:{m:"La cabeza se mueve",f:"<b>Mantén la cabeza quieta sobre la bola</b> mientras bajan los brazos."},en:{m:"Head moves",f:"<b>Keep your head still over the ball</b> as your arms come down."}},
 spine_ext:{es:{m:"Te incorporas al golpear",f:"<b>Mantén la inclinación del address al golpear</b> (early extension)."},en:{m:"You stand up at impact",f:"<b>Keep your address tilt through impact</b> (early extension)."}},
 head_impact:{es:{m:"Cabeza desplazada",f:"<b>Quédate detrás de la bola en el impacto</b>."},en:{m:"Head off position",f:"<b>Stay behind the ball at impact</b>."}},
 legs_back:{es:{m:"Te quedas atrás",f:"<b>Termina equilibrado, con el pecho al objetivo y el peso delante</b>."},en:{m:"You hang back",f:"<b>Finish balanced, chest to target, weight forward</b>."}},
 ok_address:{es:{m:"Buena postura inicial",f:null},en:{m:"Good setup",f:null}},
 ok_mid:{es:{m:"Subida en línea",f:null},en:{m:"On-plane backswing",f:null}},
 ok_top:{es:{m:"Buen top de swing",f:null},en:{m:"Good top of swing",f:null}},
 ok_head:{es:{m:"Cabeza estable",f:null},en:{m:"Steady head",f:null}},
 ok_impact:{es:{m:"Impacto sólido",f:null},en:{m:"Solid impact",f:null}},
 ok_finish:{es:{m:"Buen final equilibrado",f:null},en:{m:"Good balanced finish",f:null}},
 hands_inside:{es:{m:"Manos por dentro",f:"En el inicio metes las manos. <b>Lleva el palo más ancho</b>, sobre la línea de juego."},en:{m:"Hands inside",f:"You pull the hands in. <b>Take the club back wider</b>, along the target line."}},
 lose_ext:{es:{m:"Pierdes la extensión",f:"Tras el golpe recoges los brazos. <b>Extiende ambos brazos hacia el objetivo</b> después de la bola."},en:{m:"Loses extension",f:"You collapse after the ball. <b>Extend both arms toward the target</b>."}},
 ok_take:{es:{m:"Buen inicio",f:null},en:{m:"Good takeaway",f:null}},
 ok_release:{es:{m:"Buena liberación",f:null},en:{m:"Good release",f:null}},
 lowconf:{es:{m:"No se te ve bien aquí (fuera de cuadro)",f:null},en:{m:"Not clearly visible here (out of frame)",f:null}}
};

export const FORMANCHOR: Record<string, string> = {spine_hunched:"f-postura",spine_straight:"f-postura",spine_ext:"f-postura",legs_back:"f-postura",arms_early:"f-brazos",arms_top:"f-brazos",lose_ext:"f-brazos",head_down:"f-cabeza",head_impact:"f-cabeza",hands_inside:"f-inicio"};

export const CHECKUI: Record<Lang, { title: string; intro: string; genh: string; close: string }> = {
 es:{title:"Antes de cada golpe",intro:"¿Vas a jugar? Abre esto y llévalo contigo. Repásalo antes de cada golpe.",genh:"Recomendaciones generales",close:"Cerrar"},
 en:{title:"Before every shot",intro:"Going to play? Open this and take it with you. Run through it before every shot.",genh:"General tips",close:"Close"},
 zh:{title:"每次击球前",intro:"要去打球吗？打开这个并随身携带，每次击球前过一遍。",genh:"综合建议",close:"关闭"}
};

type CheckData = { clubs: { n: string; p: string[] }[]; gen: string[] };
export const CHECKDATA: Record<Lang, CheckData> = {
 es:{clubs:[
  {n:"Driver",p:["Bola adelantada, alineada con el talón delantero.","Pies más anchos que los hombros.","Peso 50/50, con la cabeza por detrás de la bola.","Cara cuadrada al objetivo; tee alto.","Golpe ascendente: barre la bola hacia arriba."]},
  {n:"Hierros",p:["Bola en el centro; avanza hacia delante según el hierro es más largo.","Pies a la anchura de hombros.","Peso ligeramente adelantado (60/40) al pie delantero.","Cara cuadrada; manos por delante de la cabeza del palo.","Golpe descendente: el divot empieza después de la bola."]},
  {n:"Pitch",p:["Bola en el centro; mango casi vertical (usa el bounce).","Pies estrechos y abiertos a la izquierda del objetivo.","Peso 60/40 en el pie delantero, y se queda ahí.","Cuerpo a la izquierda → cara un poco a la derecha.","La longitud del backswing controla la distancia."]},
  {n:"Búnker",p:["Bola adelantada (hacia el empeine delantero).","Cava los pies en la arena; stance abierto.","Peso adelantado (60/40) y estable.","Abre la cara del palo antes de agarrar.","Golpea la arena 5 cm por detrás de la bola y acelera."]},
  {n:"Putt",p:["Bola algo adelantada, bajo el ojo dominante.","Pies a la anchura de hombros, paralelos a la línea.","Peso 50/50, centrado y equilibrado.","Cara cuadrada a la línea de salida (lo que más manda).","Controla la distancia con la longitud del péndulo; quieto."]}
 ],gen:[
  "No cometas dos golpes malos seguidos. Tras un fallo, vuelve al centro de la calle a cualquier distancia — nada de golpes imposibles. Tras 18 hoyos lo agradecerás.",
  "Apunta al centro del green, no a la bandera. Te da el mayor margen y evita quedarte corto de lado (short-side).",
  "Coge un palo de más. Casi siempre te quedas corto y el peligro suele estar delante del green.",
  "En el tee, mantén la bola en juego: el driver no es obligatorio. Elige el lado con más sitio, lejos del peligro.",
  "Juega tus distancias reales (tu media, no tu mejor golpe). Elige el golpe de alta probabilidad y comprométete."
 ]},
 en:{clubs:[
  {n:"Driver",p:["Ball forward, off the front heel.","Feet wider than your shoulders.","Weight 50/50, head behind the ball.","Face square to target; tee it high.","Ascending strike: sweep the ball up."]},
  {n:"Irons",p:["Ball centered; move forward as the iron gets longer.","Feet shoulder-width.","Weight slightly forward (60/40) on the front foot.","Face square; hands ahead of the clubhead.","Descending strike: divot starts after the ball."]},
  {n:"Pitch",p:["Ball centered; shaft nearly vertical (use the bounce).","Feet narrow, open to the left of target.","Weight 60/40 forward, and it stays there.","Body aimed left → face slightly right.","Backswing length controls the distance."]},
  {n:"Bunker",p:["Ball forward (toward the front instep).","Dig your feet into the sand; open stance.","Weight forward (60/40) and stable.","Open the clubface before you grip.","Hit the sand ~2 in behind the ball and accelerate."]},
  {n:"Putt",p:["Ball slightly forward, under your dominant eye.","Feet shoulder-width, parallel to the line.","Weight 50/50, centered and balanced.","Face square to the start line (matters most).","Control distance with pendulum length; stay still."]}
 ],gen:[
  "Never two bad shots in a row. After a miss, get back to the fairway at any distance — no impossible shots. After 18 holes you'll thank yourself.",
  "Aim for the center of the green, not the flag. Biggest margin, and it avoids short-siding.",
  "Take one more club. You're usually short, and trouble is in front of the green.",
  "Off the tee, keep it in play: driver isn't mandatory. Pick the side with more room, away from trouble.",
  "Play your real distances (your average, not your best). Choose the high-percentage shot and commit."
 ]},
 zh:{clubs:[
  {n:"开球木",p:["球位靠前，对齐前脚脚跟。","双脚比肩略宽。","重心50/50，头在球后。","杆面对准目标方正；球座架高。","上升击球：向上扫过球。"]},
  {n:"铁杆",p:["球位居中；铁杆越长越靠前。","双脚与肩同宽。","重心略靠前（60/40）在前脚。","杆面方正；双手在杆头之前。","下降击球：草皮痕在球之后。"]},
  {n:"劈起",p:["球位居中；杆身接近垂直（利用反弹角）。","站位窄，向目标左侧打开。","重心60/40在前，保持不变。","身体朝左→杆面略朝右。","上杆长度控制距离。"]},
  {n:"沙坑",p:["球位靠前（朝前脚脚背）。","双脚踩实沙子；站位打开。","重心在前（60/40）且稳定。","握杆前先打开杆面。","击打球后约5厘米处的沙子并加速。"]},
  {n:"推杆",p:["球位略靠前，位于主视眼下方。","双脚与肩同宽，与线平行。","重心50/50，居中平衡。","杆面方正对准出球线（最关键）。","用钟摆长度控制距离；保持不动。"]}
 ],gen:[
  "不要连续两杆失误。失误后，无论多远都先回到球道中央——不要勉强不可能的球。打完18洞你会感激自己。",
  "瞄准果岭中央，而不是旗杆。容错最大，避免短边。",
  "多拿一号杆。你通常打不够远，危险多在果岭前方。",
  "开球时保持球在场内：不一定要用木杆。选空间更大的一侧，远离危险。",
  "打你的真实距离（平均值，而非最佳）。选择高成功率的球并果断执行。"
 ]}
};
