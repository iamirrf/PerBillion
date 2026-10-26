import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { Icon } from './Icons'

const goals=[['start','Start investing','Build a clear foundation from the beginning.'],['portfolio','Understand portfolios & risk','Learn how allocation and behavior shape outcomes.'],['quant','Explore quantitative research','Learn to test models and interpret uncertainty.']]

export default function Onboarding(){
  const [goal,setGoal]=useState('start'),[experience,setExperience]=useState('new'),[saving,setSaving]=useState(false),[error,setError]=useState('')
  const navigate=useNavigate(),id=useAuthStore(s=>s.user?.id)
  const destination=()=>{try{const value=sessionStorage.getItem('perbillion-return-to');sessionStorage.removeItem('perbillion-return-to');return value&&/^\/(?!\/)/.test(value)?value:'/app'}catch{return'/app'}}
  async function finish(){setSaving(true);setError('');try{await api.put('/user/preferences',{learningGoal:goal,experienceLevel:experience,onboardingComplete:true});try{localStorage.setItem(`perbillion-goal-${id}`,JSON.stringify(goal))}catch{/* Server preference is authoritative. */}navigate(destination(),{replace:true})}catch(failure:any){setError(failure.response?.data?.error||'Your learning path could not be saved. Please try again.')}finally{setSaving(false)}}
  return <div className="onboarding"><p className="kicker">YOUR STARTING POINT</p><h1>Make PerBillion<br/>work for your goal.</h1><p>Choose a direction. The academy will recommend a first lesson and mission.</p><fieldset><legend>What would you like to understand?</legend>{goals.map(([id,title,text])=><label className={goal===id?'selected':''} key={id}><input type="radio" name="goal" value={id} checked={goal===id} onChange={()=>setGoal(id)}/><span><b>{title}</b><small>{text}</small></span><Icon name="check"/></label>)}</fieldset><label className="experience-select">Your experience<select value={experience} onChange={event=>setExperience(event.target.value)}><option value="new">I’m new to investing</option><option value="some">I know some basics</option><option value="experienced">I’m comfortable with investing concepts</option></select></label>{error&&<p className="status error" role="alert">{error}</p>}<div><button className="button primary large" disabled={saving} onClick={()=>void finish()}>{saving?'Saving…':'Build my learning path'}<Icon name="arrow"/></button><button className="text-button" disabled={saving} onClick={()=>navigate(destination(),{replace:true})}>Skip for now</button></div></div>
}
