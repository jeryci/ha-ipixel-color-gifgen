(()=>{var K="2.11.1";var J="iPIXEL_DisplayState",et="iPIXEL_TestMode",it={text:"",mode:"text",effect:"fixed",speed:50,fgColor:"#ff6600",bgColor:"#000000",font:"VCR_OSD_MONO",lastUpdate:0};function st(){try{let f=localStorage.getItem(J);if(f)return JSON.parse(f)}catch(f){console.warn("iPIXEL: Could not load saved state",f)}return{...it}}function rt(f){try{localStorage.setItem(J,JSON.stringify(f))}catch(e){console.warn("iPIXEL: Could not save state",e)}}window.iPIXELDisplayState||(window.iPIXELDisplayState=st());function z(){return window.iPIXELDisplayState}function O(f){return window.iPIXELDisplayState={...window.iPIXELDisplayState,...f,lastUpdate:Date.now()},rt(window.iPIXELDisplayState),window.dispatchEvent(new CustomEvent("ipixel-display-update",{detail:window.iPIXELDisplayState})),window.iPIXELDisplayState}function V(){if(window.iPIXELTestMode!==void 0)return window.iPIXELTestMode;try{return localStorage.getItem(et)==="true"}catch{return!1}}function Z(f,e=null){let t=()=>typeof e=="function"?e():e;return{load(){try{let i=localStorage.getItem(f);if(i!==null)return JSON.parse(i)}catch(i){console.warn(`iPIXEL: Could not load ${f}`,i)}return t()},save(i){try{localStorage.setItem(f,JSON.stringify(i))}catch(s){console.warn(`iPIXEL: Could not save ${f}`,s)}},clear(){try{localStorage.removeItem(f)}catch{}}}}var k=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this._config={},this._hass=null,this._handleTestModeChange=()=>this.render(),window.addEventListener("ipixel-test-mode-change",this._handleTestModeChange)}disconnectedCallback(){window.removeEventListener("ipixel-test-mode-change",this._handleTestModeChange)}set hass(e){this._hass=e,this.render()}setConfig(e){if(!e.entity&&!V()){this._config=e;return}this._config=e,this.render()}isInTestMode(){return V()||!this._config.entity||!this.getEntity()}getEntity(){return!this._hass||!this._config.entity?null:this._hass.states[this._config.entity]}getRelatedEntity(e,t=""){if(!this._hass||!this._config.entity)return null;let i=this._config.entity.replace(/^[^.]+\./,"").replace(/_?(text|display|gif_url)$/i,""),s=`${e}.${i}${t}`;if(this._hass.states[s])return this._hass.states[s];let r=Object.keys(this._hass.states).filter(n=>{if(!n.startsWith(`${e}.`))return!1;let o=n.replace(/^[^.]+\./,"");return o.includes(i)||i.includes(o.replace(t,""))});if(t){let n=r.find(o=>o.endsWith(t));if(n)return this._hass.states[n]}else{let n=r.sort((o,a)=>o.length-a.length);if(n.length>0)return this._hass.states[n[0]]}return r.length>0?this._hass.states[r[0]]:null}hasService(e,t){let i=this._hass?.services;return!i||!i[e]?!0:Object.prototype.hasOwnProperty.call(i[e],t)}async callService(e,t,i={}){if(this._hass){if(this.isInTestMode()&&console.info(`iPIXEL [Test Mode]: ${e}.${t}`,i),!this.hasService(e,t)){console.warn(`iPIXEL: ${e}.${t} is not provided by this version of the integration, so this control does nothing. Update the integration or remove the control.`);return}try{await this._hass.callService(e,t,i)}catch(s){console.error(`iPIXEL service call failed: ${e}.${t}`,s)}}}getResolution(){let e=this.getRelatedEntity("sensor","_width")||this._hass?.states["sensor.display_width"],t=this.getRelatedEntity("sensor","_height")||this._hass?.states["sensor.display_height"];if(e&&t){let i=parseInt(e.state),s=parseInt(t.state);if(!isNaN(i)&&!isNaN(s)&&i>0&&s>0)return[i,s]}return[64,16]}isOn(){return this.isInTestMode()?!0:this.getRelatedEntity("switch")?.state==="on"}hexToRgb(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?[parseInt(t[1],16),parseInt(t[2],16),parseInt(t[3],16)]:[255,255,255]}rgbToHex(e,t,i){return"#"+(e<<16|t<<8|i).toString(16).padStart(6,"0")}escapeHtml(e){let t=document.createElement("div");return t.textContent=e,t.innerHTML}render(){}getCardSize(){return 2}};var D=`
  :host {
    --ipixel-primary: var(--primary-color, #03a9f4);
    --ipixel-accent: var(--accent-color, #ff9800);
    --ipixel-text: var(--primary-text-color, #fff);
    --ipixel-bg: var(--ha-card-background, #1c1c1c);
    --ipixel-border: var(--divider-color, #333);
  }

  .card-content { padding: 16px; }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .card-title {
    font-size: 1.1em;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4caf50;
  }
  .status-dot.off { background: #f44336; }
  .status-dot.unavailable { background: #9e9e9e; }

  .section-title {
    font-size: 0.85em;
    font-weight: 500;
    margin-bottom: 8px;
    opacity: 0.8;
  }

  .control-row { margin-bottom: 12px; }

  /* Buttons */
  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 500;
    transition: all 0.2s;
  }
  .btn-primary { background: var(--ipixel-primary); color: #fff; }
  .btn-primary:hover { opacity: 0.9; }
  .btn-secondary {
    background: rgba(255,255,255,0.1);
    color: var(--ipixel-text);
    border: 1px solid var(--ipixel-border);
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.15); }
  .btn-danger { background: #f44336; color: #fff; }
  .btn-success { background: #4caf50; color: #fff; }

  .icon-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.1);
    border: 1px solid var(--ipixel-border);
    border-radius: 6px;
    cursor: pointer;
    color: inherit;
  }
  .icon-btn:hover { background: rgba(255,255,255,0.15); }
  .icon-btn.active {
    background: rgba(3, 169, 244, 0.3);
    border-color: var(--ipixel-primary);
  }
  .icon-btn svg { width: 20px; height: 20px; fill: currentColor; }

  /* Slider */
  .slider-row { display: flex; align-items: center; gap: 12px; }
  .slider-label { min-width: 70px; font-size: 0.85em; }
  .slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(to right,
      var(--ipixel-primary) 0%,
      var(--ipixel-primary) var(--value, 50%),
      rgba(255,255,255,0.25) var(--value, 50%),
      rgba(255,255,255,0.25) 100%);
    outline: none;
    cursor: pointer;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid var(--ipixel-primary);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }
  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid var(--ipixel-primary);
    cursor: pointer;
  }
  .slider-value { min-width: 40px; text-align: right; font-size: 0.85em; font-weight: 500; }

  /* Dropdown */
  .dropdown {
    width: 100%;
    padding: 8px 12px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--ipixel-border);
    border-radius: 6px;
    color: inherit;
    font-size: 0.9em;
    cursor: pointer;
  }

  /* Input */
  .text-input {
    width: 100%;
    padding: 10px 12px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--ipixel-border);
    border-radius: 6px;
    color: inherit;
    font-size: 0.9em;
    box-sizing: border-box;
  }
  .text-input:focus { outline: none; border-color: var(--ipixel-primary); }

  /* Button Grid */
  .button-grid { display: grid; gap: 8px; }
  .button-grid-4 { grid-template-columns: repeat(4, 1fr); }
  .button-grid-3 { grid-template-columns: repeat(3, 1fr); }
  .button-grid-2 { grid-template-columns: repeat(2, 1fr); }

  /* Mode buttons */
  .mode-btn {
    padding: 10px 8px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--ipixel-border);
    border-radius: 6px;
    cursor: pointer;
    text-align: center;
    font-size: 0.8em;
    color: inherit;
    transition: all 0.2s;
  }
  .mode-btn:hover { background: rgba(255,255,255,0.12); }
  .mode-btn.active { background: rgba(3, 169, 244, 0.25); border-color: var(--ipixel-primary); }

  /* Color picker */
  .color-row { display: flex; align-items: center; gap: 12px; }
  .color-picker {
    width: 40px;
    height: 32px;
    padding: 0;
    border: 1px solid var(--ipixel-border);
    border-radius: 4px;
    cursor: pointer;
    background: none;
  }

  /* List items */
  .list-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    margin-bottom: 8px;
    gap: 12px;
  }
  .list-item:last-child { margin-bottom: 0; }
  .list-item-info { flex: 1; }
  .list-item-name { font-weight: 500; font-size: 0.9em; }
  .list-item-meta { font-size: 0.75em; opacity: 0.6; margin-top: 2px; }
  .list-item-actions { display: flex; gap: 4px; }

  /* Empty state */
  .empty-state { text-align: center; padding: 24px; opacity: 0.6; font-size: 0.9em; }

  /* Tabs */
  .tabs { display: flex; gap: 4px; margin-bottom: 16px; }
  .tab {
    flex: 1;
    padding: 10px 8px;
    border: none;
    background: rgba(255,255,255,0.05);
    color: var(--ipixel-text);
    cursor: pointer;
    border-radius: 8px;
    font-size: 0.8em;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  .tab:hover { background: rgba(255,255,255,0.1); }
  .tab.active { background: var(--ipixel-primary); color: #fff; }
  .tab-panel { display: block; }
  .tab-panel[hidden] { display: none; }

  /* Toggle switch (iOS style) */
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
  }
  .toggle-label { font-size: 0.85em; color: var(--ipixel-text); }
  .toggle-switch {
    position: relative;
    width: 44px;
    height: 24px;
    background: rgba(255,255,255,0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  .toggle-switch.active { background: var(--ipixel-primary); }
  .toggle-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: #fff;
    border-radius: 50%;
    transition: transform 0.2s;
  }
  .toggle-switch.active::after { transform: translateX(20px); }

  /* Subsection grouping */
  .subsection {
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }
  .subsection-title {
    font-size: 0.75em;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.6;
    margin-bottom: 8px;
  }

  /* Form dialog */
  .form-dialog {
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    padding: 16px;
    margin-top: 12px;
  }
  .form-row { margin-bottom: 12px; }
  .form-row label { display: block; font-size: 0.8em; opacity: 0.7; margin-bottom: 4px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

  /* Two-column helper */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  @media (max-width: 400px) {
    .button-grid-4 { grid-template-columns: repeat(2, 1fr); }
    .button-grid-3 { grid-template-columns: repeat(2, 1fr); }
  }

  /* Mobile-friendly touch targets */
  @media (max-width: 600px) {
    .btn { padding: 10px 16px; min-height: 40px; }
    .icon-btn { width: 40px; height: 40px; }
    .slider::-webkit-slider-thumb { width: 24px; height: 24px; }
    .slider::-moz-range-thumb { width: 24px; height: 24px; }
    .dropdown { padding: 10px 12px; }
    .text-input { padding: 12px; }
  }
`;var Y=class{constructor(){this.chunks=[],this.buf=new Uint8Array(8192),this.pos=0}_flush(){this.pos>0&&(this.chunks.push(this.buf.slice(0,this.pos)),this.buf=new Uint8Array(8192),this.pos=0)}_ensure(e){this.pos+e>this.buf.length&&this._flush()}writeByte(e){this._ensure(1),this.buf[this.pos++]=e&255}writeU16(e){this.writeByte(e&255),this.writeByte(e>>8&255)}writeString(e){for(let t=0;t<e.length;t++)this.writeByte(e.charCodeAt(t))}toUint8Array(){this._flush();let e=0;for(let s of this.chunks)e+=s.length;let t=new Uint8Array(e),i=0;for(let s of this.chunks)t.set(s,i),i+=s.length;return t}};function nt(f,e=256){let t=new Map;for(let n of f)for(let o=0;o<n.length;o+=3){let a=n[o]<<16|n[o+1]<<8|n[o+2];t.set(a,(t.get(a)||0)+1)}let i=[...t.entries()].sort((n,o)=>o[1]-n[1]);if(i.length>e){let n=new Map;for(let[o,a]of i){let l=o>>16&240|o>>20&15,c=o>>8&240|o>>12&15,h=o&240|o>>4&15,d=l<<16|c<<8|h;n.set(d,(n.get(d)||0)+a)}i=[...n.entries()].sort((o,a)=>a[1]-o[1]).slice(0,e)}let s=i.map(([n])=>[n>>16&255,n>>8&255,n&255]);s.some(([n,o,a])=>n===0&&o===0&&a===0)||(s.length>=e?s[s.length-1]=[0,0,0]:s.push([0,0,0]));let r=2;for(;1<<r<s.length;)r++;return{palette:s,paletteBits:r}}function at(f,e){let t=f.length/3,i=new Uint8Array(t),s=new Map;for(let r=0;r<t;r++){let n=f[r*3],o=f[r*3+1],a=f[r*3+2],l=n<<16|o<<8|a;if(s.has(l)){i[r]=s.get(l);continue}let c=0,h=1/0;for(let d=0;d<e.length;d++){let p=n-e[d][0],u=o-e[d][1],g=a-e[d][2],x=p*p+u*u+g*g;if(x===0){c=d;break}x<h&&(h=x,c=d)}s.set(l,c),i[r]=c}return i}function ot(f,e){let t=1<<e,i=t+1,s=[],r,n;function o(){s.length=0;for(let p=0;p<=i;p++)s.push(null);for(let p=0;p<t;p++)s[p]=new Map;r=e+1,n=i+1}let a=0,l=0,c=[];function h(p,u){for(a|=p<<l,l+=u;l>=8;)c.push(a&255),a>>>=8,l-=8}if(o(),h(t,r),f.length===0)return h(i,r),l>0&&c.push(a&255),c;let d=f[0];for(let p=1;p<f.length;p++){let u=f[p],g=s[d];g&&g.has(u)?d=g.get(u):(h(d,r),n<4096?(s[d]||(s[d]=new Map),s[d].set(u,n),s[n]=new Map,n>=1<<r&&r<12&&r++,n++):(h(t,r),o()),d=u)}return h(d,r),h(i,r),l>0&&c.push(a&255),c}function lt(f,e){let t=0;for(;t<e.length;){let i=Math.min(255,e.length-t);f.writeByte(i);for(let s=0;s<i;s++)f.writeByte(e[t++])}}function Q(f,e,t,i=10,s=0){let{palette:r,paletteBits:n}=nt(f),o=1<<n,a=new Y;a.writeString("GIF87a"),a.writeU16(e),a.writeU16(t),a.writeByte(128|n-1<<4|n-1),a.writeByte(0),a.writeByte(0);for(let l=0;l<o;l++)l<r.length?(a.writeByte(r[l][0]),a.writeByte(r[l][1]),a.writeByte(r[l][2])):(a.writeByte(0),a.writeByte(0),a.writeByte(0));for(let l of f){a.writeByte(33),a.writeByte(249),a.writeByte(4),a.writeByte(4),a.writeU16(i),a.writeByte(0),a.writeByte(0),a.writeByte(44),a.writeU16(0),a.writeU16(0),a.writeU16(e),a.writeU16(t),a.writeByte(0);let c=at(l,r),h=Math.max(2,n);a.writeByte(h),lt(a,ot(c,h)),a.writeByte(0)}return a.writeByte(59),a.toUint8Array()}function A(f){if(!f||f==="#111"||f==="#000")return[17,17,17];if(f==="#050505")return[5,5,5];let e=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(f);return e?[parseInt(e[1],16),parseInt(e[2],16),parseInt(e[3],16)]:[17,17,17]}function I(f,e,t){let i=0,s=0,r=0,n=Math.floor(f*6),o=f*6-n,a=t*(1-e),l=t*(1-o*e),c=t*(1-(1-o)*e);switch(n%6){case 0:i=t,s=c,r=a;break;case 1:i=l,s=t,r=a;break;case 2:i=a,s=t,r=c;break;case 3:i=a,s=l,r=t;break;case 4:i=c,s=a,r=t;break;case 5:i=t,s=a,r=l;break}return[i*255,s*255,r*255]}var G=class{constructor(e){this.renderer=e}init(e,t){let{width:i,height:s}=this.renderer;switch(e){case"scroll_ltr":case"scroll_rtl":t.offset=0;break;case"blink":t.visible=!0;break;case"snow":case"breeze":t.phases=[];for(let r=0;r<i*s;r++)t.phases.push(Math.random()*Math.PI*2);break;case"laser":t.position=0;break;case"fade":t.opacity=0,t.direction=1;break;case"typewriter":t.charIndex=0,t.cursorVisible=!0;break;case"bounce":t.offset=0,t.direction=1;break;case"sparkle":t.sparkles=[];for(let r=0;r<Math.floor(i*s*.1);r++)t.sparkles.push({x:Math.floor(Math.random()*i),y:Math.floor(Math.random()*s),brightness:Math.random(),speed:.05+Math.random()*.1});break}}step(e,t){let{width:i,extendedWidth:s}=this.renderer;switch(e){case"scroll_ltr":t.offset-=1,t.offset<=-(s||i)&&(t.offset=i);break;case"scroll_rtl":t.offset+=1,t.offset>=(s||i)&&(t.offset=-i);break;case"blink":t.visible=!t.visible;break;case"laser":t.position=(t.position+1)%i;break;case"fade":t.opacity+=t.direction*.05,t.opacity>=1?(t.opacity=1,t.direction=-1):t.opacity<=0&&(t.opacity=0,t.direction=1);break;case"typewriter":t.tick%3===0&&t.charIndex++,t.cursorVisible=t.tick%10<5;break;case"bounce":{t.offset+=t.direction;let r=Math.max(0,(s||i)-i);t.offset>=r?(t.offset=r,t.direction=-1):t.offset<=0&&(t.offset=0,t.direction=1);break}case"sparkle":{let r=t.sparkles;for(let n of r)n.brightness+=n.speed,n.brightness>1&&(n.brightness=0,n.x=Math.floor(Math.random()*i),n.y=Math.floor(Math.random()*this.renderer.height));break}}}render(e,t,i,s,r){let{width:n,height:o}=this.renderer,a=s||i||[],l=i||[],c=r||n;for(let h=0;h<o;h++)for(let d=0;d<n;d++){let p,u=d;if(e==="scroll_ltr"||e==="scroll_rtl"||e==="bounce"){for(u=d-(t.offset||0);u<0;)u+=c;for(;u>=c;)u-=c;p=a[h*c+u]||"#111"}else if(e==="typewriter"){let v=(t.charIndex||0)*6;d<v?p=l[h*n+d]||"#111":d===v&&t.cursorVisible?p="#ffffff":p="#111"}else p=l[h*n+d]||"#111";let[g,x,m]=A(p);if(g>20||x>20||m>20)switch(e){case"blink":t.visible||(g=x=m=17);break;case"snow":{let b=t.phases,v=b?.[h*n+d]||0,w=t.tick||0,y=.3+.7*Math.abs(Math.sin(v+w*.3));g*=y,x*=y,m*=y;break}case"breeze":{let b=t.phases,v=b?.[h*n+d]||0,w=t.tick||0,y=.4+.6*Math.abs(Math.sin(v+w*.15+d*.2));g*=y,x*=y,m*=y;break}case"laser":{let b=t.position||0,w=Math.abs(d-b)<3?1:.3;g*=w,x*=w,m*=w;break}case"fade":{let b=t.opacity||1;g*=b,x*=b,m*=b;break}}if(e==="sparkle"&&t.sparkles){let b=t.sparkles;for(let v of b)if(v.x===d&&v.y===h){let w=Math.sin(v.brightness*Math.PI);g=Math.min(255,g+w*200),x=Math.min(255,x+w*200),m=Math.min(255,m+w*200)}}this.renderer.setPixel(d,h,[g,x,m])}}},W=class{constructor(e){this.renderer=e}init(e,t){let{width:i,height:s}=this.renderer;switch(e){case"rainbow":t.position=0;break;case"matrix":{let r=[[0,255,0],[0,255,255],[255,0,255]];t.colorMode=r[Math.floor(Math.random()*r.length)],t.buffer=[];for(let n=0;n<s;n++)t.buffer.push(Array(i).fill(null).map(()=>[0,0,0]));break}case"plasma":case"gradient":t.time=0;break;case"fire":t.heat=[];for(let r=0;r<i*s;r++)t.heat.push(0);t.palette=this._createFirePalette();break;case"water":t.current=[],t.previous=[];for(let r=0;r<i*s;r++)t.current.push(0),t.previous.push(0);t.damping=.95;break;case"stars":{t.stars=[];let r=Math.floor(i*s*.15);for(let n=0;n<r;n++)t.stars.push({x:Math.floor(Math.random()*i),y:Math.floor(Math.random()*s),brightness:Math.random(),speed:.02+Math.random()*.05,phase:Math.random()*Math.PI*2});break}case"confetti":t.particles=[];for(let r=0;r<20;r++)t.particles.push(this._createConfettiParticle(i,s,!0));break;case"plasma_wave":case"radial_pulse":case"hypnotic":case"aurora":t.time=0;break;case"lava":t.time=0,t.noise=[];for(let r=0;r<i*s;r++)t.noise.push(Math.random()*Math.PI*2);break}}step(e,t){let{width:i,height:s}=this.renderer;switch(e){case"rainbow":t.position=(t.position+.01)%1;break;case"matrix":this._stepMatrix(t,i,s);break;case"plasma":case"gradient":t.time=(t.time||0)+.05;break;case"fire":this._stepFire(t,i,s);break;case"water":this._stepWater(t,i,s);break;case"stars":{let r=t.stars;for(let n of r)n.phase+=n.speed;break}case"confetti":{let r=t.particles;for(let n=0;n<r.length;n++){let o=r[n];o.y+=o.speed,o.x+=o.drift,o.rotation+=o.rotationSpeed,o.y>s&&(r[n]=this._createConfettiParticle(i,s,!1))}break}case"plasma_wave":case"radial_pulse":case"hypnotic":case"lava":case"aurora":t.time=(t.time||0)+.03;break}}render(e,t){switch(e){case"rainbow":this._renderRainbow(t);break;case"matrix":this._renderMatrix(t);break;case"plasma":this._renderPlasma(t);break;case"gradient":this._renderGradient(t);break;case"fire":this._renderFire(t);break;case"water":this._renderWater(t);break;case"stars":this._renderStars(t);break;case"confetti":this._renderConfetti(t);break;case"plasma_wave":this._renderPlasmaWave(t);break;case"radial_pulse":this._renderRadialPulse(t);break;case"hypnotic":this._renderHypnotic(t);break;case"lava":this._renderLava(t);break;case"aurora":this._renderAurora(t);break}}_renderRainbow(e){let{width:t,height:i}=this.renderer,s=e.position||0;for(let r=0;r<t;r++){let n=(s+r/t)%1,[o,a,l]=I(n,1,.6);for(let c=0;c<i;c++)this.renderer.setPixel(r,c,[o,a,l])}}_stepMatrix(e,t,i){let s=e.buffer,r=e.colorMode,n=.15;s.pop();let o=s[0].map(([a,l,c])=>[a*(1-n),l*(1-n),c*(1-n)]);s.unshift(JSON.parse(JSON.stringify(o)));for(let a=0;a<t;a++)Math.random()<.08&&(s[0][a]=[Math.floor(Math.random()*r[0]),Math.floor(Math.random()*r[1]),Math.floor(Math.random()*r[2])])}_renderMatrix(e){var t;let{width:i,height:s}=this.renderer,r=e.buffer;if(r)for(let n=0;n<s;n++)for(let o=0;o<i;o++){let[a,l,c]=((t=r[n])==null?void 0:t[o])||[0,0,0];this.renderer.setPixel(o,n,[a,l,c])}}_renderPlasma(e){let{width:t,height:i}=this.renderer,s=e.time||0,r=t/2,n=i/2;for(let o=0;o<t;o++)for(let a=0;a<i;a++){let l=o-r,c=a-n,h=Math.sqrt(l*l+c*c),d=Math.sin(o/8+s),p=Math.sin(a/6+s*.8),u=Math.sin(h/6-s*1.2),g=Math.sin((o+a)/10+s*.5),x=(d+p+u+g+4)/8,m=Math.sin(x*Math.PI*2)*.5+.5,_=Math.sin(x*Math.PI*2+2)*.5+.5,b=Math.sin(x*Math.PI*2+4)*.5+.5;this.renderer.setPixel(o,a,[m*255,_*255,b*255])}}_renderGradient(e){let{width:t,height:i}=this.renderer,r=(e.time||0)*10;for(let n=0;n<t;n++)for(let o=0;o<i;o++){let a=(Math.sin((n+r)*.05)*.5+.5)*255,l=(Math.cos((o+r)*.05)*.5+.5)*255,c=(Math.sin((n+o+r)*.03)*.5+.5)*255;this.renderer.setPixel(n,o,[a,l,c])}}_createFirePalette(){let e=[];for(let t=0;t<256;t++){let i,s,r;t<64?(i=t*4,s=0,r=0):t<128?(i=255,s=(t-64)*4,r=0):t<192?(i=255,s=255,r=(t-128)*4):(i=255,s=255,r=255),e.push([i,s,r])}return e}_stepFire(e,t,i){let s=e.heat;for(let r=0;r<t*i;r++)s[r]=Math.max(0,s[r]-Math.random()*10);for(let r=0;r<i-1;r++)for(let n=0;n<t;n++){let o=r*t+n,a=(r+1)*t+n,l=r*t+Math.max(0,n-1),c=r*t+Math.min(t-1,n+1);s[o]=(s[a]+s[l]+s[c])/3.05}for(let r=0;r<t;r++)Math.random()<.6&&(s[(i-1)*t+r]=180+Math.random()*75)}_renderFire(e){let{width:t,height:i}=this.renderer,s=e.heat,r=e.palette;for(let n=0;n<i;n++)for(let o=0;o<t;o++){let a=n*t+o,l=Math.floor(Math.min(255,s[a])),[c,h,d]=r[l];this.renderer.setPixel(o,n,[c,h,d])}}_stepWater(e,t,i){let s=e.current,r=e.previous,n=e.damping,o=[...r];for(let a=0;a<s.length;a++)r[a]=s[a];for(let a=1;a<i-1;a++)for(let l=1;l<t-1;l++){let c=a*t+l;s[c]=(o[(a-1)*t+l]+o[(a+1)*t+l]+o[a*t+(l-1)]+o[a*t+(l+1)])/2-s[c],s[c]*=n}if(Math.random()<.1){let a=Math.floor(Math.random()*(t-2))+1,l=Math.floor(Math.random()*(i-2))+1;s[l*t+a]=255}}_renderWater(e){let{width:t,height:i}=this.renderer,s=e.current;for(let r=0;r<i;r++)for(let n=0;n<t;n++){let o=r*t+n,a=Math.abs(s[o]),l=Math.min(255,a*2),c=l>200?l:0,h=l>150?l*.8:l*.3,d=Math.min(255,50+l);this.renderer.setPixel(n,r,[c,h,d])}}_renderStars(e){let{width:t,height:i}=this.renderer;for(let r=0;r<i;r++)for(let n=0;n<t;n++)this.renderer.setPixel(n,r,[5,5,15]);let s=e.stars;for(let r of s){let n=(Math.sin(r.phase)*.5+.5)*255,o=Math.floor(r.x),a=Math.floor(r.y);o>=0&&o<t&&a>=0&&a<i&&this.renderer.setPixel(o,a,[n,n,n*.9])}}_createConfettiParticle(e,t,i){let s=[[255,0,0],[0,255,0],[0,0,255],[255,255,0],[255,0,255],[0,255,255],[255,128,0],[255,192,203]];return{x:Math.random()*e,y:i?Math.random()*t:-2,speed:.2+Math.random()*.3,drift:(Math.random()-.5)*.3,color:s[Math.floor(Math.random()*s.length)],size:1+Math.random(),rotation:Math.random()*Math.PI*2,rotationSpeed:(Math.random()-.5)*.2}}_renderConfetti(e){let{width:t,height:i}=this.renderer;for(let r=0;r<i;r++)for(let n=0;n<t;n++)this.renderer.setPixel(n,r,[10,10,10]);let s=e.particles;for(let r of s){let n=Math.floor(r.x),o=Math.floor(r.y);if(n>=0&&n<t&&o>=0&&o<i){let a=Math.abs(Math.sin(r.rotation))*.5+.5,[l,c,h]=r.color;this.renderer.setPixel(n,o,[l*a,c*a,h*a])}}}_renderPlasmaWave(e){let{width:t,height:i}=this.renderer,s=e.time||0;for(let r=0;r<t;r++)for(let n=0;n<i;n++){let o=r/t,a=n/i,l=Math.sin(o*10+s)+Math.sin(a*10+s)+Math.sin((o+a)*10+s)+Math.sin(Math.sqrt((o-.5)**2+(a-.5)**2)*20-s*2),c=Math.sin(l*Math.PI)*.5+.5,h=Math.sin(l*Math.PI+2.094)*.5+.5,d=Math.sin(l*Math.PI+4.188)*.5+.5;this.renderer.setPixel(r,n,[c*255,h*255,d*255])}}_renderRadialPulse(e){let{width:t,height:i}=this.renderer,s=e.time||0,r=t/2,n=i/2;for(let o=0;o<t;o++)for(let a=0;a<i;a++){let l=o-r,c=a-n,h=Math.sqrt(l*l+c*c),d=Math.sin(h*.8-s*3)*.5+.5,p=Math.sin(s*2)*.3+.7,u=(h/20+s*.5)%1,[g,x,m]=I(u,.8,d*p);this.renderer.setPixel(o,a,[g,x,m])}}_renderHypnotic(e){let{width:t,height:i}=this.renderer,s=e.time||0,r=t/2,n=i/2;for(let o=0;o<t;o++)for(let a=0;a<i;a++){let l=o-r,c=a-n,h=Math.sqrt(l*l+c*c),d=Math.atan2(c,l),u=Math.sin(d*4+h*.5-s*2)*.5+.5,g=u*(Math.sin(s)*.5+.5),x=u*(Math.sin(s+2.094)*.5+.5),m=u*(Math.sin(s+4.188)*.5+.5);this.renderer.setPixel(o,a,[g*255,x*255,m*255])}}_renderLava(e){let{width:t,height:i}=this.renderer,s=e.time||0;for(let r=0;r<t;r++)for(let n=0;n<i;n++){let o=r/t,a=n/i,l=Math.sin(o*8+s*.7)*Math.cos(a*6+s*.5),c=Math.sin(o*12-s*.3)*Math.sin(a*10+s*.8),h=Math.cos((o+a)*5+s),d=(l+c+h+3)/6,p,u,g;d<.3?(p=d*3*100,u=0,g=0):d<.6?(p=100+(d-.3)*3*155,u=(d-.3)*3*100,g=0):(p=255,u=100+(d-.6)*2.5*155,g=(d-.6)*2.5*100),this.renderer.setPixel(r,n,[p,u,g])}}_renderAurora(e){let{width:t,height:i}=this.renderer,s=e.time||0;for(let r=0;r<t;r++)for(let n=0;n<i;n++){let o=r/t,a=n/i,l=Math.sin(o*6+s)*.3,c=Math.sin(o*4-s*.7)*.2,h=Math.sin(o*8+s*1.3)*.15,d=.5+l+c+h,p=Math.abs(a-d),u=Math.max(0,1-p*4),g=Math.pow(u,1.5),x=Math.sin(o*3+s*.5),m=g*(.2+x*.3)*255,_=g*(.8+Math.sin(s+o)*.2)*255,b=g*(.6+x*.4)*255,v=Math.sin(r*127.1+n*311.7)*.5+.5,w=Math.sin(s*3+r+n)*.5+.5;if(v>.98&&u<.3){let y=w*180;m=Math.max(m,y),_=Math.max(_,y),b=Math.max(b,y*.9)}this.renderer.setPixel(r,n,[m,_,b])}}},X=class{constructor(e){this.renderer=e}init(e,t){switch(e){case"color_cycle":t.hue=0;break;case"rainbow_text":t.offset=0;break;case"neon":t.glowIntensity=0,t.direction=1,t.baseColor=t.fgColor||"#ff00ff";break}}step(e,t){switch(e){case"color_cycle":t.hue=(t.hue+.01)%1;break;case"rainbow_text":t.offset=(t.offset+.02)%1;break;case"neon":t.glowIntensity+=t.direction*.05,t.glowIntensity>=1?(t.glowIntensity=1,t.direction=-1):t.glowIntensity<=.3&&(t.glowIntensity=.3,t.direction=1);break}}render(e,t,i){let{width:s,height:r}=this.renderer,n=i||[];for(let o=0;o<r;o++)for(let a=0;a<s;a++){let l=n[o*s+a]||"#111",[c,h,d]=A(l);if(c>20||h>20||d>20)switch(e){case"color_cycle":{let[u,g,x]=I(t.hue,1,.8),m=(c+h+d)/(3*255);c=u*m,h=g*m,d=x*m;break}case"rainbow_text":{let u=(t.offset+a/s)%1,[g,x,m]=I(u,1,.8),_=(c+h+d)/(3*255);c=g*_,h=x*_,d=m*_;break}case"neon":{let u=A(t.baseColor||"#ff00ff"),g=t.glowIntensity||.5;if(c=u[0]*g,h=u[1]*g,d=u[2]*g,g>.8){let x=(g-.8)*5;c=c+(255-c)*x*.3,h=h+(255-h)*x*.3,d=d+(255-d)*x*.3}break}}this.renderer.setPixel(a,o,[c,h,d])}}};var C={fixed:{category:"text",name:"Fixed",description:"Static display"},scroll_ltr:{category:"text",name:"Scroll Left",description:"Text scrolls left to right"},scroll_rtl:{category:"text",name:"Scroll Right",description:"Text scrolls right to left"},blink:{category:"text",name:"Blink",description:"Text blinks on/off"},breeze:{category:"text",name:"Breeze",description:"Gentle wave brightness"},snow:{category:"text",name:"Snow",description:"Sparkle effect"},laser:{category:"text",name:"Laser",description:"Scanning beam"},fade:{category:"text",name:"Fade",description:"Fade in/out"},typewriter:{category:"text",name:"Typewriter",description:"Characters appear one by one"},bounce:{category:"text",name:"Bounce",description:"Text bounces back and forth"},sparkle:{category:"text",name:"Sparkle",description:"Random sparkle overlay"},rainbow:{category:"ambient",name:"Rainbow",description:"HSV rainbow gradient"},matrix:{category:"ambient",name:"Matrix",description:"Digital rain effect"},plasma:{category:"ambient",name:"Plasma",description:"Classic plasma waves"},gradient:{category:"ambient",name:"Gradient",description:"Moving color gradients"},fire:{category:"ambient",name:"Fire",description:"Fire/flame simulation"},water:{category:"ambient",name:"Water",description:"Ripple/wave effect"},stars:{category:"ambient",name:"Stars",description:"Twinkling starfield"},confetti:{category:"ambient",name:"Confetti",description:"Falling colored particles"},plasma_wave:{category:"ambient",name:"Plasma Wave",description:"Multi-frequency sine waves"},radial_pulse:{category:"ambient",name:"Radial Pulse",description:"Expanding ring patterns"},hypnotic:{category:"ambient",name:"Hypnotic",description:"Spiral pattern"},lava:{category:"ambient",name:"Lava",description:"Flowing lava/magma"},aurora:{category:"ambient",name:"Aurora",description:"Northern lights"},color_cycle:{category:"color",name:"Color Cycle",description:"Cycle through colors"},rainbow_text:{category:"color",name:"Rainbow Text",description:"Rainbow gradient on text"},neon:{category:"color",name:"Neon",description:"Pulsing neon glow"}},F=class{constructor(e){this.renderer=e,this.textEffects=new G(e),this.ambientEffects=new W(e),this.colorEffects=new X(e),this.currentEffect="fixed",this.effectState={tick:0}}getEffectInfo(e){return C[e]||C.fixed}getEffectsByCategory(e){return Object.entries(C).filter(([,t])=>t.category===e).map(([t,i])=>({key:t,...i}))}initEffect(e,t={}){let i=this.getEffectInfo(e);switch(this.currentEffect=e,this.effectState={tick:0,...t},i.category){case"text":this.textEffects.init(e,this.effectState);break;case"ambient":this.ambientEffects.init(e,this.effectState);break;case"color":this.colorEffects.init(e,this.effectState);break}return this.effectState}step(){let e=this.getEffectInfo(this.currentEffect);switch(this.effectState.tick=(this.effectState.tick||0)+1,e.category){case"text":this.textEffects.step(this.currentEffect,this.effectState);break;case"ambient":this.ambientEffects.step(this.currentEffect,this.effectState);break;case"color":this.colorEffects.step(this.currentEffect,this.effectState);break}}render(e,t,i){switch(this.getEffectInfo(this.currentEffect).category){case"ambient":this.ambientEffects.render(this.currentEffect,this.effectState);break;case"text":this.textEffects.render(this.currentEffect,this.effectState,e,t,i);break;case"color":this.colorEffects.render(this.currentEffect,this.effectState,e);break}}isAmbient(e){return this.getEffectInfo(e).category==="ambient"}needsAnimation(e){return e!=="fixed"}},ct=Object.entries(C).filter(([,f])=>f.category==="text").map(([f])=>f),dt=Object.entries(C).filter(([,f])=>f.category==="ambient").map(([f])=>f),ht=Object.entries(C).filter(([,f])=>f.category==="color").map(([f])=>f),ft=Object.keys(C),T=class{constructor(e,t={}){this.container=e,this.width=t.width||64,this.height=t.height||16,this.pixelGap=t.pixelGap||.15,this.glowEnabled=t.glow!==!1,this.scale=t.scale||8,this.buffer=[],this._initBuffer(),this._colorPixels=[],this._extendedColorPixels=[],this.extendedWidth=this.width,this.effect="fixed",this.speed=50,this.animationId=null,this.lastFrameTime=0,this._isRunning=!1,this._canvas=null,this._ctx=null,this._imageData=null,this._glowCanvas=null,this._glowCtx=null,this._wrapper=null,this._canvasCreated=!1,this._pixelTemplate=null,this.effectManager=new F(this)}_initBuffer(){this.buffer=[];for(let e=0;e<this.width*this.height;e++)this.buffer.push([0,0,0])}_createCanvas(){if(typeof document>"u")return;let e=this.width*this.scale,t=this.height*this.scale;this._wrapper=document.createElement("div"),this._wrapper.style.cssText=`
      position: relative;
      width: 100%;
      aspect-ratio: ${this.width} / ${this.height};
      background: #0a0a0a;
      border-radius: 4px;
      overflow: hidden;
    `,this.glowEnabled&&(this._glowCanvas=document.createElement("canvas"),this._glowCanvas.width=e,this._glowCanvas.height=t,this._glowCanvas.style.cssText=`
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        filter: blur(${this.scale*.6}px); opacity: 0.5;
      `,this._glowCtx=this._glowCanvas.getContext("2d",{alpha:!1}),this._wrapper.appendChild(this._glowCanvas)),this._canvas=document.createElement("canvas"),this._canvas.width=e,this._canvas.height=t,this._canvas.style.cssText=`
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      image-rendering: pixelated; image-rendering: crisp-edges;
    `,this._ctx=this._canvas.getContext("2d",{alpha:!1}),this._wrapper.appendChild(this._canvas),this._imageData=this._ctx.createImageData(e,t),this._createPixelTemplate(),this._fillBackground(),this.container&&this.container.isConnected!==!1&&(this.container.innerHTML="",this.container.appendChild(this._wrapper)),this._canvasCreated=!0}_createPixelTemplate(){let e=this.scale,t=Math.max(1,Math.floor(e*this.pixelGap)),i=e-t,s=Math.max(1,Math.floor(e*.15));this._pixelTemplate=[];for(let r=0;r<e;r++)for(let n=0;n<e;n++){let o=!1;if(n<i&&r<i)if(n<s&&r<s){let a=s-n,l=s-r;o=a*a+l*l<=s*s}else if(n>=i-s&&r<s){let a=n-(i-s-1),l=s-r;o=a*a+l*l<=s*s}else if(n<s&&r>=i-s){let a=s-n,l=r-(i-s-1);o=a*a+l*l<=s*s}else if(n>=i-s&&r>=i-s){let a=n-(i-s-1),l=r-(i-s-1);o=a*a+l*l<=s*s}else o=!0;this._pixelTemplate.push(o)}}_fillBackground(){if(!this._imageData)return;let e=this._imageData.data,t=10,i=10,s=10;for(let r=0;r<e.length;r+=4)e[r]=t,e[r+1]=i,e[r+2]=s,e[r+3]=255}_ensureCanvasInContainer(){return this.container?this._wrapper&&this._wrapper.parentNode===this.container?!0:this._wrapper&&this.container.isConnected!==!1?(this.container.innerHTML="",this.container.appendChild(this._wrapper),!0):!1:!1}setPixel(e,t,i){if(e>=0&&e<this.width&&t>=0&&t<this.height){let s=t*this.width+e;s<this.buffer.length&&(this.buffer[s]=i)}}clear(){for(let e=0;e<this.buffer.length;e++)this.buffer[e]=[0,0,0]}flush(){if(this._canvasCreated?this._ensureCanvasInContainer()||this._createCanvas():this._createCanvas(),!this._imageData||!this._ctx||!this._pixelTemplate)return;let e=this._imageData.data,t=this.scale,i=this.width*t,s=this._pixelTemplate,r=10,n=10,o=10;for(let a=0;a<this.height;a++)for(let l=0;l<this.width;l++){let c=a*this.width+l,h=this.buffer[c];if(!h||!Array.isArray(h))continue;let d=Math.round(h[0]),p=Math.round(h[1]),u=Math.round(h[2]),g=l*t,x=a*t;for(let m=0;m<t;m++)for(let _=0;_<t;_++){let b=m*t+_,v=((x+m)*i+(g+_))*4;s[b]?(e[v]=d,e[v+1]=p,e[v+2]=u,e[v+3]=255):(e[v]=r,e[v+1]=n,e[v+2]=o,e[v+3]=255)}}this._ctx.putImageData(this._imageData,0,0),this.glowEnabled&&this._glowCtx&&this._glowCtx.drawImage(this._canvas,0,0)}setData(e,t=null,i=null){this._colorPixels=e||[],t?(this._extendedColorPixels=t,this.extendedWidth=i||this.width):(this._extendedColorPixels=e||[],this.extendedWidth=this.width)}setEffect(e,t=50){let i=this._isRunning;this.effect!==e&&(this.effect=e,this.effectManager.initEffect(e,{speed:t})),this.speed=t,i&&e!=="fixed"&&this.start()}start(){this._isRunning||(this._isRunning=!0,this.lastFrameTime=performance.now(),this._animate())}stop(){this._isRunning=!1,this.animationId&&(cancelAnimationFrame(this.animationId),this.animationId=null)}get isRunning(){return this._isRunning}_animate(){if(!this._isRunning)return;let e=performance.now(),t=500-(this.speed-1)*4.7;e-this.lastFrameTime>=t&&(this.lastFrameTime=e,this.effectManager.step()),this._renderFrame(),this.animationId=requestAnimationFrame(()=>this._animate())}_renderFrame(){this.effectManager.render(this._colorPixels,this._extendedColorPixels,this.extendedWidth),this.flush()}renderStatic(){this._canvasCreated||this._createCanvas(),this._renderFrame()}setDimensions(e,t){(e!==this.width||t!==this.height)&&(this.width=e,this.height=t,this.extendedWidth=e,this._initBuffer(),this._canvasCreated=!1,this.effectManager=new F(this),this.effect!=="fixed"&&this.effectManager.initEffect(this.effect,{speed:this.speed}))}setContainer(e){e!==this.container&&(this.container=e,this._wrapper&&e&&(e.innerHTML="",e.appendChild(this._wrapper)))}destroy(){this.stop(),this._canvas=null,this._ctx=null,this._imageData=null,this._glowCanvas=null,this._glowCtx=null,this._wrapper=null,this._canvasCreated=!1,this._pixelTemplate=null}};function S({id:f,min:e=0,max:t=100,value:i=50,unit:s="",showValue:r=!0,valueFormatter:n}){let o=(i-e)/(t-e)*100,a=n?n(i):`${i}${s}`;return`
    <div class="slider-row">
      <input type="range" class="slider" id="${f}" min="${e}" max="${t}" value="${i}" style="--value:${o}%">
      ${r?`<span class="slider-value" id="${f}-val">${a}</span>`:""}
    </div>`}function E(f,e,{onInput:t,onChange:i,unit:s="",valueFormatter:r}={}){let n=f.getElementById(e);if(!n)return;let o=f.getElementById(`${e}-val`),a=Number(n.min),l=Number(n.max),c=h=>{let d=Number(h),p=l>a?(d-a)/(l-a)*100:0;return n.style.setProperty("--value",`${p}%`),o&&(o.textContent=r?r(d):`${d}${s}`),d};c(n.value),n.addEventListener("input",h=>{let d=c(h.target.value);t?.(d,h)}),i&&n.addEventListener("change",h=>i(Number(h.target.value),h))}function R(f,{selected:e,itemClass:t="mode-btn",gridClass:i="button-grid button-grid-3",dataAttr:s="value",label:r=l=>l.name,value:n=l=>l.value,extraClass:o=()=>"",title:a}={}){let l=Array.isArray(e)?h=>e.some(d=>String(d)===String(h)):h=>String(h)===String(e),c=f.map(h=>{let d=n(h),p=l(d)?" active":"",u=o(h),g=u?` ${u}`:"",x=a?` title="${a(h)}"`:"";return`<button class="${t}${p}${g}" data-${s}="${d}"${x}>${r(h)}</button>`}).join("");return`<div class="${i}">${c}</div>`}function P(f,e,{onSelect:t,multi:i=!1,attr:s="value"}={}){f.querySelectorAll(e).forEach(r=>{r.addEventListener("click",n=>{let o=n.currentTarget,a=o.dataset[s];if(i){let l=o.classList.toggle("active");t?.(a,l,o)}else f.querySelectorAll(e).forEach(l=>l.classList.remove("active")),o.classList.add("active"),t?.(a,o)})})}function L(f){return`<div class="color-row">${f.map((t,i)=>`<span class="color-row-label"${i>0?' style="margin-left:16px;"':""}>${t.label}:</span>
      <input type="color" class="color-picker" id="${t.id}" value="${t.value}">`).join("")}</div>`}function B(f,e,t){e.forEach(i=>{f.getElementById(i)?.addEventListener("input",s=>t?.(i,s.target.value,s))})}function H(f,e,t="data-tab"){return`<div class="tabs">${f.map(s=>`<button class="${s.id===e?"tab active":"tab"}" ${t}="${s.id}">${s.label}</button>`).join("")}</div>`}function U(f,e,t="data-tab"){f.querySelectorAll(`[${t}]`).forEach(i=>{i.addEventListener("click",s=>{let r=s.currentTarget.getAttribute(t);e?.(r,s)})})}function $(f,e,t){return`<div class="tab-panel${e?" active":""}" id="panel-${f}" ${e?"":"hidden"}>${t}</div>`}var pt=typeof window<"u"&&(typeof window.hassConnection<"u"||document.querySelector("home-assistant")!==null),tt=pt?"/ipixel_color/gallery":`${window.location.pathname.substring(0,window.location.pathname.lastIndexOf("/")+1)}gallery`,M=Z("iPIXEL_StoredGIFs",()=>[]),ut=[{id:"text",label:"Text"},{id:"gif",label:"GIF"}],gt=[{id:"library",label:"Library"},{id:"create",label:"Create"},{id:"mine",label:"Mine"}],xt=[{value:"auto",label:"Auto (scroll only if too wide)"},{value:"static",label:"Static"},{value:"scroll_left",label:"Scroll right to left"},{value:"scroll_right",label:"Scroll left to right"},{value:"blink",label:"Blink"},{value:"breeze",label:"Breeze"},{value:"snow",label:"Snow"},{value:"laser",label:"Laser"}],mt=[{value:"cusong",label:"CUSONG (app default)"},{value:"pixeloid",label:"Pixeloid"},{value:"cusong_italic",label:"CUSONG Italic"},{value:"vcr",label:"VCR OSD Mono"},{value:"simsun",label:"SimSun"},{value:"arial",label:"Arial"},{value:"arial_bold",label:"Arial Nova Bold"},{value:"google_sans",label:"Google Sans"}],bt=[{value:0,name:"Off (use text colour)"},{value:1,name:"Rainbow Wave"},{value:2,name:"Rainbow Cycle"},{value:3,name:"Rainbow Pulse"},{value:4,name:"Rainbow Fade"},{value:5,name:"Rainbow Chase"},{value:6,name:"Rainbow Sparkle"},{value:7,name:"Rainbow Gradient"},{value:8,name:"Rainbow Theater"},{value:9,name:"Rainbow Fire"}],vt=[{value:8,label:"8px small"},{value:16,label:"16px medium"},{value:32,label:"32px large"}],_t=[{value:"rainbow",name:"Rainbow"},{value:"fire",name:"Fire"},{value:"matrix",name:"Matrix"},{value:"plasma",name:"Plasma"},{value:"water",name:"Water"},{value:"stars",name:"Stars"}],wt={text:"",font:"cusong",fontSize:16,effect:"auto",speed:50,fgColor:"#ffffff",bgColor:"#000000",rainbowMode:0},yt={effect:"rainbow",speed:50,frames:12},j=class extends k{constructor(){super();let e=z();this._text={...wt,...e},this._gif={...yt},this._tab="text",this._gifTab="library",this._error="",this._sending=null,this._manifest=null,this._size=null,this._filter="all",this._renderer=null}getCardSize(){return 4}connectedCallback(){this._loadManifest()}disconnectedCallback(){this._renderer?.stop(),super.disconnectedCallback()}_updateText(e){this._text={...this._text,...e},O({...this._text,mode:"text"}),this._restoreTextValues()}_restoreTextValues(){let e=i=>this.shadowRoot.getElementById(i),t=this._text;if(e("text-input")&&(e("text-input").value=t.text),e("text-font")&&(e("text-font").value=t.font),e("text-font-size")&&(e("text-font-size").value=String(t.fontSize)),e("text-effect")&&(e("text-effect").value=t.effect),e("rainbow-mode")&&(e("rainbow-mode").value=String(t.rainbowMode)),e("text-color")&&(e("text-color").value=t.fgColor),e("bg-color")&&(e("bg-color").value=t.bgColor),e("text-speed")){e("text-speed").value=t.speed,e("text-speed").style.setProperty("--value",`${t.speed}%`);let i=e("text-speed-val");i&&(i.textContent=`${t.speed}`)}}async _sendText(){let e=this._text;if(!e.text){this._error="Enter some text first.",this.render();return}if(this._error="",this._config.entity&&this._hass&&!this.isInTestMode())try{await this._hass.callService("text","set_value",{entity_id:this._config.entity,value:e.text})}catch(t){console.warn("iPIXEL: could not update the text entity",t)}await this.callService("ipixel_color","set_matrix_text",{text:e.text,effect:e.effect,speed:e.speed,font:e.font,font_size:e.fontSize,color_fg:this.hexToRgb(e.fgColor),color_bg:this.hexToRgb(e.bgColor),rainbow_mode:e.rainbowMode})}_renderTextTab(){let e=this._text,t=e.rainbowMode>0;return`
      <div class="input-row">
        <input type="text" class="text-input" id="text-input"
               placeholder="Text to show on the matrix" maxlength="120">
        <button class="btn btn-primary" id="send-text-btn">Send</button>
      </div>

      <div class="two-col">
        <div>
          <div class="section-title">Font</div>
          <div class="control-row">
            <select class="dropdown" id="text-font">
              ${mt.map(i=>`<option value="${i.value}">${i.label}</option>`).join("")}
            </select>
          </div>
        </div>
        <div>
          <div class="section-title">Font size</div>
          <div class="control-row">
            <select class="dropdown" id="text-font-size">
              ${vt.map(i=>`<option value="${i.value}">${i.label}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>

      <div class="section-title">Effect</div>
      <div class="control-row">
        <select class="dropdown" id="text-effect">
          ${xt.map(i=>`<option value="${i.value}">${i.label}</option>`).join("")}
        </select>
      </div>

      <div class="section-title">Speed</div>
      <div class="control-row">
        ${S({id:"text-speed",min:0,max:100,value:e.speed})}
      </div>
      <div class="hint">Scroll speed and blink rate.</div>

      <div class="section-title">Colour</div>
      <div class="control-row">
        ${L([{id:"text-color",label:"Text",value:e.fgColor},{id:"bg-color",label:"Background",value:e.bgColor}])}
      </div>
      ${t?'<div class="note">A rainbow mode is active, so the panel cycles the colours and ignores the text colour.</div>':""}

      <div class="section-title">Rainbow</div>
      <div class="control-row">
        <select class="dropdown" id="rainbow-mode">
          ${bt.map(i=>`<option value="${i.value}">${i.name}</option>`).join("")}
        </select>
      </div>`}_attachTextListeners(){let e=t=>this.shadowRoot.getElementById(t);e("text-input")?.addEventListener("input",t=>this._updateText({text:t.target.value})),e("text-font")?.addEventListener("change",t=>this._updateText({font:t.target.value})),e("text-font-size")?.addEventListener("change",t=>this._updateText({fontSize:parseInt(t.target.value,10)})),e("text-effect")?.addEventListener("change",t=>this._updateText({effect:t.target.value})),e("rainbow-mode")?.addEventListener("change",t=>{this._updateText({rainbowMode:parseInt(t.target.value,10)||0}),this.render()}),E(this.shadowRoot,"text-speed",{onInput:t=>this._updateText({speed:t})}),B(this.shadowRoot,["text-color","bg-color"],(t,i)=>{this._updateText(t==="text-color"?{fgColor:i}:{bgColor:i})}),e("send-text-btn")?.addEventListener("click",()=>this._sendText()),e("text-input")?.addEventListener("keydown",t=>{t.key==="Enter"&&this._sendText()})}async _loadManifest(){if(!this._manifest){try{let e=await fetch(`${tt}/manifest.json`);this._manifest=await e.json()}catch(e){console.error("iPIXEL: could not load the GIF library",e),this._manifest={}}this._autoSelectSize(),this.render()}}_autoSelectSize(){if(!this._manifest||this._size)return;let[e,t]=this.getResolution(),i=`${e}x${t}`,s=Object.keys(this._manifest);this._size=this._manifest[i]?i:s[0]||null}_sizes(){return this._manifest?Object.keys(this._manifest).sort((e,t)=>{let[i,s]=e.split("x").map(Number),[r,n]=t.split("x").map(Number);return s-n||i-r}):[]}_libraryItems(){let e=this._manifest?.[this._size],t=[];return e?.animations&&this._filter!=="eyes"&&e.animations.forEach(i=>t.push({...i,kind:"animation"})),e?.eyes&&this._filter!=="animations"&&e.eyes.forEach(i=>t.push({...i,kind:"eye"})),t}_renderLibraryTab(){if(!this._manifest)return'<div class="empty-state">Loading library...</div>';let[e,t]=this.getResolution(),i=this._sizes(),s=this._manifest[this._size],r=[{value:"all",name:"All"},{value:"animations",name:"Animations",show:(s?.animations?.length||0)>0},{value:"eyes",name:"Eyes",show:(s?.eyes?.length||0)>0}].filter(n=>n.show!==!1);return`
      <div class="section-title">Panel size</div>
      ${R(i.map(n=>({value:n,name:n,isMatch:n===`${e}x${t}`})),{selected:this._size,itemClass:"chip",gridClass:"chips",dataAttr:"size",extraClass:n=>n.isMatch?"match":""})}

      <div class="section-title" style="margin-top:12px;">Category</div>
      ${R(r,{selected:this._filter,itemClass:"chip",gridClass:"chips",dataAttr:"filter"})}

      ${this._renderLibraryItems()}`}_renderLibraryItems(){let e=this._libraryItems();return e.length===0?'<div class="empty-state">No animations for this category.</div>':`<div class="gif-grid">${e.map(t=>{let i=this._sending===t.file,s=t.kind==="eye"?`Eye ${t.side.toUpperCase()} #${t.num}`:t.name||`#${t.num}`;return`
        <div class="gif-item${i?" sending":""}" data-file="${t.file}"
             title="${this.escapeHtml(s)}">
          <img src="${tt}/${this._size}/${t.file}" loading="lazy"
               alt="${this.escapeHtml(s)}">
          <div class="gif-label">${this.escapeHtml(s)}</div>
          ${i?'<div class="gif-overlay">Sending...</div>':""}
        </div>`}).join("")}</div>`}async _sendLibraryGif(e){this._sending=e,this._error="",this.render();let t={size:this._size,filename:e};this._config.entity&&(t.entity_id=this._config.entity),await this.callService("ipixel_color","display_local_gallery",t),this._sending=null,this.render()}_initPreview(){let e=this.shadowRoot.getElementById("gif-preview");if(!e||this._renderer&&this._rendererContainer===e)return;this._renderer?.stop();let[t,i]=this.getResolution();this._renderer=new T(e,{width:t,height:i}),this._rendererContainer=e}_gifFrames(){let[e,t]=this.getResolution(),i=Math.max(2,Math.min(30,parseInt(this._gif.frames,10)||12)),s=[];for(let r=0;r<i;r++){let n=new Uint8Array(e*t*3),o=(a,l,c,h,d)=>{if(a<0||l<0||a>=e||l>=t)return;let p=(l*e+a)*3;n[p]=c,n[p+1]=h,n[p+2]=d};if(this._gif.effect==="rainbow")for(let a=0;a<t;a++){let l=(r/i+a/Math.max(t-1,1)*.5)%1,c=Math.round((Math.sin(l*6.283)+1)*127),h=Math.round((Math.sin(l*6.283+2.094)+1)*127),d=Math.round((Math.sin(l*6.283+4.188)+1)*127);for(let p=0;p<e;p++)o(p,a,c,h,d)}else if(this._gif.effect==="fire")for(let a=0;a<t;a++){let l=(a+r*1.5)%t,c=Math.round((1-l/Math.max(t-1,1))*255);for(let h=0;h<e;h++)o(h,a,c,Math.round(c*.35),Math.round(c*.08))}else if(this._gif.effect==="plasma"){let a=r*.4;for(let l=0;l<t;l++)for(let c=0;c<e;c++){let h=(Math.sin(c*.16+a)+Math.sin(l*.22+a)+Math.sin((c+l)*.12+a)+3)/6;o(c,l,Math.round(h*255),Math.round((Math.sin(c*.3+a)+1)*127),Math.round((Math.cos(l*.3+a)+1)*127))}}else if(this._gif.effect==="water")for(let a=0;a<t;a++){let l=Math.sin(a*.4+r*.55)*.5+.5,c=Math.round(30+225*l);for(let h=0;h<e;h++)o(h,a,Math.round(c*.2),Math.round(c*.75),c)}else if(this._gif.effect==="matrix"){let a=Math.max(4,Math.floor(e/2));for(let l=0;l<a;l++){let c=l*37%11,h=(r*2+c*3)%(t+6);for(let d=0;d<5;d++){let p=h-d;if(p<0||p>=t)continue;let u=Math.round((1-d/5)*255);o(Math.floor(l*(e/a)),p,0,u,Math.round(u*.25))}}}else{let a=Math.max(4,Math.floor(e/3));for(let l=0;l<a;l++){let c=(r*.35+l*.45)%(Math.PI*2),h=(Math.sin(c)+1)*.5,d=Math.round(h*255),p=Math.floor(l*(e/a));o(p,t-1,d,d,d),h>.7&&o(p,t-2,Math.round(d*.5),Math.round(d*.5),Math.round(d*.5))}}s.push(n)}return s}_frameDelay(){return Math.max(2,Math.round(20-this._gif.speed/100*17))}_updatePreview(){if(!this._renderer)return;let[e,t]=this.getResolution(),i=this._gifFrames().map(s=>{let r=new Array(e*t);for(let n=0;n<r.length;n++){let o=n*3;r[n]="#"+[s[o],s[o+1],s[o+2]].map(a=>a.toString(16).padStart(2,"0")).join("")}return r});this._renderer.playFrames?this._renderer.playFrames(i,this._frameDelay()*10):i.length>0&&(this._renderer.setData(i[0]),this._renderer.setEffect("fixed",50),this._renderer.renderStatic())}_renderCreateTab(){let e=this._gif;return`
      <div class="preview-box">
        <div class="preview-screen" id="gif-preview"></div>
      </div>

      <div class="section-title">Animation</div>
      ${R(_t,{selected:e.effect,itemClass:"chip",gridClass:"chips",dataAttr:"effect"})}

      <div class="section-title" style="margin-top:12px;">Speed</div>
      <div class="control-row">
        ${S({id:"gif-speed",min:0,max:100,value:e.speed})}
      </div>

      <div class="section-title">Frames</div>
      <div class="control-row">
        ${S({id:"gif-frames",min:2,max:30,value:e.frames})}
      </div>

      <div class="button-grid button-grid-2" style="margin-top:8px;">
        <button class="btn btn-secondary" id="gif-save-btn">Save</button>
        <button class="btn btn-primary" id="gif-send-btn">Send</button>
      </div>
      <div class="hint">Saving keeps the animation in this browser so you can send it again later.</div>`}_encodeGif(){let[e,t]=this.getResolution();return Q(this._gifFrames(),e,t,this._frameDelay(),0)}async _saveGif(){let e=`${this._gif.effect}_${this._gifFrames}_f.gif`;try{let t=this._encodeGif(),i=new Blob([t],{type:"image/gif"}),s=new FileReader,r=await new Promise((l,c)=>{s.onload=()=>l(s.result),s.onerror=()=>c(s.error),s.readAsDataURL(i)}),n=M.load(),o={name:e,dataUrl:r,addedAt:Date.now()},a=n.findIndex(l=>l.name===e);a>=0?n[a]=o:n.push(o),M.save(n),this._gifTab="mine",this._error="",this.render()}catch(t){console.error("iPIXEL: could not save the generated GIF",t),this._error="Could not save the animation. Try fewer frames.",this.render()}}async _sendGeneratedGif(){let e=this._encodeGif(),t=`${this._gif.effect}_${this._gif.frames}_f.gif`,i=`data:image/gif;base64,${this._bytesToBase64(e)}`,s=M.load(),r={name:t,dataUrl:i,addedAt:Date.now()},n=s.findIndex(o=>o.name===t);n>=0?s[n]=r:s.push(r),M.save(s),this._error="",await this.callService("ipixel_color","display_gif_data",{gif_data:i})}_bytesToBase64(e){let t="";for(let s=0;s<e.length;s+=32768)t+=String.fromCharCode.apply(null,e.subarray(s,s+32768));return btoa(t)}_attachCreateListeners(){P(this.shadowRoot,"[data-effect]",{onSelect:e=>{this._gif={...this._gif,effect:e},this._updatePreview(),this.render()},attr:"effect"}),E(this.shadowRoot,"gif-speed",{onInput:e=>{this._gif={...this._gif,speed:e},this._updatePreview()}}),E(this.shadowRoot,"gif-frames",{onInput:e=>{this._gif={...this._gif,frames:e},this._updatePreview()}}),this.shadowRoot.getElementById("gif-save-btn")?.addEventListener("click",()=>this._saveGif()),this.shadowRoot.getElementById("gif-send-btn")?.addEventListener("click",()=>this._sendGeneratedGif())}_renderMineTab(){let e=M.load();return`
      <div class="drop-zone" id="drop-zone">
        <div class="drop-text">Drop a GIF here or tap to upload</div>
        <input type="file" id="file-input" accept="image/gif,.gif" multiple>
      </div>

      ${e.length===0?'<div class="empty-state">Nothing stored yet. Create one in the Create tab, or upload a GIF.</div>':`<div class="gif-grid">${e.map(t=>{let i=this._sending===t.name;return`
              <div class="gif-item stored${i?" sending":""}" data-name="${this.escapeHtml(t.name)}"
                   title="${this.escapeHtml(t.name)}">
                <img src="${t.dataUrl}" loading="lazy" alt="${this.escapeHtml(t.name)}">
                <div class="gif-label">${this.escapeHtml(t.name.replace(/\.gif$/i,""))}</div>
                <button class="gif-delete" data-delete="${this.escapeHtml(t.name)}">x</button>
                ${i?'<div class="gif-overlay">Sending...</div>':""}
              </div>`}).join("")}</div>`}`}_storeFiles(e){let t=M.load(),i=0,s=0;for(let r of e){if(!r.type.includes("gif")&&!r.name.toLowerCase().endsWith(".gif"))continue;i++;let n=new FileReader;n.onload=()=>{let o={name:r.name,dataUrl:n.result,addedAt:Date.now()},a=t.findIndex(l=>l.name===r.name);a>=0?t[a]=o:t.push(o),++s===i&&(M.save(t),this.render())},n.onerror=()=>{++s===i&&(M.save(t),this.render())},n.readAsDataURL(r)}}async _sendStoredGif(e){let t=M.load().find(i=>i.name===e);t&&(this._sending=e,this._error="",this.render(),await this.callService("ipixel_color","display_gif_data",{gif_data:t.dataUrl}),this._sending=null,this.render())}_attachMineListeners(){let e=this.shadowRoot.getElementById("drop-zone");e&&(e.addEventListener("dragover",t=>{t.preventDefault(),t.stopPropagation(),e.classList.add("drag-over")}),e.addEventListener("dragleave",t=>{t.preventDefault(),t.stopPropagation(),e.classList.remove("drag-over")}),e.addEventListener("drop",t=>{t.preventDefault(),t.stopPropagation(),e.classList.remove("drag-over"),t.dataTransfer?.files?.length&&this._storeFiles(t.dataTransfer.files)}),e.addEventListener("click",()=>{this.shadowRoot.getElementById("file-input")?.click()})),this.shadowRoot.getElementById("file-input")?.addEventListener("change",t=>{t.target.files?.length&&this._storeFiles(t.target.files)}),this.shadowRoot.querySelectorAll(".gif-item.stored").forEach(t=>{t.addEventListener("click",i=>{i.target.classList.contains("gif-delete")||this._sendStoredGif(t.dataset.name)})}),this.shadowRoot.querySelectorAll("[data-delete]").forEach(t=>{t.addEventListener("click",i=>{i.stopPropagation();let s=t.dataset.delete;M.save(M.load().filter(r=>r.name!==s)),this.render()})})}_renderGifTab(){return`
      ${H(gt,this._gifTab,"data-gif-tab")}
      ${$("library",this._gifTab==="library",this._renderLibraryTab())}
      ${$("create",this._gifTab==="create",this._renderCreateTab())}
      ${$("mine",this._gifTab==="mine",this._renderMineTab())}`}render(){!this._hass&&!this.isInTestMode()||(this.shadowRoot.innerHTML=`
      <style>${D}
        .input-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .input-row .text-input { flex: 1; }
        .hint { font-size: 0.75em; opacity: 0.6; margin: -8px 0 16px; }
        .note { font-size: 0.75em; opacity: 0.6; margin-top: 4px; }
        .error { color: var(--error-color, #db4437); font-size: 0.8em; margin-top: 12px; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .chip {
          padding: 5px 12px; border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px; background: rgba(255,255,255,0.05);
          color: inherit; cursor: pointer; font-size: 0.75em; transition: all 0.2s;
        }
        .chip:hover { background: rgba(255,255,255,0.1); }
        .chip.active { background: var(--ipixel-primary); border-color: var(--ipixel-primary); color: #fff; }
        .chip.match { border-color: rgba(76,175,80,0.6); }
        .gif-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px; margin-top: 8px;
        }
        .gif-item {
          position: relative; background: #000; border: 2px solid rgba(255,255,255,0.1);
          border-radius: 8px; overflow: hidden; cursor: pointer;
          aspect-ratio: 1; display: flex; align-items: center; justify-content: center;
          transition: transform 0.15s;
        }
        .gif-item:hover { border-color: var(--ipixel-primary); transform: scale(1.04); }
        .gif-item.sending { opacity: 0.7; border-color: var(--ipixel-accent, #ff9800); }
        .gif-item.stored { border-color: rgba(255,152,0,0.35); }
        .gif-item img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
        .gif-label {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: rgba(0,0,0,0.7); font-size: 0.6em; padding: 2px 4px;
          text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .gif-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7em; color: var(--ipixel-accent, #ff9800);
        }
        .gif-delete {
          position: absolute; top: 2px; right: 2px; width: 18px; height: 18px;
          background: rgba(244,67,54,0.85); border: none; border-radius: 50%;
          color: #fff; font-size: 11px; line-height: 18px; text-align: center;
          cursor: pointer; padding: 0; display: none;
        }
        .gif-item:hover .gif-delete { display: block; }
        .preview-box {
          background: #000; border-radius: 8px; padding: 8px;
          border: 2px solid #222; margin-bottom: 12px;
        }
        .preview-screen { background: #000; border-radius: 4px; overflow: hidden; min-height: 60px; }
        .drop-zone {
          border: 2px dashed rgba(255,255,255,0.2); border-radius: 10px;
          padding: 16px; text-align: center; margin-bottom: 12px;
          transition: all 0.2s; cursor: pointer;
        }
        .drop-zone:hover, .drop-zone.drag-over {
          border-color: var(--ipixel-primary); background: rgba(3,169,244,0.05);
        }
        .drop-zone input[type="file"] { display: none; }
        .drop-text { font-size: 0.8em; opacity: 0.6; }
      </style>
      <ha-card>
        <div class="card-content">
          ${H(ut,this._tab)}
          ${$("text",this._tab==="text",this._renderTextTab())}
          ${$("gif",this._tab==="gif",this._renderGifTab())}
          ${this._error?`<div class="error">${this.escapeHtml(this._error)}</div>`:""}
        </div>
      </ha-card>`,this._tab==="text"?(this._restoreTextValues(),this._attachTextListeners()):(this._attachGifListeners(),this._gifTab==="create"&&(this._initPreview(),this._updatePreview())),U(this.shadowRoot,e=>{this._tab=e,this._error="",this.render()}))}_attachGifListeners(){U(this.shadowRoot,e=>{this._gifTab=e,this.render()},"data-gif-tab"),this._gifTab==="library"?(P(this.shadowRoot,"[data-size]",{onSelect:e=>{this._size=e,this._filter="all",this.render()},attr:"size"}),P(this.shadowRoot,"[data-filter]",{onSelect:e=>{this._filter=e,this.render()},attr:"filter"}),this.shadowRoot.querySelectorAll(".gif-item[data-file]").forEach(e=>{e.addEventListener("click",()=>this._sendLibraryGif(e.dataset.file))})):this._gifTab==="create"?this._attachCreateListeners():this._attachMineListeners()}static getConfigElement(){return document.createElement("ipixel-simple-editor")}static getStubConfig(){return{entity:""}}};var Mt=[{value:"auto",label:"Auto (scroll only if too wide)"},{value:"static",label:"Static"},{value:"scroll_left",label:"Scroll right to left"},{value:"scroll_right",label:"Scroll left to right"},{value:"blink",label:"Blink"},{value:"breeze",label:"Breeze"},{value:"snow",label:"Snow"},{value:"laser",label:"Laser"}],Ct=[{value:"cusong",label:"CUSONG (app default)"},{value:"pixeloid",label:"Pixeloid"},{value:"cusong_italic",label:"CUSONG Italic"},{value:"vcr",label:"VCR OSD Mono"},{value:"simsun",label:"SimSun"},{value:"arial",label:"Arial"},{value:"arial_bold",label:"Arial Nova Bold"},{value:"google_sans",label:"Google Sans"}],St=[{value:0,name:"Off (use text colour)"},{value:1,name:"Rainbow Wave"},{value:2,name:"Rainbow Cycle"},{value:3,name:"Rainbow Pulse"},{value:4,name:"Rainbow Fade"},{value:5,name:"Rainbow Chase"},{value:6,name:"Rainbow Sparkle"},{value:7,name:"Rainbow Gradient"},{value:8,name:"Rainbow Theater"},{value:9,name:"Rainbow Fire"}],Et=[{value:8,label:"8px small"},{value:16,label:"16px medium"},{value:32,label:"32px large"}],$t={text:"",font:"cusong",effect:"auto",speed:50,fgColor:"#ffffff",bgColor:"#000000",rainbowMode:0,fontSize:16},N=class extends k{constructor(){super(),this._form={...$t,...z()},this._error=""}getCardSize(){return 3}_update(e){this._form={...this._form,...e},O({text:this._form.text,mode:"text",effect:this._form.effect,speed:this._form.speed,fgColor:this._form.fgColor,bgColor:this._form.bgColor,rainbowMode:this._form.rainbowMode,font:this._form.font,fontSize:this._form.fontSize}),this._restoreFormValues()}_restoreFormValues(){let e=i=>this.shadowRoot.getElementById(i),t=this._form;if(e("text-input")&&(e("text-input").value=t.text),e("text-font")&&(e("text-font").value=t.font),e("text-effect")&&(e("text-effect").value=t.effect),e("rainbow-mode")&&(e("rainbow-mode").value=String(t.rainbowMode)),e("font-size")&&(e("font-size").value=String(t.fontSize)),e("text-speed")){e("text-speed").value=t.speed,e("text-speed").style.setProperty("--value",`${t.speed}%`);let i=e("text-speed-val");i&&(i.textContent=`${t.speed}`)}e("text-color")&&(e("text-color").value=t.fgColor),e("bg-color")&&(e("bg-color").value=t.bgColor)}render(){if(!this._hass)return;let e=this._form,t=e.rainbowMode>0;this.shadowRoot.innerHTML=`
      <style>${D}
        .text-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .text-row .text-input { flex: 1; }
        .send-btn { min-width: 84px; }
        .hint { font-size: 0.75em; opacity: 0.6; margin: -8px 0 16px; }
        .error { color: var(--error-color, #db4437); font-size: 0.8em; margin-top: 8px; }
        .note { font-size: 0.75em; opacity: 0.6; margin-top: 4px; }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="text-row">
            <input type="text" class="text-input" id="text-input"
                   placeholder="Text to show on the matrix"
                   maxlength="120">
            <button class="btn btn-primary send-btn" id="send-btn">Send</button>
          </div>

          <div class="two-col">
            <div>
              <div class="section-title">Font</div>
              <div class="control-row">
                <select class="dropdown" id="text-font">
                  ${Ct.map(i=>`<option value="${i.value}">${i.label}</option>`).join("")}
                </select>
              </div>
            </div>
            <div>
              <div class="section-title">Font size</div>
              <div class="control-row">
                <select class="dropdown" id="font-size">
                  ${Et.map(i=>`<option value="${i.value}">${i.label}</option>`).join("")}
                </select>
              </div>
            </div>
          </div>

          <div class="section-title">Effect</div>
          <div class="control-row">
            <select class="dropdown" id="text-effect">
              ${Mt.map(i=>`<option value="${i.value}">${i.label}</option>`).join("")}
            </select>
          </div>

          <div class="section-title">Speed</div>
          <div class="control-row">
            ${S({id:"text-speed",min:0,max:100,value:e.speed})}
          </div>
          <div class="hint">Scroll speed and blink rate.</div>

          <div class="section-title">Colour</div>
          <div class="control-row">
            ${L([{id:"text-color",label:"Text",value:e.fgColor},{id:"bg-color",label:"Background",value:e.bgColor}])}
          </div>
          ${t?'<div class="note">A rainbow mode is active, so the device cycles colours and ignores the text colour.</div>':""}

          <div class="section-title">Rainbow</div>
          <div class="control-row">
            <select class="dropdown" id="rainbow-mode">
              ${St.map(i=>`<option value="${i.value}">${i.name}</option>`).join("")}
            </select>
          </div>

          ${this._error?`<div class="error">${this.escapeHtml(this._error)}</div>`:""}
        </div>
      </ha-card>`,this._restoreFormValues(),this._attachListeners()}_attachListeners(){let e=t=>this.shadowRoot.getElementById(t);e("text-input")?.addEventListener("input",t=>this._update({text:t.target.value})),e("text-font")?.addEventListener("change",t=>this._update({font:t.target.value})),e("text-effect")?.addEventListener("change",t=>this._update({effect:t.target.value})),e("font-size")?.addEventListener("change",t=>this._update({fontSize:parseInt(t.target.value,10)})),e("rainbow-mode")?.addEventListener("change",t=>{this._update({rainbowMode:parseInt(t.target.value,10)||0}),this.render()}),E(this.shadowRoot,"text-speed",{onInput:t=>this._update({speed:t})}),B(this.shadowRoot,["text-color","bg-color"],(t,i)=>{this._update(t==="text-color"?{fgColor:i}:{bgColor:i})}),e("send-btn")?.addEventListener("click",()=>this._send()),e("text-input")?.addEventListener("keydown",t=>{t.key==="Enter"&&this._send()})}async _send(){let e=this._form;if(!e.text){this._error="Enter some text first.",this.render();return}if(this._error="",this._config.entity&&this._hass&&!this.isInTestMode())try{await this._hass.callService("text","set_value",{entity_id:this._config.entity,value:e.text})}catch(t){console.warn("iPIXEL: could not update text entity",t)}await this.callService("ipixel_color","set_matrix_text",{text:e.text,effect:e.effect,speed:e.speed,font:e.font,font_size:e.fontSize,color_fg:this.hexToRgb(e.fgColor),color_bg:this.hexToRgb(e.bgColor),rainbow_mode:e.rainbowMode})}static getConfigElement(){return document.createElement("ipixel-simple-editor")}static getStubConfig(){return{entity:""}}};var q=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"})}setConfig(e){this._config=e,this.render()}set hass(e){this._hass=e,this.render()}render(){if(!this._hass)return;let e=Object.keys(this._hass.states).filter(t=>t.startsWith("text.")||t.startsWith("switch.")).sort();this.shadowRoot.innerHTML=`
      <style>
        .row { margin-bottom: 12px; }
        label { display: block; margin-bottom: 4px; font-weight: 500; font-size: 0.9em; }
        select, input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 4px;
          background: var(--card-background-color);
          color: inherit;
          box-sizing: border-box;
        }
      </style>
      <div class="row">
        <label>Entity</label>
        <select id="entity">
          <option value="">Select entity</option>
          ${e.map(t=>`
            <option value="${t}" ${this._config?.entity===t?"selected":""}>
              ${this._hass.states[t]?.attributes?.friendly_name||t}
            </option>
          `).join("")}
        </select>
      </div>
      <div class="row">
        <label>Name (optional)</label>
        <input type="text" id="name" value="${this._config?.name||""}" placeholder="Display name">
      </div>`,this.shadowRoot.querySelectorAll("select, input").forEach(t=>{t.addEventListener("change",()=>this.fireConfig())})}fireConfig(){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:{type:this._config?.type||"custom:ipixel-display-card",entity:this.shadowRoot.getElementById("entity")?.value,name:this.shadowRoot.getElementById("name")?.value||void 0}},bubbles:!0,composed:!0}))}};try{let f=(e,t)=>{customElements.get(e)||customElements.define(e,t)};f("ipixel-control-card",j),f("ipixel-text-card",N),f("ipixel-simple-editor",q),window.customCards=window.customCards||[],[{type:"ipixel-control-card",name:"iPIXEL Panel",description:"Send text and GIF animations to the LED matrix"},{type:"ipixel-text-card",name:"iPIXEL Text",description:"Send text only, with colour, font, effect and speed"}].forEach(e=>{try{window.customCards.push({...e,preview:!0,documentationURL:"https://github.com/cagcoach/ha-ipixel-color"})}catch(t){console.error("iPIXEL: failed to register card",e.type,t)}})}catch(f){console.error("iPIXEL: failed to initialize cards",f)}console.info(`%c iPIXEL Cards %c ${K} `,"background:#03a9f4;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;","background:#333;color:#fff;padding:2px 6px;border-radius:0 4px 4px 0;");})();
