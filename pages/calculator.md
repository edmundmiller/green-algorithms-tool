---
title: Green Algorithms Calculator
---

## Details about your algorithm

To understand how each parameter impacts your carbon footprint, check out the formula below and the methods article

<Dropdown name=runtime title="Runtime (HH:MM)">
<DropdownOption valueLabel="1H" value=1 />
<DropdownOption valueLabel="2H" value=2 />
<DropdownOption valueLabel="3H" value=3 />
</Dropdown>

Selected: {inputs.hardcoded.value}

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

## Memory Configuration

<TextInput
    name="memory"
    title="Memory (GB)"
    defaultValue="64"
/>

## Platform Configuration

<Dropdown
    name="platform_type"
    title="Platform Type"
    data={[
        {label: 'Local Server', value: 'localServer'},
        {label: 'Cloud Provider', value: 'cloud'}
    ]}
/>

{#if inputs.platform_type.value === 'cloud'}
<Dropdown
    name="cloud_provider"
    title="Cloud Provider"
    data={[
        {label: 'Google Cloud Platform', value: 'gcp'},
        {label: 'Amazon Web Services', value: 'aws'},
        {label: 'Microsoft Azure', value: 'azure'}
    ]}
/>
{/if}

## Usage Factors

<TextInput
    name="cpu_usage"
    title="CPU Usage Factor (0-1)"
    defaultValue="1.0"
/>

{#if inputs.core_type.value === 'GPU' || inputs.core_type.value === 'Both'}
<TextInput
    name="gpu_usage"
    title="GPU Usage Factor (0-1)"
    defaultValue="1.0"
/>
{/if}

## Power Usage Effectiveness (PUE)

```sql pue_defaults
select * from v2_2.defaults_PUE
```

<TextInput
    name="pue"
    title="Power Usage Effectiveness"
    defaultValue={pue_defaults[0].default_value}
/>

<small>*PUE is the ratio of total power consumption of the data center to the power consumption of the computing equipment. A typical value is {pue_defaults[0].default_value}.</small>

## Location

<Dropdown
    name="continent"
    title="Continent"
    data={[
        {label: 'Europe', value: 'europe'},
        {label: 'North America', value: 'north_america'},
        {label: 'South America', value: 'south_america'},
        {label: 'Asia', value: 'asia'},
        {label: 'Africa', value: 'africa'},
        {label: 'Oceania', value: 'oceania'}
    ]}
/>

{#if inputs.continent.value}
<Dropdown
    name="country"
    title="Country"
    data={carbon_intensity
        .filter(c => c.continent === inputs.continent.value)
        .map(c => ({
            label: c.country,
            value: c.country
        }))}
/>
{/if}

{#if inputs.country.value}
<Dropdown
    name="region"
    title="Region"
    data={carbon_intensity
        .filter(c => 
            c.continent === inputs.continent.value && 
            c.country === inputs.country.value)
        .map(c => ({
            label: c.region,
            value: c.location
        }))}
/>
{/if}

## Results

{#if calculate_emissions}
Your computation would result in:

- **Carbon Emissions**: {calculate_emissions[0].emissions.toFixed(2)} gCO2e
- **Energy Consumption**: {calculate_emissions[0].energy_kwh.toFixed(2)} kWh
- **Power Draw**:
  - CPU: {calculate_emissions[0].cpu_power.toFixed(2)}W
  - GPU: {calculate_emissions[0].gpu_power.toFixed(2)}W
  - Memory: {calculate_emissions[0].memory_power.toFixed(2)}W

<BarChart
    data={[
        {component: 'CPU', power: calculate_emissions[0].cpu_power},
        {component: 'GPU', power: calculate_emissions[0].gpu_power},
        {component: 'Memory', power: calculate_emissions[0].memory_power}
    ]}
    x="component"
    y="power"
    title="Power Distribution (W)"
/>
{/if}
