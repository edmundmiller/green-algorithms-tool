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
