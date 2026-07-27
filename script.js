(function(){
  var open=null, lastFocus=null;
  function focusables(m){ return m.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])'); }
  function openModal(id){
    var m=document.getElementById(id); if(!m) return;
    lastFocus=document.activeElement; m.hidden=false; open=m;
    document.body.style.overflow='hidden';
    var f=focusables(m); if(f.length) f[0].focus();
  }
  function closeModal(){
    if(!open) return;
    open.hidden=true; document.body.style.overflow='';
    if(lastFocus&&lastFocus.focus) lastFocus.focus();
    open=null;
  }
  document.addEventListener('click',function(e){
    var t=e.target.closest('[data-open]');
    if(t){ e.preventDefault(); openModal(t.getAttribute('data-open')); return; }
    if(e.target.closest('[data-close]')){ e.preventDefault(); closeModal(); return; }
    if(open && e.target===open){ closeModal(); }            // click outside
  });
  document.addEventListener('keydown',function(e){
    if(!open) return;
    if(e.key==='Escape'){ closeModal(); return; }
    if(e.key==='Tab'){                                       // focus trap
      var f=focusables(open); if(!f.length) return;
      var first=f[0], last=f[f.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  });
})();