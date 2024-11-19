---
title: Green Algorithms Calculator
---

# Green Algorithms Calculator

<script>
// Default values
let defaultValues = {
    runTime_hour: 12,
    runTime_min: 0,
    coreType: 'CPU',
    numberCPUs: 12,
    CPUmodel: 'Xeon E5-2683 v4',
    tdpCPU: 12,
    numberGPUs: 1,
    GPUmodel: 'NVIDIA Tesla V100',
    tdpGPU: 200,
    memory: 64,
    platformType: 'localServer',
    provider: 'gcp',
    usageCPU: 1.0,
    usageGPU: 1.0,
    PUE: 1.0,
    PSF: 1
};

// Declare reactive variables
let coreType = defaultValues.coreType;
let numberCPUs = defaultValues.numberCPUs;
let CPUmodel = defaultValues.CPUmodel;
let numberGPUs = defaultValues.numberGPUs;
let GPUmodel = defaultValues.GPUmodel;
let memory = defaultValues.memory;
let runTime_hour = defaultValues.runTime_hour;
let runTime_min = defaultValues.runTime_min;
let PUE = defaultValues.PUE;
let PSF = defaultValues.PSF;
let continent;
let country;
let location;
</script>

```sql
select
'CPU' as type,
model,
tdp_per_core as tdp
from TDP_cpu
union all
select
'GPU' as type,
model,
tdp_per_core as tdp
from TDP_gpu
```

```sql
select
location,
continent_name as continentName,
country_name as countryName,
region_name as regionName,
carbon_intensity as carbonIntensity
from CI_aggregated
```

## Core Configuration

<Select
label="Core Type"
options={[
{label: 'CPU', value: 'CPU'},
{label: 'GPU', value: 'GPU'},
{label: 'Both', value: 'Both'}
]}
bind:value={coreType}
/>

{#if coreType === 'CPU' || coreType === 'Both'}

### CPU Configuration

<NumberInput 
    label="Number of CPU Cores"
    bind:value={numberCPUs}
    min={1}
/>

<Select
label="CPU Model"
options={cores.filter(c => c.type === 'CPU').map(c => ({
label: c.model,
value: c.model
}))}
bind:value={CPUmodel}
/>
{/if}

{#if coreType === 'GPU' || coreType === 'Both'}

### GPU Configuration

<NumberInput
    label="Number of GPUs"
    bind:value={numberGPUs}
    min={1}
/>

<Select
label="GPU Model"
options={cores.filter(c => c.type === 'GPU').map(c => ({
label: c.model,
value: c.model
}))}
bind:value={GPUmodel}
/>
{/if}

## Memory Configuration

<NumberInput
    label="Memory (GB)"
    bind:value={memory}
    min={0}
/>

## Runtime Configuration

<NumberInput
    label="Hours"
    bind:value={runTime_hour}
    min={0}
/>

<NumberInput
    label="Minutes"
    bind:value={runTime_min}
    min={0}
    max={59}
/>

## Location

<Select
label="Continent"
options={[...new Set(carbon_intensity.map(c => c.continentName))].map(c => ({
label: c,
value: c
}))}
bind:value={continent}
/>

{#if continent}
<Select
label="Country"
options={[...new Set(carbon_intensity.filter(c => c.continentName === continent).map(c => c.countryName))].map(c => ({
label: c,
value: c
}))}
bind:value={country}
/>
{/if}

{#if country}
<Select
label="Region"
options={carbon_intensity.filter(c => c.continentName === continent && c.countryName === country).map(c => ({
label: c.regionName,
value: c.location
}))}
bind:value={location}
/>
{/if}

```sql
with inputs as (
select
${runTime_hour || 0} as runtime_hours,
${runTime_min || 0} as runtime_mins,
${numberCPUs || 0} as num_cpus,
${numberGPUs || 0} as num_gpus,
${memory || 0} as memory_gb,
${location ? '${location}' : null} as location,
${PUE || 1} as pue,
${PSF || 1} as psf
),
power_draw as (
select
i.,
c.carbonIntensity,
-- Calculate total runtime in hours
(runtime_hours + runtime_mins/60.0) as runtime,
-- Calculate power draw
case when '${coreType}' in ('CPU','Both') then
num_cpus (select tdp from cores where type='CPU' and model='${CPUmodel || "Xeon E5-2683 v4"}')
else 0 end as cpu_power,
case when '${coreType}' in ('GPU','Both') then
num_gpus (select tdp from cores where type='GPU' and model='${GPUmodel || "NVIDIA Tesla V100"}')
else 0 end as gpu_power,
memory_gb 0.3725 as memory_power -- Assuming 0.3725W per GB
from inputs i
left join carbon_intensity c on c.location = i.location
),
energy_consumption as (
select
,
-- Calculate energy in kWh
runtime pue psf (cpu_power + gpu_power + memory_power) / 1000 as energy_kwh
from power_draw
)
select
runtime,
cpu_power,
gpu_power,
memory_power,
energy_kwh,
carbonIntensity,
-- Calculate emissions in gCO2e
energy_kwh carbonIntensity as emissions
from energy_consumption
```

{#if calculate_emissions[0].emissions}

## Results

Your computation would result in:

- **Carbon Emissions**: {calculate_emissions[0].emissions.toFixed(2)} gCO2e
- **Energy Consumption**: {calculate_emissions[0].energy_kwh.toFixed(2)} kWh
- **Power Draw**:
  - CPU: {calculate_emissions[0].cpu_power.toFixed(2)}W
  - GPU: {calculate_emissions[0].gpu_power.toFixed(2)}W
  - Memory: {calculate_emissions[0].memory_power.toFixed(2)}W

<BarChart
    data={calculate_emissions}
    x="component" 
    y="power"
    title="Power Distribution"
/>

{/if}
