export const biomarkerDatabase:any = {

Ferritin:{
deficient:30,
suboptimal:60,
optimalRange:"60–120 ng/mL",
weight:12,
why:"Ferritin reflects iron storage and oxygen transport capacity. Low ferritin is strongly linked to fatigue and decreased endurance performance.",
foods:"Red meat, beef liver, lentils, spinach, pumpkin seeds",
lifestyle:"Avoid coffee/tea within 1 hour of iron-rich meals, ensure adequate caloric intake",
supplements:"Iron bisglycinate or ferrous sulfate",
retest:"8–12 weeks",
research:{
author:"Peeling et al.",
title:"Iron Status and the Athlete",
link:"https://pubmed.ncbi.nlm.nih.gov/24791949/"
}
},

"Iron Saturation":{
deficient:15,
suboptimal:25,
optimalRange:"25–40%",
weight:8,
why:"Iron saturation reflects circulating iron available for red blood cell production.",
foods:"Red meat, shellfish, beans",
lifestyle:"Pair iron foods with vitamin C",
supplements:"Iron bisglycinate",
retest:"8–12 weeks",
research:{
author:"Sim et al.",
title:"Iron Considerations for the Athlete",
link:"https://pubmed.ncbi.nlm.nih.gov/23687255/"
}
},

Hemoglobin:{
deficient:13,
suboptimal:14,
optimalRange:"14–16 g/dL",
weight:10,
why:"Hemoglobin carries oxygen in the blood and is critical for endurance performance.",
foods:"Red meat, eggs, beans",
lifestyle:"Altitude training, adequate caloric intake",
supplements:"Iron if deficient",
retest:"8–12 weeks",
research:{
author:"Schumacher et al.",
title:"Hemoglobin Mass and Endurance Performance",
link:"https://pubmed.ncbi.nlm.nih.gov/16015132/"
}
},

"Vitamin D":{
deficient:20,
suboptimal:35,
optimalRange:"40–60 ng/mL",
weight:10,
why:"Vitamin D supports immune health, bone density, muscle function, and recovery.",
foods:"Fatty fish, egg yolks, fortified dairy",
lifestyle:"Sun exposure 10–20 minutes daily",
supplements:"Vitamin D3 + K2",
retest:"8 weeks",
research:{
author:"Close et al.",
title:"Vitamin D and Athletic Performance",
link:"https://pubmed.ncbi.nlm.nih.gov/21904259/"
}
},

Magnesium:{
deficient:1.7,
suboptimal:2.0,
optimalRange:"2.0–2.3 mg/dL",
weight:7,
why:"Magnesium is involved in muscle relaxation, ATP production, and sleep quality.",
foods:"Pumpkin seeds, almonds, dark chocolate",
lifestyle:"Improve sleep quality and hydration",
supplements:"Magnesium glycinate",
retest:"8 weeks",
research:{
author:"Nielsen",
title:"Magnesium and Exercise Performance",
link:"https://pubmed.ncbi.nlm.nih.gov/20352370/"
}
},

"Vitamin B12":{
deficient:300,
suboptimal:450,
optimalRange:"500–900 pg/mL",
weight:9,
why:"Vitamin B12 is essential for red blood cell production and neurological health.",
foods:"Beef, eggs, dairy",
lifestyle:"Ensure adequate animal protein intake",
supplements:"Methylcobalamin",
retest:"8 weeks",
research:{
author:"O'Leary",
title:"Vitamin B12 in Health and Disease",
link:"https://pubmed.ncbi.nlm.nih.gov/18709885/"
}
},

CRP:{
deficient:3,
suboptimal:1,
optimalRange:"<1 mg/L",
weight:8,
why:"CRP reflects systemic inflammation and recovery status.",
foods:"Fatty fish, berries, leafy greens",
lifestyle:"Improve sleep and reduce chronic stress",
supplements:"Omega-3 fatty acids",
retest:"8–12 weeks",
research:{
author:"Ridker et al.",
title:"C-reactive Protein and Cardiovascular Risk",
link:"https://pubmed.ncbi.nlm.nih.gov/10736279/"
}
},

Testosterone:{
deficient:350,
suboptimal:500,
optimalRange:"500–900 ng/dL",
weight:10,
why:"Testosterone supports muscle growth, recovery, red blood cell production, and overall performance.",
foods:"Eggs, red meat, oysters",
lifestyle:"Strength training, sleep optimization, adequate calorie intake",
supplements:"Vitamin D3, zinc, creatine",
retest:"8–12 weeks",
research:{
author:"Crewther et al.",
title:"Testosterone and Athletic Performance",
link:"https://pubmed.ncbi.nlm.nih.gov/20601729/"
}
},

TSH:{
deficient:4,
suboptimal:3,
optimalRange:"0.5–2.5 µIU/mL",
weight:7,
why:"TSH reflects thyroid function which regulates metabolism and energy levels.",
foods:"Iodized salt, seafood",
lifestyle:"Ensure adequate calorie intake and micronutrients",
supplements:"Iodine if deficient",
retest:"8–12 weeks",
research:{
author:"Wiersinga",
title:"Thyroid Hormone Physiology",
link:"https://pubmed.ncbi.nlm.nih.gov/25905417/"
}
},

Cortisol:{
deficient:5,
suboptimal:10,
optimalRange:"10–18 µg/dL",
weight:6,
why:"Cortisol reflects stress response and recovery balance.",
foods:"Whole foods with balanced macros",
lifestyle:"Sleep optimization and stress management",
supplements:"Ashwagandha",
retest:"8 weeks",
research:{
author:"Hackney",
title:"Stress and the Endocrine System",
link:"https://pubmed.ncbi.nlm.nih.gov/18971569/"
}
},

Glucose:{
deficient:65,
suboptimal:75,
optimalRange:"75–95 mg/dL",
weight:7,
why:"Glucose reflects metabolic health and energy regulation.",
foods:"Balanced carbohydrate intake",
lifestyle:"Regular exercise and stable meal timing",
supplements:"Chromium if needed",
retest:"12 weeks",
research:{
author:"DeFronzo",
title:"Glucose Homeostasis",
link:"https://pubmed.ncbi.nlm.nih.gov/10221851/"
}
},

Insulin:{
deficient:2,
suboptimal:5,
optimalRange:"2–8 µIU/mL",
weight:7,
why:"Insulin reflects metabolic health and insulin sensitivity.",
foods:"Balanced whole foods diet",
lifestyle:"Strength training and aerobic exercise",
supplements:"Berberine",
retest:"12 weeks",
research:{
author:"Shanik et al.",
title:"Insulin Resistance",
link:"https://pubmed.ncbi.nlm.nih.gov/17003131/"
}
},

Triglycerides:{
deficient:150,
suboptimal:100,
optimalRange:"<100 mg/dL",
weight:6,
why:"Triglycerides reflect metabolic health and dietary fat/carbohydrate balance.",
foods:"Omega-3 rich foods",
lifestyle:"Exercise and balanced macronutrient intake",
supplements:"Fish oil",
retest:"12 weeks",
research:{
author:"Nordestgaard",
title:"Triglycerides and Cardiovascular Risk",
link:"https://pubmed.ncbi.nlm.nih.gov/22156117/"
}
},

HDL:{
deficient:40,
suboptimal:50,
optimalRange:"50–80 mg/dL",
weight:6,
why:"HDL supports cardiovascular health and metabolic function.",
foods:"Olive oil, fatty fish",
lifestyle:"Regular aerobic exercise",
supplements:"Omega-3",
retest:"12 weeks",
research:{
author:"Barter",
title:"HDL Cholesterol",
link:"https://pubmed.ncbi.nlm.nih.gov/17686826/"
}
},

LDL:{
deficient:160,
suboptimal:120,
optimalRange:"70–120 mg/dL",
weight:6,
why:"LDL reflects lipid transport and cardiovascular risk.",
foods:"Whole foods diet",
lifestyle:"Regular exercise",
supplements:"Plant sterols",
retest:"12 weeks",
research:{
author:"Ference",
title:"LDL and Cardiovascular Disease",
link:"https://pubmed.ncbi.nlm.nih.gov/28444290/"
}
}

}