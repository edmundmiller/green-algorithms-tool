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
    link=source
    colorPalette={['#78E7A2','#86D987','#93CB70','#9EBC5C','#A6AD4D','#AB9E43','#AF8F3E','#AF803C','#AC713D','#A76440','#9E5943']}
    tooltip={[
        {id: 'countryName', fmt: 'id', showColumnName: false, valueClass: 'text-xl font-semibold'},
        {id: 'carbonIntensity', fieldClass: 'text-[grey]', valueClass: 'text-[red]'},
        {id: 'source', showColumnName: false, contentType: 'link', valueClass: 'font-bold mt-1'},
        {id: 'comments', showColumnName: false}
    ]}
/>
<!-- TODO Add units to hovertemplate -->
<!-- TODO Format source to shorten -->
        <!-- hovertemplate="%{text} <extra> %{z:.0f} gCO2e/kWh </extra>", -->

## About CO2e

"Carbon dioxide equivalent" (CO2e) measures the global warming potential of a mixture of greenhouse gases. **It represents the quantity of CO2 that would have the same impact on global warming** as the mix of interest and is used as a standardised unit to assess the environmental impact of human activities.

## What is a tree-month?

It's the amount of CO2 sequestered by a tree in a month. **We use it to measure how long it would take to a mature tree to absorb the CO2 emitted by an algorithm.** We use the value of 11 kg CO2/year, which is roughly 1kg CO2/month.
Power draw of different processors
