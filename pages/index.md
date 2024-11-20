---
title: Green Algorithms Calculator
queries:
    - memory_power: memory_power.sql
# TODO Support links
# http://calculator.green-algorithms.org//?runTime_hour=12&runTime_min=0&appVersion=v2.2&locationContinent=Europe&locationCountry=Austria&locationRegion=AT&coreType=CPU&numberCPUs=12&CPUmodel=Xeon%20E5-2683%20v4&memory=64&platformType=localServer
---

## Details about your algorithm

To understand how each parameter impacts your carbon footprint, check out the formula below and the [methods article](https://onlinelibrary.wiley.com/doi/10.1002/advs.202100707)

### Runtime (HH:MM)
<Dropdown name=runtime_hours title="Hours">
<DropdownOption valueLabel="1 Hours" value=1 default/>
<DropdownOption valueLabel="2 Hours" value=2 />
<DropdownOption valueLabel="3 Hours" value=3 />
</Dropdown>

<Dropdown name=runtime_minutes title="Minutes">
<DropdownOption valueLabel="1 min" value=1 default />
<DropdownOption valueLabel="2 min" value=2 />
<DropdownOption valueLabel="3 min" value=3 />
</Dropdown>

---

<Dropdown name=core_type title="Type of cores" multiple=true selectAllByDefault=true>
    <DropdownOption valueLabel="CPU" value="CPU" />
    <DropdownOption valueLabel="GPU" value="GPU" />
</Dropdown>

<!-- TODO Slider? -->
<TextInput
    name=number_of_cores
    title="Number of cores"
    defaultValue="12"
/>

```sql current_models
select type,model from v2_2.providers_hardware
where type in ${inputs.core_type.value}
```

<Dropdown name=core_model title="Model" data={current_models} value=model />

---

<TextInput
    name="memory"
    title="Memory (GB)"
    defaultValue="64"
/>

---

## Platform Configuration

<Dropdown
name="platform_type"
title="Platform Type"
>
    <DropdownOption valueLabel="Cloud Computing" value="cloud" />
    <DropdownOption valueLabel="Personal computer" value="personal" />
    <DropdownOption valueLabel="Local Server" value="server" />
</Dropdown>

<!-- {#if inputs.platform_type.value === 'cloud'}
TODO Cloud selection
{/if} -->

```sql location_country
select countryName from v2_2.CI_aggregated
-- TODO Select region and then country
```

<Dropdown
name=compute_location
title="Select location"
data={location_country}
value=countryName
/>

<br/>

<ButtonGroup name=real_cpu_usage title="Do you know the real usage factor of your CPU?" display="tabs">
    <ButtonGroupItem valueLabel="Yes" value=true />
    <ButtonGroupItem valueLabel="No" value=false default />
</ButtonGroup>

<ButtonGroup name=pue title="Do you know the Power Usage Efficiency (PUE) of your local data centre?" display="tabs">
    <ButtonGroupItem valueLabel="Yes" value=true />
    <ButtonGroupItem valueLabel="No" value=false default />
</ButtonGroup>


<ButtonGroup name=pragmatic_scaling_factor title="Do you want to use a Pragmatic Scaling Factor?" display="tabs">
    <ButtonGroupItem valueLabel="Yes" value=true />
    <ButtonGroupItem valueLabel="No" value=false default />
</ButtonGroup>

<!-- TODO App version?-->

---

```sql carbon_intensity
select 
  countryName,
  carbonIntensity 
from v2_2.CI_aggregated
where countryName = '${inputs.compute_location.value}'
```

```sql power_usage
select 
  tdp,
  model
from v2_2.TDP_cpu -- TODO Support GPU
where model = '${inputs.core_model.value}'
```

<!-- TODO select from provider -->
```sql pue
select
provider,
PUE,
from v2_2.defaults_PUE
where provider = 'Unknown'
```

---

{#if inputs.runtime_hours && inputs.number_of_cores && power_usage.length > 0 && carbon_intensity.length > 0}

```sql energy
select 
  (${inputs.runtime_hours.value} * ((${inputs.number_of_cores} * tdp) + memory_power.value) * pue.PUE * ${inputs.pragmatic_scaling_factor}) as energy_kwh
from 
${power_usage}
```

```sql carbon
select 
  (energy_kwh * ${carbon_intensity.carbonIntensity}) / 1000 as carbon_footprint 
from ${energy}
```

  ## Results

  <BigValue 
    data={carbon}
    value=carbon_footprint
    title="Carbon Footprint"
    subtitle="kg CO₂e"
    decimals={2}
  />

  <BigValue
    data={energy}
    value=energy_kwh
    title="Energy Consumption"
    subtitle="kWh"
    decimals={2}
  />

### Environmental Impact

```sql environment_impact
select
(carbon_footprint * 0.017) as sequestered,
(carbon_footprint * 0.2) as driving,
(carbon_footprint * 0.1) as flying,
from ${carbon};
```

  - Carbon sequestered by <Value data={environment_impact} value=sequestered format="number" decimals=1 /> trees in a year
  - Equivalent to driving <Value data={environment_impact} value=driving format="number" decimals=1 /> km in an average car
  - Or flying <Value data={environment_impact} value=flying format="number" decimals=1 /> km in an airplane

<!-- ### Computing cores VS Memory -->

<!-- ```sql donut_query -->
<!-- select 'Glazed' as donut, 213 as count -->
<!-- union all -->
<!-- select 'Cruller' as donut, 442 as count -->
<!-- union all -->
<!-- select 'Jelly-filled' as donut, 321 as count -->
<!-- union all -->
<!-- select 'Cream-filled' as donut, 350 as count -->
<!-- ``` -->

<!-- ```sql donut_data -->
<!-- select donut as name, count as value -->
<!-- from ${donut_query} -->
<!-- ``` -->

<!-- <ECharts config={ -->
<!--     { -->
<!--         tooltip: { -->
<!--             formatter: '{b}: {c} ({d}%)' -->
<!--         }, -->
<!--       series: [ -->
<!--         { -->
<!--           type: 'pie', -->
<!--           radius: ['40%', '70%'], -->
<!--           data: [...donut_data], -->
<!--         } -->
<!--       ] -->
<!--       } -->
<!--     } -->
<!-- /> -->

{/if}


