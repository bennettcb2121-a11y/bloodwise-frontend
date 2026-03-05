'use client'

import { useState } from "react"

import { analyzeBiomarkers } from "../src/lib/analyzeBiomarkers"
import { calculateScore } from "../src/lib/calculateScore"
import { classifyUser } from "../src/lib/classifyUser"
import { recommendTests } from "../src/lib/recommendTests"

import { interventions } from "../src/lib/interventions"
import { researchSources } from "../src/lib/research"
import { supplementRecommendations } from "../src/lib/supplements"

import { buildReportSummary } from "../src/lib/reportSummary"
import { buildTopActions } from "../src/lib/actionEngine"

export default function Home(){

const [age,setAge] = useState("")
const [sex,setSex] = useState("")
const [sport,setSport] = useState("")
const [volume,setVolume] = useState("")
const [diet,setDiet] = useState("")

const [recommended,setRecommended] = useState<string[]>([])
const [bloodwork,setBloodwork] = useState<any>({})

const [report,setReport] = useState<any[]>([])
const [score,setScore] = useState<number | null>(null)
const [summary,setSummary] = useState("")
const [topActions,setTopActions] = useState<any[]>([])

const getTrainingUnit = () => {
if(sport==="Running") return "Miles per week"
return "Hours per week"
}

const handleProfile = () => {

const profile = classifyUser({
age,
sex,
sport,
volume,
diet
})

const tests = recommendTests(profile)

setRecommended(tests)

}

const handleBloodwork = (marker:string,value:any)=>{

setBloodwork({
...bloodwork,
[marker]:value
})

}

const runAnalysis = () => {

const analysis = analyzeBiomarkers(bloodwork,{
age,
sex,
sport,
volume,
diet
})

setReport(analysis)

const calculatedScore = calculateScore(analysis)
setScore(calculatedScore)

const summaryText = buildReportSummary(analysis)
setSummary(summaryText)

const actions = buildTopActions(analysis)
setTopActions(actions)

}

let stackTotal = 0
let premiumEstimate = 0

return(

<div style={{padding:40,maxWidth:1200,margin:"auto",color:"white"}}>

<h1 style={{fontSize:44,fontWeight:700}}>Bloodwise</h1>

<p style={{opacity:.7}}>
Bloodwise provides educational bloodwork insights and is not medical advice.
Consult a licensed healthcare professional before making health decisions.
</p>

{/* PROFILE */}

<div style={{marginTop:40}}>

<h2>Profile</h2>

<input placeholder="Age" onChange={e=>setAge(e.target.value)} />

<select onChange={e=>setSex(e.target.value)}>
<option value="">Sex</option>
<option>Male</option>
<option>Female</option>
</select>

<select onChange={e=>setSport(e.target.value)}>
<option value="">Sport</option>
<option>Running</option>
<option>Cycling</option>
<option>Swimming</option>
<option>Ball Sports</option>
<option>General Fitness</option>
</select>

<input placeholder={getTrainingUnit()} onChange={e=>setVolume(e.target.value)} />

<select onChange={e=>setDiet(e.target.value)}>
<option value="">Diet</option>
<option>Omnivore</option>
<option>Vegetarian</option>
<option>Vegan</option>
</select>

<button onClick={handleProfile} style={{marginTop:10}}>
Generate Blood Test Recommendations
</button>

</div>

{/* RECOMMENDED TESTS */}

{recommended.length>0 && (

<div style={{marginTop:40}}>

<h2>Recommended Blood Tests</h2>

<ul>
{recommended.map((test,i)=>(
<li key={i}>{test}</li>
))}
</ul>

</div>

)}

{/* BLOODWORK ENTRY */}

{recommended.length>0 && (

<div style={{marginTop:40}}>

<h2>Enter Bloodwork</h2>

{recommended.map((marker,i)=>(
<input
key={i}
placeholder={marker}
onChange={e=>handleBloodwork(marker,e.target.value)}
/>
))}

<button onClick={runAnalysis} style={{marginTop:10}}>
Analyze Blood Tests
</button>

</div>

)}

{/* REPORT */}

{report.length>0 && (

<div style={{marginTop:60}}>

<h2>Bloodwise Score</h2>
<h1>{score}/100</h1>

<p style={{marginTop:10,opacity:.8}}>
{summary}
</p>

{/* TOP ACTIONS */}

<div style={{marginTop:30}}>

<h3>Top Actions</h3>

<ul>
{topActions.map((a:any,i:number)=>(
<li key={i}>
<b>{a.marker}</b> — {a.impact} impact
</li>
))}
</ul>

</div>

{/* BIOMARKERS */}

<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:20,
marginTop:40
}}>

{report.map((marker:any,i:number)=>{

const intervention = interventions[marker.marker]
const study = researchSources[marker.marker]
const supplements = supplementRecommendations[marker.marker]

let cheapestMonthly = 0

if(Array.isArray(supplements) && supplements.length>0){

const cheapest = supplements.reduce((a:any,b:any)=>{
const aCost = a.price/a.servings
const bCost = b.price/b.servings
return aCost<bCost ? a : b
})

cheapestMonthly = (cheapest.price/cheapest.servings)*30

stackTotal += cheapestMonthly
premiumEstimate += 20

}

return(

<div key={i} style={{
border:"1px solid #333",
borderRadius:12,
padding:20
}}>

<h3>{marker.marker}</h3>

<p style={{
color:
marker.status==="optimal"
? "#22c55e"
: marker.status==="suboptimal"
? "#facc15"
: "#ef4444"
}}>
{marker.status}
</p>

<p>Optimal: {marker.optimalRange}</p>

{/* STUDY */}

{study && (

<p style={{fontSize:13,opacity:.7}}>
{study.author}. {study.title}
<br/>
<a href={study.link} target="_blank">View Study</a>
</p>

)}

{/* INTERVENTIONS */}

{intervention && (

<div style={{marginTop:10}}>

<p><b>Why:</b> {intervention.why}</p>
<p><b>Foods:</b> {intervention.foods}</p>
<p><b>Lifestyle:</b> {intervention.lifestyle}</p>
<p><b>Supplements:</b> {intervention.supplements}</p>
<p><b>Retest:</b> {intervention.retest}</p>

</div>

)}

{/* SUPPLEMENTS */}

{Array.isArray(supplements) && supplements.length>0 && (

<div style={{marginTop:20}}>

<h4>Best Value Supplements</h4>

{supplements.map((s:any,i:number)=>{

const costPerDose = s.price / s.servings
const monthlyCost = costPerDose * 30

return(

<div key={i} style={{marginBottom:10}}>

<b>{s.brand}</b>

<p>Bottle Price: ${s.price}</p>
<p>Servings: {s.servings}</p>
<p>$ per dose: ${costPerDose.toFixed(2)}</p>
<p>Monthly Cost: ${monthlyCost.toFixed(2)}</p>

</div>

)

})}

</div>

)}

</div>

)

})}

</div>

{/* STACK SUMMARY */}

<div style={{marginTop:50}}>

<h2>Recommended Supplement Stack</h2>

<p>Total Optimized Monthly Cost: ${stackTotal.toFixed(2)}</p>
<p>Typical Premium Stack Estimate: ${premiumEstimate}</p>
<p>Savings: ${(premiumEstimate-stackTotal).toFixed(2)}</p>

</div>

</div>

)}

</div>

)

}