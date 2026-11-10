'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function InfoTip({title,children}:{title:string;children:string}) {
  const id=useId();
  const button=useRef<HTMLButtonElement>(null);
  const panel=useRef<HTMLDivElement>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const pinned=useRef(false);
  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState({left:12,top:12});
  function stopTimer(){if(timer.current)clearTimeout(timer.current);}
  function show(){stopTimer();setOpen(true);}
  function close(){stopTimer();pinned.current=false;setOpen(false);}
  function leave(){
    if(!pinned.current && document.activeElement!==button.current){
      stopTimer();timer.current=setTimeout(()=>setOpen(false),150);
    }
  }
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useLayoutEffect(()=>{
    if(!open||!button.current||!panel.current)return;
    function reposition(){
      if(!button.current||!panel.current)return;
      const b=button.current.getBoundingClientRect(),p=panel.current.getBoundingClientRect();
      setPosition({left:Math.max(12,Math.min(b.right-p.width,window.innerWidth-p.width-12)),
        top:b.bottom+8+p.height<=window.innerHeight-12?b.bottom+8:Math.max(12,b.top-p.height-8)});
    }
    reposition();
    window.addEventListener('resize',reposition);
    window.addEventListener('scroll',reposition,{capture:true,passive:true});
    return()=>{window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);};
  },[open]);
  useEffect(()=>{
    if(!open)return;
    const outside=(e:PointerEvent)=>{if(!button.current?.contains(e.target as Node)&&!panel.current?.contains(e.target as Node))close();};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  return <>
    <button ref={button} type="button" className="info-tip-button" aria-label={'Help: '+title} aria-expanded={open} aria-describedby={open?id:undefined}
      onMouseEnter={show} onMouseLeave={leave} onFocus={show} onBlur={close}
      onClick={()=>{if(pinned.current)close();else{pinned.current=true;show();}}}><span aria-hidden="true">i</span></button>
    {open?createPortal(<div ref={panel} id={id} role="tooltip" className="info-tip-panel" style={position} onMouseEnter={stopTimer} onMouseLeave={leave}>
      <strong>{title}</strong><p>{children}</p>
    </div>,document.body):null}
  </>;
}
