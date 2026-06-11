(function(){
  function getFile(files,path){return (files||[]).find(function(f){return f.file_path===path})}
  function stripImports(code){return String(code||'').replace(/^import[^;]+;?$/gm,'')}
  function transformApp(code){
    var cleaned=stripImports(code).replace(/export\s+default\s+function\s+App/,'function App').replace(/export\s+default\s+App\s*;?/,'');
    return cleaned+'\nwindow.GeneratedApp = typeof App !== "undefined" ? App : window.GeneratedApp;';
  }
  function renderPreview(files){
    var app=getFile(files,'src/App.jsx');
    var css=getFile(files,'src/styles.css');
    var mount=document.getElementById('previewWeb');
    if(!mount||!app) return;
    mount.innerHTML='';
    var iframe=document.createElement('iframe');
    iframe.className='generated-preview-frame';
    iframe.setAttribute('sandbox','allow-scripts allow-forms allow-modals');
    iframe.srcdoc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script><script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script><script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script><style>'+((css&&css.content)||'')+'<\/style></head><body><div id="root"></div><script type="text/babel">const Rocket=()=>null,Sparkles=()=>null,Layers=()=>null;'+transformApp(app.content)+';ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(window.GeneratedApp));<\/script></body></html>';
    mount.appendChild(iframe);
  }
  window.renderGeneratedPreview=renderPreview;
  window.addEventListener('genova-files-updated',function(e){renderPreview(e.detail&&e.detail.files)});
})();
