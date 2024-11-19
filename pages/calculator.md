---
title: Green Algorithms Calculator
---

## Details about your algorithm

To understand how each parameter impacts your carbon footprint, check out the formula below and the [methods article](https://onlinelibrary.wiley.com/doi/10.1002/advs.202100707)

### Runtime (HH:MM)
<Dropdown name=runtime_hours title="Hours">
<DropdownOption valueLabel="1 Hours" value=1 />
<DropdownOption valueLabel="2 Hours" value=2 />
<DropdownOption valueLabel="3 Hours" value=3 />
</Dropdown>

<Dropdown name=runtime_minutes title="Minutes">
<DropdownOption valueLabel="1 min" value=1 />
<DropdownOption valueLabel="2 min" value=2 />
<DropdownOption valueLabel="3 min" value=3 />
</Dropdown>

---

<Dropdown name=core_type title="Type of cores">
    <DropdownOption valueLabel="CPU" value="CPU" />
    <DropdownOption valueLabel="GPU" value="GPU" />
    <DropdownOption value="Both" />
</Dropdown>

<TextInput
    name=number_of_cores
    title="Number of cores"
    defaultValue=12
/>

Selected: {inputs.text_input4}

```sql current_models
select model from v2_2.providers_hardware
```

<Dropdown name=core_model title="Model" data={current_models}     value=model
/>

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

{#if inputs.runtime_hours && inputs.number_of_cores && power_usage.length > 0 && carbon_intensity.length > 0}

```sql energy
select 
  (${inputs.runtime_hours} * ${inputs.number_of_cores} * ${power_usage[0].tdp}) / 1000 as energy_kwh
```

```sql carbon
select 
  (energy_kwh * ${carbon_intensity[0].carbonIntensity}) / 1000 as carbon_footprint 
from energy
```

  ## Results

  <BigValue 
    value={carbon}
    title="Carbon Footprint"
    subtitle="kg CO₂e"
    decimals={2}
  />

  <BigValue
    value={energy}
    title="Energy Consumption"
    subtitle="kWh"
    decimals={2}
  />

  ### Environmental Impact
  - Carbon sequestered by <Value value={carbon*0.017} format="number" decimals=1 /> trees in a year
  - Equivalent to driving <Value value={carbon/0.2} format="number" decimals=1 /> km in an average car
  - Or flying <Value value={carbon/0.1} format="number" decimals=1 /> km in an airplane

{/if}
