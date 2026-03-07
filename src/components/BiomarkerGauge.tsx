"use client"

type Props = {
  value: number
  optimalMin: number
  optimalMax: number
}

export default function BiomarkerGauge({
  value,
  optimalMin,
  optimalMax
}: Props) {

  const min = optimalMin * 0.5
  const max = optimalMax * 1.5

  const percent = Math.max(
    0,
    Math.min(
      100,
      ((value - min) / (max - min)) * 100
    )
  )

  return (

    <div style={{marginTop:10}}>

      <div
        style={{
          height:8,
          background:"#1f2937",
          borderRadius:4,
          position:"relative"
        }}
      >

        <div
          style={{
            position:"absolute",
            left:`${percent}%`,
            top:-4,
            width:16,
            height:16,
            borderRadius:"50%",
            background:"#22c55e",
            transform:"translateX(-50%)"
          }}
        />

      </div>

    </div>

  )

}