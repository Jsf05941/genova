(function(){
  function loadCss(){
    if(document.querySelector('link[href="agent-modes.css"]')) return;
    var link=document.createElement('link');
    link.rel='stylesheet';
    link.href='agent-modes.css';
    document.head.appendChild(link);
  }

  function setView(view){
    document.body.classList.remove('agent-preview-mode','agent-code-mode','agent-deploy-mode');
    if(view==='preview'){
      document.body.classList.add('agent-preview-mode');
      var previewTab=document.querySelector('.preview-tab');
      if(previewTab) previewTab.click();
    }
    if(view==='code'){
      document.body.classList.add('agent-code-mode');
      if(window.currentProject&&typeof window.loadGeneratedFiles==='function'){
        window.loadGeneratedFiles(window.currentProject.id);
      }
    }
    if(view==='deploy'){
      document.body.classList.add('agent-deploy-mode');
    }
  }

  function button(label, icon, action){
    var btn=document.createElement('button');
    var i=document.createElement('i');
    i.className='ti '+icon;
    btn.appendChild(i);
    btn.appendChild(document.createTextNode(' '+label));
    btn.addEventListener('click',action);
    return btn;
  }

  function ensureControls(){
    if(document.getElementById('agentViewControls')) return;
    var controls=document.createElement('div');
    controls.id='agentViewControls';
    controls.className='agent-view-controls';
    controls.appendChild(button('Code','ti-code',function(){setView('code')}));
    controls.appendChild(button('Preview','ti-eye',function(){setView('preview')}));
    controls.appendChild(button('Deploy','ti-rocket',function(){setView('deploy')}));
    controls.appendChild(button('Redeploy','ti-cloud-upload',function(){if(typeof window.redeploy==='function') window.redeploy()}));
    document.body.appendChild(controls);
  }

  function patch(){
    loadCss();
    window.setAgentView=setView;
    window.ensureAgentControls=ensureControls;

    var wait=setInterval(function(){
      if(typeof window.openAgentPanel==='function'){
        clearInterval(wait);
        var oldOpen=window.openAgentPanel;
        window.openAgentPanel=function(modelLabel){
          loadCss();
          ensureControls();
          return oldOpen(modelLabel);
        };
      }
    },100);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',patch);
  else patch();
})();
