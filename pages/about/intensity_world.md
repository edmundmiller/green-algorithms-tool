---
title: Carbon Intensity across the world
---

```sql CI_aggr
select * from v2_2.CI_aggregated
```
<AreaMap
    data={CI_aggr}
    areaCol=countryName
    geoJsonUrl='/world.geo.json'
    geoId=ADMIN
    value=carbonIntensity
/>
        <!-- hovertemplate="%{text} <extra> %{z:.0f} gCO2e/kWh </extra>", -->

## About CO2e

"Carbon dioxide equivalent" (CO2e) measures the global warming potential of a mixture of greenhouse gases. **It represents the quantity of CO2 that would have the same impact on global warming** as the mix of interest and is used as a standardised unit to assess the environmental impact of human activities.

## What is a tree-month?

It's the amount of CO2 sequestered by a tree in a month. **We use it to measure how long it would take to a mature tree to absorb the CO2 emitted by an algorithm.** We use the value of 11 kg CO2/year, which is roughly 1kg CO2/month.
Power draw of different processors
